import { createRequire } from "node:module";
import { getApps, initializeApp } from "firebase/app";
import { collection, deleteField, doc, getDocs, initializeFirestore, updateDoc } from "firebase/firestore";

const require = createRequire(import.meta.url);
const cfg = require("../firebase-applet-config.json");

const APP_NAME = "tmp-pdf-loja-alias";
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

const TARGET_CODES = new Set(["68096","68097","68098"]);
const BACKUP_FIELD = "__tmpPdfPreviousRepresentativeName";

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  const action = String(req.query?.action || "").toLowerCase();
  if (!["set","restore","inspect"].includes(action)) {
    return res.status(400).json({ sucesso:false, erro:"ACAO_INVALIDA" });
  }

  try {
    const snap = await getDocs(collection(db, "orders"));
    const targets = snap.docs
      .map((d) => ({ id:d.id, ...d.data() } as any))
      .filter((row) => String(row.tenantId || "") === "imperio")
      .filter((row) => TARGET_CODES.has(String(row.orderCode || row.code || "")));

    const result:any[] = [];
    for (const row of targets) {
      const ref = doc(db, "orders", String(row.id));
      if (action === "inspect") {
        result.push({ id:row.id, pedido:String(row.orderCode || row.code || ""), representativeName:row.representativeName || "", backup:row[BACKUP_FIELD] || "" });
        continue;
      }

      if (action === "set") {
        if (!row[BACKUP_FIELD]) {
          await updateDoc(ref, {
            [BACKUP_FIELD]: row.representativeName || "",
            representativeName: "LOJA",
          });
        }
        result.push({ id:row.id, pedido:String(row.orderCode || row.code || ""), status:"alias_aplicado" });
      }

      if (action === "restore") {
        const previous = row[BACKUP_FIELD];
        if (previous !== undefined) {
          await updateDoc(ref, {
            representativeName: previous,
            [BACKUP_FIELD]: deleteField(),
          });
          result.push({ id:row.id, pedido:String(row.orderCode || row.code || ""), status:"restaurado", representativeName:previous });
        }
      }
    }

    return res.status(200).json({ sucesso:true, action, quantidade:targets.length, result });
  } catch (error:any) {
    console.error("[tmp-pdf-loja-alias]", error);
    return res.status(500).json({ sucesso:false, erro:error?.message || String(error) });
  }
}
