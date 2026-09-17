import { createRequire } from "node:module";
import { getApps, initializeApp } from "firebase/app";
import { collection, getDocs, initializeFirestore } from "firebase/firestore";

const require = createRequire(import.meta.url);
const cfg = require("../../firebase-applet-config.json");
const APP = "ops-sep17-1730-check";
const app = getApps().find((a) => a.name === APP) || initializeApp({
  apiKey: cfg.apiKey,
  authDomain: cfg.authDomain,
  projectId: cfg.projectId,
  storageBucket: cfg.storageBucket,
  messagingSenderId: cfg.messagingSenderId,
  appId: cfg.appId,
}, APP);
const db = initializeFirestore(app, { experimentalForceLongPolling: true }, cfg.firestoreDatabaseId);

const ORDER_CODES = new Set(["67520","67109","67484","67521","67483"]);
const tenantMatches = (v:any) => String(v?.tenantId || "imperio") === "imperio";

export default async function handler(req:any, res:any) {
  if (req.method !== "GET") return res.status(405).json({ ok:false });
  if (String(req.query?.key || "") !== "sep17-1730-a93f2c") return res.status(404).send("Not found");
  const [ordersSnap, itemsSnap] = await Promise.all([
    getDocs(collection(db, "orders")),
    getDocs(collection(db, "items")),
  ]);
  const itemMap = new Map(itemsSnap.docs.map((d) => [String(d.id), { id:d.id, ...d.data() } as any]));
  const orders:any = {};
  for (const d of ordersSnap.docs) {
    const row:any = { id:Number(d.id), ...d.data() };
    if (!tenantMatches(row) || !ORDER_CODES.has(String(row.orderCode || ""))) continue;
    const item:any = itemMap.get(String(row.itemId));
    const code = String(item?.code || row.itemId || "");
    const out = {
      id: row.id,
      orderCode: String(row.orderCode || ""),
      customerName: String(row.customerName || ""),
      itemId: Number(row.itemId),
      itemCode: code,
      itemName: String(item?.name || row.customProductName || ""),
      color: String(row.color || ""),
      totalQuantity: Number(row.totalQuantity || 0),
      invoicedQuantity: Number(row.invoicedQuantity || 0),
      status: String(row.status || ""),
      isActive: row.isActive !== false,
    };
    (orders[out.orderCode] ||= []).push(out);
  }
  return res.status(200).json({ ok:true, orders });
}
