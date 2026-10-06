import test from "node:test";
import assert from "node:assert/strict";
import { validateAndNormalizeTekSystemSync } from "../api/_lib/teksystemSync.js";
import { buildWriterJobs, hasTransaction74, planWriterJob, type WriterCatalog, type WriterJob } from "../api/_lib/teksystemWriter.js";
import { buildImportedOrderDocument } from "../api/_lib/orderImportDocuments.js";
import { splitPayload } from "../tools/teksystem-sync-cycle-utils.js";
import { readOnlyRows } from "../tools/teksystem-firebird-v2.js";
import * as Firebird from "node-firebird";
import { EventEmitter } from "node:events";

const now = new Date("2026-10-06T12:00:00-03:00");
function catalog(): WriterCatalog { return {
  customers: [{ id: 5, tenantId: "imperio", name: "CLIENTE", hasRET: true }],
  items: [{ id: 100, code: "2517", name: "BARRA", tenantId: "imperio", type: "PRODUTO", components: [{ itemId: 101, quantity: 2 }] }],
  users: [{ id: "representante_imperio", name: "Império Representante", tenantId: "imperio", role: "REPRESENTANTE" }],
}; }
function sourceRow() { return { externalId: "pedido:77:900", codigopedido: 77, detalheid: 900, empresa: 1,
  cliente: 5, codigoitem: "2517.11", cordescricao: "CINZA", variacao: 0, variacaodescricao: "INDEFINIDA", gradedescricao: "-",
  quantidade: 10, precounitariobruto: 20, precounitario: 18, familiadescricao: "GERENCIAL", transacaovenda: 74,
  prazos: [{ dias: 30, formapagamentodescricao: "BOLETO BANCARIO - A PRAZO" }], representantes: [],
  promessaentrega: "2026-10-09T03:00:00Z", emitidoem: now.toISOString(), observacoes: "", observacoesitem: "" }; }
function payload() { return { tenantId: "imperio", generatedAt: now.toISOString(), source: { readerVersion: 2, completeOrderSnapshots: true },
  entities: { pedidos: [sourceRow()], romaneios: [{ ...sourceRow(), externalId: "romaneio:10:20", quantidadefaturada: 4, emitidoem: now.toISOString() }] } }; }
function jobs() { return buildWriterJobs(validateAndNormalizeTekSystemSync(payload()).payload!); }
function job(kind: WriterJob["kind"], rows: any[]): WriterJob { return { ...jobs()[0], kind, externalKey: kind === "clientes" ? "5" : "2517", rows }; }

