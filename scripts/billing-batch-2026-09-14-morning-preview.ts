import { buildBillingPlan, collectSourceKeys, type BillingImportPayload } from "../api/_lib/billingImportCore.ts";
import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.ts";

const payload: BillingImportPayload = {
  origem: "CHATGPT_PDF",
  tenantId: "imperio",
  solicitadoPor: "raul",
  documentKey: "FATURADOS-MANHA-14-SETEMBRO-2026-09-14",
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
  console.log("BILLING_PREVIEW", JSON.stringify({ resumo: plan.resumo, canConfirm: plan.canConfirm, previewHash: plan.previewHash, linhas: plan.linhas }));
  if (!plan.canConfirm) throw new Error("Preview possui pendências; faturamento bloqueado.");
  if (plan.resumo.total !== 9 || plan.resumo.quantidadeAFaturar !== 1581 || plan.resumo.ajustesQuantidade !== 0) {
    throw new Error(`Resumo inesperado: ${JSON.stringify(plan.resumo)}`);
  }
  console.log("BILLING_0914_MORNING_PREVIEW_OK", plan.previewHash);
  process.exit(0);
}

main().catch((error) => { console.error(error); process.exit(1); });
