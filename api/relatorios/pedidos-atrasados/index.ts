import crypto from "node:crypto";
import { createRequire } from "node:module";
import { getApps, initializeApp } from "firebase/app";
import { collection, getDocs, initializeFirestore } from "firebase/firestore";

const require = createRequire(import.meta.url);
const firebaseConfigFile = require("../../../firebase-applet-config.json") as {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  firestoreDatabaseId?: string;
};

const APP_NAME = "overdue-orders-report-api";
// Hash SHA-256 de uma chave exclusiva da rotina de leitura. A chave em texto
// puro nunca é versionada no repositório.
const REPORT_TOKEN_SHA256 = "438e86d265406e36170c2b192b26a411ea73624839754fa885d1664576e92afc";

const firebaseApp =
  getApps().find((app) => app.name === APP_NAME) ||
  initializeApp(
    {
      apiKey: firebaseConfigFile.apiKey,
      authDomain: firebaseConfigFile.authDomain,
      projectId: firebaseConfigFile.projectId,
      storageBucket: firebaseConfigFile.storageBucket,
      messagingSenderId: firebaseConfigFile.messagingSenderId,
      appId: firebaseConfigFile.appId,
    },
    APP_NAME,
  );

const db = initializeFirestore(
  firebaseApp,
  { experimentalForceLongPolling: true },
  firebaseConfigFile.firestoreDatabaseId,
);

const DAY_MS = 24 * 60 * 60 * 1000;
const SAO_PAULO_TZ = "America/Sao_Paulo";

function tenantMatches(value: any, tenantId: string): boolean {
  return String(value?.tenantId || "imperio") === tenantId;
}

function getAccessToken(req: any): string {
  const header = String(req.headers?.authorization || "");
  const bearerMatch = header.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch) return bearerMatch[1].trim();

  // Query-token support exists specifically for read-only schedulers that cannot
  // attach Authorization headers. Prefer Bearer auth whenever possible.
  return String(req.query?.token || "").trim();
}

function secureEquals(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function isAuthorized(req: any): boolean {
  const providedToken = getAccessToken(req);
  if (!providedToken) return false;

  const envToken =
    process.env.ORDER_REPORT_API_TOKEN ||
    process.env.INTEGRATION_TOKEN ||
    process.env.ORDER_IMPORT_API_TOKEN;

  if (envToken) return secureEquals(providedToken, envToken);

  const providedHash = crypto.createHash("sha256").update(providedToken).digest("hex");
  return secureEquals(providedHash, REPORT_TOKEN_SHA256);
}

function dateKeyInTimeZone(now = new Date(), timeZone = SAO_PAULO_TZ): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dateOnlyToUtcMs(value: unknown): number | null {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return Date.UTC(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
}

function positiveNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function clampLimit(value: unknown): number {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed)) return 10;
  return Math.min(50, Math.max(1, parsed));
}

function displayProductName(order: any, itemById: Map<number, any>): string {
  const item = itemById.get(Number(order.itemId));
  return String(
    order.customProductName ||
      item?.name ||
      order.originalProductCode ||
      `Item ${order.itemId || "sem código"}`,
  ).trim();
}

function displayProductCode(order: any, itemById: Map<number, any>): string {
  const item = itemById.get(Number(order.itemId));
  return String(item?.code || order.originalProductCode || "").trim();
}

function lineProgress(order: any) {
  const totalQuantity = positiveNumber(order.totalQuantity);
  const status = String(order.status || "PENDENTE").toUpperCase();
  const packedQuantity = Math.min(totalQuantity, positiveNumber(order.packedQuantity));
  const invoicedQuantity = Math.min(totalQuantity, positiveNumber(order.invoicedQuantity));

  const packedComplete = status === "EMBALADO" || packedQuantity >= totalQuantity;
  const invoicedComplete = status === "FATURADO" || invoicedQuantity >= totalQuantity;

  const pendingPackaging = packedComplete ? 0 : Math.max(0, totalQuantity - packedQuantity);
  const pendingBilling = invoicedComplete ? 0 : Math.max(0, totalQuantity - invoicedQuantity);

  return {
    totalQuantity,
    packedQuantity: packedComplete ? totalQuantity : packedQuantity,
    invoicedQuantity: invoicedComplete ? totalQuantity : invoicedQuantity,
    pendingPackaging,
    pendingBilling,
    openQuantity: Math.max(pendingPackaging, pendingBilling),
    packedComplete,
    invoicedComplete,
  };
}

