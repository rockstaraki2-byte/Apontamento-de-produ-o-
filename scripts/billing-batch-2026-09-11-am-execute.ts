import { buildBillingPlan, collectSourceKeys, type BillingImportPayload } from "../api/_lib/billingImportCore.ts";
import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.ts";

const expectedPreviewHash = "99f1af81bc66ff4922099c6079fac637ba38403930535e70c00e58f8f5669188";
const payload: BillingImportPayload = {
  origem: "CHATGPT_PDF",
  tenantId: "imperio",
  solicitadoPor: "raul",
  documentKey: "FATURADOS-11-SET-MANHA-2026-09-11",
  expectedPreviewHash,
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

  console.log("PRE_EXEC_RECHECK", JSON.stringify({ resumo: plan.resumo, canConfirm: plan.canConfirm, previewHash: plan.previewHash }));
  if (plan.previewHash !== expectedPreviewHash) throw new Error(`Estado mudou desde a prévia. Esperado ${expectedPreviewHash}, atual ${plan.previewHash}`);
  if (!plan.canConfirm) throw new Error("Lote não pode ser confirmado.");

  const result = await repo.applyPlan(plan);
  console.log("EXEC_RESULT", JSON.stringify(result));

  const after = await repo.loadSnapshot("imperio");
  const checks = [
    { code: "67217", itemId: 9, qty: 2000 },
    { code: "67234", itemId: 3133, qty: 80 },
    { code: "66571", itemId: 1884, qty: 5000 },
  ].map((check) => ({
    ...check,
    rows: after.orders
      .filter((o) => String(o.orderCode).trim() === check.code && Number(o.itemId) === check.itemId)
      .map((o) => ({ totalQuantity: o.totalQuantity, invoicedQuantity: o.invoicedQuantity ?? 0, status: o.status, isActive: o.isActive })),
  }));
  console.log("POST_VERIFY", JSON.stringify(checks));

  for (const check of checks) {
    if (check.rows.length !== 1) throw new Error(`Verificação falhou para ${check.code}/${check.itemId}: quantidade de linhas inesperada.`);
    const row = check.rows[0];
    if (Number(row.invoicedQuantity) !== check.qty || row.status !== "FATURADO" || row.isActive !== false) {
      throw new Error(`Verificação falhou para ${check.code}/${check.itemId}: ${JSON.stringify(row)}`);
    }
  }
  if (result.resumo.aplicados !== 3 || result.resumo.quantidadeFaturada !== 7080) throw new Error("Resumo de faturamento inesperado.");
  console.log("BATCH_OK", result.auditId ?? "sem-audit-id");
  process.exit(0);
}

main().catch((error) => { console.error(error); process.exit(1); });
