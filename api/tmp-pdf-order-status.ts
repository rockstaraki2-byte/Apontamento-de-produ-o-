import { createRequire } from "node:module";
import { getApps, initializeApp } from "firebase/app";
import { collection, getDocs, initializeFirestore } from "firebase/firestore";

const require = createRequire(import.meta.url);
const cfg = require("../firebase-applet-config.json");

const APP_NAME = "tmp-pdf-order-status";
const app =
  getApps().find((candidate) => candidate.name === APP_NAME) ||
  initializeApp(
    {
      apiKey: cfg.apiKey,
      authDomain: cfg.authDomain,
      projectId: cfg.projectId,
      storageBucket: cfg.storageBucket,
      messagingSenderId: cfg.messagingSenderId,
      appId: cfg.appId,
    },
    APP_NAME,
  );

const db = initializeFirestore(
  app,
  { experimentalForceLongPolling: true },
  cfg.firestoreDatabaseId,
);

const TARGET_CODES = new Set([
  "67684","67689","67694","67695","67700",
  "67711","67712","67713","67714","67715","67717"
]);

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  try {
    const snap = await getDocs(collection(db, "orders"));
    const grouped = new Map<string, any[]>();

    for (const docSnap of snap.docs) {
      const data = docSnap.data() || {};
      const code = String(data.orderCode || data.code || "");
      if (!TARGET_CODES.has(code)) continue;
      if (String(data.tenantId || "imperio") !== "imperio") continue;
      const list = grouped.get(code) || [];
      list.push({
        status: data.status || "",
        totalQuantity: Number(data.totalQuantity) || 0,
        invoicedQuantity: Number(data.invoicedQuantity) || 0,
      });
      grouped.set(code, list);
    }

    const result = Array.from(TARGET_CODES).map((code) => {
      const items = grouped.get(code) || [];
      const fullyInvoiced =
        items.length > 0 &&
        items.every((item) =>
          item.status === "FATURADO" ||
          (item.totalQuantity > 0 && item.invoicedQuantity >= item.totalQuantity)
        );
      return {
        pedido: code,
        encontrado: items.length > 0,
        totalmenteFaturado: fullyInvoiced,
        itens: items.length,
      };
    });

    res.status(200).json({ result });
  } catch (error: any) {
    console.error("[tmp-pdf-order-status]", error);
    res.status(500).json({ error: error?.message || String(error) });
  }
}
