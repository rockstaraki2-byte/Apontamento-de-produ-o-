import crypto from "node:crypto";
import { createRequire } from "node:module";
import { getApps } from "firebase/app";
import { collection, doc, getDocs, getFirestore, query, runTransaction, where } from "firebase/firestore";
import { buildBillingPlan, collectSourceKeys, type BillingImportPayload } from "../api/_lib/billingImportCore.ts";
import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.ts";
import { prepareOrder } from "../api/_lib/orderImportCore.ts";
import { FirestoreOrderImportRepository } from "../api/_lib/orderImportFirestore.ts";

const require = createRequire(import.meta.url);
const firebaseConfigFile = require("../firebase-applet-config.json") as { firestoreDatabaseId?: string };

const tenantId = "imperio";
const documentKey = "FATURADOS-11-SET-1630-2026-09-11";
const expectedDirectHash = "957667c73c57307259f8c7c5cefcf2c7783e33a2196b5aab252a476620259392";
const expectedRepairHash = "4b9243881d74428d233069f79a45727506a993c87e1959fb5a178bc5bf42530b";

const directLines = [
  { lineId: "p14-67377-2739-250", codigoPedido: "67377", cliente: "1554 - MJ COMERCIO DIGITAL LTDA", itemId: 2739, descricao: "PAR DE CONECTOR ESCARIADO 1,5MM", cor: "ZINCADO", quantidade: 250, numeroNota: "6310", observacoes: "PDF entrega 67380" },
  { lineId: "p15a-66970-4599-1", codigoPedido: "66970", cliente: "18 - LUIZ ROBERTO PEREIRA 51477548653", itemId: 1779765279240, descricao: "MESA DE CENTRO ATTO", cor: "DOURADO", quantidade: 1, observacoes: "PDF entrega 67382; codigo impresso 4599.12" },
  { lineId: "p15b-66970-4600-1", codigoPedido: "66970", cliente: "18 - LUIZ ROBERTO PEREIRA 51477548653", itemId: 4600, descricao: "LATERAL ATTO 600MM", cor: "DOURADO", quantidade: 1, observacoes: "PDF entrega 67382; codigo impresso 4600.12" },
  { lineId: "p15c-66970-4601-1", codigoPedido: "66970", cliente: "18 - LUIZ ROBERTO PEREIRA 51477548653", itemId: 4601, descricao: "LATERAL ATTO 700MM", cor: "DOURADO", quantidade: 1, observacoes: "PDF entrega 67382; codigo impresso 4601.12" },
];

const repairOrder = {
  codigoPedido: "67251",
  cliente: { codigo: 856, nome: "ROFER COMERCIO E IMPORTAÇÃO LTDA" },
  representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
  formaPagamento: "Carteira",
  prazos: [60],
  comNotaFiscal: false,
  dataLimite: "2026-09-11",
  possuiRET: false,
  observacoes: "Complemento do pedido 67251 conforme PDF entrega 67379",
  itens: [
    { codigoOriginal: "287", codigoProduto: "287", descricao: "SUPORTE BAIXO DE PLASTICO", familia: "GERENCIAL", quantidade: 500, precoUnitario: 1.30, descontoPercentual: 15 },
    { codigoOriginal: "2739.1", codigoProduto: "2739", descricao: "PAR DE CONECTOR ESCARIADO 1,5MM", familia: "GERENCIAL", quantidade: 1750, precoUnitario: 0.98, descontoPercentual: 15 },
  ],
};

function nextNumericIds(count: number): number[] {
  const base = BigInt(Date.now()) * 4096n + BigInt(crypto.randomInt(0, 1024));
  return Array.from({ length: count }, (_, index) => {
    const value = Number(base + BigInt(index));
    if (!Number.isSafeInteger(value)) throw new Error("ID numérico fora do limite seguro.");
    return value;
  });
}

async function buildDirectPlan(repo: FirestoreBillingRepository) {
  const payload: BillingImportPayload = { origem: "CHATGPT_PDF", tenantId, solicitadoPor: "raul", documentKey, faturamentos: directLines };
  const snapshot = await repo.loadSnapshot(tenantId);
  const keys = collectSourceKeys(payload, snapshot);
  const processed = await repo.findProcessedSourceKeys(tenantId, documentKey, keys);
  return buildBillingPlan(snapshot, payload, { tenantId, origem: "CHATGPT_PDF", solicitadoPor: "raul", processedSourceKeys: processed });
}