test("normalização preserva datas reais e datas aninhadas", () => {
  const input = payload(); (input.entities.pedidos[0] as any).emitidoem = now;
  (input.entities.pedidos[0].prazos[0] as any).vencimento = now;
  const row: any = validateAndNormalizeTekSystemSync(input).payload!.entities.pedidos[0];
  assert.equal(row.emitidoem, now.toISOString()); assert.equal(row.prazos[0].vencimento, now.toISOString());
});
test("cliente mantém id e campos próprios, mapeia contato, prazo e RET", () => {
  assert.equal(hasTransaction74("Transação de venda 74 para Família 0"), true);
  assert.equal(hasTransaction74("Pedido 74, transação 174"), false);
  const plan = planWriterJob(job("clientes", [{ codigo: 5, nome: "CLIENTE ATUAL", telefone: "1234", email: "A@B.COM", cidade: "UBÁ", estado: "mg", bairro: "CENTRO", prazosPadrao: [45,30], observacoescompravenda: "Transação 74" }]), catalog(), []);
  assert.equal(plan.mutations[0].docId, "5"); assert.equal(plan.mutations[0].patch.name, "CLIENTE ATUAL");
  assert.equal(plan.mutations[0].patch.defaultPaymentTerms, "30/45 Dias"); assert.equal(plan.mutations[0].patch.email, "a@b.com");
  assert.equal(plan.mutations[0].patch.hasRET, undefined); // already true: no unnecessary write
  assert.equal(plan.mutations[0].patch.defaultDiscountPercent, undefined);
});
test("item preserva composição e tipo interno existentes", () => {
  const plan = planWriterJob(job("produtos", [{ codigo: "2517", descricao: "BARRA NOVA", unidadesigla: "PÇ" }]), catalog(), []);
  assert.equal(plan.mutations[0].patch.name, "BARRA NOVA"); assert.equal(plan.mutations[0].patch.components, undefined);
  assert.equal(plan.mutations[0].patch.type, undefined);
});
test("pedido novo usa regras existentes, id da fonte e valores financeiros", () => {
  const plan = planWriterJob(jobs()[0], catalog(), [], now);
  assert.equal(plan.action, "CRIADO"); assert.equal(plan.createOrder!.prepared.lines[0].unitPrice, 20);
  assert.equal(plan.createOrder!.prepared.lines[0].discountPercent, 10);
  const order = buildImportedOrderDocument(plan.createOrder!, 0, 123, "boleto", "cadastro");
  assert.equal(order.teksystemLineId, "pedido:77:900"); assert.equal(order.hasRET, true);
  assert.equal(order.fiscalType, "SEM_NF"); assert.equal(order.variation, "-");
});
function existing() { const plan = planWriterJob(jobs()[0], catalog(), [], now); return buildImportedOrderDocument(plan.createOrder!, 0, 123, "boleto", "cadastro"); }
test("romaneio aplica total cumulativo e repetição não duplica faturamento", () => {
  const order = existing(); const billing = jobs()[1];
  const first = planWriterJob(billing, catalog(), [order], now);
  assert.equal(first.mutations[0].patch.invoicedQuantity, 4); assert.equal(first.mutations[0].patch.status, "FATURADO_PARCIAL");
  assert.equal(first.mutations[1].docId, "faturamento_123"); assert.equal(first.mutations[1].patch.skipInventoryUpdate, true);
  Object.assign(order, first.mutations[0].patch);
  assert.equal(planWriterJob(billing, catalog(), [order], now).mutations.length, 0);
  billing.rows.push({ ...billing.rows[0], externalId: "romaneio:11:21", quantidadefaturada: 6 });
  const second = planWriterJob(billing, catalog(), [order], now);
  assert.equal(second.mutations[0].patch.invoicedQuantity, 10); assert.equal(second.mutations[0].patch.status, "FATURADO");
});
test("estornos e excesso exigem revisão sem alterar o pedido", () => {
  const order: any = existing(); order.invoicedQuantity = 5;
  assert.throws(() => planWriterJob(jobs()[1], catalog(), [order], now), (e: any) => e.code === "ESTORNO_REQUER_REVISAO");
  const billing = jobs()[1]; billing.rows[0].quantidadefaturada = 11;
  assert.throws(() => planWriterJob(billing, catalog(), [existing()], now), (e: any) => e.code === "FATURAMENTO_EXCEDE_PEDIDO");
});
test("id já vinculado não permite trocar produto silenciosamente", () => {
  const order = existing(); order.itemId = 200;
  assert.throws(() => planWriterJob(jobs()[1], catalog(), [order], now), (e: any) => e.code === "IDENTIDADE_ITEM_DIVERGENTE");
});
test("catálogo/pedidos de outra empresa são recusados", () => {
  const other = catalog(); other.customers[0].tenantId = "outra";
  assert.throws(() => planWriterJob(jobs()[0], other, [], now), (e: any) => e.code === "TENANT_INVALIDO");
  const order = existing(); order.tenantId = "outra";
  assert.throws(() => planWriterJob(jobs()[1], catalog(), [order], now), (e: any) => e.code === "TENANT_INVALIDO");
});
test("leitor antigo, empresas não autorizadas e romaneios repetidos são recusados", () => {
  const input = payload(); input.source.readerVersion = 1;
  assert.throws(() => buildWriterJobs(validateAndNormalizeTekSystemSync(input).payload!));
  input.source.readerVersion = 2; input.entities.pedidos[0].empresa = 2;
  assert.throws(() => buildWriterJobs(validateAndNormalizeTekSystemSync(input).payload!), (e: any) => e.code === "EMPRESA_NAO_AUTORIZADA");
  const billing = jobs()[1]; billing.rows.push({ ...billing.rows[0] });
  assert.throws(() => planWriterJob(billing, catalog(), [existing()], now), (e: any) => e.code === "ROMANEIO_DUPLICADO");
});
test("split v2 mantém todas as linhas, romaneios e variantes na mesma página", () => {
  const input: any = payload(); input.entities.clientes = [{ codigo: 5, externalId: "cliente:5" }];
  input.entities.produtos = [{ codigo: "2517", externalId: "produto:2517" }, { codigo: "2517.11", externalId: "produto:2517.11" }];
  const pages = splitPayload(input, 2);
  assert.equal(pages.length, 3);
  const page = pages.find((p) => p.entities?.pedidos?.length)!;
  assert.equal(page.entities!.romaneios!.length, 1);
  assert.equal(pages.find((p) => p.entities?.produtos?.length)!.entities!.produtos!.length, 2);
  assert.throws(() => splitPayload(input, 1), /não pode ser dividido/);
});
test("BLOBs são lidos na mesma transação READ ONLY e decodificados em UTF8", async () => {
  let committed = false;
  const tx: any = { queryAsync: async () => [{ note: (transaction: any, cb: any) => {
    assert.equal(transaction, tx); const stream = new EventEmitter(); cb(null, "note", stream);
    queueMicrotask(() => { stream.emit("data", Buffer.from("Transação 74", "utf8")); stream.emit("end"); });
  } }], commitAsync: async () => { committed = true; }, rollbackAsync: async () => {} };
  const db: any = { transactionAsync: async (isolation: any) => { assert.equal(isolation, Firebird.ISOLATION_READ_COMMITTED_READ_ONLY); return tx; } };
  const rows = await readOnlyRows(db, "SELECT note FROM PESSOA");
  assert.equal(rows[0].note, "Transação 74"); assert.equal(committed, true);
});
