import type { Carga, Customer, ExpeditionRoute, User } from "./types";
import { normalizeString } from "./searchUtils";

export const EDITABLE_ORDER_LOAD_STATUSES = new Set<Carga["status"]>([
  "PLANEJADA",
  "ABERTA",
]);

export function getExpeditionCustomerCity(customer?: Customer | null) {
  if (!customer) return "";
  const city = String(
    (customer as any).city ||
      (customer as any).cidade ||
      (customer as any).municipio ||
      (customer as any).municipality ||
      "",
  ).trim();
  if (city) return city;

  const address = String((customer as any).address || (customer as any).endereco || "").trim();
  const cityStateMatch = address.match(/(?:^|,)\s*([^,]+?)\s*[-–/]\s*[A-Za-z]{2}\s*$/);
  return cityStateMatch?.[1]?.trim() || "";
}

export function getExpeditionRoutesForCustomer(
  customer: Customer | null | undefined,
  routeRecords: ExpeditionRoute[] | undefined,
) {
  if (!customer) return [] as ExpeditionRoute[];
  const routes = (routeRecords || []).filter((route) => route.active !== false);
  const assignedRoutes = routes.filter((route) =>
    (route.customerIds || []).some((id) => String(id) === String(customer.id)),
  );
  if (assignedRoutes.length > 0) return assignedRoutes;

  const normalizedCity = normalizeString(getExpeditionCustomerCity(customer));
  const cityRoutes = normalizedCity
    ? routes.filter((route) => normalizeString(route.name).includes(normalizedCity))
    : [];
  if (cityRoutes.length > 0) return cityRoutes;

  // Cidades sem rota regional cadastrada usam a rota complementar de transportadoras.
  return normalizedCity
    ? routes.filter((route) => normalizeString(route.name).includes("cidadesdespacho"))
    : [];
}

export function getLoadsForExpeditionRoutes(
  cargas: Carga[] | undefined,
  routes: ExpeditionRoute[],
) {
  const routeIds = new Set(routes.map((route) => String(route.id)));
  const routeNames = new Set(routes.map((route) => normalizeString(route.name)));
  return (cargas || [])
    .filter((carga) => {
      if (carga.routeId && routeIds.has(String(carga.routeId))) return true;
      return [carga.routeName, carga.name, ...(Array.isArray(carga.route) ? carga.route : [])]
        .filter(Boolean)
        .some((name) => routeNames.has(normalizeString(name)));
    })
    .sort((a, b) => {
      const dateA = String(a.scheduledDate || a.departureDate || "").split("T")[0];
      const dateB = String(b.scheduledDate || b.departureDate || "").split("T")[0];
      const shiftRank = (shift?: string) => shift === "MANHA" ? 0 : shift === "TARDE" ? 1 : 2;
      return dateA.localeCompare(dateB) ||
        shiftRank(a.shift) - shiftRank(b.shift) ||
        Number(a.createdAt || 0) - Number(b.createdAt || 0);
    });
}

export async function createPlannedOrderCarga(
  db: { addCarga: (carga: Omit<Carga, "id">) => Promise<string> },
  route: ExpeditionRoute,
  scheduledDate: string,
  user: User,
) {
  const selectedDate = new Date(`${scheduledDate}T12:00:00`);
  if (Number.isNaN(selectedDate.getTime())) throw new Error("Informe uma data de entrega válida.");

  const timestamp = Date.now();
  return db.addCarga({
    name: route.name,
    routeId: route.id,
    routeName: route.name,
    route: [route.name],
    shift: route.shift,
    scheduledDate,
    departureDate: scheduledDate,
    dayOfWeek: ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"][selectedDate.getDay()],
    orderIds: [],
    orderQuantities: {},
    separatedQuantities: {},
    status: "PLANEJADA",
    createdAt: timestamp,
    auditTrail: [{
      timestamp,
      userId: user.id,
      userName: user.name,
      action: "Carga planejada criada no lançamento/edição de pedido",
    }],
    tenantId: "imperio",
  });
}

export function getSuggestedExpeditionLoad(cargas: Carga[], deliveryDate: string) {
  const deliveryKey = String(deliveryDate || "").split("T")[0];
  return [...cargas].sort((a, b) => {
    const dateA = String(a.scheduledDate || a.departureDate || "").split("T")[0];
    const dateB = String(b.scheduledDate || b.departureDate || "").split("T")[0];
    if (deliveryKey) {
      const aBeforeDue = dateA <= deliveryKey;
      const bBeforeDue = dateB <= deliveryKey;
      if (aBeforeDue !== bBeforeDue) return aBeforeDue ? -1 : 1;
      const dateOrder = aBeforeDue ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
      if (dateOrder !== 0) return dateOrder;
    } else {
      const dateOrder = dateA.localeCompare(dateB);
      if (dateOrder !== 0) return dateOrder;
    }
    const shiftRank = (shift?: string) => shift === "MANHA" ? 0 : shift === "TARDE" ? 1 : 2;
    return shiftRank(a.shift) - shiftRank(b.shift) ||
      Number(a.createdAt || 0) - Number(b.createdAt || 0);
  })[0] || null;
}

