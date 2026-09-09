import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateLineTotals,
  deriveProductIdentity,
  mapPaymentMethod,
  matchCustomer,
  matchProduct,
  matchRepresentative,
  normalizeDeliveryDate,
  normalizePaymentTerms,
  resolveFiscalType,
  resolveRET,
  type CatalogSnapshot,
  type OrderImportPayload,
} from "../api/_lib/orderImportRules.ts";
import {
  processOrderImport,
  type AtomicCreateInput,
  type AtomicCreateResult,
  type ImportAuditInput,
  type OrderImportRepository,
} from "../api/_lib/orderImportCore.ts";

const fixedNow = new Date("2026-09-09T12:00:00-03:00");

const catalog: CatalogSnapshot = {
  customers: [
    { id: 856, name: "ROFER COMERCIO E IMPORTACAO LTDA", tenantId: "imperio" },
    { id: 25, name: "25 - Moveis Bom Pastor", tradeName: "Moveis Bom Pastor", tenantId: "imperio" },
    { id: 370, name: "STORE DECOR", tenantId: "imperio" },
  ],
  items: [
    { id: 2517, code: "2517", name: "BARRA CHATA REFORCO 53 CM 2 FUROS - PERFILADA", tenantId: "imperio" },
    { id: 3024, code: "3024", name: "PE ZINCADO", tenantId: "imperio" },
    { id: 4598, code: "4598", name: "PE COLORIDO", tenantId: "imperio" },
    { id: 9001, code: "9001", name: "MEDIDA FINAL 108 CM", tenantId: "imperio" },
    { id: 9002, code: "9002", name: "MEDIDA FINAL 118 CM", tenantId: "imperio" },
  ],
  users: [
    { id: "representante_imperio", name: "Império Representante", role: "REPRESENTANTE", tenantId: "imperio" },
    { id: "representante_kesse", name: "Kesse Representante", role: "REPRESENTANTE", tenantId: "imperio" },
    { id: "representante_andre", name: "André Representante", role: "REPRESENTANTE", tenantId: "imperio" },
    { id: "representante_danilo", name: "Danilo Representante", role: "REPRESENTANTE", tenantId: "imperio" },
    { id: "representante_lilian", name: "Lilian Representante", role: "REPRESENTANTE", tenantId: "imperio" },
    { id: "representante_angelo", name: "Ângelo representante", role: "REPRESENTANTE", tenantId: "imperio" },
  ],
};

function baseOrder(code = "67218") {
  return {
    codigoPedido: code,
    cliente: { codigo: "856", nome: "ROFER COMERCIO E IMPORTACAO LTDA" },
    representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
    formaPagamento: "CARTEIRA",
    prazos: [60],
    comNotaFiscal: false,
    dataLimite: "2099-09-08",
    possuiRET: false,
    itens: [
      {
        codigoOriginal: "2517.11",
        codigoProduto: "2517",
        descricao: "BARRA CHATA REFORCO 53 CM 2 FUROS - PERFILADA",
        familia: "GERENCIAL",
        cor: "CINZA",
        quantidade: 200,
        precoUnitario: "1,8500",
        descontoPercentual: 15,
      },
    ],
  };
}

class FakeRepo implements OrderImportRepository {
  existing = new Map<string, number[]>();
  markers = new Map<string, number[]>();
  audits: ImportAuditInput[] = [];
  created: AtomicCreateInput[] = [];
  failAtomic = false;
  nextId = 10000;

  async loadCatalog() { return catalog; }
  async findExistingOrderIds(_tenantId: string, code: string) { return this.existing.get(code) || []; }
  async createOrderAtomically(input: AtomicCreateInput): Promise<AtomicCreateResult> {
    const key = `${input.tenantId}:${input.prepared.codigoPedido}`;
    const marker = this.markers.get(key);
    if (marker) return { created: false, orderIds: [], existingOrderIds: marker };
    if (this.failAtomic) throw new Error("falha simulada dentro da transação");
    const ids = input.prepared.lines.map(() => this.nextId++);
    this.markers.set(key, ids);
    this.created.push(input);
    return { created: true, orderIds: ids };
  }
  async writeAudit(input: ImportAuditInput) { this.audits.push(input); }
}

const meta = { tenantId: "imperio", origem: "TEKSYSTEM_PDF", solicitadoPor: "teste", now: fixedNow };

test("1. pedido novo é criado", async () => {
  const repo = new FakeRepo();
  const result = await processOrderImport(repo, { pedidos: [baseOrder()] }, meta, false);
  assert.equal(result.resumo.criados, 1);
  assert.equal(result.resultados[0].status, "CRIADO");
});

