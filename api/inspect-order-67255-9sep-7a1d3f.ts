import { createRequire } from "node:module";
import { getApps, initializeApp } from "firebase/app";
import { collection, getDocs, initializeFirestore, query, where } from "firebase/firestore";

const require = createRequire(import.meta.url);
const cfg = require("../firebase-applet-config.json");
const appName = "inspect-order-67255";
const app = getApps().find((a) => a.name === appName) || initializeApp({
  apiKey: cfg.apiKey,
  authDomain: cfg.authDomain,
  projectId: cfg.projectId,
  storageBucket: cfg.storageBucket,
  messagingSenderId: cfg.messagingSenderId,
  appId: cfg.appId,
}, appName);
const db = initializeFirestore(app, { experimentalForceLongPolling: true }, cfg.firestoreDatabaseId);

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ ok: false });
  const snap = await getDocs(query(collection(db, "orders"), where("orderCode", "==", "67255")));
  const orders = snap.docs.map((d) => ({ docId: d.id, ...d.data() })).filter((o: any) => String(o.tenantId || "imperio") === "imperio");
  return res.status(200).json({ orders: orders.map((o: any) => ({
    docId: o.docId,
    id: o.id,
    orderCode: o.orderCode,
    customerId: o.customerId,
    customerName: o.customerName,
    representativeId: o.representativeId,
    representativeName: o.representativeName,
    itemId: o.itemId,
    totalQuantity: o.totalQuantity,
    unitPrice: o.unitPrice,
    paymentCondition: o.paymentCondition,
    paymentTerms: o.paymentTerms,
    paymentTermsDays: o.paymentTermsDays,
    fiscalType: o.fiscalType,
    deliveryDate: o.deliveryDate,
    status: o.status,
    createdAt: o.createdAt,
  })) });
}
