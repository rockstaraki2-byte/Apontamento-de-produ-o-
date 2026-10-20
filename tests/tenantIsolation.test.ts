import { test } from "node:test";
import assert from "node:assert/strict";
import { filterTenantRecords, tenantIdMatches, tenantScopedCacheKey } from "../src/tenantIsolation";

test("filtra setores por tenant e descarta dados sem tenant", () => {
  const sectors = [
    { id: 1, name: "Corte A", tenantId: "empresa-a" },
    { id: 1, name: "Corte B", tenantId: "empresa-b" },
    { id: 2, name: "Setor legado sem empresa" },
  ];

  assert.deepEqual(filterTenantRecords(sectors, "empresa-a"), [sectors[0]]);
  assert.deepEqual(filterTenantRecords(sectors, "empresa-b"), [sectors[1]]);
  assert.deepEqual(filterTenantRecords(sectors, "global"), []);
});

test("não trata identificadores globais ou vazios como tenant operacional", () => {
  assert.equal(tenantIdMatches("empresa-a", "global"), false);
  assert.equal(tenantIdMatches("empresa-a", ""), false);
  assert.equal(tenantIdMatches(undefined, "empresa-a"), false);
});

test("mantém uma chave de cache distinta para cada empresa", () => {
  assert.notEqual(
    tenantScopedCacheKey("sectors", "empresa-a"),
    tenantScopedCacheKey("sectors", "empresa-b"),
  );
});
