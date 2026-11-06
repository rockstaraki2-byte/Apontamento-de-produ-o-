import { createHash } from "node:crypto";

export const CALENDAR_TENANT_ID = "imperio";
export const CALENDAR_TIME_ZONE = "America/Sao_Paulo";

const FINAL_LOAD_STATUSES = new Set([
  "DESPACHADA",
  "ENTREGUE",
  "FATURADA",
  "FATURADA_COMPLETA",
  "CANCELADA",
  "CANCELADO",
]);

const STATUS_LABELS: Record<string, string> = {
  PLANEJADA: "Planejada",
  ABERTA: "Aberta",
  FECHADA: "Fechada",
  LIBERADA: "Liberada",
  EM_SEPARACAO: "Em separação",
  PRONTA: "Pronta",
  CARREGADA: "Carregada",
  DESPACHADA: "Despachada",
  EM_TRANSITO: "Em trânsito",
  ENTREGUE: "Entregue",
  FATURADA: "Faturada",
  FATURADA_PARCIAL: "Faturada parcial",
  FATURADA_COMPLETA: "Faturada completa",
  CANCELADA: "Cancelada",
  CANCELADO: "Cancelado",
};

export interface CalendarLoad {
  id: string;
  tenantId?: string;
  name?: string;
  routeName?: string;
  shift?: string;
  scheduledDate?: string;
  departureDate?: string;
  status?: string;
  stagingLocation?: string;
  notes?: string;
  driverName?: string;
  vehiclePlate?: string;
  orderIds?: Array<number | string>;
  orderQuantities?: Record<string, number>;
}

export interface CalendarOrder {
  id?: number | string;
  orderCode?: string;
  customerName?: string;
  totalQuantity?: number;
}

export interface GoogleCalendarEventResource {
  id: string;
  summary: string;
  description: string;
  location?: string;
  start: { date: string };
  end: { date: string };
  status: "confirmed";
  visibility: "private";
  transparency: "transparent";
  extendedProperties: {
    private: Record<string, string>;
  };
}

function normalizeDateOnly(value: unknown): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const dateKey = raw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return "";
  const parts = dateKey.split("-").map(Number);
  const parsed = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  if (
    parsed.getUTCFullYear() !== parts[0] ||
    parsed.getUTCMonth() !== parts[1] - 1 ||
    parsed.getUTCDate() !== parts[2]
  ) return "";
  return dateKey;
}

export function getCalendarDateKey(now = new Date(), timeZone = CALENDAR_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return String(values.year) + "-" + String(values.month) + "-" + String(values.day);
}

export function getCargaDate(carga: CalendarLoad): string {
  return normalizeDateOnly(carga.scheduledDate || carga.departureDate);
}

export function isCargaEligibleForCalendar(
  carga: CalendarLoad,
  tenantId: string,
  today: string,
): boolean {
  const loadDate = getCargaDate(carga);
  const validToday = normalizeDateOnly(today);
  const status = String(carga.status || "").trim().toUpperCase();
  return (
    carga.tenantId === tenantId &&
    Boolean(loadDate) &&
    Boolean(validToday) &&
    loadDate >= validToday &&
    !FINAL_LOAD_STATUSES.has(status)
  );
}

export function addOneCalendarDay(dateKey: string): string {
  const validDate = normalizeDateOnly(dateKey);
  if (!validDate) throw new Error("INVALID_CALENDAR_DATE");
  const [year, month, day] = validDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

export function googleCalendarEventId(tenantId: string, cargaId: string): string {
  return createHash("sha256")
    .update(String(tenantId) + ":" + String(cargaId))
    .digest("hex");
}

function displayDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-");
  return day + "/" + month + "/" + year;
}

function cleanText(value: unknown, maxLength = 500): string {
  return String(value || "").trim().slice(0, maxLength);
}

function displayQuantity(value: unknown): string {
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity <= 0) return "";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(quantity);
}

export function buildCalendarEvent(
  carga: CalendarLoad,
  tenantId: string,
  ordersById: ReadonlyMap<number, CalendarOrder>,
): GoogleCalendarEventResource {
  const loadDate = getCargaDate(carga);
  if (!loadDate || carga.tenantId !== tenantId) throw new Error("CARGA_FORA_DO_TENANT_OU_SEM_DATA");

  const routeName = cleanText(carga.routeName || carga.name || ("Carga " + carga.id), 120);
  const shift = carga.shift === "MANHA" ? "Manhã" : carga.shift === "TARDE" ? "Tarde" : "";
  const title = ("Carga · " + routeName + (shift ? " · " + shift : "")).slice(0, 250);
  const status = String(carga.status || "").trim().toUpperCase();
  const lines: string[] = [
    "Rota: " + routeName,
    "Data de carregamento: " + displayDate(loadDate),
    "Turno: " + (shift || "Não informado"),
    "Status no ApontaPRO: " + (STATUS_LABELS[status] || status || "Não informado"),
  ];

  const stagingLocation = cleanText(carga.stagingLocation, 300);
  const driverName = cleanText(carga.driverName, 120);
  const vehiclePlate = cleanText(carga.vehiclePlate, 40);
  const notes = cleanText(carga.notes, 2000);
  if (stagingLocation) lines.push("Local de saída: " + stagingLocation);
  if (driverName) lines.push("Motorista: " + driverName);
  if (vehiclePlate) lines.push("Veículo: " + vehiclePlate);

  const orderIds = Array.isArray(carga.orderIds) ? carga.orderIds : [];
  if (orderIds.length) {
    lines.push("", "Pedidos vinculados:");
    orderIds.slice(0, 100).forEach((rawId) => {
      const orderId = Number(rawId);
      if (!Number.isFinite(orderId)) return;
      const order = ordersById.get(orderId);
      const code = cleanText(order?.orderCode || ("Pedido " + orderId), 80);
      const customer = cleanText(order?.customerName, 160);
      const quantity = displayQuantity(carga.orderQuantities?.[String(orderId)]);
      const details = [code, customer, quantity ? quantity + " un." : ""].filter(Boolean).join(" — ");
      lines.push("• " + details);
    });
    if (orderIds.length > 100) lines.push("• Mais " + (orderIds.length - 100) + " pedido(s) vinculados.");
  }

  if (notes) lines.push("", "Observações: " + notes);
  lines.push("", "Evento sincronizado pelo ApontaPRO.");
  const description = lines.join("\n").slice(0, 8000);
  const eventId = googleCalendarEventId(tenantId, carga.id);

  return {
    id: eventId,
    summary: title,
    description,
    ...(stagingLocation ? { location: stagingLocation } : {}),
    start: { date: loadDate },
    end: { date: addOneCalendarDay(loadDate) },
    status: "confirmed",
    visibility: "private",
    transparency: "transparent",
    extendedProperties: {
      private: {
        apontaProTenantId: tenantId,
        apontaProCargaId: carga.id,
        apontaProSource: "ApontaPRO",
      },
    },
  };
}
