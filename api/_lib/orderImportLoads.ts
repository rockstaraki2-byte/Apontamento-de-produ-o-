export interface ExpeditionRouteForOrderLoad {
  id: string;
  name?: string;
  active?: boolean;
  weekday?: number;
  shift?: string;
  customerIds?: Array<string | number>;
  tenantId?: string;
}

export interface ExpeditionCargaForOrderLoad {
  id: string;
  name?: string;
  routeId?: string;
  routeName?: string;
  status?: string;
  scheduledDate?: string;
  departureDate?: string;
  shift?: string;
  createdAt?: number;
  tenantId?: string;
}

export interface OrderLoadPlan {
  routeId: string;
  routeName: string;
  scheduledDate: string;
  cargaId?: string;
  createCarga: boolean;
}

export interface OrderLoadSelection {
  plan?: OrderLoadPlan;
  warning?: string;
}

function sameId(left: unknown, right: unknown): boolean {
  return String(left ?? "").trim() === String(right ?? "").trim();
}

function normalizeWords(value?: string): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function cityAcronym(city: string): string {
  const ignored = new Set(["da", "das", "de", "do", "dos", "e", "d"]);
  return normalizeWords(city)
    .split(" ")
    .filter((word) => word && !ignored.has(word))
    .map((word) => word[0] || "")
    .join("");
}

function routeMatchesCity(routeName: string, city: string): boolean {
  if (!city) return false;
  const normalizedCity = normalizeWords(city);
  const acronym = cityAcronym(city);
  const withoutSuffix = routeName.split(/\s+-\s+/)[0] || routeName;
  const withoutPrefix = withoutSuffix.replace(/^\s*rota\s+/i, "").trim();

  return withoutPrefix
    .split(/[\/|>,;]+/)
    .map((token) => normalizeWords(token.trim()))
    .filter(Boolean)
    .some(
      (token) =>
        token === normalizedCity ||
        token.includes(normalizedCity) ||
        normalizedCity.includes(token) ||
        (acronym.length >= 2 && token === acronym),
    );
}

function parseDateKey(value: string): string | null {
  const dateKey = value.split("T")[0];
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return date.toISOString().slice(0, 10) === dateKey ? dateKey : null;
}

function nextRouteOccurrence(weekday: number, fromDate: string): string | null {
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return null;
  const dateKey = parseDateKey(fromDate);
  if (!dateKey) return null;
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  const delta = (weekday - date.getUTCDay() + 7) % 7;
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

function shiftRank(shift?: string): number {
  return shift === "MANHA" ? 0 : shift === "TARDE" ? 1 : 2;
}

/**
 * Uses the same route/customer/city and next-occurrence rules as the load
 * suggestions screen. Missing or cross-tenant records are never adopted.
 */
export function selectOrderLoad(
  tenantId: string,
  customerId: string | number,
  customerCity: string,
  deliveryDate: string,
  routes: ExpeditionRouteForOrderLoad[],
  cargas: ExpeditionCargaForOrderLoad[],
): OrderLoadSelection {
  const dueDate = parseDateKey(deliveryDate);
  if (!dueDate) {
    return { warning: "Pedido criado sem carga: a data de entrega não permite calcular um dia de rota elegível." };
  }

  const eligibleRoutes = routes
    .filter((route) => {
      const directCustomerMatch = Array.isArray(route.customerIds) &&
        route.customerIds.some((id) => sameId(id, customerId));
      return route.tenantId === tenantId && route.active !== false &&
        (directCustomerMatch || routeMatchesCity(String(route.name || ""), customerCity));
    })
    .map((route) => ({ route, scheduledDate: nextRouteOccurrence(Number(route.weekday), dueDate) }))
    .filter((entry): entry is { route: ExpeditionRouteForOrderLoad; scheduledDate: string } => Boolean(entry.scheduledDate))
    .sort((a, b) =>
      a.scheduledDate.localeCompare(b.scheduledDate) ||
      shiftRank(a.route.shift) - shiftRank(b.route.shift) ||
      String(a.route.name || "").localeCompare(String(b.route.name || "")) ||
      a.route.id.localeCompare(b.route.id));

  const selected = eligibleRoutes[0];
  if (!selected) {
    return { warning: "Pedido criado sem carga: não foi encontrada rota ativa elegível para o cliente ou cidade cadastrada." };
  }

  const sameRouteAndDate = cargas.filter((carga) => {
    const date = String(carga.scheduledDate || carga.departureDate || "").split("T")[0];
    return carga.tenantId === tenantId && carga.routeId === selected.route.id && date === selected.scheduledDate;
  });
  const editableCarga = sameRouteAndDate
    .filter((carga) => carga.status === "ABERTA" || carga.status === "PLANEJADA")
    .sort((a, b) =>
      shiftRank(a.shift) - shiftRank(b.shift) ||
      Number(a.createdAt || 0) - Number(b.createdAt || 0) ||
      a.id.localeCompare(b.id))[0];

  const basePlan = {
    routeId: selected.route.id,
    routeName: String(selected.route.name || ""),
    scheduledDate: selected.scheduledDate,
  };
  if (editableCarga) {
    return { plan: { ...basePlan, cargaId: editableCarga.id, createCarga: false } };
  }
  if (sameRouteAndDate.length) {
    return { warning: "Pedido criado sem carga: já existe uma carga nessa rota e data, mas ela não está aberta ou planejada." };
  }
  return { plan: { ...basePlan, createCarga: true } };
}
