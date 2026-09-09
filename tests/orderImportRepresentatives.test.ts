import test from "node:test";
import assert from "node:assert/strict";
import { prepareOrder } from "../api/_lib/orderImportCore.ts";
import type { CatalogSnapshot } from "../api/_lib/orderImportRules.ts";

const now = new Date("2026-09-09T13:00:00-03:00");

const catalogWithoutPersistedRepresentatives: CatalogSnapshot = {
  customers: [
    { id: 1115, name: "KAVIN ESTOFADOS LTDA", tenantId: "imperio" },
  ],
  items: [
    {
      id: 5484,
      code: "5484",
      name: "BASE MESA DECORATIVA KAVIN - TUBO DE 1/2\" C/ CHAPA 50X50",
      tenantId: "imperio",
    },
  ],
  users: [],
};

function orderWithRepresentative(representante: string) {
  return {
    codigoPedido: "67231",
    cliente: { codigo: "1115", nome: "KAVIN ESTOFADOS LTDA" },
    representante,
    formaPagamento: "BOLETO 30 DIAS",
    prazos: [30],
    dataLimite: "2026-09-11",
    itens: [
      {
        codigoOriginal: "5484.3",
        descricao: "BASE MESA DECORATIVA KAVIN - TUBO DE 1/2\" C/ CHAPA 50X50",
        familia: "GERENCIAL",
        quantidade: 1,
        precoUnitario: "23,90",
        descontoPercentual: 0,
      },
    ],
  };
}

test("KESSE usa o representante padrão mesmo sem usuário persistido no Firestore", () => {
  const result = prepareOrder(
    orderWithRepresentative("KESSE"),
    catalogWithoutPersistedRepresentatives,
    now,
  );

  assert.equal(result.errors.length, 0);
  assert.equal(result.prepared?.representativeId, "representante_kesse");
  assert.equal(result.prepared?.representativeName, "Kesse Representante");
  assert.equal(result.preview.representanteAssociado?.id, "representante_kesse");
});

test("consultor desconhecido continua bloqueado em vez de virar venda direta", () => {
  const result = prepareOrder(
    orderWithRepresentative("CONSULTOR INEXISTENTE"),
    catalogWithoutPersistedRepresentatives,
    now,
  );

  assert.equal(result.prepared, null);
  assert.equal(
    result.errors.some((error) => error.code === "REPRESENTANTE_NAO_ENCONTRADO"),
    true,
  );
});
