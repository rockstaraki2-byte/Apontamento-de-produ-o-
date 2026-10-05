import test from "node:test";
import assert from "node:assert/strict";
import {
  syncRecordKey,
  validateAndNormalizeTekSystemSync,
} from "../api/_lib/teksystemSync.ts";
import { makeSince, splitPayload } from "../tools/teksystem-sync-cycle-utils.ts";

function sample() {
  return {
    schemaVersion: 1,
    tenantId: "imperio",
    source: { host: "SERVIDOR", serverPort: 5700, databasePort: 3055 },
    entities: {
      clientes: [{ codigo: "501", nome: "CLIENTE EXEMPLO" }],
      produtos: [{ externalId: "P-001", descricao: "PRODUTO EXEMPLO" }],
      pedidos: [{ codigoPedido: "PED-001", clienteCodigo: "501" }],
      faturamentos: [{ numeroNota: "NF-001", codigoPedido: "PED-001" }],
      romaneios: [{ externalId: "romaneio:22:99", cargaId: 22, cargaItemId: 99, codigoPedido: "PED-001" }],
    },
  };
}

test("normaliza as cinco entidades e cria externalId quando necessário", () => {
  const result = validateAndNormalizeTekSystemSync(sample());
  assert.equal(result.ok, true);
  assert.deepEqual(result.counts, {
    clientes: 1,
    produtos: 1,
    pedidos: 1,
    faturamentos: 1,
    romaneios: 1,
  });
  assert.equal(result.payload?.entities.clientes[0].externalId, "501");
  assert.equal(result.payload?.entities.pedidos[0].externalId, "PED-001");
  assert.equal(result.payload?.entities.romaneios[0].externalId, "romaneio:22:99");
  assert.equal(result.payload?.tenantId, "imperio");
  assert.match(result.payload?.payloadHash || "", /^[a-f0-9]{64}$/);
});

test("rejeita tenant diferente do autorizado", () => {
  const result = validateAndNormalizeTekSystemSync({ ...sample(), tenantId: "outra-empresa" });
  assert.equal(result.ok, false);
  assert.equal(result.payload, null);
  assert.equal(result.issues.some((issue) => issue.field === "tenantId"), true);
});

test("rejeita externalId duplicado dentro do mesmo lote", () => {
  const payload = sample();
  payload.entities.produtos = [
    { externalId: "P-001", descricao: "A" },
    { externalId: "P-001", descricao: "B" },
  ];
  const result = validateAndNormalizeTekSystemSync(payload);
  assert.equal(result.ok, false);
  assert.equal(result.issues.some((issue) => issue.field.includes("produtos[1]")), true);
});

test("a chave de staging é determinística e separa entidades", () => {
  const customerKey = syncRecordKey("imperio", "clientes", "501");
  assert.equal(customerKey, syncRecordKey("imperio", "clientes", "501"));
  assert.notEqual(customerKey, syncRecordKey("imperio", "produtos", "501"));
  assert.match(customerKey, /^[a-f0-9]{64}$/);
});

test("modo delta é preservado e modo desconhecido volta para snapshot", () => {
  const delta = validateAndNormalizeTekSystemSync({ ...sample(), modo: "delta" });
  const snapshot = validateAndNormalizeTekSystemSync({ ...sample(), modo: "outro" as any });
  assert.equal(delta.payload?.modo, "delta");
  assert.equal(snapshot.payload?.modo, "snapshot");
});

test("divide lotes sem perder registros e mantém no máximo o limite por envio", () => {
  const payload = sample();
  const chunks = splitPayload(payload, 2);
  assert.equal(chunks.length, 3);
  assert.deepEqual(chunks.map((chunk) =>
    Object.values(chunk.entities || {}).reduce((sum, rows) => sum + (rows?.length || 0), 0),
  ), [2, 2, 1]);
  assert.equal(chunks.reduce((sum, chunk) =>
    sum + Object.values(chunk.entities || {}).reduce((inner, rows) => inner + (rows?.length || 0), 0),
  0), 5);
});

test("cursor delta usa lookback inicial ou reprocessa pequena janela de segurança", () => {
  const now = new Date("2026-10-05T15:00:00.000Z");
  assert.equal(
    makeSince({}, now, 24, 5).toISOString(),
    "2026-10-04T14:55:00.000Z",
  );
  assert.equal(
    makeSince({ lastSuccessfulWatermark: "2026-10-05T14:00:00.000Z" }, now, 24, 5).toISOString(),
    "2026-10-05T13:55:00.000Z",
  );
});
