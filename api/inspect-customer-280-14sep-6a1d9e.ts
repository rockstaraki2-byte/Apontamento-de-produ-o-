import { createRequire } from "node:module";
import { getApps, initializeApp } from "firebase/app";
import { collection, doc, getDoc, getDocs, initializeFirestore, query, where } from "firebase/firestore";

const require = createRequire(import.meta.url);
const config = require("../firebase-applet-config.json") as any;
const appName = "inspect-customer-280-14sep";
const app = getApps().find((a) => a.name === appName) || initializeApp({
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
}, appName);
const db = initializeFirestore(app, { experimentalForceLongPolling: true }, config.firestoreDatabaseId);

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, erro: "Método não permitido." });

  const customerSnap = await getDoc(doc(db, "customers", "280"));
  const ordersSnap = await getDocs(query(collection(db, "orders"), where("tenantId", "==", "imperio")));
  const orders = ordersSnap.docs
    .map((d) => ({ id: d.id, ...d.data() } as any))
    .filter((o) => String(o.customerId) === "280" || String(o.customerName || "").toUpperCase().includes("BARBOSA METALURGIA"))
    .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0))
    .slice(0, 10)
    .map((o) => ({
      id: o.id,
      orderCode: o.orderCode,
      customerId: o.customerId,
      customerName: o.customerName,
      paymentCondition: o.paymentCondition,
      paymentTerms: o.paymentTerms,
      paymentTermsDays: o.paymentTermsDays,
      representativeId: o.representativeId,
      representativeName: o.representativeName,
      deliveryDate: o.deliveryDate,
      fiscalType: o.fiscalType,
      createdAt: o.createdAt,
      status: o.status,
    }));

  return res.status(200).json({
    ok: true,
    customer: customerSnap.exists() ? { id: customerSnap.id, ...customerSnap.data() } : null,
    recentOrders: orders,
  });
}
