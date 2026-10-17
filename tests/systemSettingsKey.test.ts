import assert from "node:assert/strict";
import { test } from "node:test";
import { systemSettingsDocumentId } from "../src/systemSettingsKey.js";

test("mantém id legado do Império e separa configurações dos demais tenants", () => {
  assert.equal(systemSettingsDocumentId("imperio", "default"), "default");
  assert.equal(systemSettingsDocumentId("sk", "default"), "tenant_sk__default");
  assert.equal(systemSettingsDocumentId("empresa-a", "default"), "tenant_empresa-a__default");
  assert.notEqual(
    systemSettingsDocumentId("sk", "default"),
    systemSettingsDocumentId("imperio", "default"),
  );
});

test("rejeita tenant global e ids de configuração inválidos", () => {
  assert.throws(() => systemSettingsDocumentId("global", "default"));
  assert.throws(() => systemSettingsDocumentId("sk", "nested/value"));
});
