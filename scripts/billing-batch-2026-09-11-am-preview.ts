import { buildBillingPlan, collectSourceKeys, type BillingImportPayload } from "../api/_lib/billingImportCore.ts";
import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.ts";

const payload: BillingImportPayload = {
  origem: "CHATGPT_PDF",
  tenantId: "imperio",
  solicitadoPor: "raul",
  documentKey: "FATURADOS-11-SET-MANHA-2026-09-11",
  faturamentos: [
    { lineId: "p1-67217-9-2000", codigoPedido: "67217", cliente: "225 - LUART ESTOFADOS LTDA", codigoProduto: "9", descricao: "SUPORTE QUADRADO", quantidade: 2000, observacoes: "PDF entrega 67323" },
    { lineId: "p2-67234-3133-80", codigoPedido: "67234", cliente: "1157 - DDESING LTDA.", codigoProduto: "3133", descricao: "GIRATORIO DE ESFERA 256X256X2.5", quantidade: 80, observacoes: "PDF entrega 67325" },
    { lineId: "p3-66571-1884-5000", codigoPedido: "66571", cliente: "791 - RONDOMOVEIS LTDA", codigoProduto: "1884", descricao: "CHAPA UNIÃO CAMA BOX", quantidade: 5000, numeroNota: "6299", observacoes: "PDF entrega 67326" },
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
  if (plan.resumo.quantidadeAFaturar !== 7080) throw new Error(`Quantidade total inesperada: ${plan.resumo.quantidadeAFaturar}`);
  console.log("BILLING_PREVIEW_OK", plan.previewHash);
}

main().catch((error) => { console.error(error); process.exit(1); });
