import assert from "node:assert/strict";
import { test } from "node:test";
import { getLaserQuoteDisplayStatus, getLaserQuoteFinishedStatus, getLaserQuoteMaterialMode, isFinishedLaserQuote, matchesLaserQuoteStatus } from "../src/utils/laserQuoteStatus";

test("finalização acompanha exatamente a aprovação com ou sem material", () => {
  assert.equal(getLaserQuoteFinishedStatus("imperio", { status: "APROVADO_COM_MATERIAL" }), "CORTADO_COM_MATERIAL");
  assert.equal(getLaserQuoteFinishedStatus("imperio", { status: "APROVADO_SEM_MATERIAL" }), "CORTADO_SEM_MATERIAL");
  assert.equal(getLaserQuoteFinishedStatus("imperio", { status: "APROVADO_SEM_MATERIAL", approvalMaterialMode: "COM_MATERIAL" }), "CORTADO_SEM_MATERIAL");
});

test("a modalidade é preservada após finalizar e após reabrir o orçamento", () => {
  assert.equal(getLaserQuoteMaterialMode({ status: "CORTADO_COM_MATERIAL" }), "COM_MATERIAL");
  assert.equal(getLaserQuoteMaterialMode({ status: "CORTADO_SEM_MATERIAL" }), "SEM_MATERIAL");
  assert.equal(getLaserQuoteFinishedStatus("imperio", { status: "ENVIADO", approvalMaterialMode: "SEM_MATERIAL" }), "CORTADO_SEM_MATERIAL");
  assert.equal(getLaserQuoteMaterialMode({ status: "APROVADO", approvalMaterialMode: "SEM_MATERIAL" }), null);
});

test("legados sem informação não têm material presumido", () => {
  for (const status of ["CORTADO", "FINALIZADO", "APROVADO", "RASCUNHO"] as const) {
    assert.equal(getLaserQuoteMaterialMode({ status }), null);
    assert.equal(getLaserQuoteFinishedStatus("imperio", { status }), "CORTADO");
  }
  assert.equal(getLaserQuoteDisplayStatus("imperio", { status: "FINALIZADO", approvalMaterialMode: "COM_MATERIAL" }), "CORTADO_COM_MATERIAL");
});

test("filtro geral de cortados abrange legados e novos; filtros específicos não se misturam", () => {
  for (const status of ["CORTADO", "FINALIZADO", "CORTADO_COM_MATERIAL", "CORTADO_SEM_MATERIAL"] as const) {
    assert.equal(isFinishedLaserQuote(status), true);
    assert.equal(matchesLaserQuoteStatus("imperio", { status }, "CORTADO"), true);
  }
  assert.equal(matchesLaserQuoteStatus("imperio", { status: "CORTADO_COM_MATERIAL" }, "CORTADO_SEM_MATERIAL"), false);
  assert.equal(matchesLaserQuoteStatus("imperio", { status: "CORTADO_SEM_MATERIAL" }, "CORTADO_SEM_MATERIAL"), true);
  assert.equal(matchesLaserQuoteStatus("imperio", { status: "CORTADO" }, "CORTADO_COM_MATERIAL"), false);
  assert.equal(matchesLaserQuoteStatus("imperio", { status: "APROVADO_COM_MATERIAL" }, "APROVADO"), true);
  assert.equal(isFinishedLaserQuote("APROVADO_SEM_MATERIAL"), false);
});

test("outras empresas mantêm finalização e filtros anteriores", () => {
  assert.equal(getLaserQuoteFinishedStatus("outra", { status: "APROVADO_COM_MATERIAL" }), "CORTADO");
  assert.equal(getLaserQuoteFinishedStatus("outra", { status: "APROVADO_SEM_MATERIAL" }), "CORTADO");
  assert.equal(getLaserQuoteDisplayStatus("outra", { status: "FINALIZADO", approvalMaterialMode: "COM_MATERIAL" }), "FINALIZADO");
  assert.equal(matchesLaserQuoteStatus("outra", { status: "FINALIZADO" }, "CORTADO"), false);
});
