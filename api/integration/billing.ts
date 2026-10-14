import { timingSafeEqual } from "node:crypto";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../src/firebase.ts";

type FinanceOrder = {
  deliveryDate?: number | string | Date | null;
  totalQuantity?: number | string;
  invoicedQuantity?: number | string;
  unitPrice?: number | string;
  isActive?: boolean;
  status?: string;
};

const LEGACY_JULY_BILLING = 169194.69;
const OVERRIDDEN_JULY_START = "2026-07-01";
const OVERRIDDEN_JULY_END = "2026-07-07";

function formatBusinessDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";
  return year && month && day ? year + "-" + month + "-" + day : "";
}

function getLocalDateString(value: FinanceOrder["deliveryDate"]): string {
  if (!value) return "";
  if (value instanceof Date) return formatBusinessDate(value);

  if (typeof value === "number") {
    return formatBusinessDate(new Date(value));
  }

  if (typeof value === "string") {
    const cleaned = value.trim();
    if (!cleaned) return "";

    if (/^\d+$/.test(cleaned)) {
      return formatBusinessDate(new Date(Number.parseInt(cleaned, 10)));
    }

    if (cleaned.includes("/")) {
      const parts = cleaned.split(" ")[0].split("/");
      if (parts.length === 3) {
        return parts[2] + "-" + parts[1].padStart(2, "0") + "-" + parts[0].padStart(2, "0");
      }
    }

    if (cleaned.includes("-")) {
      const firstPart = cleaned.split("T")[0].split(" ")[0];
      const parts = firstPart.split("-");
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return parts[0] + "-" + parts[1].padStart(2, "0") + "-" + parts[2].padStart(2, "0");
        }
        return parts[2] + "-" + parts[1].padStart(2, "0") + "-" + parts[0].padStart(2, "0");
      }
    }

    const parsed = new Date(cleaned);
    if (Number.isFinite(parsed.getTime())) return formatBusinessDate(parsed);
  }

  return "";
}

function getCurrentBusinessMonth(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  return year && month ? year + "-" + month : "";
}

function toFiniteNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function spreadsheetDateSerial(): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "0";
  const year = Number(part("year"));
  const month = Number(part("month"));
  const day = Number(part("day"));
  const hour = Number(part("hour"));
  const minute = Number(part("minute"));
  const second = Number(part("second"));
  const localMidnight = Date.UTC(year, month - 1, day) / 86400000 + 25569;
  return localMidnight + (hour * 3600 + minute * 60 + second) / 86400;
}

function csvCell(value: string): string {
  return '"' + value.replace(/"/g, '""') + '"';
}

function isAuthorized(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer);
}

function csvResponse(rows: string[][]): Response {
  const body = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    },
  });
}

/**
 * Read-only CSV bridge for the management spreadsheet.
 * It mirrors FinanceiroScreen's effective-billed and active-portfolio cards.
 */
export async function GET(request: Request): Promise<Response> {
  const expectedToken = process.env.APONTAPRO_SHEETS_API_TOKEN || "";
  const url = new URL(request.url);
  const suppliedToken = url.searchParams.get("token") || "";

  if (!expectedToken) {
    return Response.json(
      { error: "Integração ainda não configurada." },
      { status: 503 },
    );
  }
  if (!isAuthorized(suppliedToken, expectedToken)) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const month = url.searchParams.get("month") || getCurrentBusinessMonth();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return Response.json(
      { error: "Informe month no formato YYYY-MM." },
      { status: 400 },
    );
  }

  try {
    const [ordersSnapshot, settingsSnapshot] = await Promise.all([
      getDocs(query(collection(db, "orders"), where("tenantId", "==", "imperio"))),
      getDocs(query(collection(db, "systemSettings"), where("tenantId", "==", "imperio"))),
    ]);

    const financeOrders = ordersSnapshot.docs.map((document) => document.data() as FinanceOrder);
    const systemSettings = settingsSnapshot.docs[0]?.data() || {};

    let totalInvoiced = 0;
    let totalActive = 0;
    let totalExpected = 0;

    for (const order of financeOrders) {
      const deliveryDate = getLocalDateString(order.deliveryDate);
      if (!deliveryDate.startsWith(month)) continue;

      const isOverriddenDate =
        deliveryDate >= OVERRIDDEN_JULY_START &&
        deliveryDate <= OVERRIDDEN_JULY_END;
      const totalQuantity = toFiniteNumber(order.totalQuantity);
      const invoicedQuantity = toFiniteNumber(order.invoicedQuantity);
      const unitPrice = toFiniteNumber(order.unitPrice);
      const invoicedValue = invoicedQuantity * unitPrice;
      const activeQuantity = Math.max(0, totalQuantity - invoicedQuantity);
      const activeValue = activeQuantity * unitPrice;

      if (order.status === "FATURADO") {
        const fullValue = totalQuantity * unitPrice;
        if (!isOverriddenDate) {
          totalInvoiced += fullValue;
          totalExpected += fullValue;
        }
      } else {
        if (!isOverriddenDate) {
          totalInvoiced += invoicedValue;
          totalExpected += invoicedValue;
        }
        if (order.isActive !== false) {
          totalActive += activeValue;
          totalExpected += activeValue;
        }
      }
    }

    if (month === "2026-07") {
      totalInvoiced += LEGACY_JULY_BILLING;
      totalExpected += LEGACY_JULY_BILLING;
    }

    const manualTotalAdjustment = toFiniteNumber(systemSettings.manualTotalAdjustment);
    totalInvoiced += manualTotalAdjustment;
    totalExpected += manualTotalAdjustment;

    const updatedAt = spreadsheetDateSerial();
    return csvResponse([
      ["metrica", "valor", "competencia"],
      ["faturamento_efetivo", totalInvoiced.toFixed(2), month],
      ["carteira_ativa", totalActive.toFixed(2), month],
      ["provisao_total", totalExpected.toFixed(2), month],
      ["atualizado_em", updatedAt.toFixed(8), month],
      ["criterio_mes", "data_de_entrega_do_pedido", month],
    ]);
  } catch (error) {
    console.error("[billing-sheet-sync] Falha ao montar resumo do ApontaPRO:", error);
    return Response.json(
      { error: "Falha ao consultar o resumo financeiro do ApontaPRO." },
      { status: 500 },
    );
  }
}
