import assert from "node:assert/strict";
import test from "node:test";
import type { ProductionBatch, User } from "../src/types";
import {
  getAssignableBatchOperators,
  getVisibleProductionBatches,
} from "../src/utils/productionBatchAccess";

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: "operator-a",
  name: "Operador A",
  role: "PRODUCAO",
  tenantId: "tenant-a",
  ...overrides,
});

const makeBatch = (id: number, overrides: Partial<ProductionBatch> = {}): ProductionBatch => ({
  id,
  name: `Lote ${id}`,
  sectorId: 1,
  orderIds: [],
  status: "PENDENTE",
  createdAt: id,
  tenantId: "tenant-a",
  ...overrides,
});

test("batch assignment candidates include only non-manager users from the active tenant", () => {
  const users = [
    makeUser({ id: "operator-a" }),
    makeUser({ id: "pcp-a", role: "PCP" }),
    makeUser({ id: "admin-a", role: "ADMIN" }),
    makeUser({ id: "manager-a", role: "GERENCIA" }),
    makeUser({ id: "operator-b", tenantId: "tenant-b" }),
  ];

  assert.deepEqual(
    getAssignableBatchOperators(users, "tenant-a").map((user) => user.id),
    ["operator-a", "pcp-a"],
  );
  assert.deepEqual(getAssignableBatchOperators(users, "global"), []);
});

test("operators see standard tenant batches and only gerencia batches assigned to them", () => {
  const user = makeUser({ id: "operator-a" });
  const batches = [
    makeBatch(1),
    makeBatch(2, { sectorId: 999, isGerenciaLote: true, assignedOperatorIds: ["operator-a"] }),
    makeBatch(3, { sectorId: 999, isGerenciaLote: true, assignedOperatorIds: ["operator-b"] }),
    makeBatch(4, { tenantId: "tenant-b" }),
  ];

  assert.deepEqual(
    getVisibleProductionBatches(batches, user, "tenant-a").map((batch) => batch.id),
    [1, 2],
  );
});

test("privileged users still see every batch in their tenant, never another tenant's batches", () => {
  const manager = makeUser({ id: "manager-a", role: "GERENCIA" });
  const batches = [
    makeBatch(1),
    makeBatch(2, { sectorId: 999, isGerenciaLote: true }),
    makeBatch(3, { tenantId: "tenant-b" }),
  ];

  assert.deepEqual(
    getVisibleProductionBatches(batches, manager, "tenant-a").map((batch) => batch.id),
    [1, 2],
  );
});

test("batch access fails closed for global sessions and tenant mismatches", () => {
  const batches = [makeBatch(1)];

  assert.deepEqual(getVisibleProductionBatches(batches, makeUser(), "global"), []);
  assert.deepEqual(getVisibleProductionBatches(batches, makeUser(), "tenant-b"), []);
  assert.deepEqual(getVisibleProductionBatches(batches, null, "tenant-a"), []);
});
