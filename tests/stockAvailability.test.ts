import assert from "node:assert/strict";
import test from "node:test";
import {
  exceedsPlanningReservation,
  planningReservationWarning,
} from "../src/stockAvailability";

test("a stock shortage without production reservations reports the actual cause", () => {
  const stock = { quantity: 300, planningReservedQuantity: 0 };
  assert.equal(exceedsPlanningReservation(stock, 500), true);
  const warning = planningReservationWarning(stock, 500);
  assert.match(warning, /300 unidade\(s\) disponíveis/);
  assert.match(warning, /precisa de 500/);
  assert.doesNotMatch(warning, /reservada/);
});

test("a production reservation reports the physical and available quantities", () => {
  const stock = { quantity: 500, planningReservedQuantity: 200 };
  assert.equal(exceedsPlanningReservation(stock, 400), true);
  const warning = planningReservationWarning(stock, 400);
  assert.match(warning, /500 unidade\(s\) no estoque/);
  assert.match(warning, /200 reservada\(s\)/);
  assert.match(warning, /300 disponível\(is\)/);
});
