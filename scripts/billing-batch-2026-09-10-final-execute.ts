import { buildBillingPlan, collectSourceKeys, type BillingImportPayload } from "../api/_lib/billingImportCore.ts";
import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.ts";
import { processOrderImport } from "../api/_lib/orderImportCore.ts";
import { FirestoreOrderImportRepository } from "../api/_lib/orderImportFirestore.ts";
import type { OrderImportPayload } from "../api/_lib/orderImportRules.ts";

const tenantId = "imperio";
const orderCodes = ["67304","67305","67306","67307","67311"];
const documentKey = "FATURADOS-10-SET-TARDE-2026-09-10-P21-25";

const orderPayload: OrderImportPayload = {
  origem: "CHATGPT_PDF",
  tenantId,
  solicitadoPor: "raul",
  pedidos: [
    { codigoPedido: "67304", cliente: { codigo: 858, nome: "CONSUMIDOR FINAL" }, representante: null, formaPagamento: "Carteira", prazos: [], comNotaFiscal: false, dataLimite: "2026-09-10", possuiRET: false, observacoes: "Faturamento PDF entrega 67313", itens: [{ codigoProduto: "70", descricao: "ZINCAGEM DE PEÇAS", familia: "GERENCIAL", quantidade: "3.2900", precoUnitario: "34.95", descontoPercentual: 0 }] },
    { codigoPedido: "67305", cliente: { codigo: 858, nome: "CONSUMIDOR FINAL" }, representante: null, formaPagamento: "Carteira", prazos: [], comNotaFiscal: false, dataLimite: "2026-09-10", possuiRET: false, observacoes: "Faturamento PDF entrega 67315", itens: [{ codigoProduto: "70", descricao: "ZINCAGEM DE PEÇAS", familia: "GERENCIAL", quantidade: "3.5600", precoUnitario: "34.83", descontoPercentual: 0 }] },
    { codigoPedido: "67306", cliente: { codigo: 858, nome: "CONSUMIDOR FINAL" }, representante: null, formaPagamento: "Carteira", prazos: [], comNotaFiscal: false, dataLimite: "2026-09-10", possuiRET: false, observacoes: "Faturamento PDF entrega 67317", itens: [{ codigoProduto: "70", descricao: "ZINCAGEM DE PEÇAS", familia: "GERENCIAL", quantidade: "0.9680", precoUnitario: "34.93", descontoPercentual: 0 }] },
    { codigoPedido: "67307", cliente: { codigo: 858, nome: "CONSUMIDOR FINAL" }, representante: null, formaPagamento: "Carteira", prazos: [], comNotaFiscal: false, dataLimite: "2026-09-10", possuiRET: false, observacoes: "Faturamento PDF entrega 67319", itens: [{ codigoProduto: "70", descricao: "ZINCAGEM DE PEÇAS", familia: "GERENCIAL", quantidade: "2.9720", precoUnitario: "34.99", descontoPercentual: 0 }] },
    { codigoPedido: "67311", cliente: { codigo: 858, nome: "CONSUMIDOR FINAL" }, representante: null, formaPagamento: "Carteira", prazos: [], comNotaFiscal: false, dataLimite: "2026-09-10", possuiRET: false, observacoes: "Faturamento PDF entrega 67321", itens: [{ codigoProduto: "70", descricao: "ZINCAGEM DE PEÇAS", familia: "GERENCIAL", quantidade: "4.8840", precoUnitario: "34.11", descontoPercentual: 0 }] },
  ],
};

async function main() {
  const orderRepo = new FirestoreOrderImportRepository();
  const meta = { tenantId, origem: "CHATGPT_PDF", solicitadoPor: "raul", now: new Date("2026-09-10T17:43:00-03:00") };

  const recheck = await processOrderImport(orderRepo, orderPayload, meta, true);
  console.log("PRECREATE_RECHECK", JSON.stringify(recheck.resumo));
  if (recheck.resumo.recebidos !== 5 || recheck.resumo.validos !== 5 || recheck.resumo.jaExistentes !== 0 || recheck.resumo.comErro !== 0) {
    throw new Error("Estado mudou desde a prévia; abortando antes da criação.");
  }

  const created = await processOrderImport(orderRepo, orderPayload, meta, false);
  console.log("CREATE_RESULT", JSON.stringify(created));
  if (created.resumo.criados !== 5 || created.resumo.comErro !== 0 || created.resumo.jaExistentes !== 0) {
    throw new Error("Nem todos os cinco pedidos foram criados; não iniciar faturamento.");
  }

  const billingRepo = new FirestoreBillingRepository();
  const snapshot = await billingRepo.loadSnapshot(tenantId);
  const billingPayload: BillingImportPayload = {
    origem: "CHATGPT_PDF",
    tenantId,
    solicitadoPor: "raul",
    documentKey,
    allowBreakReservations: false,
    faturarPedidosInteiros: orderCodes,
  };
  const sourceKeys = collectSourceKeys(billingPayload, snapshot);
  const processedSourceKeys = await billingRepo.findProcessedSourceKeys(tenantId, documentKey, sourceKeys);
  const plan = buildBillingPlan(snapshot, billingPayload, { tenantId, origem: "CHATGPT_PDF", solicitadoPor: "raul", processedSourceKeys });
  console.log("BILLING_PREVIEW", JSON.stringify({ resumo: plan.resumo, previewHash: plan.previewHash, linhas: plan.linhas }));
  if (!plan.canConfirm || plan.resumo.pendencias !== 0 || plan.resumo.total !== 5 || plan.resumo.quantidadeAFaturar !== 15.674) {
    throw new Error("Prévia de faturamento final não corresponde às 5 linhas/15,674 esperadas.");
  }

  const result = await billingRepo.applyPlan(plan);
  console.log("EXEC_RESULT", JSON.stringify(result));
  if (!result.sucesso || result.resumo.aplicados !== 5 || result.resumo.quantidadeFaturada !== 15.674) {
    throw new Error("Faturamento não aplicou exatamente as cinco linhas esperadas.");
  }

  const after = await billingRepo.loadSnapshot(tenantId);
  const verification = orderCodes.map((code) => {
    const rows = after.orders.filter((o) => String(o.orderCode).trim() === code);
    return { code, rows: rows.map((o) => ({ totalQuantity: o.totalQuantity, invoicedQuantity: o.invoicedQuantity, status: o.status, isActive: o.isActive, itemId: o.itemId })) };
  });
  console.log("POST_VERIFY", JSON.stringify(verification));
  for (const entry of verification) {
    if (entry.rows.length !== 1 || entry.rows[0].status !== "FATURADO" || entry.rows[0].isActive !== false || Number(entry.rows[0].invoicedQuantity) !== Number(entry.rows[0].totalQuantity)) {
      throw new Error(`Verificação final falhou para pedido ${entry.code}.`);
    }
  }
  console.log("FINAL_BATCH_OK", result.auditId);
  process.exit(0);
}
main().catch((err) => { console.error(err); process.exit(1); });
