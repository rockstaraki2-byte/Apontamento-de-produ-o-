import assert from "node:assert/strict";
import test from "node:test";
import {
  createLoadMetrics,
  getOrderBillingSummary,
  isFullySeparated,
  loadDate,
  mergeCargaOrderAllocations,
} from "../src/expeditionMetrics";
import type { Carga, Order } from "../src/types";

const order = {
  id: 13,
  orderCode: "65133",
  customerName: "Cliente",
  totalQuantity: 16,
  packedQuantity: 12,
  invoicedQuantity: 8,
} as Order;
const first = {
  id: "first", name: "Primeira", status: "EM_SEPARACAO", orderIds: [13],
  scheduledDate: "2026-09-25", orderQuantities: { 13: 6 }, separatedQuantities: { 13: 6 }, createdAt: 1,
} as Carga;
const second = {
  id: "second", name: "Segunda", status: "EM_SEPARACAO", orderIds: [13],
  scheduledDate: "2026-09-26", orderQuantities: { 13: 10 }, separatedQuantities: { 13: 5 }, createdAt: 2,
} as Carga;

function orderForBilling(overrides: Partial<Order> = {}): Order {
  return {
    ...order,
    id: 101,
    orderCode: "PED-101",
    itemId: 1,
    color: "Preto",
    size: "Padrão",
    variation: "",
    customerName: "Cliente Teste",
    totalQuantity: 100,
    packedQuantity: 0,
    isActive: true,
    createdAt: 1,
    deliveryDate: "2026-10-01",
    status: "PENDENTE",
    ...overrides,
  } as Order;
}

function loadForBilling(overrides: Partial<Carga> = {}): Carga {
  return {
    id: "load-1",
    name: "Rota Teste",
    orderIds: [101],
    orderQuantities: { 101: 50 },
    status: "ABERTA",
    createdAt: 1,
    scheduledDate: "2026-10-01",
    ...overrides,
  } as Carga;
}

test("distribui embalado e faturado por carga sem contar o mesmo pedido duas vezes", () => {
  const calc = createLoadMetrics([second, first], [order]);
  assert.equal(calc.packedForLoad(first, 13), 6);
  assert.equal(calc.packedForLoad(second, 13), 6);
  assert.equal(calc.invoicedForLoad(first, 13), 6);
  assert.equal(calc.invoicedForLoad(second, 13), 2);
  assert.deepEqual([calc.metrics(second).required, calc.metrics(second).separated, calc.metrics(second).invoiced], [10, 5, 2]);
  assert.equal(calc.metrics(second).percent, 50);
});

test("carga só pode ficar pronta quando todos os pedidos vinculados estão separados", () => {
  assert.equal(isFullySeparated(first), true);
  assert.equal(isFullySeparated(second), false);
  assert.equal(isFullySeparated({ ...first, orderIds: [] }), false);
  assert.equal(isFullySeparated({ ...first, orderIds: [13, 14] }), false);
});

test("data programada em ISO continua no dia correto da TV", () => {
  assert.equal(loadDate({ ...first, scheduledDate: "2026-09-25T15:30:00.000Z" }), "2026-09-25");
});

test("vínculo mescla a versão atual da carga e preserva inclusões concorrentes", () => {
  const liveCarga = {
    ...first,
    orderIds: [13, 14],
    orderQuantities: { 13: 7, 14: 2 },
  } as Carga;

  const merged = mergeCargaOrderAllocations(liveCarga, [
    {
      orderId: 13,
      quantity: 2,
      availableQuantity: 4,
      targetQuantityAtSelection: 6,
    },
    {
      orderId: 15,
      quantity: 1,
      availableQuantity: 1,
      targetQuantityAtSelection: 0,
    },
  ]);

  assert.deepEqual(merged.orderIds, [13, 14, 15]);
  assert.deepEqual(merged.orderQuantities, { 13: 9, 14: 2, 15: 1 });
});

test("vínculo bloqueia quantidade que ficou indisponível enquanto a tela estava aberta", () => {
  const liveCarga = {
    ...first,
    orderQuantities: { 13: 7 },
  } as Carga;

  assert.throws(
    () =>
      mergeCargaOrderAllocations(liveCarga, [
        {
          orderId: 13,
          quantity: 4,
          availableQuantity: 4,
          targetQuantityAtSelection: 6,
        },
      ]),
    /Disponível agora: 3/,
  );
});

test("saldo de pedidos parcialmente faturados exclui as unidades já faturadas", () => {
  assert.deepEqual(
    getOrderBillingSummary(orderForBilling({ status: "FATURADO_PARCIAL", invoicedQuantity: 25 })),
    {
      total: 100,
      invoiced: 25,
      remaining: 75,
      isFullyInvoiced: false,
      isPartiallyInvoiced: true,
      billingDataIncomplete: false,
    },
  );
});

test("pedido totalmente faturado fica bloqueado mesmo se faltar a quantidade faturada", () => {
  const complete = getOrderBillingSummary(orderForBilling({ status: "FATURADO", invoicedQuantity: 0 }));
  assert.equal(complete.invoiced, 100);
  assert.equal(complete.remaining, 0);
  assert.equal(complete.isFullyInvoiced, true);
});

test("faturamento parcial sem quantidade registrada permanece bloqueado para conferência", () => {
  const summary = getOrderBillingSummary(orderForBilling({ status: "FATURADO_PARCIAL", invoicedQuantity: 0 }));
  assert.equal(summary.remaining, 0);
  assert.equal(summary.billingDataIncomplete, true);
});

test("quantidade faturada é atribuída primeiro às cargas mais antigas", () => {
  const earlier = loadForBilling({ scheduledDate: "2026-09-30", orderQuantities: { 101: 30 } });
  const future = loadForBilling({
    id: "load-2",
    scheduledDate: "2026-10-02",
    orderQuantities: { 101: 70 },
  });
  const metrics = createLoadMetrics(
    [future, earlier],
    [orderForBilling({ status: "FATURADO_PARCIAL", invoicedQuantity: 40 })],
  );

  assert.equal(metrics.invoicedForLoad(earlier, 101), 30);
  assert.equal(metrics.invoicedForLoad(future, 101), 10);
});

test("vínculo recusa quantidade acima do saldo liberado sem carga", () => {
  assert.throws(
    () => mergeCargaOrderAllocations(loadForBilling(), [{
      orderId: 101,
      quantity: 76,
      availableQuantity: 75,
      targetQuantityAtSelection: 50,
    }]),
    /Disponível agora: 75/,
  );
});
