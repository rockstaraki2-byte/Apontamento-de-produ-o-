import assert from "node:assert/strict";
import test from "node:test";
import { isDynamicImportLoadError } from "../src/utils/chunkLoadRecovery";

test("identifica falhas de módulos carregados sob demanda nos navegadores comuns", () => {
  const errors = [
    "Failed to fetch dynamically imported module: https://example.com/assets/EtiquetasTab.js",
    "Importing a module script failed.",
    "error loading dynamically imported module",
    "Unable to preload CSS for /assets/EtiquetasTab.css",
  ];

  for (const error of errors) {
    assert.equal(isDynamicImportLoadError(new Error(error)), true, error);
  }
});

test("não trata erros de dados como falha de atualização do aplicativo", () => {
  assert.equal(isDynamicImportLoadError(new Error("Firestore permission denied")), false);
  assert.equal(isDynamicImportLoadError(new Error("Erro inesperado ao renderizar.")), false);
  assert.equal(isDynamicImportLoadError(null), false);
});
