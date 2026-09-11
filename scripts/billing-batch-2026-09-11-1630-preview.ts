import { buildBillingPlan, collectSourceKeys, type BillingImportPayload } from "../api/_lib/billingImportCore.ts";
import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.ts";
import { prepareOrder } from "../api/_lib/orderImportCore.ts";
import { FirestoreOrderImportRepository } from "../api/_lib/orderImportFirestore.ts";

const tenantId = "imperio";
const documentKey = "FATURADOS-11-SET-1630-2026-09-11";

const directPayload: BillingImportPayload = {
  origem: "CHATGPT_PDF",
  tenantId,
  solicitadoPor: "raul",
  documentKey,
  faturamentos: [
    { lineId: "p14-67377-2739-250", codigoPedido: "67377", cliente: "1554 - MJ COMERCIO DIGITAL LTDA", itemId: 2739, descricao: "PAR DE CONECTOR ESCARIADO 1,5MM", cor: "ZINCADO", quantidade: 250, numeroNota: "6310", observacoes: "PDF entrega 67380" },
    { lineId: "p15a-66970-4599-1", codigoPedido: "66970", cliente: "18 - LUIZ ROBERTO PEREIRA 51477548653", itemId: 1779765279240, descricao: "MESA DE CENTRO ATTO", cor: "DOURADO", quantidade: 1, observacoes: "PDF entrega 67382; codigo impresso 4599.12" },
    { lineId: "p15b-66970-4600-1", codigoPedido: "66970", cliente: "18 - LUIZ ROBERTO PEREIRA 51477548653", itemId: 4600, descricao: "LATERAL ATTO 600MM", cor: "DOURADO", quantidade: 1, observacoes: "PDF entrega 67382; codigo impresso 4600.12" },
    { lineId: "p15c-66970-4601-1", codigoPedido: "66970", cliente: "18 - LUIZ ROBERTO PEREIRA 51477548653", itemId: 4601, descricao: "LATERAL ATTO 700MM", cor: "DOURADO", quantidade: 1, observacoes: "PDF entrega 67382; codigo impresso 4601.12" },
  ],
};

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

async function main() {
  const billingRepo = new FirestoreBillingRepository();
  const snapshot = await billingRepo.loadSnapshot(tenantId);
  const sourceKeys = collectSourceKeys(directPayload, snapshot);
  const processed = await billingRepo.findProcessedSourceKeys(tenantId, documentKey, sourceKeys);
  const plan = buildBillingPlan(snapshot, directPayload, { tenantId, origem: "CHATGPT_PDF", solicitadoPor: "raul", processedSourceKeys: processed });
  console.log("DIRECT_PREVIEW", JSON.stringify({ resumo: plan.resumo, canConfirm: plan.canConfirm, previewHash: plan.previewHash, linhas: plan.linhas }));
  if (!plan.canConfirm || plan.resumo.total !== 4 || plan.resumo.quantidadeAFaturar !== 253 || plan.resumo.pendencias !== 0) {
    throw new Error(`Prévia direta inesperada: ${JSON.stringify(plan.resumo)}`);
  }

  const existing67251 = snapshot.orders.filter((o) => String(o.orderCode).trim() === "67251");
  const itemMap = new Map(snapshot.items.map((i) => [String(i.id), i]));
  const rows = existing67251.map((o) => ({ itemId: o.itemId, itemCode: itemMap.get(String(o.itemId))?.code, total: o.totalQuantity, invoiced: o.invoicedQuantity ?? 0, status: o.status }));
  console.log("ORDER_67251_CURRENT", JSON.stringify(rows));
  const has287 = existing67251.some((o) => Number(o.itemId) === 287);
  const has2739 = existing67251.some((o) => Number(o.itemId) === 2739);
  if (has287 || has2739) throw new Error("67251 mudou: uma das linhas ausentes apareceu antes da execução.");

  const orderRepo = new FirestoreOrderImportRepository();
  const catalog = await orderRepo.loadCatalog(tenantId);
  const preparedResult = prepareOrder(repairOrder, catalog, new Date("2026-09-11T16:31:00-03:00"));
  console.log("REPAIR_PREVIEW", JSON.stringify({ errors: preparedResult.errors, warnings: preparedResult.warnings, preview: preparedResult.preview, prepared: preparedResult.prepared }));
  if (!preparedResult.prepared || preparedResult.errors.length !== 0 || preparedResult.prepared.lines.length !== 2) throw new Error("Validação das linhas ausentes do 67251 falhou.");
  const ids = preparedResult.prepared.lines.map((l) => Number(l.itemId)).sort((a,b) => a-b);
  if (ids[0] !== 287 || ids[1] !== 2739) throw new Error(`Itens validados inesperados: ${ids.join(",")}`);
  if (preparedResult.prepared.lines[0].totalQuantity + preparedResult.prepared.lines[1].totalQuantity !== 2250) throw new Error("Quantidade do complemento 67251 inesperada.");

  console.log("BILLING_1630_PREVIEW_OK", JSON.stringify({ directPreviewHash: plan.previewHash, repairHash: preparedResult.prepared.normalizedPayloadHash }));
  process.exit(0);
}

main().catch((error) => { console.error(error); process.exit(1); });
