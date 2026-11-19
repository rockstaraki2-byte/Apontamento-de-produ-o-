import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addPreventiveInterval,
  daysBetween,
  getPreventivePlanStatus,
  preventiveAlertId,
  preventiveOrderId,
  preventivePlanBelongsToTenant,
} from "../src/maintenancePreventive";

test("meses de calendário mantêm o vencimento no último dia quando necessário", () => {
  assert.equal(addPreventiveInterval("2026-01-31", 1, "MONTHS"), "2026-02-28");
  assert.equal(addPreventiveInterval("2024-01-31", 1, "MONTHS"), "2024-02-29");
  assert.equal(addPreventiveInterval("2026-11-30", 3, "MONTHS"), "2027-02-28");
});

test("periodicidade em dias avança pela data real sem erro de fuso", () => {
  assert.equal(addPreventiveInterval("2026-11-19", 15, "DAYS"), "2026-12-04");
  assert.equal(daysBetween("2026-02-28", "2026-03-01"), 1);
});

test("planos sem data-base ficam pendentes e não viram atraso artificial", () => {
  assert.equal(
    getPreventivePlanStatus({ alertLeadDays: [7, 3, 1, 0] }, "2026-11-19"),
    "PRIMEIRA_PENDENTE",
  );
});

test("situação distingue execução, vencimento, alerta e plano em dia", () => {
  const plan = { nextDueDate: "2026-11-26", alertLeadDays: [7, 3, 1, 0] };
  assert.equal(getPreventivePlanStatus(plan, "2026-11-19"), "A_VENCER");
  assert.equal(getPreventivePlanStatus(plan, "2026-11-26"), "VENCE_HOJE");
  assert.equal(getPreventivePlanStatus(plan, "2026-11-27"), "VENCIDA");
  assert.equal(getPreventivePlanStatus(plan, "2026-11-18"), "EM_DIA");
  assert.equal(getPreventivePlanStatus(plan, "2026-11-19", true), "EM_EXECUCAO");
});

test("dados preventivos só pertencem ao tenant exato", () => {
  assert.equal(preventivePlanBelongsToTenant({ tenantId: "imperio" }, "imperio"), true);
  assert.equal(preventivePlanBelongsToTenant({ tenantId: "demonstracao" }, "imperio"), false);
  assert.equal(preventivePlanBelongsToTenant({ tenantId: "imperio" }, "global"), false);
});

test("IDs de OS e avisos são idempotentes por ciclo e destinatário", () => {
  assert.equal(preventiveOrderId("plan/one", "2026-11-26"), preventiveOrderId("plan/one", "2026-11-26"));
  assert.notEqual(preventiveOrderId("plan/one", "2026-11-26"), preventiveOrderId("plan/one", "2026-12-11"));
  assert.equal(
    preventiveAlertId("imperio", "plan/one", "2026-11-26", 7, "tech-1"),
    preventiveAlertId("imperio", "plan/one", "2026-11-26", 7, "tech-1"),
  );
  assert.notEqual(
    preventiveAlertId("imperio", "plan/one", "2026-11-26", 7, "tech-1"),
    preventiveAlertId("imperio", "plan/one", "2026-11-26", 7, "manager-1"),
  );
});
