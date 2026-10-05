import crypto from "node:crypto";
import { createRequire } from "node:module";
import { getApps, initializeApp } from "firebase/app";
import { collection, documentId, getDocs, initializeFirestore, query, where } from "firebase/firestore";
import { processOrderImport } from "./_lib/orderImportCore.js";
import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";

const TENANT_ID = "imperio";
const TOKEN_SHA256 = "4be474369647357dc976243f917be3c60b474e50eb33952db5b3fde336ab78f0";
const ALLOWED_CODES = new Set(["68199","68214","68220","68230","68231","68232","68233","68234","68235","68238","68239","68240","68241"]);

function authorized(req: any): boolean {
  const match = String(req.headers?.authorization || "").match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  const supplied = crypto.createHash("sha256").update(match[1].trim()).digest();
  const expected = Buffer.from(TOKEN_SHA256, "hex");
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

function verifyDb() {
  const require = createRequire(import.meta.url);
  const config = require("../firebase-applet-config.json");
  const appName = "temporary-order-verify-86a99e894d56";
  const app = getApps().find((item) => item.name === appName) || initializeApp({
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    storageBucket: config.storageBucket,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId,
  }, appName);
  return initializeFirestore(app, { experimentalForceLongPolling: true }, config.firestoreDatabaseId);
}

export default async function handler(req: any, res: any) {
  if (!authorized(req)) return res.status(401).json({ sucesso: false, erro: "NAO_AUTORIZADO" });

  if (req.method === "GET") {
    const codes = String(req.query?.codes || "").split(",").map((code) => code.trim()).filter(Boolean);
    if (!codes.length || codes.length > 13 || codes.some((code) => !ALLOWED_CODES.has(code))) {
      return res.status(400).json({ sucesso: false, erro: "CODIGOS_INVALIDOS" });
    }
    try {
      const db = verifyDb();
      const ordersSnapshot = await getDocs(query(collection(db, "orders"), where("orderCode", "in", codes)));
      const rows = ordersSnapshot.docs
        .map((doc) => ({ docId: doc.id, ...doc.data() } as any))
        .filter((row) => String(row.tenantId || "imperio") === TENANT_ID);
      const itemIds = [...new Set(rows.map((row) => String(row.itemId)).filter(Boolean))];
      const itemsSnapshot = itemIds.length
        ? await getDocs(query(collection(db, "items"), where(documentId(), "in", itemIds)))
        : null;
      const items = new Map((itemsSnapshot?.docs || []).map((doc) => [doc.id, doc.data() as any]));
      return res.status(200).json(rows.map((row) => {
        const item = items.get(String(row.itemId)) || {};
        return {
          docId: row.docId,
          id: row.id,
          tenantId: row.tenantId || "imperio",
          orderCode: row.orderCode,
          customerId: row.customerId,
          customerName: row.customerName || "",
          itemId: row.itemId,
          itemCode: item.code || "",
          itemName: item.name || "",
          originalProductCode: row.originalProductCode || "",
          color: row.color || "",
          size: row.size || "",
          variation: row.variation || "",
          totalQuantity: row.totalQuantity,
          unitPrice: row.unitPrice,
          discountPercent: row.discountPercent,
          discountAmount: row.discountAmount,
          paymentCondition: row.paymentCondition || "",
          paymentTerms: row.paymentTerms || "",
          paymentTermsDays: row.paymentTermsDays || [],
          fiscalType: row.fiscalType || "",
          deliveryDate: row.deliveryDate || "",
          hasRET: Boolean(row.hasRET),
          representativeName: row.representativeName || "",
          status: row.status || "",
          isActive: row.isActive !== false,
          itemNotes: row.itemNotes || "",
          notes: row.notes || "",
        };
      }));
    } catch {
      return res.status(500).json({ sucesso: false, erro: "ERRO_LEITURA" });
    }
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ sucesso: false, erro: "METHOD_NOT_ALLOWED" });
  }

  const payload = req.body && typeof req.body === "object" ? req.body : {};
  if (payload.tenantId && String(payload.tenantId) !== TENANT_ID) {
    return res.status(400).json({ sucesso: false, erro: "TENANT_INVALIDO" });
  }
  const pedidos = Array.isArray(payload.pedidos) ? payload.pedidos : [];
  if (!pedidos.length || pedidos.length > 13 || pedidos.some((order: any) => !ALLOWED_CODES.has(String(order?.codigoPedido || "").trim()))) {
    return res.status(400).json({ sucesso: false, erro: "PEDIDOS_INVALIDOS" });
  }

  try {
    const normalizedPayload = {
      ...payload,
      origem: "CHATGPT_GOOGLE_DRIVE_PDF_PEDIDOS_05_OUT_2026",
      tenantId: TENANT_ID,
      solicitadoPor: "raul",
    };
    const meta = { tenantId: TENANT_ID, origem: normalizedPayload.origem, solicitadoPor: normalizedPayload.solicitadoPor, now: new Date() };
    const repository = new FirestoreOrderImportRepository();
    const dryRun = String(req.query?.dryRun || "").toLowerCase() === "true";
    const result = await processOrderImport(repository, normalizedPayload as any, meta, dryRun);
    return res.status(result.resumo.comErro > 0 ? 207 : 200).json(result);
  } catch {
    return res.status(500).json({ sucesso: false, erro: "ERRO_INTERNO" });
  }
}
