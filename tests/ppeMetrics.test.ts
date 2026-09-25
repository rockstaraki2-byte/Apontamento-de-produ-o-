import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEpiReplacementDashboard,
  getDistributionTiming,
  summarizeEpiConsumption,
} from "../src/ppeMetrics";
import type { EpiDistribution, Item, UniformDistribution } from "../src/types";

const day = (date: string) => new Date(`${date}T12:00:00`).getTime();

test("resume quantidade e número de entregas por EPI dentro do período", () => {
  const items = [
    { id: 1, code: "EPI-1", name: "Luva", type: "EPI" },
    { id: 2, code: "EPI-2", name: "Óculos", type: "EPI" },
    { id: 3, code: "P-1", name: "Produto", type: "PRODUTO" },
  ] as Item[];
  const distributions = [
    { id: "1", employeeId: "e1", itemId: 1, quantity: 2, date: day("2026-09-10") },
    { id: "2", employeeId: "e2", itemId: 1, quantity: 3, date: day("2026-09-20") },
    { id: "3", employeeId: "e1", itemId: 2, quantity: 1, date: day("2026-08-20") },
  ] as EpiDistribution[];

  assert.deepEqual(
    summarizeEpiConsumption(items, distributions, day("2026-09-01"), day("2026-09-30")),
    [
      { itemId: 1, code: "EPI-1", name: "Luva", quantity: 5, deliveries: 2 },
    ],
  );
});

test("calcula prazo e média só entre entregas do mesmo funcionário e do mesmo item", () => {
  const history = [
    { id: "a", employeeId: "e1", itemId: 10, quantity: 1, date: day("2026-06-01") },
    { id: "b", employeeId: "e1", itemId: 10, quantity: 1, date: day("2026-06-11") },
    { id: "c", employeeId: "e1", itemId: 11, quantity: 1, date: day("2026-06-12") },
    { id: "d", employeeId: "e1", itemId: 10, quantity: 1, date: day("2026-06-26") },
    { id: "e", employeeId: "e2", itemId: 10, quantity: 1, date: day("2026-06-27") },
  ] as EpiDistribution[];
  const current = history[3];
  const uniform = [
    { id: "u1", employeeId: "e1", uniformId: "camisa-M", quantity: 1, date: day("2026-06-25") },
  ] as UniformDistribution[];

  assert.deepEqual(getDistributionTiming("EPI", current, history, uniform), {
    previousDeliveryAt: day("2026-06-11"),
    daysSincePreviousDelivery: 15,
    averageUseDays: 12.5,
  });
});

test("usa somente as cinco entregas mais recentes para calcular a média de uso", () => {
  const dates = ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-13", "2026-01-23", "2026-05-03"];
  const history = dates.map((date, index) => ({
    id: String(index), employeeId: "e1", itemId: 10, quantity: 1, date: day(date),
  })) as EpiDistribution[];

  const timing = getDistributionTiming("EPI", history[5], history, []);
  assert.equal(timing.averageUseDays, 30.25);
});

test("dashboard sinaliza atraso e proximidade da troca usando o último recebimento", () => {
  const items = [
    { id: 10, code: "EPI-10", name: "Luva", type: "EPI", replacementIntervalDays: 30 },
    { id: 11, code: "EPI-11", name: "Óculos", type: "EPI" },
  ] as Item[];
  const distributions = [
    { id: "old", employeeId: "e1", itemId: 10, quantity: 1, date: day("2026-08-01") },
    { id: "new", employeeId: "e1", itemId: 10, quantity: 2, date: day("2026-09-01") },
  ] as EpiDistribution[];
  const now = day("2026-09-25");

  const rows = buildEpiReplacementDashboard(distributions, items, [
    { id: "e1", name: "Ana", sectorId: 1, isActive: true },
  ], now);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].quantity, 2);
  assert.equal(rows[0].daysRemaining, 6);
  assert.equal(rows[0].status, "PRÓXIMO");
});
