import test from "node:test";
import assert from "node:assert/strict";
import {
  buildBillingPlan,
  type BillingSnapshot,
} from "../api/_lib/billingImportCore.ts";

const snapshot: BillingSnapshot = {
  items: [
    { id: 1, code: "P001", name: "Pé Lavezzi", tenantId: "imperio", components: [{ itemId: 3, quantity: 2 }] },
    { id: 2, code: "P002", name: "Sapata Chata", tenantId: "imperio" },
    { id: 3, code: "C001", name: "Componente", tenantId: "imperio" },
  ],
  stocks: [
    { id: "1|PRETO|||ACABADO", tenantId: "imperio", itemId: 1, color: "PRETO", size: "", variation: "", stage: "ACABADO", quantity: 500, reservedQuantity: 0 },
    { id: "3|PRETO|||ACABADO", tenantId: "imperio", itemId: 3, color: "PRETO", size: "", variation: "", stage: "ACABADO", quantity: 1000 },
  ],
  orders: [
    { id: 10, tenantId: "imperio", orderCode: "100", itemId: 1, color: "PRETO", size: "", variation: "", customerName: "Cliente X", totalQuantity: 100, invoicedQuantity: 20, status: "PENDENTE", isActive: true, createdAt: 1 },
    { id: 11, tenantId: "imperio", orderCode: "100", itemId: 2, color: "", size: "", variation: "", customerName: "Cliente X", totalQuantity: 50, invoicedQuantity: 0, status: "PENDENTE", isActive: true, createdAt: 2 },
  ],
};

const context = { tenantId: "imperio", origem: "CHATGPT", solicitadoPor: "raul" };

test("faturamento parcial mantém quantidade original do pedido", () => {
  const plan = buildBillingPlan(
    snapshot,
    { documentKey: "NF-1", faturamentos: [{ lineId: "1", codigoPedido: "100", codigoProduto: "P001", quantidade: 30 }] },
    context,
  );
  const op = plan.linhas[0].operation!;
  assert.equal(plan.linhas[0].status, "PRONTO");
  assert.equal(op.currentInvoicedQuantity, 20);
  assert.equal(op.newInvoicedQuantity, 50);
  assert.equal(op.newTotalQuantity, 100);
});

test("faturamento acima do pedido ajusta pelo acumulado", () => {
  const plan = buildBillingPlan(
    snapshot,
    { documentKey: "NF-2", faturamentos: [{ lineId: "1", codigoPedido: "100", codigoProduto: "P001", quantidade: 90 }] },
    context,
  );
  const op = plan.linhas[0].operation!;
  assert.equal(plan.linhas[0].status, "AJUSTAR_E_FATURAR");
  assert.equal(op.newInvoicedQuantity, 110);
  assert.equal(op.newTotalQuantity, 110);
  assert.equal(op.quantityAdjustedBy, 10);
});

test("pedido inexistente é devolvido para o fluxo de lançamento", () => {
  const plan = buildBillingPlan(
    snapshot,
    { documentKey: "NF-3", faturamentos: [{ lineId: "1", codigoPedido: "999", codigoProduto: "P001", quantidade: 10 }] },
    context,
  );
  assert.equal(plan.linhas[0].status, "PEDIDO_NAO_ENCONTRADO");
  assert.equal(plan.canConfirm, false);
});

test("item ambíguo nunca é escolhido automaticamente", () => {
  const plan = buildBillingPlan(
    snapshot,
    { documentKey: "NF-4", faturamentos: [{ lineId: "1", codigoPedido: "100", quantidade: 10 }] },
    context,
  );
  assert.equal(plan.linhas[0].status, "ITEM_AMBIGUO");
  assert.equal(plan.canConfirm, false);
});

test("linha já processada é idempotente", () => {
  const plan = buildBillingPlan(
    snapshot,
    { documentKey: "NF-5", faturamentos: [{ lineId: "1", codigoPedido: "100", codigoProduto: "P001", quantidade: 10 }] },
    { ...context, processedSourceKeys: new Set(["item:1"]) },
  );
  assert.equal(plan.linhas[0].status, "JA_PROCESSADO");
  assert.equal(plan.resumo.quantidadeAFaturar, 0);
});

test("faturar pedido inteiro usa apenas o saldo pendente", () => {
  const plan = buildBillingPlan(snapshot, { documentKey: "NF-6", faturarPedidosInteiros: ["100"] }, context);
  assert.equal(plan.linhas.filter((line) => line.operation).length, 2);
  assert.equal(plan.resumo.quantidadeAFaturar, 130);
});

test("reserva de outro pedido exige autorização explícita", () => {
  const withReservation: BillingSnapshot = {
    ...snapshot,
    stocks: snapshot.stocks.map((stock) => stock.itemId === 1 ? { ...stock, reservedQuantity: 50 } : stock),
    orders: [
      ...snapshot.orders,
      { id: 12, tenantId: "imperio", orderCode: "200", itemId: 1, color: "PRETO", size: "", variation: "", customerName: "Cliente Y", totalQuantity: 40, invoicedQuantity: 0, status: "EMBALADO", isActive: true, createdAt: 0 },
    ],
  };

  const blocked = buildBillingPlan(
    withReservation,
    { documentKey: "NF-7", faturamentos: [{ lineId: "1", codigoPedido: "100", codigoProduto: "P001", quantidade: 10 }] },
    context,
  );
  assert.equal(blocked.linhas[0].status, "RESERVA_CONFLITANTE");
  assert.equal(blocked.canConfirm, false);

  const allowed = buildBillingPlan(
    withReservation,
    { documentKey: "NF-8", allowBreakReservations: true, faturamentos: [{ lineId: "1", codigoPedido: "100", codigoProduto: "P001", quantidade: 10 }] },
    context,
  );
  assert.equal(allowed.linhas[0].status, "PRONTO");
  assert.equal(allowed.canConfirm, true);
});
