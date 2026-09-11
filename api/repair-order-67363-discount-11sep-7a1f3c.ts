import { createRequire } from "node:module";
import { getApps, initializeApp } from "firebase/app";
import { doc, getDoc, initializeFirestore, setDoc } from "firebase/firestore";

const require = createRequire(import.meta.url);
const config = require("../firebase-applet-config.json") as any;
const appName = "repair-order-67363-11sep";
const app = getApps().find((a) => a.name === appName) || initializeApp({
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
}, appName);
const db = initializeFirestore(app, { experimentalForceLongPolling: true }, config.firestoreDatabaseId);

const ORDER_ID = "7328350678566566";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, erro: "Método não permitido." });
  const ref = doc(db, "orders", ORDER_ID);
  const snap = await getDoc(ref);
  if (!snap.exists()) return res.status(404).json({ ok: false, erro: "Pedido não encontrado." });
  const before: any = snap.data();
  if (String(before.tenantId) !== "imperio" || String(before.orderCode) !== "67363") {
    return res.status(409).json({ ok: false, erro: "Registro não corresponde ao pedido esperado." });
  }
  await setDoc(ref, {
    discountAmount: 1.04,
    discountAmountScaled: 10400,
    netTotalScaled: 196600,
  }, { merge: true });
  return res.status(200).json({
    ok: true,
    orderId: ORDER_ID,
    before: {
      discountAmount: before.discountAmount,
      discountAmountScaled: before.discountAmountScaled,
      netTotalScaled: before.netTotalScaled,
    },
    after: { discountAmount: 1.04, discountAmountScaled: 10400, netTotalScaled: 196600 },
  });
}
