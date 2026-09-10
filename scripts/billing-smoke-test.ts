import { buildBillingPlan, type BillingImportPayload } from "../api/_lib/billingImportCore.ts";
import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.ts";
import { normalizeText } from "../api/_lib/orderImportRules.ts";

async function main() {
  const tenantId = "imperio";
  const documentKey = "CHATGPT-TESTE-FATURAMENTO-CYRNE-3931-25-2026-09-10";
  const payload: BillingImportPayload = {
    origem: "CHATGPT_SMOKE_TEST",
    tenantId,
    solicitadoPor: "raul",
    documentKey,
    allowBreakReservations: false,
    faturamentos: [
      {
        lineId: "1",
        codigoPedido: "teste de faturamento",
        cliente: "cyrne",
        codigoProduto: "3931",
        quantidade: 25,
        observacoes: "Teste controlado solicitado por Raul via ChatGPT em 2026-09-10",
      },
    ],
  };

  const repo = new FirestoreBillingRepository();
  const snapshot = await repo.loadSnapshot(tenantId);

  const matchingOrderCodes = snapshot.orders.filter((order) =>
    normalizeText(order.orderCode) === normalizeText("teste de faturamento"),
  );

  console.log("Pedidos candidatos por código:", matchingOrderCodes.map((o) => ({
    id: o.id,
    orderCode: o.orderCode,
    customerName: o.customerName,
    itemId: o.itemId,
    totalQuantity: o.totalQuantity,
    invoicedQuantity: o.invoicedQuantity || 0,
    status: o.status,
  })));

  if (matchingOrderCodes.length === 0) {
    throw new Error("Pedido 'teste de faturamento' não encontrado. Nenhuma alteração foi feita.");
  }

  const item3931 = snapshot.items.find((item) => normalizeText(item.code) === "3931");
  if (!item3931) {
    throw new Error("Item de código 3931 não encontrado no catálogo. Nenhuma alteração foi feita.");
  }

  const exactCandidates = matchingOrderCodes.filter((order) =>
    Number(order.itemId) === Number(item3931.id) &&
    normalizeText(order.customerName).includes("CYRNE"),
  );

  if (exactCandidates.length !== 1) {
    throw new Error(
      `Esperava exatamente 1 linha do pedido para cliente CYRNE e item 3931, mas encontrei ${exactCandidates.length}. Nenhuma alteração foi feita.`,
    );
  }

  const target = exactCandidates[0];
  console.log("ALVO VALIDADO:", {
    orderId: target.id,
    orderCode: target.orderCode,
    customerName: target.customerName,
    itemId: target.itemId,
    itemCode: item3931.code,
    itemName: item3931.name,
    totalQuantity: target.totalQuantity,
    invoicedQuantity: target.invoicedQuantity || 0,
    status: target.status,
  });

  const sourceKeys = ["item:1"];
  const processedSourceKeys = await repo.findProcessedSourceKeys(tenantId, documentKey, sourceKeys);
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

  if (!plan.canConfirm) {
    throw new Error("A prévia não autorizou confirmação. Nenhuma alteração foi feita.");
  }

  if (plan.linhas.length !== 1 || !plan.linhas[0].operation) {
    throw new Error("A prévia não retornou exatamente uma operação. Nenhuma alteração foi feita.");
  }

  const op = plan.linhas[0].operation;
  if (
    op.orderId !== target.id ||
    op.billingQuantity !== 25 ||
    normalizeText(op.customerName).includes("CYRNE") === false ||
    normalizeText(op.itemCode) !== "3931"
  ) {
    throw new Error("A operação resolvida não corresponde exatamente ao teste autorizado. Nenhuma alteração foi feita.");
  }

  const result = await repo.applyPlan(plan);
  console.log("RESULTADO:", JSON.stringify(result, null, 2));

  if (result.resumo.quantidadeFaturada !== 25) {
    throw new Error(`Quantidade faturada inesperada: ${result.resumo.quantidadeFaturada}`);
  }

  const after = await repo.loadSnapshot(tenantId);
  const updated = after.orders.find((order) => order.id === target.id);
  console.log("PÓS-FATURAMENTO:", {
    orderId: updated?.id,
    orderCode: updated?.orderCode,
    customerName: updated?.customerName,
    itemId: updated?.itemId,
    totalQuantity: updated?.totalQuantity,
    invoicedQuantity: updated?.invoicedQuantity,
    status: updated?.status,
    isActive: updated?.isActive,
  });

  if (!updated || Number(updated.invoicedQuantity || 0) !== Number(target.invoicedQuantity || 0) + 25) {
    throw new Error("A conferência pós-faturamento não encontrou o acréscimo esperado de 25 unidades.");
  }
}

main().catch((error) => {
  console.error("SMOKE TEST FALHOU:", error?.stack || error);
  process.exit(1);
});
