import { buildBillingPlan, collectSourceKeys, type BillingImportPayload } from "../api/_lib/billingImportCore.ts";
import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.ts";

const expectedPreviewHash = "2819800d00191e3149ce7918c13ca5797c52843bbfdf95494386a5518c97be94";
const payload: BillingImportPayload = {
  origem: "CHATGPT_PDF",
  tenantId: "imperio",
  solicitadoPor: "raul",
  documentKey: "FATURADOS-MANHA-14-SETEMBRO-2026-09-14",
  expectedPreviewHash,
  faturamentos: [
    { lineId: "p1-67383-1925-20", codigoPedido: "67383", cliente: "1094 - DECORARE MOVEIS LTDA", itemId: 1925, descricao: "PINO DE LATÃO COM CABEÇA DE 16 E CORPO DE 10MM", quantidade: 20, numeroNota: "6311", observacoes: "PDF entrega 67384" },
    { lineId: "p2a-66972-866-29", codigoPedido: "66972", cliente: "1563 - ZURC INTERIORES LTDA", itemId: 866, descricao: "SAPATA GIRATORIA BANQUETA PRENSAR", cor: "PRETO FOSCO", quantidade: 29, numeroNota: "6312", observacoes: "PDF entrega 67389; codigo impresso 866.3" },
    { lineId: "p2b-66972-3128-29", codigoPedido: "66972", cliente: "1563 - ZURC INTERIORES LTDA", itemId: 3128, descricao: "ARGOLA 40 CM 4 FUROS EXTERNO", cor: "PRETO FOSCO", quantidade: 29, numeroNota: "6312", observacoes: "PDF entrega 67389; codigo impresso 3128.3" },
    { lineId: "p2c-67106-866-76", codigoPedido: "67106", cliente: "1563 - ZURC INTERIORES LTDA", itemId: 866, descricao: "SAPATA GIRATORIA BANQUETA PRENSAR", cor: "PRETO FOSCO", quantidade: 76, numeroNota: "6312", observacoes: "PDF entrega 67389; codigo impresso 866.3" },
    { lineId: "p2d-67106-3128-91", codigoPedido: "67106", cliente: "1563 - ZURC INTERIORES LTDA", itemId: 3128, descricao: "ARGOLA 40 CM 4 FUROS EXTERNO", cor: "PRETO FOSCO", quantidade: 91, numeroNota: "6312", observacoes: "PDF entrega 67389; codigo impresso 3128.3" },
    { lineId: "p3-67388-3744-93", codigoPedido: "67388", cliente: "10 - M. S. R. PEREIRA & CIA LTDA", itemId: 3744, descricao: "PÉ MONTREAL 15CM", cor: "PRETO FOSCO", quantidade: 93, observacoes: "PDF entrega 67391; codigo impresso 3744.3" },
    { lineId: "p4-67082-3192-10", codigoPedido: "67082", cliente: "914 - SANTRIN COMERCIO LTDA", itemId: 3192, descricao: "SAPATA GIRATORIA COM GARRA", cor: "PRETO FOSCO", quantidade: 10, observacoes: "PDF entrega 67393; codigo impresso 3192.3" },
    { lineId: "p5-66961-3108-233", codigoPedido: "66961", cliente: "1123 - M.R. DECOR LTDA", itemId: 2489, descricao: "PAR DE MECANISMO RETRÁTIL METAL 85 CM", cor: "CINZA", quantidade: 233, observacoes: "PDF entrega 67395; codigo impresso 3108.11" },
    { lineId: "p6-67336-1-1000", codigoPedido: "67336", cliente: "1300 - BEL INDUSTRIA DE MOVEIS LTDA", itemId: 1, descricao: "RODIZIO DE SILICONE DE 40 1,5 TRANSPARENTE", cor: "ZINCADO", quantidade: 1000, observacoes: "PDF entrega 67397; codigo impresso 1.1" },
  ],
};

async function main() {
  const repo = new FirestoreBillingRepository();
  const snapshot = await repo.loadSnapshot("imperio");
  const sourceKeys = collectSourceKeys(payload, snapshot);
  const processed = await repo.findProcessedSourceKeys("imperio", payload.documentKey!, sourceKeys);
  const plan = buildBillingPlan(snapshot, payload, {
    tenantId: "imperio",
    origem: "CHATGPT_PDF",
    solicitadoPor: "raul",
    processedSourceKeys: processed,
  });
  console.log("PRE_EXEC_RECHECK", JSON.stringify({ resumo: plan.resumo, canConfirm: plan.canConfirm, previewHash: plan.previewHash }));
  if (plan.previewHash !== expectedPreviewHash) throw new Error(`Estado mudou desde a prévia. Esperado ${expectedPreviewHash}, atual ${plan.previewHash}`);
  if (!plan.canConfirm || plan.resumo.total !== 9 || plan.resumo.quantidadeAFaturar !== 1581 || plan.resumo.ajustesQuantidade !== 0) throw new Error("Lote não pode ser confirmado ou resumo mudou.");

  const result = await repo.applyPlan(plan);
  console.log("EXEC_RESULT", JSON.stringify(result));
  if (result.resumo.aplicados !== 9 || result.resumo.quantidadeFaturada !== 1581 || result.resumo.duplicadosIgnorados !== 0) {
    throw new Error(`Resultado inesperado: ${JSON.stringify(result.resumo)}`);
  }

  const after = await repo.loadSnapshot("imperio");
  const expected = [
    { orderCode: "67383", itemId: 1925, total: 20, invoiced: 20, status: "FATURADO", active: false },
    { orderCode: "66972", itemId: 866, total: 100, invoiced: 100, status: "FATURADO", active: false },
    { orderCode: "66972", itemId: 3128, total: 100, invoiced: 100, status: "FATURADO", active: false },
    { orderCode: "67106", itemId: 866, total: 132, invoiced: 76, status: "FATURADO_PARCIAL", active: true },
    { orderCode: "67106", itemId: 3128, total: 132, invoiced: 91, status: "FATURADO_PARCIAL", active: true },
    { orderCode: "67388", itemId: 3744, total: 93, invoiced: 93, status: "FATURADO", active: false },
    { orderCode: "67082", itemId: 3192, total: 10, invoiced: 10, status: "FATURADO", active: false },
    { orderCode: "66961", itemId: 2489, total: 300, invoiced: 233, status: "FATURADO_PARCIAL", active: true },
    { orderCode: "67336", itemId: 1, total: 1000, invoiced: 1000, status: "FATURADO", active: false },
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
  console.log("BILLING_0914_MORNING_BATCH_OK", result.auditId ?? "sem-audit-id");
  process.exit(0);
}

main().catch((error) => { console.error(error); process.exit(1); });
