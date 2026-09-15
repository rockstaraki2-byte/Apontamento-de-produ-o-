import { createRequire } from "node:module";
import { getApps, initializeApp } from "firebase/app";
import { collection, getDocs, initializeFirestore } from "firebase/firestore";

const TOKEN = "sep15-1520-7c6f9d8a3b2149f0aee4c2c7d4b8f6a1";
const require = createRequire(import.meta.url);
const firebaseConfigFile = require("../firebase-applet-config.json") as {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  firestoreDatabaseId?: string;
};
const APP_NAME = "tmp-billing-20260915-1520-check";
const app = getApps().find((a) => a.name === APP_NAME) || initializeApp({
  apiKey: firebaseConfigFile.apiKey,
  authDomain: firebaseConfigFile.authDomain,
  projectId: firebaseConfigFile.projectId,
  storageBucket: firebaseConfigFile.storageBucket,
  messagingSenderId: firebaseConfigFile.messagingSenderId,
  appId: firebaseConfigFile.appId,
}, APP_NAME);
const db = initializeFirestore(app, { experimentalForceLongPolling: true }, firebaseConfigFile.firestoreDatabaseId);

function tenantMatches(value: any) {
  return String(value?.tenantId || "imperio") === "imperio";
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ error: "method" });
  if (String(req.query?.token || "") !== TOKEN) return res.status(404).json({ error: "not_found" });

  const [ordersSnap, itemsSnap] = await Promise.all([
    getDocs(collection(db, "orders")),
    getDocs(collection(db, "items")),
  ]);
  const ordersAll = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() as any })).filter(tenantMatches);
  const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() as any })).filter(tenantMatches);
  const itemMap = new Map(items.map((item: any) => [String(item.id), item]));
  const codes = ["66848","67451","67108","67455","66959","67279","66458","65025","67042"];
  const orders: Record<string, any[]> = {};
  for (const code of codes) {
    orders[code] = ordersAll
      .filter((o: any) => String(o.orderCode).trim() === code)
      .map((o: any) => {
        const item: any = itemMap.get(String(o.itemId));
        return {
          id:o.id, orderCode:o.orderCode, customerName:o.customerName, customerId:o.customerId??null,
          itemId:o.itemId, itemCode:item?.code??null, itemName:item?.name??o.customProductName??null,
          color:o.color??"-", size:o.size??"-", variation:o.variation??"-",
          totalQuantity:o.totalQuantity, invoicedQuantity:o.invoicedQuantity??0,
          status:o.status??null, isActive:o.isActive??null,
          unitPrice:o.unitPrice??null, discountPercent:o.discountPercent??null,
          fiscalType:o.fiscalType??null, representativeName:o.representativeName??null,
          paymentCondition:o.paymentCondition??null, paymentTermsDays:o.paymentTermsDays??null,
        };
      });
  }

  const catalogCodes = ["1848","937","4233","5448"];
  const catalog: Record<string, any[]> = {};
  for (const code of catalogCodes) {
    catalog[code] = items
      .filter((item: any) => String(item.code ?? item.id).trim() === code || String(item.code ?? "").startsWith(`${code}.`))
      .map((item: any) => ({ id:item.id, code:item.code, name:item.name, productionPoints:item.productionPoints??null, basePrice:item.basePrice??null }));
  }

  return res.status(200).json({ ok:true, orders, catalog });
}

// Temporary endpoint; remove immediately after this billing reconciliation.
