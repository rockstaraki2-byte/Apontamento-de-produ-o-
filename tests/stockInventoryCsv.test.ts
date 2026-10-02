import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Item, StockEntry } from "../src/types";
import {
  buildStockCountImportPlan,
  parseStockCountQuantity,
  parseStockInventoryCsv,
} from "../src/utils/stockInventoryCsv";

const item: Item = {
  id: 42,
  code: "A-42",
  name: "Peça; especial",
  notes: "",
  type: "PRODUTO",
  unit: "PC",
};

const stock: StockEntry = {
  id: "42|PRETO|M|DIREITA|ACABADO",
  itemId: 42,
  color: "PRETO",
  size: "M",
  variation: "DIREITA",
  stage: "ACABADO",
  quantity: 10,
  reservedQuantity: 2,
};

describe("stock inventory CSV", () => {
  it("parses Excel semicolon files, quoted delimiters and Brazilian quantities", () => {
    const csv = '\uFEFFsep=;\r\n"ID_ESTOQUE";"ID_ITEM";"CODIGO";"DESCRICAO";"COR";"TAMANHO";"VARIACAO";"ESTAGIO";"QUANTIDADE_CONTADA"\r\n"42|PRETO|M|DIREITA|ACABADO";42;"A-42";"Peça; especial";PRETO;M;DIREITA;ACABADO;"1.234,5"\r\n';
    const table = parseStockInventoryCsv(csv);
    assert.equal(table.rows.length, 1);
    const plan = buildStockCountImportPlan(table, [item], [stock]);
    assert.equal(plan.errors.length, 0);
    assert.equal(plan.adjustments[0].after, 1234.5);
    assert.equal(plan.adjustments[0].before, 10);
  });

  it("allows zero counts, leaves blank counts unchanged and flags duplicate rows", () => {
    const csv = [
      "ID_ITEM;CODIGO;DESCRICAO;COR;TAMANHO;VARIACAO;ESTAGIO;QUANTIDADE_CONTADA",
      "42;A-42;\"Peça; especial\";PRETO;M;DIREITA;ACABADO;0",
      "42;A-42;\"Peça; especial\";PRETO;M;DIREITA;ACABADO;",
      "42;A-42;\"Peça; especial\";PRETO;M;DIREITA;ACABADO;4",
    ].join("\n");
    const plan = buildStockCountImportPlan(parseStockInventoryCsv(csv), [item], [stock]);
    assert.equal(plan.adjustments.length, 1);
    assert.equal(plan.adjustments[0].after, 0);
    assert.equal(plan.blankCount, 1);
    assert.equal(plan.errors.length, 1);
    assert.match(plan.errors[0], /repetido/);
  });

  it("rejects unknown products and malformed or negative quantities", () => {
    const csv = [
      "CODIGO;DESCRICAO;QUANTIDADE_CONTADA",
      "A-42;\"Peça; especial\";-2",
      "NAO-EXISTE;Inexistente;3",
    ].join("\n");
    const plan = buildStockCountImportPlan(parseStockInventoryCsv(csv), [item], [stock]);
    assert.equal(plan.adjustments.length, 0);
    assert.equal(plan.errors.length, 2);
  });

  it("parses Brazilian and English decimal quantities and rejects invalid values", () => {
    assert.equal(parseStockCountQuantity("2,75"), 2.75);
    assert.equal(parseStockCountQuantity("1.234,5"), 1234.5);
    assert.equal(parseStockCountQuantity("1,234.5"), 1234.5);
    assert.equal(parseStockCountQuantity("0"), 0);
    assert.ok(Number.isNaN(parseStockCountQuantity("-1")));
    assert.ok(Number.isNaN(parseStockCountQuantity("abc")));
  });
});
