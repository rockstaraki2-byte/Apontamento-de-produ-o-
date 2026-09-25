import assert from "node:assert/strict";
import test from "node:test";
import { createLoadMetrics, isFullySeparated, loadDate } from "../src/expeditionMetrics";
import type { Carga, Order } from "../src/types";

const order = { id: 13, orderCode: "65133", customerName: "Cliente", packedQuantity: 12, invoicedQuantity: 8 } as Order;
const first = {
  id: "first", name: "Primeira", status: "EM_SEPARACAO", orderIds: [13],
  scheduledDate: "2026-09-25", orderQuantities: { 13: 6 }, separatedQuantities: { 13: 6 }, createdAt: 1,
} as Carga;
const second = {
  id: "second", name: "Segunda", status: "EM_SEPARACAO", orderIds: [13],
  scheduledDate: "2026-09-26", orderQuantities: { 13: 10 }, separatedQuantities: { 13: 5 }, createdAt: 2,
} as Carga;

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