test("2. pedido duplicado retorna JA_EXISTE", async () => {
  const repo = new FakeRepo();
  repo.existing.set("67218", [123]);
  const result = await processOrderImport(repo, { pedidos: [baseOrder()] }, meta, false);
  assert.equal(result.resultados[0].status, "JA_EXISTE");
  assert.equal(result.resultados[0].pedidoId, 123);
});

test("3. duas requisições simultâneas não duplicam o pedido", async () => {
  const repo = new FakeRepo();
  const payload: OrderImportPayload = { pedidos: [baseOrder()] };
  const [a, b] = await Promise.all([
    processOrderImport(repo, payload, meta, false),
    processOrderImport(repo, payload, meta, false),
  ]);
  const statuses = [a.resultados[0].status, b.resultados[0].status].sort();
  assert.deepEqual(statuses, ["CRIADO", "JA_EXISTE"]);
  assert.equal(repo.created.length, 1);
});

test("4. cliente é localizado pelo código", () => {
  const result = matchCustomer({ codigo: 856, nome: "nome qualquer" }, catalog.customers);
  assert.equal(result.customer?.id, 856);
});

test("5. cliente é localizado pelo nome normalizado", () => {
  const result = matchCustomer({ nome: "rofer comércio e importação ltda" }, catalog.customers);
  assert.equal(result.customer?.id, 856);
});

test("6. regra especial MOVEIS B P / código 25", () => {
  const result = matchCustomer({ codigo: 25, nome: "MOVEIS B P LTDA" }, catalog.customers);
  assert.equal(result.customer?.id, 25);
});

test("7. produto é localizado pelo código base removendo sufixo", () => {
  const result = matchProduct({ codigoOriginal: "2517.11", descricao: "outra" }, catalog.items);
  assert.equal(result.product?.id, 2517);
  assert.equal(result.identity.cor, "CINZA");
});

test("8. produto é localizado pela descrição exata normalizada", () => {
  const result = matchProduct({ descricao: "pé zincado" }, catalog.items);
  assert.equal(result.product?.id, 3024);
});

test("9. produto inexistente retorna PRODUTO_NAO_ENCONTRADO", () => {
  const result = matchProduct({ codigoOriginal: "999999", descricao: "INEXISTENTE" }, catalog.items);
  assert.equal(result.product, null);
  assert.equal(result.errors[0].code, "PRODUTO_NAO_ENCONTRADO");
});

for (const [suffix, expected] of [
  [".1", "ZINCADO"], [".3", "PRETO FOSCO"], [".4", "COBRE"], [".6", "CHAMPAGNE"],
  [".11", "CINZA"], [".12", "DOURADO"], [".14", "INOX"],
] as const) {
  test(`10. cor ${suffix} mapeia para ${expected}`, () => {
    assert.equal(deriveProductIdentity({ codigoOriginal: `4598${suffix}` }).cor, expected);
  });
}

test("11. produto sem sufixo permanece sem cor", () => {
  assert.equal(deriveProductIdentity({ codigoOriginal: "4598" }).cor, "-");
});

test("12. mesmo produto em duas cores continua em duas linhas", async () => {
  const repo = new FakeRepo();
  const order: any = baseOrder("70000");
  order.itens = [
    { ...order.itens[0], codigoOriginal: "4598.3", codigoProduto: "4598", descricao: "PE COLORIDO" },
    { ...order.itens[0], codigoOriginal: "4598.12", codigoProduto: "4598", descricao: "PE COLORIDO" },
  ];
  const result = await processOrderImport(repo, { pedidos: [order] }, meta, false);
  assert.equal(result.resultados[0].quantidadeItens, 2);
  assert.deepEqual(repo.created[0].prepared.lines.map((l) => l.color), ["PRETO FOSCO", "DOURADO"]);
});

test("13. quantidade decimal é preservada em escala inteira", () => {
  const result = calculateLineTotals({ quantidade: "1,5000", precoUnitario: "2,0000", descontoPercentual: 0 });
  assert.equal(result.totals?.quantityScaled, 15000);
  assert.equal(result.totals?.grossTotalScaled, 30000);
});

test("14. valor brasileiro 1.225,50 é interpretado corretamente", () => {
  const result = calculateLineTotals({ quantidade: 1, precoUnitario: "1.225,50", descontoPercentual: 0 });
  assert.equal(result.totals?.unitPriceScaled, 12255000);
});