function summarizeOrderStatus(lines: any[]): string {
  const progress = lines.map(lineProgress);
  const allPacked = progress.every((p) => p.packedComplete);
  const allInvoiced = progress.every((p) => p.invoicedComplete);
  const anyPacked = progress.some((p) => p.packedQuantity > 0);
  const anyInvoiced = progress.some((p) => p.invoicedQuantity > 0);

  if (allPacked && allInvoiced) return "EMBALADO_E_FATURADO";
  if (allPacked && !allInvoiced) return anyInvoiced ? "EMBALADO_FATURAMENTO_PARCIAL" : "EMBALADO_NAO_FATURADO";
  if (!allPacked && allInvoiced) return anyPacked ? "FATURADO_EMBALAGEM_PARCIAL" : "FATURADO_NAO_EMBALADO";
  if (anyPacked && anyInvoiced) return "EMBALAGEM_E_FATURAMENTO_PARCIAIS";
  if (anyPacked) return "EMBALAGEM_PARCIAL_NAO_FATURADO";
  if (anyInvoiced) return "NAO_EMBALADO_FATURAMENTO_PARCIAL";
  return "NAO_EMBALADO_NAO_FATURADO";
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ sucesso: false, erro: "METHOD_NOT_ALLOWED" });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ sucesso: false, erro: "NAO_AUTORIZADO" });
  }

  const tenantId = String(req.query?.tenantId || req.headers?.["x-tenant-id"] || "imperio").trim() || "imperio";
  const limit = clampLimit(req.query?.limit);
  const dateBase = String(req.query?.date || dateKeyInTimeZone()).trim();
  const todayUtcMs = dateOnlyToUtcMs(dateBase);

  if (todayUtcMs === null) {
    return res.status(400).json({
      sucesso: false,
      erro: "DATA_INVALIDA",
      mensagem: "Use o parâmetro date no formato YYYY-MM-DD.",
    });
  }

  try {
    const [ordersSnap, itemsSnap] = await Promise.all([
      getDocs(collection(db, "orders")),
      getDocs(collection(db, "items")),
    ]);

    const itemById = new Map<number, any>();
    itemsSnap.docs.forEach((docSnap) => {
      const item = { id: Number(docSnap.id), ...docSnap.data() } as any;
      if (tenantMatches(item, tenantId)) itemById.set(Number(item.id), item);
    });

    const eligibleLines = ordersSnap.docs
      .map((docSnap) => ({ id: Number(docSnap.id), ...docSnap.data() } as any))
      .filter((order) => tenantMatches(order, tenantId))
      .filter((order) => order.isActive !== false)
      .filter((order) => String(order.status || "").toUpperCase() !== "CANCELADO")
      .map((order) => {
        const deliveryUtcMs = dateOnlyToUtcMs(order.deliveryDate);
        if (deliveryUtcMs === null) return null;
        const daysLate = Math.floor((todayUtcMs - deliveryUtcMs) / DAY_MS);
        if (daysLate <= 0) return null;
        return { ...order, deliveryUtcMs, daysLate };
      })
      .filter(Boolean) as any[];

    const grouped = new Map<string, any[]>();
    eligibleLines.forEach((order) => {
      const orderCode = String(order.orderCode || order.id || "SEM_CODIGO").trim();
      const list = grouped.get(orderCode) || [];
      list.push(order);
      grouped.set(orderCode, list);
    });

    const report = Array.from(grouped.entries())
      .map(([orderCode, lines]) => {
        const productLines = lines
          .map((line) => ({ line, progress: lineProgress(line) }))
          .filter(({ progress }) => !(progress.packedComplete && progress.invoicedComplete));

        if (productLines.length === 0) return null;

        const earliestDelivery = Math.min(...lines.map((line) => Number(line.deliveryUtcMs)));
        const daysLate = Math.floor((todayUtcMs - earliestDelivery) / DAY_MS);
        const customerName = String(lines.find((line) => line.customerName)?.customerName || "").trim();

        return {
          pedido: orderCode,
          cliente: customerName,
          dataEntrega: new Date(earliestDelivery).toISOString().slice(0, 10),
          diasAtraso: daysLate,
          status: summarizeOrderStatus(lines),
          produtos: productLines.map(({ line, progress }) => ({
            codigo: displayProductCode(line, itemById),
            descricao: displayProductName(line, itemById),
            cor: String(line.color || "").trim(),
            tamanho: String(line.size || "").trim(),
            variacao: String(line.variation || "").trim(),
            quantidadePedido: progress.totalQuantity,
            quantidadeEmbalada: progress.packedQuantity,
            quantidadeFaturada: progress.invoicedQuantity,
            quantidadePendenteEmbalagem: progress.pendingPackaging,
            quantidadePendenteFaturamento: progress.pendingBilling,
            quantidadeEmAberto: progress.openQuantity,
            statusLinha: String(line.status || "PENDENTE"),
          })),
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.diasAtraso - a.diasAtraso || String(a.pedido).localeCompare(String(b.pedido)))
      .slice(0, limit);

    return res.status(200).json({
      sucesso: true,
      tenantId,
      dataBase: dateBase,
      geradoEm: new Date().toISOString(),
      quantidade: report.length,
      pedidos: report,
    });
  } catch (error: any) {
    console.error("[Overdue Orders Report API]", error);
    return res.status(500).json({
      sucesso: false,
      erro: "ERRO_INTERNO",
      mensagem: error?.message || "Erro interno ao consultar pedidos atrasados.",
    });
  }
}
