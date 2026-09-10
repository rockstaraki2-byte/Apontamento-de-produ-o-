import { buildBillingPlan, type BillingImportPayload } from "../api/_lib/billingImportCore.ts";
import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.ts";
import { normalizeText } from "../api/_lib/orderImportRules.ts";

async function main() {
  const tenantId = "imperio";
  const documentKey = "CHATGPT-TESTE-FATURAMENTO-CYRNE-3931-25-2026-09-10";
  const orderCode = "Teste de faturamemto";

  const repo = new FirestoreBillingRepository();
  const snapshot = await repo.loadSnapshot(tenantId);

  const item3931 = snapshot.items.find((item) => normalizeText(item.code) === "3931");
  if (!item3931) {
    throw new Error("Item de código 3931 não encontrado. Nenhuma alteração foi feita.");
  }

  const candidates = snapshot.orders.filter((order) =>
    normalizeText(order.orderCode) === normalizeText(orderCode) &&
    Number(order.itemId) === Number(item3931.id) &&
    normalizeText(order.customerName).includes("CYRNE"),
  );

  if (candidates.length !== 1) {
    throw new Error(
      `Esperava exatamente 1 linha para '${orderCode}' + CYRNE + item 3931; encontrei ${candidates.length}. Nenhuma alteração foi feita.`,
    );
  }

  const target = candidates[0];
  console.log("ALVO:", {
    id: target.id,
    orderCode: target.orderCode,
    customerName: target.customerName,
    itemCode: item3931.code,
    itemName: item3931.name,
    totalQuantity: target.totalQuantity,
    invoicedQuantity: target.invoicedQuantity || 0,
    status: target.status,
    isActive: target.isActive,
  });

  if (Number(target.totalQuantity) !== 50 || Number(target.invoicedQuantity || 0) !== 0) {
    throw new Error(
      `Estado diferente do previamente conferido (esperado total=50 e faturado=0; atual total=${target.totalQuantity}, faturado=${target.invoicedQuantity || 0}). Nenhuma alteração foi feita.`,
    );
  }

  const payload: BillingImportPayload = {
    origem: "CHATGPT_SMOKE_TEST",
    tenantId,
    solicitadoPor: "raul",
    documentKey,
    allowBreakReservations: false,
    faturamentos: [
      {
        lineId: "1",
        codigoPedido: orderCode,
        cliente: "1478 - CYRNE DECOR",
        codigoProduto: "3931",
        quantidade: 25,
        observacoes: "Teste controlado solicitado por Raul via ChatGPT em 2026-09-10",
      },
    ],
  };

  const processedSourceKeys = await repo.findProcessedSourceKeys(
    tenantId,
    documentKey,
    ["item:1"],
  );

  const plan = buildBillingPlan(snapshot, payload, {
    tenantId,
    origem: "CHATGPT_SMOKE_TEST",
    solicitadoPor: "raul",
    processedSourceKeys,
  });

  console.log("PREVIEW:", JSON.stringify({
    canConfirm: plan.canConfirm,
    resumo: plan.resumo,
    linhas: plan.linhas.map((line) => ({
      status: line.status,
      message: line.message,
      operation: line.operation && {
        orderId: line.operation.orderId,
        orderCode: line.operation.orderCode,
        customerName: line.operation.customerName,
        itemCode: line.operation.itemCode,
        itemName: line.operation.itemName,
        billingQuantity: line.operation.billingQuantity,
        currentTotalQuantity: line.operation.currentTotalQuantity,
        currentInvoicedQuantity: line.operation.currentInvoicedQuantity,
        newTotalQuantity: line.operation.newTotalQuantity,
        newInvoicedQuantity: line.operation.newInvoicedQuantity,
        quantityAdjustedBy: line.operation.quantityAdjustedBy,
        resultingStatus: line.operation.resultingStatus,
        reservationConflict: line.operation.reservationConflict || null,
      },
    })),
    previewHash: plan.previewHash,
  }, null, 2));

  if (!plan.canConfirm || plan.linhas.length !== 1 || !plan.linhas[0].operation) {
    throw new Error("A prévia não autorizou exatamente uma operação. Nenhuma alteração foi feita.");
  }

  const op = plan.linhas[0].operation;
  if (
    op.orderId !== target.id ||
    op.billingQuantity !== 25 ||
    op.currentTotalQuantity !== 50 ||
    op.currentInvoicedQuantity !== 0 ||
    op.newTotalQuantity !== 50 ||
    op.newInvoicedQuantity !== 25 ||
    op.resultingStatus !== "FATURADO_PARCIAL" ||
    Boolean(op.reservationConflict) ||
    normalizeText(op.customerName).includes("CYRNE") === false ||
    normalizeText(op.itemCode) !== "3931"
  ) {
    throw new Error("A operação planejada não corresponde exatamente ao teste autorizado. Nenhuma alteração foi feita.");
  }

  const result = await repo.applyPlan(plan);
  console.log("RESULTADO:", JSON.stringify(result, null, 2));

  if (
    result.resumo.aplicados !== 1 ||
    result.resumo.quantidadeFaturada !== 25
  ) {
    throw new Error("O resultado da gravação não corresponde ao faturamento de 25 unidades esperado.");
  }

  const after = await repo.loadSnapshot(tenantId);
  const updated = after.orders.find((order) => order.id === target.id);
  console.log("PÓS-FATURAMENTO:", {
    id: updated?.id,
    orderCode: updated?.orderCode,
    customerName: updated?.customerName,
    totalQuantity: updated?.totalQuantity,
    invoicedQuantity: updated?.invoicedQuantity,
    status: updated?.status,
    isActive: updated?.isActive,
  });

  if (
    !updated ||
    Number(updated.totalQuantity) !== 50 ||
    Number(updated.invoicedQuantity || 0) !== 25 ||
    updated.status !== "FATURADO_PARCIAL" ||
    updated.isActive === false
  ) {
    throw new Error("A conferência pós-faturamento não encontrou o estado esperado (50 total / 25 faturado / parcial)." );
  }

  console.log("SMOKE TEST OK: 25 unidades do item 3931 faturadas no pedido de teste da Cyrne.");
}

main().catch((error) => {
  console.error("SMOKE TEST FALHOU:", error?.stack || error);
  process.exit(1);
});
