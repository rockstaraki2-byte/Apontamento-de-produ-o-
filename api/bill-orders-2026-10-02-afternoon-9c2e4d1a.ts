import { createRequire } from "node:module";
import { getApps, initializeApp } from "firebase/app";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  initializeFirestore,
  setDoc,
} from "firebase/firestore";
import { processOrderImport } from "./_lib/orderImportCore.js";
import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";
import { buildBillingPlan, collectSourceKeys } from "./_lib/billingImportCore.js";
import { FirestoreBillingRepository } from "./_lib/billingImportFirestore.js";

const tenantId = "imperio";
const origem = "CHATGPT_GOOGLE_DRIVE_PDF_FATURADOS_02_OUT_TARDE";
const solicitadoPor = "raul";
const documentKey = "FATURADOS-02-OUT-TARDE-DELTA-2026-10-02";

const morningOrderCodes = [
  "68095","68139","67935","66728","68140","68100","67234","67754",
  "66720","67621","68148","67840","68145","67950"
];

const afternoonDeltaOrderCodes = [
  "67844","67812","67593","67826","68172","67970","67753","68187","68196"
];

const ensureOrder68196: any = {
  origem,
  tenantId,
  solicitadoPor,
  pedidos: [
    {
      codigoPedido: "68196",
      cliente: { codigo: 140, nome: "VANDECI DE FREITAS E CIA LTDA" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      formaPagamento: "CARTEIRA",
      prazos: [14],
      comNotaFiscal: false,
      dataLimite: "2026-10-02",
      observacoes: "Origem: Faturados 02-out tarde; Entrega 68198.",
      itens: [
        {
          codigoOriginal: "5598",
          codigoProduto: "5598",
          descricao: 'CHAPA 1/8" - 200MM X 2000MM',
          familia: "GERENCIAL",
          quantidade: 2,
          precoUnitario: 68,
          descontoPercentual: 0,
        },
        {
          codigoOriginal: "5599",
          codigoProduto: "5599",
          descricao: 'CHAPA 1/8" - 200MM X 2700MM',
          familia: "GERENCIAL",
          quantidade: 4,
          precoUnitario: 91.8,
          descontoPercentual: 0,
        },
      ],
    },
  ],
};

const billingPayload: any = {
  origem,
  tenantId,
  solicitadoPor,
  documentKey,
  allowBreakReservations: false,
  faturamentos: [
    { lineId: "pm-e68171-67844-3128-30", codigoPedido: "67844", itemId: 3128, quantidade: 30, numeroNota: "6409" },
    { lineId: "pm-e68171-67844-3193-20", codigoPedido: "67844", itemId: 2140, quantidade: 20, numeroNota: "6409" },
    { lineId: "pm-e68176-67812-3074-500", codigoPedido: "67812", itemId: 3074, quantidade: 500 },
    { lineId: "pm-e68178-67593-1088-10000", codigoPedido: "67593", itemId: 1088, quantidade: 10000 },
    { lineId: "pm-e68179-67826-1653-10", codigoPedido: "67826", itemId: 1653, quantidade: 10, numeroNota: "6410" },
    { lineId: "pm-e68179-67826-4597-40", codigoPedido: "67826", itemId: 4597, quantidade: 40, numeroNota: "6410" },
    { lineId: "pm-e68179-68172-4597-5", codigoPedido: "68172", itemId: 4597, quantidade: 5, numeroNota: "6410" },
    { lineId: "pm-e68181-67970-1850-56", codigoPedido: "67970", itemId: 1850, quantidade: 56 },
    { lineId: "pm-e68181-67970-3155-1000", codigoPedido: "67970", itemId: 1280, quantidade: 1000 },
    { lineId: "pm-e68185-67753-1519-100", codigoPedido: "67753", itemId: 1519, quantidade: 100 },
    { lineId: "pm-e68185-67753-4809-20", codigoPedido: "67753", itemId: 4809, quantidade: 20 },
    { lineId: "pm-e68189-68187-2517-100", codigoPedido: "68187", itemId: 1779765282668, quantidade: 100 },
    { lineId: "pm-e68198-68196-5598-2", codigoPedido: "68196", itemId: 1790968005598, quantidade: 2 },
    { lineId: "pm-e68198-68196-5599-4", codigoPedido: "68196", itemId: 1790968005599, quantidade: 4 },
  ],
};

const require = createRequire(import.meta.url);
const firebaseConfigFile = require("../firebase-applet-config.json") as any;
const APP_NAME = "ops-billing-2026-10-02-afternoon";
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

async function ensureMissingProductsFor68196() {
  const definitions = [
    { id: 1790968005598, code: "5598", name: 'CHAPA 1/8" - 200MM X 2000MM' },
    { id: 1790968005599, code: "5599", name: 'CHAPA 1/8" - 200MM X 2700MM' },
  ];
  const itemsSnap = await getDocs(collection(db, "items"));
  const existingItems = itemsSnap.docs.map((d) => ({ docId: d.id, ...d.data() } as any));
  const created: any[] = [];
  const existing: any[] = [];

  for (const definition of definitions) {
    const matches = existingItems.filter(
      (item: any) =>
        String(item.tenantId || "imperio") === tenantId &&
        String(item.code || "").trim() === definition.code,
    );
    if (matches.length > 0) {
      existing.push(matches.map((item: any) => ({
        id: item.id ?? item.docId,
        code: item.code,
        name: item.name,
      })));
      continue;
    }

    const ref = doc(db, "items", String(definition.id));
    const before = await getDoc(ref);
    if (!before.exists()) {
      await setDoc(ref, {
        id: definition.id,
        tenantId,
        code: definition.code,
        name: definition.name,
        type: "PRODUTO",
        notes:
          "Cadastro criado a partir do documento Faturados 02-out tarde. Código e descrição confirmados no documento; preço-base não inferido.",
        recoveredAt: Date.now(),
        recoveredReason: "missing_catalog_item_from_verified_billing_document",
      });
    }
    const after = await getDoc(ref);
    if (!after.exists()) throw new Error(`Falha ao criar produto ${definition.code}.`);
    created.push({ id: definition.id, code: definition.code, name: definition.name });
  }

  return { created, existing };
}

async function inspectState() {
  const repo = new FirestoreBillingRepository();
  const snapshot = await repo.loadSnapshot(tenantId);
  const wanted = new Set([...morningOrderCodes, ...afternoonDeltaOrderCodes]);
  const rows = snapshot.orders
    .filter((x: any) => wanted.has(String(x.orderCode || "")))
    .map((x: any) => {
      const item = snapshot.items.find((i: any) => String(i.id) === String(x.itemId)) || {};
      return {
        id: x.id,
        orderCode: String(x.orderCode || ""),
        customerName: x.customerName || "",
        itemId: x.itemId,
        itemCode: item.code || "",
        itemName: item.name || x.customProductName || "",
        color: x.color || "",
        variation: x.variation || "",
        totalQuantity: Number(x.totalQuantity || 0),
        invoicedQuantity: Number(x.invoicedQuantity || 0),
        status: x.status || "",
        isActive: x.isActive !== false,
      };
    });

  const [logsSnap, keysSnap] = await Promise.all([
    getDocs(collection(db, "logs")),
    getDocs(collection(db, "billingImportKeys")),
  ]);
  const orderIds = new Set(rows.map((r: any) => Number(r.id)));
  const logs = logsSnap.docs
    .map((d) => ({ docId: d.id, ...d.data() } as any))
    .filter((l: any) => orderIds.has(Number(l.orderId)) && String(l.type || "") === "FATURAMENTO")
    .map((l: any) => ({
      docId: l.docId,
      orderId: l.orderId,
      quantityInvoiced: Number(l.quantityInvoiced || 0),
      timestamp: l.timestamp,
      importOrigin: l.importOrigin || "",
      billingDocumentKey: l.billingDocumentKey || "",
      invoiceNumber: l.invoiceNumber || "",
    }));
  const keys = keysSnap.docs
    .map((d) => ({ docId: d.id, ...d.data() } as any))
    .filter((k: any) => wanted.has(String(k.orderCode || "")))
    .map((k: any) => ({
      docId: k.docId,
      orderCode: k.orderCode,
      itemId: k.itemId,
      quantityInvoiced: k.quantityInvoiced,
      documentKey: k.documentKey,
      sourceKey: k.sourceKey,
      processedAt: k.processedAt,
      auditId: k.auditId,
    }));

  return { rows, logs, keys };
}

async function previewBilling() {
  const repository = new FirestoreBillingRepository();
  const snapshot = await repository.loadSnapshot(tenantId);
  const sourceKeys = collectSourceKeys(billingPayload, snapshot);
  const processed = await repository.findProcessedSourceKeys(
    tenantId,
    documentKey,
    sourceKeys,
  );
  return buildBillingPlan(snapshot, billingPayload, {
    tenantId,
    origem,
    solicitadoPor,
    processedSourceKeys: processed,
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ sucesso: false, erro: "METHOD_NOT_ALLOWED" });
  }

  if (String(req.query?.inspect || "").toLowerCase() === "true") {
    const state = await inspectState();
    return res.status(200).json({
      sucesso: true,
      tenantId,
      morningOrderCodes,
      afternoonDeltaOrderCodes,
      ...state,
    });
  }

  if (String(req.query?.prepare || "").toLowerCase() === "true") {
    const productPrep = await ensureMissingProductsFor68196();
    const repo = new FirestoreOrderImportRepository();
    const meta = { tenantId, origem, solicitadoPor, now: new Date() };
    const dry = await processOrderImport(repo, ensureOrder68196, meta, true);
    if (dry.resumo.comErro > 0) {
      return res.status(207).json({ sucesso: false, etapa: "PREPARE_DRY_RUN", productPrep, dry });
    }
    const result = await processOrderImport(repo, ensureOrder68196, meta, false);
    return res.status(result.resumo.comErro > 0 ? 207 : 200).json({
      sucesso: result.resumo.comErro === 0,
      etapa: "PREPARE",
      productPrep,
      dry,
      result,
    });
  }

  if (String(req.query?.dryRun || "").toLowerCase() === "true") {
    const plan = await previewBilling();
    return res.status(plan.canConfirm ? 200 : 207).json({
      sucesso: plan.canConfirm,
      dryRun: true,
      previewHash: plan.previewHash,
      canConfirm: plan.canConfirm,
      resumo: plan.resumo,
      linhas: plan.linhas.map((l: any) => ({
        sourceKey: l.sourceKey,
        status: l.status,
        message: l.message,
        candidateOrderIds: l.candidateOrderIds,
        operation: l.operation && {
          orderId: l.operation.orderId,
          orderCode: l.operation.orderCode,
          itemId: l.operation.itemId,
          itemCode: l.operation.itemCode,
          itemName: l.operation.itemName,
          color: l.operation.color,
          billingQuantity: l.operation.billingQuantity,
          currentTotalQuantity: l.operation.currentTotalQuantity,
          currentInvoicedQuantity: l.operation.currentInvoicedQuantity,
          newTotalQuantity: l.operation.newTotalQuantity,
          newInvoicedQuantity: l.operation.newInvoicedQuantity,
          quantityAdjustedBy: l.operation.quantityAdjustedBy,
          resultingStatus: l.operation.resultingStatus,
          reservationConflict: l.operation.reservationConflict || null,
        },
      })),
    });
  }

  if (String(req.query?.execute || "").toLowerCase() === "true") {
    const expectedPreviewHash = String(req.query?.previewHash || "").trim();
    const plan = await previewBilling();
    if (!plan.canConfirm || plan.resumo.pendencias > 0 || plan.resumo.conflitosReserva > 0) {
      return res.status(409).json({
        sucesso: false,
        erro: "PLAN_NOT_CONFIRMABLE",
        previewHash: plan.previewHash,
        resumo: plan.resumo,
        linhas: plan.linhas,
      });
    }
    if (expectedPreviewHash && expectedPreviewHash !== plan.previewHash) {
      return res.status(409).json({
        sucesso: false,
        erro: "PREVIEW_HASH_CHANGED",
        expectedPreviewHash,
        actualPreviewHash: plan.previewHash,
        resumo: plan.resumo,
      });
    }
    const repository = new FirestoreBillingRepository();
    const result = await repository.applyPlan(plan);
    return res.status(200).json({ sucesso: true, previewHash: plan.previewHash, result });
  }

  if (String(req.query?.verify || "").toLowerCase() === "true") {
    const state = await inspectState();
    const plan = await previewBilling();
    return res.status(200).json({
      sucesso: true,
      tenantId,
      documentKey,
      state,
      postPlan: {
        previewHash: plan.previewHash,
        canConfirm: plan.canConfirm,
        resumo: plan.resumo,
        linhas: plan.linhas.map((l: any) => ({
          sourceKey: l.sourceKey,
          status: l.status,
          message: l.message,
        })),
      },
    });
  }

  return res.status(400).json({
    sucesso: false,
    erro: "MODE_REQUIRED",
    mensagem: "Use ?inspect=true, ?prepare=true, ?dryRun=true, ?execute=true ou ?verify=true.",
  });
}
