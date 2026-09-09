import { createRequire } from "node:module";
import { getApps, initializeApp } from "firebase/app";
import {
  doc,
  getDoc,
  initializeFirestore,
  updateDoc,
} from "firebase/firestore";

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

const APP_NAME = "order-67231-repair-api";
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

const ORDER_ID = "7327572126946971";
const ORDER_CODE = "67231";
const TENANT_ID = "imperio";
const REPRESENTATIVE_ID = "representante_kesse";
const REPRESENTATIVE_NAME = "Kesse Representante";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ sucesso: false, erro: "METHOD_NOT_ALLOWED" });
  }

  try {
    const ref = doc(db, "orders", ORDER_ID);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return res.status(404).json({ sucesso: false, erro: "PEDIDO_NAO_ENCONTRADO" });
    }

    const before = snap.data() || {};
    if (String(before.tenantId || "") !== TENANT_ID || String(before.orderCode || "") !== ORDER_CODE) {
      return res.status(409).json({
        sucesso: false,
        erro: "PEDIDO_DIVERGENTE",
        encontrado: {
          tenantId: before.tenantId || null,
          orderCode: before.orderCode || null,
        },
      });
    }

    const oldNotes = String(before.notes || "");
    const notes = oldNotes
      .replace(
        "Consultor TekSystem: KESSE (sem usuário representante correspondente no sistema)",
        "Consultor TekSystem: KESSE",
      )
      .trim();

    await updateDoc(ref, {
      representativeId: REPRESENTATIVE_ID,
      representativeName: REPRESENTATIVE_NAME,
      ...(notes !== oldNotes ? { notes } : {}),
    });

    const afterSnap = await getDoc(ref);
    const after = afterSnap.data() || {};

    return res.status(200).json({
      sucesso: true,
      orderId: ORDER_ID,
      orderCode: after.orderCode,
      tenantId: after.tenantId,
      before: {
        representativeId: before.representativeId || "",
        representativeName: before.representativeName || "",
        notes: before.notes || "",
      },
      after: {
        representativeId: after.representativeId || "",
        representativeName: after.representativeName || "",
        notes: after.notes || "",
      },
    });
  } catch (error: any) {
    console.error("[repair order 67231]", error);
    return res.status(500).json({ sucesso: false, erro: error?.message || "ERRO_INTERNO" });
  }
}
