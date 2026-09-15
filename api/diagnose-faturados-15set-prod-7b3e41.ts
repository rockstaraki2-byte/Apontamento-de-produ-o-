import { createRequire } from "node:module";
import { getApps, initializeApp } from "firebase/app";
import { collection, getDocs, initializeFirestore } from "firebase/firestore";

const require = createRequire(import.meta.url);
const config = require("../firebase-applet-config.json") as any;
const appName = "diag-faturados-15set-prod";
const app = getApps().find((a) => a.name === appName) || initializeApp({
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
}, appName);
const db = initializeFirestore(app, { experimentalForceLongPolling: true }, config.firestoreDatabaseId);

const ORDER_CODES = [
  "67383","66972","67106","67388","67082","67336","66962","66959","67028","67083",
  "67230","66957","67079","67192","67398","66174","66961","66850","67422","67415",
  "67431","65025","67009","67430","66667","66715","66679","66571","67328","67424",
  "67234","67425","67440"
];

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  const tenantId = "imperio";
  const [ordersSnap, itemsSnap] = await Promise.all([
    getDocs(collection(db, "orders")),
    getDocs(collection(db, "items")),
  ]);
  const tenantMatches = (row: any) => String(row?.tenantId || "imperio") === tenantId;
  const items = itemsSnap.docs.map((d) => ({ id: Number(d.id) || d.id, ...d.data() } as any)).filter(tenantMatches);
  const itemMap = new Map(items.map((item: any) => [String(item.id), item]));
  const wanted = new Set(ORDER_CODES);
  const rows = ordersSnap.docs
    .map((d) => ({ id: Number(d.id), ...d.data() } as any))
    .filter((o) => Number.isFinite(o.id) && tenantMatches(o) && wanted.has(String(o.orderCode || "").trim()))
    .map((order: any) => {
      const item: any = itemMap.get(String(order.itemId));
      const total = Number(order.totalQuantity || 0);
      const invoiced = Number(order.invoicedQuantity || 0);
      return {
        id: order.id,
        orderCode: String(order.orderCode || ""),
        customerName: order.customerName || "",
        itemId: order.itemId,
        itemCode: String(item?.code || ""),
        itemName: String(item?.name || order.customProductName || ""),
        originalProductCode: String(order.originalProductCode || ""),
        color: order.color || "",
        totalQuantity: total,
        invoicedQuantity: invoiced,
        remainingQuantity: Math.max(0, total - invoiced),
        status: order.status || "",
        isActive: order.isActive,
      };
    })
    .sort((a, b) => a.orderCode.localeCompare(b.orderCode) || a.id - b.id);
  const byCode: Record<string, any[]> = {};
  for (const code of ORDER_CODES) byCode[code] = rows.filter((r) => r.orderCode === code);
  const missingOrderCodes = ORDER_CODES.filter((code) => byCode[code].length === 0);
  return res.status(200).json({ ok: true, tenantId, missingOrderCodes, byCode });
}