test("15. desconto percentual recalcula bruto, desconto e líquido", () => {
  const result = calculateLineTotals({ quantidade: 200, precoUnitario: "1,85", descontoPercentual: 15 });
  assert.equal(result.totals?.grossTotalScaled, 3700000);
  assert.equal(result.totals?.discountAmountScaled, 555000);
  assert.equal(result.totals?.netTotalScaled, 3145000);
});

test("16. família GERENCIAL = SEM_NF", () => {
  assert.equal(resolveFiscalType({ itens: [{ familia: "GERENCIAL" }] }).fiscalType, "SEM_NF");
});

test("17. família INDEFINIDA = COM_NF", () => {
  assert.equal(resolveFiscalType({ itens: [{ familia: "INDEFINIDA" }] }).fiscalType, "COM_NF");
});

test("18. data futura válida é preservada", () => {
  assert.equal(normalizeDeliveryDate({ dataLimite: "2026-12-20" }, fixedNow).date, "2026-12-20");
});

test("19. previsão vazia usa a data atual de São Paulo", () => {
  assert.equal(normalizeDeliveryDate({ dataLimite: "" }, fixedNow).date, "2026-09-09");
});

test("20. previsão passada usa a data atual", () => {
  assert.equal(normalizeDeliveryDate({ dataLimite: "2026-09-08" }, fixedNow).date, "2026-09-09");
});

test("21. transação 74 marca RET", () => {
  assert.equal(resolveRET({ transacaoVenda: 74, possuiRET: false }), true);
  assert.equal(resolveRET({ transacaoVenda: 73, possuiRET: true }), false);
});

test("22. representantes conhecidos são mapeados", () => {
  const result = matchRepresentative("MAPEFOR REPRESENTACOES LTDA", catalog.users);
  assert.equal(result.representative?.name, "Danilo Representante");
});

test("23. consultor vazio resulta em nenhum representante sem erro", () => {
  const result = matchRepresentative("", catalog.users);
  assert.equal(result.representative, null);
  assert.equal(result.errors.length, 0);
});

test("24. falha atômica não deixa pedido parcial", async () => {
  const repo = new FakeRepo();
  repo.failAtomic = true;
  const result = await processOrderImport(repo, { pedidos: [baseOrder("80000")] }, meta, false);
  assert.equal(result.resultados[0].status, "ERRO");
  assert.equal(repo.created.length, 0);
  assert.equal(repo.markers.size, 0);
});

test("25. lote processa sucesso, duplicado e erro isoladamente", async () => {
  const repo = new FakeRepo();
  repo.existing.set("DUP", [500]);
  const invalid: any = baseOrder("BAD");
  invalid.itens[0].codigoProduto = "99999";
  invalid.itens[0].codigoOriginal = "99999";
  invalid.itens[0].descricao = "NAO EXISTE";
  const result = await processOrderImport(repo, { pedidos: [baseOrder("OK"), baseOrder("DUP"), invalid] }, meta, false);
  assert.equal(result.resumo.criados, 1);
  assert.equal(result.resumo.jaExistentes, 1);
  assert.equal(result.resumo.comErro, 1);
});

test("dryRun valida sem gravar nem auditar", async () => {
  const repo = new FakeRepo();
  const result = await processOrderImport(repo, { pedidos: [baseOrder("DRY")] }, meta, true);
  assert.equal(result.resultados[0].status, "VALIDO");
  assert.equal(repo.created.length, 0);
  assert.equal(repo.audits.length, 0);
});

test("famílias conflitantes retornam FAMILIA_NF_CONFLITANTE", () => {
  const result = resolveFiscalType({ itens: [{ familia: "GERENCIAL" }, { familia: "INDEFINIDA" }] });
  assert.equal(result.fiscalType, null);
  assert.equal(result.errors[0].code, "FAMILIA_NF_CONFLITANTE");
});

test("formas de pagamento são mapeadas", () => {
  assert.equal(mapPaymentMethod("BOLETO N DIAS"), "Boleto Bancário");
  assert.equal(mapPaymentMethod("PIX A VISTA"), "PIX");
  assert.equal(mapPaymentMethod("CARTEIRA"), "Carteira");
  assert.equal(mapPaymentMethod("DEPOSITO"), "Depósito em Conta");
});

test("prazos 30/45/60 são convertidos para array", () => {
  assert.deepEqual(normalizePaymentTerms("30/45/60"), [30, 45, 60]);
});

test("data impossível retorna DATA_INVALIDA", () => {
  const result = normalizeDeliveryDate({ dataLimite: "31/02/2026" }, fixedNow);
  assert.equal(result.date, null);
  assert.equal(result.errors[0].code, "DATA_INVALIDA");
});
