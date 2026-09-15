import { buildBillingPlan, collectSourceKeys, type BillingImportPayload } from "../api/_lib/billingImportCore.ts";
import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.ts";

const payload: BillingImportPayload = {
  origem: "CHATGPT_PDF",
  tenantId: "imperio",
  solicitadoPor: "raul",
  documentKey: "FATURADOS-15-SET-PENDENTES-2026-09-15",
  allowBreakReservations: false,
  faturamentos: [
    { lineId: "p20-66667-1884-500", codigoPedido: "66667", itemId: 1884, quantidade: 500, numeroNota: "6315" },
    { lineId: "p20-66715-1-5000", codigoPedido: "66715", itemId: 1, quantidade: 5000, numeroNota: "6315" },
    { lineId: "p21-66679-1-3000", codigoPedido: "66679", itemId: 1, quantidade: 3000, numeroNota: "6316" },
    { lineId: "p22-66571-3810-2000", codigoPedido: "66571", itemId: 3810, quantidade: 2000, numeroNota: "6317" },
    { lineId: "p22-67328-3810-50", codigoPedido: "67328", itemId: 3810, quantidade: 50, numeroNota: "6317" },
    { lineId: "p23-67424-1630-80", codigoPedido: "67424", itemId: 1630, quantidade: 80, numeroNota: "6318" },
    { lineId: "p24-67234-4809-25", codigoPedido: "67234", itemId: 4809, quantidade: 25 },
    { lineId: "p25-67425-1880-500", codigoPedido: "67425", itemId: 1880, quantidade: 500 },
    { lineId: "p25-67425-2739-250", codigoPedido: "67425", itemId: 2739, quantidade: 250 },
  ],
};

async function buildPlan(repo: FirestoreBillingRepository) {
  const snapshot = await repo.loadSnapshot("imperio");
  const keys = collectSourceKeys(payload, snapshot);
  const processed = await repo.findProcessedSourceKeys("imperio", payload.documentKey!, keys);
  const plan = buildBillingPlan(snapshot, payload, {
    tenantId: "imperio",
    origem: "CHATGPT_PDF",
    solicitadoPor: "raul",
    processedSourceKeys: processed,
  });
  return { snapshot, plan };
}

async function main() {
  const repo = new FirestoreBillingRepository();
  const before = await buildPlan(repo);
  console.log("PREVIEW", JSON.stringify({
    resumo: before.plan.resumo,
    canConfirm: before.plan.canConfirm,
    previewHash: before.plan.previewHash,
    linhas: before.plan.linhas,
  }));

  if (!before.plan.canConfirm || before.plan.resumo.total !== 9 || before.plan.resumo.quantidadeAFaturar !== 11405 || before.plan.resumo.ajustesQuantidade !== 0 || before.plan.resumo.pendencias !== 0) {
    throw new Error(`Prévia inesperada ou bloqueada: ${JSON.stringify(before.plan.resumo)}`);
  }

  const result = await repo.applyPlan(before.plan);
  console.log("EXEC_RESULT", JSON.stringify(result));

  if (result.resumo.aplicados !== 9 || result.resumo.quantidadeFaturada !== 11405 || result.resumo.duplicadosIgnorados !== 0 || result.resumo.itensComQuantidadeAjustada !== 0) {
    throw new Error(`Resultado inesperado: ${JSON.stringify(result.resumo)}`);
  }

  const after = await repo.loadSnapshot("imperio");
  const expected = [
    { orderCode: "66667", itemId: 1884, total: 3000, invoiced: 3000, status: "FATURADO", active: false },
    { orderCode: "66715", itemId: 1, total: 5000, invoiced: 5000, status: "FATURADO", active: false },
    { orderCode: "66679", itemId: 1, total: 3000, invoiced: 3000, status: "FATURADO", active: false },
    { orderCode: "66571", itemId: 3810, total: 2000, invoiced: 2000, status: "FATURADO", active: false },
    { orderCode: "67328", itemId: 3810, total: 50, invoiced: 50, status: "FATURADO", active: false },
    { orderCode: "67424", itemId: 1630, total: 80, invoiced: 80, status: "FATURADO", active: false },
    { orderCode: "67234", itemId: 4809, total: 100, invoiced: 25, status: "FATURADO_PARCIAL", active: true },
    { orderCode: "67425", itemId: 1880, total: 500, invoiced: 500, status: "FATURADO", active: false },
    { orderCode: "67425", itemId: 2739, total: 250, invoiced: 250, status: "FATURADO", active: false },
  ];

  const checks = expected.map((e) => {
    const rows = after.orders.filter((o) => String(o.orderCode).trim() === e.orderCode && Number(o.itemId) === e.itemId);
    return {
      ...e,
      rows: rows.map((o) => ({
        totalQuantity: o.totalQuantity,
        invoicedQuantity: o.invoicedQuantity ?? 0,
        status: o.status,
        isActive: o.isActive,
      })),
    };
  });
  console.log("POST_VERIFY", JSON.stringify(checks));

  for (const check of checks) {
    if (check.rows.length !== 1) throw new Error(`Verificação encontrou ${check.rows.length} linhas para ${check.orderCode}/${check.itemId}`);
    const row = check.rows[0];
    if (Number(row.totalQuantity) !== check.total || Number(row.invoicedQuantity) !== check.invoiced || row.status !== check.status || Boolean(row.isActive) !== check.active) {
      throw new Error(`Verificação falhou para ${check.orderCode}/${check.itemId}: ${JSON.stringify(row)}`);
    }
  }

  console.log("BILLING_2026_09_15_PENDING_BATCH_OK", result.auditId ?? "sem-audit-id");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
