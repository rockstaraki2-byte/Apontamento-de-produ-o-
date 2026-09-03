import assert from "node:assert/strict";
import { test } from "node:test";
import { isApprovedPackagingSource, isImperioPackagingUser } from "../src/utils/imperioPackagingUtils";

test("o acesso direto ao menu Embalar fica limitado ao coletor da Império", () => {
  assert.equal(isImperioPackagingUser("imperio", { role: "EMBALAGEM" }), true);
  assert.equal(isImperioPackagingUser("outra", { role: "EMBALAGEM" }), false);
  assert.equal(isImperioPackagingUser("imperio", { role: "PRODUCAO" }), false);
});

test("fontes aprovadas são reconhecidas sem depender de caixa ou campo legado", () => {
  assert.equal(isApprovedPackagingSource({ status: "aprovado" }), true);
  assert.equal(isApprovedPackagingSource({ status: "APROVADO" }), true);
  assert.equal(isApprovedPackagingSource({ statusQualidade: "APROVADO" }), true);
  assert.equal(isApprovedPackagingSource({ qualityStatus: " aprovado " }), true);
  assert.equal(isApprovedPackagingSource({ status: "pendente", qualidadeAprovada: true }), true);
  assert.equal(isApprovedPackagingSource({ status: "finalizado", qualidadeAprovada: false }), false);
});
