import {
  buildBillingPlan,
  collectSourceKeys,
  type BillingImportPayload,
} from "../api/_lib/billingImportCore.ts";
import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.ts";
import { normalizeText } from "../api/_lib/orderImportRules.ts";

async function main() {
  const tenantId = "imperio";
  const orderId = 1789010806874;
  const orderCode = "Teste de faturamemto";
  const documentKey = "CHATGPT-TESTE-FATURAMENTO-CYRNE-3931-MAIS35-2026-09-10";

  const repo = new FirestoreBillingRepository();
  const snapshot = await repo.loadSnapshot(tenantId);
  const item3931 = snapshot.items.find((item) => normalizeText(item.code) === "3931");
  if (!item3931) throw new Error("Item 3931 não encontrado. Nenhuma alteração foi feita.");

  const target = snapshot.orders.find((order) => Number(order.id) === orderId);
  if (!target) throw new Error("Pedido de teste não encontrado pelo ID esperado. Nenhuma alteração foi feita.");

  const exactTarget =
    normalizeText(target.orderCode) === normalizeText(orderCode) &&
    normalizeText(target.customerName).includes("CYRNE") &&
    Number(target.itemId) === Number(item3931.id);
  if (!exactTarget) {
    throw new Error("O ID esperado não corresponde a CYRNE + pedido de teste + item 3931. Nenhuma alteração foi feita.");
  }

  console.log("ANTES:", JSON.stringify({
    id: target.id,
    orderCode: target.orderCode,
    customerName: target.customerName,
    itemCode: item3931.code,
    itemName: item3931.name,
    totalQuantity: target.totalQuantity,
    invoicedQuantity: target.invoicedQuantity || 0,
    status: target.status,
    isActive: target.isActive,
  }, null, 2));

  // Guarda forte contra executar em estado diferente do explicitamente autorizado.
  if (
    Number(target.totalQuantity) !== 50 ||
    Number(target.invoicedQuantity || 0) !== 25 ||
    target.status !== "FATURADO_PARCIAL"
  ) {
    throw new Error(
      `Estado inesperado: total=${target.totalQuantity}, faturado=${target.invoicedQuantity || 0}, status=${target.status}. Nenhuma alteração foi feita.`,
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
        quantidade: 35,
        observacoes: "Segundo teste controlado solicitado por Raul via ChatGPT em 2026-09-10",
      },
    ],
  };

  const sourceKeys = collectSourceKeys(payload, snapshot);
  const processedSourceKeys = await repo.findProcessedSourceKeys(
    tenantId,
    documentKey,
    sourceKeys,
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
    throw new Error("Prévia não autorizou exatamente uma operação. Nenhuma alteração foi feita.");
  }

  const op = plan.linhas[0].operation;
  if (
    Number(op.orderId) !== orderId ||
    op.billingQuantity !== 35 ||
    op.currentTotalQuantity !== 50 ||
    op.currentInvoicedQuantity !== 25 ||
    op.newTotalQuantity !== 60 ||
    op.newInvoicedQuantity !== 60 ||
    op.quantityAdjustedBy !== 10 ||
    op.resultingStatus !== "FATURADO" ||
    Boolean(op.reservationConflict) ||
    normalizeText(op.itemCode) !== "3931"
  ) {
    throw new Error("A operação planejada não corresponde exatamente ao faturamento autorizado. Nenhuma alteração foi feita.");
  }

  const result = await repo.applyPlan(plan);
  console.log("RESULTADO:", JSON.stringify(result, null, 2));

  const after = await repo.loadSnapshot(tenantId);
  const updated = after.orders.find((order) => Number(order.id) === orderId);
  console.log("DEPOIS:", JSON.stringify({
    id: updated?.id,
    orderCode: updated?.orderCode,
    customerName: updated?.customerName,
    totalQuantity: updated?.totalQuantity,
    invoicedQuantity: updated?.invoicedQuantity,
    status: updated?.status,
    isActive: updated?.isActive,
  }, null, 2));

  if (
    !updated ||
    Number(updated.totalQuantity) !== 60 ||
    Number(updated.invoicedQuantity || 0) !== 60 ||
    updated.status !== "FATURADO"
  ) {
    throw new Error("Pós-validação diferente do esperado (60 total / 60 faturado / FATURADO)." );
  }

  console.log("SMOKE TEST 2 OK: +35 unidades faturadas; pedido ajustado de 50 para 60 e concluído.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("SMOKE TEST 2 FALHOU:", error?.stack || error);
    process.exit(1);
  });
