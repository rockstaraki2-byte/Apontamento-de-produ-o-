import assert from "node:assert/strict";
import { test } from "node:test";
import { isRetratilMechanism, restrictToRetratilMechanisms } from "../src/utils/imperioWorkflowUtils";

test("mecanismo retrátil aceita caixa, acentos e espaços sem liberar outros produtos", () => {
  for (const name of ["MECANISMO RETRÁTIL 1200", "Mecanismo retratil", "Kit mecanismo  retrátil reforçado"]) {
    assert.equal(isRetratilMechanism(name), true, name);
  }
  for (const name of [undefined, "", "MANCAL RETRÁTIL", "Barra chata", "Mecanismo fixo", "Mecanismo retrátilzinho"]) {
    assert.equal(isRetratilMechanism(name), false, name);
  }
});

test("restrição atende login, perfil e setor, inclusive usuários com vários setores", () => {
  assert.equal(restrictToRetratilMechanisms("imperio", { id: "montagem_retratil", role: "PRODUCAO" }, []), true);
  assert.equal(restrictToRetratilMechanisms("imperio", { id: "operador", role: "MONTAGEM_RETRATIL" }, []), true);
  assert.equal(restrictToRetratilMechanisms("imperio", { id: "operador", role: "PRODUCAO" }, ["Solda", "Montagem de Retrátil"]), true);
  assert.equal(restrictToRetratilMechanisms("imperio", { id: "operador", role: "PRODUCAO" }, ["Montagem Retratil"]), true);
  assert.equal(restrictToRetratilMechanisms("imperio", { id: "solda", role: "SOLDA" }, ["Solda"]), false);
});

test("nenhuma outra empresa recebe a restrição", () => {
  for (const tenant of ["outra", "", "global"]) {
    assert.equal(restrictToRetratilMechanisms(tenant, { id: "montagem_retratil", role: "MONTAGEM_RETRATIL" }, ["Montagem Retrátil"]), false);
  }
});