async function main() {
  const billingRepo = new FirestoreBillingRepository();
  const directPlan = await buildDirectPlan(billingRepo);
  console.log("DIRECT_RECHECK", JSON.stringify({ resumo: directPlan.resumo, previewHash: directPlan.previewHash, canConfirm: directPlan.canConfirm }));
  if (directPlan.previewHash !== expectedDirectHash || !directPlan.canConfirm || directPlan.resumo.quantidadeAFaturar !== 253) {
    throw new Error("Estado dos faturamentos diretos mudou desde a prévia; execução bloqueada.");
  }

  const orderRepo = new FirestoreOrderImportRepository();
  const catalog = await orderRepo.loadCatalog(tenantId);
  const preparedResult = prepareOrder(repairOrder, catalog, new Date("2026-09-11T16:31:00-03:00"));
  if (!preparedResult.prepared || preparedResult.errors.length !== 0 || preparedResult.prepared.normalizedPayloadHash !== expectedRepairHash) {
    throw new Error("Validação do complemento 67251 mudou desde a prévia.");
  }
  const prepared = preparedResult.prepared;

  const app = getApps().find((a) => a.name === "order-import-api");
  if (!app) throw new Error("Firebase app de importação não inicializado.");
  const db = getFirestore(app, firebaseConfigFile.firestoreDatabaseId);
  const orderQuery = query(collection(db, "orders"), where("orderCode", "==", "67251"));
  const orderSnap = await getDocs(orderQuery);
  const existingRows = orderSnap.docs.map((d) => ({ ref: d.ref, id: Number(d.id), data: d.data() })).filter((r) => String(r.data.tenantId || "imperio") === tenantId);
  if (existingRows.length !== 2) throw new Error(`67251 deveria ter 2 linhas antes do complemento; encontrou ${existingRows.length}.`);
  const existingItemIds = new Set(existingRows.map((r) => Number(r.data.itemId)));
  if (existingItemIds.has(287) || existingItemIds.has(2739)) throw new Error("Uma linha do complemento 67251 apareceu após a prévia; execução bloqueada.");
  const existing797 = existingRows.find((r) => Number(r.data.itemId) === 337);
  const existing2551 = existingRows.find((r) => Number(r.data.itemId) === 2551);
  if (!existing797 || !existing2551 || Number(existing797.data.invoicedQuantity || 0) !== 600 || Number(existing2551.data.invoicedQuantity || 0) !== 150) {
    throw new Error("Estado das linhas já faturadas do 67251 mudou; execução bloqueada.");
  }

  const template = existing797.data;
  const newIds = nextNumericIds(2);
  const repairMarkerId = crypto.createHash("sha256").update(`${tenantId}:67251:${documentKey}:repair`).digest("hex");
  const repairMarkerRef = doc(db, "orderRepairKeys", repairMarkerId);
  const repairAuditRef = doc(db, "orderImportAudits", crypto.randomUUID());
  const createdAt = Date.now();

  await runTransaction(db, async (tx) => {
    const marker = await tx.get(repairMarkerRef);
    if (marker.exists()) throw new Error("Complemento 67251 já foi aplicado anteriormente; execução interrompida para evitar duplicidade.");

    prepared.lines.forEach((line, index) => {
      const id = newIds[index];
      tx.set(doc(db, "orders", String(id)), {
        ...template,
        id,
        tenantId,
        orderCode: "67251",
        itemId: line.itemId,
        color: line.color,
        size: line.size,
        variation: line.variation,
        customerName: prepared.customerName,
        customerId: prepared.customerId,
        representativeName: prepared.representativeName || template.representativeName || "",
        representativeId: prepared.representativeId || template.representativeId || "",
        totalQuantity: line.totalQuantity,
        quantityScaled: line.quantityScaled,
        packedQuantity: 0,
        producedQuantity: 0,
        paintedQuantity: 0,
        cutQuantity: 0,
        invoicedQuantity: 0,
        isActive: true,
        createdAt,
        deliveryDate: template.deliveryDate || prepared.deliveryDate,
        paymentCondition: template.paymentCondition || "CARTEIRA",
        paymentTerms: template.paymentTerms || prepared.paymentTerms,
        paymentTermsDays: template.paymentTermsDays || prepared.paymentTermsDays,
        billingRule: template.billingRule || "cadastro",
        fiscalType: template.fiscalType || prepared.fiscalType,
        unitPrice: line.unitPrice,
        unitPriceScaled: line.unitPriceScaled,
        discountPercent: line.discountPercent,
        discountPercentScaled: line.discountPercentScaled,
        discountAmount: line.discountAmount,
        discountAmountScaled: line.discountAmountScaled,
        grossTotalScaled: line.grossTotalScaled,
        netTotalScaled: line.netTotalScaled,
        hasRET: template.hasRET ?? prepared.hasRET,
        status: "PENDENTE",
        statusOriginalPdf: "CHATGPT_PDF",
        notes: prepared.orderNotes,
        itemNotes: line.itemNotes,
        originalProductCode: line.codigoOriginal,
        importOrigin: "CHATGPT_PDF_REPAIR",
        importedAt: createdAt,
        importedBy: "raul",
        importPayloadHash: prepared.normalizedPayloadHash,
      });
    });

    tx.set(repairMarkerRef, { tenantId, orderCode: "67251", documentKey, orderIds: newIds, itemIds: prepared.lines.map((l) => l.itemId), createdAt, origem: "CHATGPT_PDF_REPAIR", payloadHash: prepared.normalizedPayloadHash });
    tx.set(repairAuditRef, { tenantId, origem: "CHATGPT_PDF_REPAIR", solicitadoPor: "raul", codigoPedido: "67251", payloadHash: prepared.normalizedPayloadHash, result: "ITENS_ADICIONADOS_PEDIDO_EXISTENTE", warnings: prepared.warnings, orderIds: newIds, timestamp: createdAt });
  });
  console.log("REPAIR_CREATED", JSON.stringify({ orderCode: "67251", orderIds: newIds, itemIds: prepared.lines.map((l) => l.itemId) }));

  const combinedPayload: BillingImportPayload = {
    origem: "CHATGPT_PDF",
    tenantId,
    solicitadoPor: "raul",
    documentKey,
    faturamentos: [
      { lineId: "p13a-67251-287-500", codigoPedido: "67251", cliente: "856 - ROFER COMERCIO E IMPORTAÇÃO LTDA", itemId: 287, descricao: "SUPORTE BAIXO DE PLASTICO", quantidade: 500, observacoes: "PDF entrega 67379" },
      { lineId: "p13d-67251-2739-1750", codigoPedido: "67251", cliente: "856 - ROFER COMERCIO E IMPORTAÇÃO LTDA", itemId: 2739, descricao: "PAR DE CONECTOR ESCARIADO 1,5MM", cor: "ZINCADO", quantidade: 1750, observacoes: "PDF entrega 67379; codigo impresso 2739.1" },
      ...directLines,
    ],
  };
  const snapshot = await billingRepo.loadSnapshot(tenantId);
  const keys = collectSourceKeys(combinedPayload, snapshot);
  const processed = await billingRepo.findProcessedSourceKeys(tenantId, documentKey, keys);
  const plan = buildBillingPlan(snapshot, combinedPayload, { tenantId, origem: "CHATGPT_PDF", solicitadoPor: "raul", processedSourceKeys: processed });
  console.log("COMBINED_PREVIEW", JSON.stringify({ resumo: plan.resumo, canConfirm: plan.canConfirm, previewHash: plan.previewHash, linhas: plan.linhas }));
  if (!plan.canConfirm || plan.resumo.pendencias !== 0 || plan.resumo.total !== 6 || plan.resumo.quantidadeAFaturar !== 2503 || plan.resumo.ajustesQuantidade !== 0) {
    throw new Error(`Lote combinado inesperado: ${JSON.stringify(plan.resumo)}`);
  }

  const result = await billingRepo.applyPlan(plan);
  console.log("EXEC_RESULT", JSON.stringify(result));
  if (result.resumo.aplicados !== 6 || result.resumo.quantidadeFaturada !== 2503 || result.resumo.duplicadosIgnorados !== 0) {
    throw new Error(`Resultado inesperado: ${JSON.stringify(result.resumo)}`);
  }

  const after = await billingRepo.loadSnapshot(tenantId);
  const expected = [
    { orderCode: "67251", itemId: 287, total: 500, invoiced: 500, status: "FATURADO", active: false },
    { orderCode: "67251", itemId: 2739, total: 1750, invoiced: 1750, status: "FATURADO", active: false },
    { orderCode: "67377", itemId: 2739, total: 250, invoiced: 250, status: "FATURADO", active: false },
    { orderCode: "66970", itemId: 1779765279240, total: 12, invoiced: 1, status: "FATURADO_PARCIAL", active: true },
    { orderCode: "66970", itemId: 4600, total: 8, invoiced: 1, status: "FATURADO_PARCIAL", active: true },
    { orderCode: "66970", itemId: 4601, total: 8, invoiced: 1, status: "FATURADO_PARCIAL", active: true },
  ];
  const checks = expected.map((e) => {
    const rows = after.orders.filter((o) => String(o.orderCode).trim() === e.orderCode && Number(o.itemId) === e.itemId);
    return { ...e, rows: rows.map((o) => ({ totalQuantity: o.totalQuantity, invoicedQuantity: o.invoicedQuantity ?? 0, status: o.status, isActive: o.isActive })) };
  });
  console.log("POST_VERIFY", JSON.stringify(checks));
  for (const check of checks) {
    if (check.rows.length !== 1) throw new Error(`Verificação encontrou ${check.rows.length} linhas para ${check.orderCode}/${check.itemId}`);
    const row = check.rows[0];
    if (Number(row.totalQuantity) !== check.total || Number(row.invoicedQuantity) !== check.invoiced || row.status !== check.status || Boolean(row.isActive) !== check.active) {
      throw new Error(`Verificação falhou para ${check.orderCode}/${check.itemId}: ${JSON.stringify(row)}`);
    }
  }
  console.log("BILLING_1630_BATCH_OK", result.auditId ?? "sem-audit-id");
  process.exit(0);
}

main().catch((error) => { console.error(error); process.exit(1); });
