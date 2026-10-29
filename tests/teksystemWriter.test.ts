import test from "node:test";
import assert from "node:assert/strict";
import { validateAndNormalizeTekSystemSync } from "../api/_lib/teksystemSync.js";
import { buildWriterJobs, hasTransaction74, planCargaQuantityMutations, planWriterJob, requiresOrderCancellationContext, sourcePayment, type WriterCatalog, type WriterJob } from "../api/_lib/teksystemWriter.js";
import { buildImportedOrderDocument } from "../api/_lib/orderImportDocuments.js";
import { splitPayload } from "../tools/teksystem-sync-cycle-utils.js";
import { buildOrderItemStatusProjection, readCompleteEntities, readOnlyRows, readOrderPresenceSnapshot } from "../tools/teksystem-firebird-v2.js";
import { orderPresenceLineTargets, orderPresenceLineTargetsHash, orderPresenceTargetCodes, orderPresenceTargetHash, planOrderLineCancellations, planOrderPresenceReconciliation } from "../api/_lib/teksystemOrderPresence.js";
import { orderLineIdsHash } from "../api/_lib/teksystemOrderPresenceHash.js";
import * as Firebird from "node-firebird";
import { EventEmitter } from "node:events";

const now = new Date("2026-10-06T12:00:00-03:00");
function catalog(): WriterCatalog { return {
  customers: [{ id: 5, tenantId: "imperio", name: "CLIENTE", city: "Ubá", hasRET: true }],
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
test("condição padrão da tabela comercial tem prioridade sobre o campo genérico e prazos", () => {
  const plan = planWriterJob(job("clientes", [{ codigo: 5, nome: "CLIENTE", condicaopagamento: 0,
    descricaocondicaopadrao: "BOLETO 30/60/90", prazosPadrao: [30] }]), catalog(), []);
  assert.equal(plan.mutations[0].patch.defaultPaymentTerms, "BOLETO 30/60/90");
  const undefinedCondition = planWriterJob(job("clientes", [{ codigo: 5, nome: "CLIENTE", condicaopagamento: 0 }]), catalog(), []);
  assert.equal(undefinedCondition.mutations[0].patch.defaultPaymentTerms, "");
});
test("pedido novo usa regras existentes, id da fonte e valores financeiros", () => {
  const plan = planWriterJob(jobs()[0], catalog(), [], now);
  assert.equal(plan.action, "CRIADO"); assert.equal(plan.createOrder!.prepared.lines[0].unitPrice, 20);
  assert.equal(plan.createOrder!.prepared.customerCity, "Ubá");
  assert.equal(plan.createOrder!.prepared.lines[0].discountPercent, 10);
  const order = buildImportedOrderDocument(plan.createOrder!, 0, 123, "boleto", "cadastro");
  assert.equal(order.teksystemLineId, "pedido:77:900"); assert.equal(order.hasRET, true);
  assert.equal(order.fiscalType, "SEM_NF"); assert.equal(order.variation, "-");
});
function existing() { const plan = planWriterJob(jobs()[0], catalog(), [], now); return buildImportedOrderDocument(plan.createOrder!, 0, 123, "boleto", "cadastro"); }
test("PDF é atualizado quando pagamento muda; vínculo técnico isolado não dispara exportação", () => {
  const order: any = existing();
  const currentJob = jobs()[0];
  for (const mutation of planWriterJob(currentJob, catalog(), [order], now).mutations) Object.assign(order, mutation.patch);
  assert.equal(planWriterJob(currentJob, catalog(), [order], now).details.pdfNeedsRefresh, false);
  delete order.teksystemLineId;
  const technical = planWriterJob(currentJob, catalog(), [order], now);
  assert.equal(technical.action, "JA_EXISTE");
  assert.equal(technical.details.pdfNeedsRefresh, false);
  for (const mutation of technical.mutations) Object.assign(order, mutation.patch);
  currentJob.rows[0].prazos[0].dias = 45;
  const changed = planWriterJob(currentJob, catalog(), [order], now);
  assert.equal(changed.action, "ATUALIZADO");
  assert.equal(changed.details.pdfNeedsRefresh, true);
  assert.equal(changed.mutations[0].patch.totalQuantity, undefined);
});
test("romaneio aplica total cumulativo e repetição não duplica faturamento", () => {
  const order = existing(); const billing = jobs()[1];
  assert.equal(billing.writerRevision, 2);
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
test("faturamento por linha não é bloqueado por outro item removido do pedido", () => {
  const source = payload();
  const removedLine = { ...sourceRow(), detalheid: 901, externalId: "pedido:77:901", quantidade: 10 };
  source.entities.pedidos = [sourceRow(), removedLine];
  source.entities.romaneios = [{ ...sourceRow(), externalId: "romaneio:10:20", quantidadefaturada: 4 }];
  const normalized = validateAndNormalizeTekSystemSync(source).payload!;
  const [orderJob, billingJob] = buildWriterJobs(normalized).filter((entry) => ["pedidos", "romaneios"].includes(entry.kind));
  const created = planWriterJob(orderJob, catalog(), [], now).createOrder!;
  const orders = [
    buildImportedOrderDocument(created, 0, 123, "boleto", "cadastro"),
    buildImportedOrderDocument(created, 1, 124, "boleto", "cadastro"),
  ];
  billingJob.orderRows = [sourceRow()];
  const plan = planWriterJob(billingJob, catalog(), orders, now);
  assert.equal(plan.action, "FATURADO");
  assert.equal(plan.mutations[0].docId, "123");
  assert.equal(plan.mutations[0].patch.invoicedQuantity, 4);
  assert.equal(plan.mutations.some((mutation) => mutation.docId === "124"), false);
});
test("linha de cabeçalho sem chave não bloqueia outras linhas faturadas", () => {
  const order = existing();
  const billing = jobs()[1];
  billing.orderRows = [{ codigopedido: 77, empresa: 1, cliente: 5, externalId: "pedido:77:cabecalho" }, sourceRow()];
  const plan = planWriterJob(billing, catalog(), [order], now);
  assert.equal(plan.action, "FATURADO");
  assert.equal(plan.mutations[0].patch.invoicedQuantity, 4);
});
test("romaneio de linha removida usa chave estável e quantidade do próprio documento", () => {
  const source: any = payload();
  const removedLine = { ...sourceRow(), detalheid: 901, externalId: "pedido:77:901", quantidade: 10 };
  source.entities.pedidos = [sourceRow(), removedLine];
  source.entities.romaneios = [{ ...removedLine, cliente: undefined, clientecodigo: 5, quantidadepedido: 3,
    externalId: "romaneio:10:21", quantidadefaturada: 2 }];
  const normalized = validateAndNormalizeTekSystemSync(source).payload!;
  const [orderJob, billingJob] = buildWriterJobs(normalized).filter((entry) => ["pedidos", "romaneios"].includes(entry.kind));
  const created = planWriterJob(orderJob, catalog(), [], now).createOrder!;
  const orders = [
    buildImportedOrderDocument(created, 0, 123, "boleto", "cadastro"),
    buildImportedOrderDocument(created, 1, 124, "boleto", "cadastro"),
  ];
  billingJob.orderRows = [sourceRow()];
  const plan = planWriterJob(billingJob, catalog(), orders, now);
  assert.equal(plan.action, "FATURADO");
  assert.equal(plan.mutations[0].docId, "124");
  assert.equal(plan.mutations[0].patch.totalQuantity, 3);
  assert.equal(plan.mutations[0].patch.invoicedQuantity, 2);
  assert.equal(plan.mutations[0].patch.status, "FATURADO_PARCIAL");
});
test("quantidade menor da origem atualiza faturamento sem ultrapassar produção registrada", () => {
  const order = existing(); order.totalQuantity = 10; order.packedQuantity = 5;
  const billing = jobs()[1]; billing.orderRows[0].quantidade = 8;
  billing.rows[0].quantidadepedido = 8; billing.rows[0].quantidadefaturada = 4;
  const plan = planWriterJob(billing, catalog(), [order], now);
  assert.equal(plan.mutations[0].patch.totalQuantity, 8);
  assert.equal(plan.mutations[0].patch.invoicedQuantity, 4);
  order.packedQuantity = 9;
  assert.throws(() => planWriterJob(billing, catalog(), [order], now), (e: any) => e.code === "QUANTIDADE_FONTE_MENOR_QUE_OPERACAO");
});
test("romaneio já lançado é contabilizado sem reativar um item cancelado", () => {
  const order = existing(); order.status = "CANCELADO"; order.isActive = false;
  const plan = planWriterJob(jobs()[1], catalog(), [order], now);
  assert.equal(plan.action, "FATURADO");
  assert.equal(plan.mutations[0].patch.invoicedQuantity, 4);
  assert.equal(plan.mutations[0].patch.status, "CANCELADO");
  assert.equal(plan.mutations[0].patch.isActive, false);
  assert.equal(plan.mutations.some((mutation) => mutation.collection === "logs"), true);
});
test("id já vinculado não permite trocar produto silenciosamente", () => {
  const order = existing(); order.itemId = 200;
  assert.throws(() => planWriterJob(jobs()[1], catalog(), [order], now), (e: any) => e.code === "IDENTIDADE_ITEM_DIVERGENTE");
});
test("pedido existente associa pelo código, mesmo com id interno e texto de variação diferentes", () => {
  const cat = catalog(); cat.items.push({ id: 999, code: "2517.11", tenantId: "imperio" });
  const order: any = existing(); order.itemId = 999; order.teksystemLineId = "";
  order.variation = "GIRATORIO"; order.notes = "Observação humana";
  const orderJob = jobs()[0]; orderJob.rows[0].observacoesitem = "GIRATORIA";
  const plan = planWriterJob(orderJob, cat, [order], now);
  assert.equal(plan.mutations[0].patch.teksystemLineId, "pedido:77:900");
  assert.equal(plan.mutations[0].patch.itemId, undefined);
  assert.equal(plan.mutations[0].patch.totalQuantity, undefined);
  assert.equal(plan.mutations[0].patch.variation, "GIRATORIA");
  assert.match(plan.mutations[0].patch.notes, /^Observação humana/);
});
test("cor indefinida da origem não impede associação única por código", () => {
  const order = existing(); const orderJob = jobs()[0];
  orderJob.rows[0].codigoitem = "2517"; orderJob.rows[0].cordescricao = "INDEFINIDA";
  assert.doesNotThrow(() => planWriterJob(orderJob, catalog(), [order], now));
});
test("Tek-System corrige cor e medida divergentes em pedido ainda sem operação", () => {
  const order = existing(); order.color = "ZINCADO";
  const colorPlan = planWriterJob(jobs()[0], catalog(), [order], now);
  assert.equal(colorPlan.mutations[0].patch.color, "CINZA");
  const other = existing(); other.size = "40";
  const orderJob = jobs()[0]; orderJob.rows[0].gradedescricao = "50";
  const sizePlan = planWriterJob(orderJob, catalog(), [other], now);
  assert.equal(sizePlan.mutations[0].patch.size, "50");
});
test("código repetido sem chave não usa nome, quantidade nem primeiro candidato para adivinhar", () => {
  const first: any = existing(); first.teksystemLineId = "";
  const second = { ...first, id: 124, totalQuantity: 20, variation: "OUTRO" };
  assert.throws(() => planWriterJob(jobs()[0], catalog(), [first, second], now), (e: any) => e.code === "ITEM_PEDIDO_AMBIGUO");
});
test("pedido 68052: cor, variação e valor líquido identificam as linhas legadas sem chave", () => {
  const first: any = existing();
  Object.assign(first, { id: 123, docId: "123", teksystemLineId: "", originalProductCode: "2517.1",
    color: "ZINCADO", variation: "VAR-B", totalQuantity: 10, unitPrice: 40, discountPercent: 25 });
  const second: any = { ...first, id: 124, docId: "124", originalProductCode: "2517.11",
    color: "CINZA", variation: "VAR-A", totalQuantity: 5, unitPrice: 50, discountPercent: 20 };
  const orderJob = jobs()[0];
  Object.assign(orderJob.rows[0], { detalheid: 900, codigoitem: "2517.11", variacao: 1, variacaodescricao: "VAR-A",
    quantidade: 5, precounitariobruto: 50, precounitario: 40 });
  orderJob.rows[0].externalId = "pedido:77:900";
  orderJob.rows.push({ ...orderJob.rows[0], externalId: "pedido:77:901", detalheid: 901, codigoitem: "2517.1",
    variacao: 2, variacaodescricao: "VAR-B", quantidade: 10, precounitariobruto: 40, precounitario: 30 });
  const plan = planWriterJob(orderJob, catalog(), [first, second], now);
  const firstLink = plan.details.vinculosItens.find((link: any) => link.itemApontaPRO === 123);
  const secondLink = plan.details.vinculosItens.find((link: any) => link.itemApontaPRO === 124);
  assert.equal(firstLink.linhaTekSystem, "pedido:77:901");
  assert.equal(secondLink.linhaTekSystem, "pedido:77:900");
  assert.match(firstLink.criterio.join(" "), /cor.*variação.*valor líquido unitário/);
  assert.match(secondLink.criterio.join(" "), /cor.*variação.*valor líquido unitário/);
});
test("atributos de identificação conflitantes não escolhem uma linha automaticamente", () => {
  const first: any = existing();
  Object.assign(first, { id: 123, docId: "123", teksystemLineId: "", color: "CINZA", variation: "VAR-B", unitPrice: 40, discountPercent: 25 });
  const second: any = { ...first, id: 124, docId: "124", color: "ZINCADO", variation: "VAR-A", unitPrice: 50, discountPercent: 20 };
  const orderJob = jobs()[0];
  Object.assign(orderJob.rows[0], { variacao: 1, variacaodescricao: "VAR-A", precounitariobruto: 50, precounitario: 40 });
  assert.throws(() => planWriterJob(orderJob, catalog(), [first, second], now), (error: any) => error.code === "ITEM_PEDIDO_AMBIGUO");
});
test("Tek-System sobrescreve identidade e preço divergentes quando a linha já está vinculada e livre", () => {
  const order: any = existing();
  Object.assign(order, { color: "ZINCADO", variation: "ANTIGA", unitPrice: 99, discountPercent: 0 });
  const plan = planWriterJob(jobs()[0], catalog(), [order], now);
  const patch = plan.mutations[0].patch;
  assert.equal(patch.color, "CINZA"); assert.equal(patch.variation, "-");
  assert.equal(patch.unitPrice, 20); assert.equal(patch.discountPercent, 10);
});
test("Tek-System corrige o produto vinculado e o cliente do pedido ainda pendente", () => {
  const cat = catalog(); cat.items.push({ id: 200, code: "3730", name: "BARRA NOVA", tenantId: "imperio" });
  const order: any = existing(); Object.assign(order, { itemId: 100, customerId: 99, customerName: "CLIENTE INCORRETO" });
  const orderJob = jobs()[0]; orderJob.rows[0].codigoitem = "3730";
  const plan = planWriterJob(orderJob, cat, [order], now);
  assert.equal(plan.mutations[0].patch.itemId, 200);
  assert.equal(plan.mutations[0].patch.customerId, 5);
  assert.equal(plan.mutations[0].patch.customerName, "CLIENTE");
});
test("identidade divergente não é reescrita depois que há operação registrada", () => {
  const order: any = existing(); order.color = "ZINCADO"; order.packedQuantity = 1;
  assert.throws(() => planWriterJob(jobs()[0], catalog(), [order], now), (error: any) => error.code === "IDENTIDADE_COM_OPERACAO_INICIADA");
});
test("consultor sem correspondência não bloqueia a atualização de linhas existentes", () => {
  const order = existing();
  const orderJob = jobs()[0];
  orderJob.rows[0].consultoresvendas = [{ nome: "NOVO CONSULTOR" }];
  orderJob.rows[0].prazos[0].dias = 45;
  const plan = planWriterJob(orderJob, catalog(), [order], now);
  assert.equal(plan.mutations[0].patch.representativeId, undefined);
  assert.match(plan.details.avisos.join(" "), /representante existente preservado/);
});
test("quantidade alterada é atualizada antes da operação; item ausente continua em revisão", () => {
  const order = existing(); order.totalQuantity = 11;
  const updated = planWriterJob(jobs()[0], catalog(), [order], now);
  assert.equal(updated.action, "ATUALIZADO");
  assert.equal(updated.mutations[0].patch.totalQuantity, 10);
  assert.equal(updated.details.pdfNeedsRefresh, true);
  const orderJob = jobs()[0]; orderJob.rows.push({ ...orderJob.rows[0], detalheid: 901, codigoitem: "9999" });
  assert.throws(() => planWriterJob(orderJob, catalog(), [existing()], now), (e: any) => e.code === "PRODUTO_NAO_ENCONTRADO");
});
test("mudança de quantidade depois de produção/embalagem/faturamento exige revisão", () => {
  for (const field of ["packedQuantity", "producedQuantity", "paintedQuantity", "cutQuantity", "invoicedQuantity"]) {
    const order: any = existing(); order[field] = 1;
    const changedJob = jobs()[0]; changedJob.rows[0].quantidade = 11;
    assert.throws(() => planWriterJob(changedJob, catalog(), [order], now), (e: any) => e.code === "QUANTIDADE_COM_OPERACAO_INICIADA");
  }
});
test("pedido já faturado não recebe alteração comercial automática", () => {
  const order: any = existing(); order.invoicedQuantity = 1; order.status = "FATURADO_PARCIAL";
  const changedJob = jobs()[0]; changedJob.rows[0].precounitariobruto = 22;
  assert.throws(() => planWriterJob(changedJob, catalog(), [order], now), (e: any) => e.code === "PEDIDO_FATURADO_REQUER_REVISAO");
});
test("pedido novo nunca usa descrição para compensar código incorreto", () => {
  const orderJob = jobs()[0]; orderJob.rows[0].codigoitem = "9999"; orderJob.rows[0].descricaoitem = "BARRA";
  assert.throws(() => planWriterJob(orderJob, catalog(), [], now), (e: any) => e.code === "PRODUTO_NAO_ENCONTRADO");
});
test("forma não suportada usa Outra forma e descreve a condição original no lançamento", () => {
  const orderJob = jobs()[0]; orderJob.rows[0].prazos = [{ dias: 0, formapagamentodescricao: "CARTÃO DE DÉBITO - A VISTA", valor: 180 }];
  orderJob.rows[0].descricaocondicaopagamento = "DÉBITO A VISTA";
  const prepared = planWriterJob(orderJob, catalog(), [], now).createOrder!.prepared;
  assert.equal(prepared.paymentCondition, "Outra forma");
  assert.deepEqual(prepared.paymentTermsDays, [0]);
  assert.match(prepared.orderNotes, /CARTÃO DE DÉBITO - A VISTA/);
  assert.match(prepared.orderNotes, /Condição: DÉBITO A VISTA/);
});
test("múltiplas formas preservam todas as descrições e os prazos da origem", () => {
  const payment = sourcePayment({ prazos: [{ dias: 0, formapagamentodescricao: "PIX" }, { dias: 30, formapagamentodescricao: "BOLETO" }] });
  assert.equal(payment.method, "Outra forma"); assert.deepEqual(payment.terms, [0,30]);
  assert.match(payment.description, /Forma: PIX/); assert.match(payment.description, /Forma: BOLETO/);
});
test("pagamento instantâneo é PIX; tabela comercial qualifica OUTROS sem perder o texto original", () => {
  assert.equal(sourcePayment({ prazos: [{ formapagamentodescricao: "PAGAMENTO INSTATANEO (PIX)" }] }).method, "PIX");
  const payment = sourcePayment({ descricaocondicaopagamento: "CARTEIRA", prazos: [{ dias: 30, formapagamentodescricao: "OUTROS" }] });
  assert.equal(payment.method, "Carteira"); assert.match(payment.description, /OUTROS/);
  assert.equal(sourcePayment({}).method, "Outra forma");
});
test("pedido existente atualiza pagamento da origem preservando notas e sem duplicar descrição", () => {
  const order: any = existing(); order.paymentCondition = "PIX"; order.paymentTerms = "90 Dias"; order.billingRule = "ultimo_pedido"; order.notes = "Manter entrega combinada";
  const first = planWriterJob(jobs()[0], catalog(), [order], now);
  assert.equal(first.mutations[0].patch.paymentCondition, "BOLETO");
  assert.equal(first.mutations[0].patch.paymentTerms, "30 Dias");
  assert.equal(first.mutations[0].patch.billingRule, "cadastro");
  assert.match(first.mutations[0].patch.notes, /Manter entrega combinada/);
  Object.assign(order, first.mutations[0].patch);
  assert.equal((order.notes.match(/\[Pagamento Tek-System\]/g) || []).length, 1);
  assert.equal(planWriterJob(jobs()[0], catalog(), [order], now).mutations.length, 0);
});
test("pedido existente sincroniza quantidade, preço, desconto, entrega e observações sem apagar nota local", () => {
  const order: any = existing();
  order.notes = `Anotação local\n\n${order.notes}`;
  const changedJob = jobs()[0];
  Object.assign(changedJob.rows[0], {
    quantidade: 12, precounitariobruto: 22, precounitario: 20,
    promessaentrega: "2026-10-12T03:00:00Z", observacoes: "Entregar no período da manhã",
    observacoesitem: "Separar com cuidado", transacaovenda: 73,
  });
  const plan = planWriterJob(changedJob, catalog(), [order], now);
  const patch = plan.mutations[0].patch;
  assert.equal(plan.action, "ATUALIZADO");
  assert.equal(patch.totalQuantity, 12); assert.equal(patch.unitPrice, 22);
  assert.equal(patch.deliveryDate, "2026-10-12"); assert.equal(patch.hasRET, false);
  assert.equal(patch.itemNotes, "Separar com cuidado");
  assert.match(patch.notes, /Anotação local/);
  assert.match(patch.notes, /\[Observações Tek-System\][\s\S]*Entregar no período da manhã/);
  assert.ok(Number(patch.discountPercent) > 9 && Number(patch.discountPercent) < 10);
  Object.assign(order, patch);
  assert.equal(planWriterJob(changedJob, catalog(), [order], now).mutations.length, 0);
});
test("mudança de quantidade atualiza a carga aberta sem perder auditoria ou outras alocações", () => {
  const changedJob = jobs()[0]; changedJob.rows[0].quantidade = 12;
  const order = existing();
  const plan = planWriterJob(changedJob, catalog(), [order], now);
  const carga: any = { id: "carga-1", docId: "carga-1", tenantId: "imperio", status: "ABERTA",
    orderIds: [123, 456], orderQuantities: { "123": 10, "456": 5 }, auditTrail: [] };
  const mutations = planCargaQuantityMutations(changedJob, plan, [carga], now);
  assert.equal(mutations.length, 1); assert.equal(mutations[0].collection, "cargas");
  assert.equal(mutations[0].patch.orderQuantities["123"], 12);
  assert.equal(mutations[0].patch.orderQuantities["456"], 5);
  assert.match(mutations[0].patch.auditTrail[0].action, /atualizada para 12/);
  carga.separatedQuantities = { "123": 1 };
  assert.throws(() => planCargaQuantityMutations(changedJob, plan, [carga], now), (e: any) => e.code === "CARGA_SEPARADA_REQUER_REVISAO");
});
function appendFixture() {
  const cat = catalog(); cat.items.push({ id: 200, code: "3730", name: "BARRA NOVA", tenantId: "imperio" });
  const order: any = existing(); order.packedQuantity = 7; order.producedQuantity = 8;
  const orderJob = jobs()[0]; orderJob.rows.push({ ...sourceRow(), detalheid: 901, codigoitem: "3730", quantidade: 50, precounitariobruto: 2.4, precounitario: 2.4 });
  return { cat, order, orderJob };
}
test("complementa somente linhas ausentes, com ID determinístico e apontamentos zerados", () => {
  const { cat, order, orderJob } = appendFixture();
  const plan = planWriterJob(orderJob, cat, [order], now);
  assert.equal(plan.action, "COMPLEMENTADO"); assert.equal(plan.details.quantidadeItensIncluidos, 1);
  const added = plan.mutations.filter((m) => !m.before);
  assert.equal(added.length, 1); assert.equal(added[0].patch.itemId, 200);
  assert.equal(added[0].patch.totalQuantity, 50); assert.equal(added[0].patch.unitPrice, 2.4);
  assert.equal(added[0].patch.packedQuantity, 0); assert.equal(added[0].patch.invoicedQuantity, 0);
  assert.equal(added[0].patch.teksystemLineId, "pedido:77:901");
  assert.equal(plan.orderGuards![0].id, order.id);
  const existingMutation = plan.mutations.find((m) => m.before)!;
  for (const field of ["totalQuantity", "packedQuantity", "producedQuantity", "itemId", "unitPrice", "status", "invoicedQuantity"]) assert.equal(existingMutation.patch[field], undefined);
  const again = planWriterJob(orderJob, cat, [order], new Date(now.getTime() + 60_000));
  assert.equal(again.mutations.find((m) => !m.before)!.docId, added[0].docId);
  const completed: any[] = [order];
  for (const m of plan.mutations) {
    if (m.before) Object.assign(order, m.patch); else completed.push({ ...m.patch, docId: m.docId });
  }
  assert.equal(planWriterJob(orderJob, cat, completed, now).action, "JA_EXISTE");
  assert.equal(planWriterJob(orderJob, cat, completed, now).mutations.length, 0);
});
test("linha nova de código repetido só é incluída quando as linhas antigas têm chave inequívoca", () => {
  const order = existing(); const orderJob = jobs()[0];
  orderJob.rows.push({ ...sourceRow(), detalheid: 901, quantidade: 5 });
  assert.equal(planWriterJob(orderJob, catalog(), [order], now).details.quantidadeItensIncluidos, 1);
  order.teksystemLineId = "";
  assert.throws(() => planWriterJob(orderJob, catalog(), [order], now), (e: any) => e.code === "ITEM_PEDIDO_AMBIGUO");
});
test("não transforma troca/remoção de item antigo em nova linha nem altera quantidade existente", () => {
  const { cat, order, orderJob } = appendFixture();
  orderJob.rows = [orderJob.rows[1]];
  const cancellationContext = { loaded: true, cargas: [], productionBatches: [], productionAgendas: [], coilCuttingPlans: [], productionSteps: [], logs: [] };
  const removedLinePlan = planWriterJob(orderJob, cat, [order], now, cancellationContext);
  assert.equal(removedLinePlan.mutations.find((m) => m.patch.status === "CANCELADO")?.docId, String(order.id));
  orderJob.rows.unshift(sourceRow()); order.totalQuantity = 9;
  assert.throws(() => planWriterJob(orderJob, cat, [order], now), (e: any) => e.code === "QUANTIDADE_COM_OPERACAO_INICIADA");
});
test("código ausente no catálogo e preço inválido da linha nova impedem qualquer complementação", () => {
  const { cat, order, orderJob } = appendFixture();
  orderJob.rows[1].codigoitem = "9999";
  assert.throws(() => planWriterJob(orderJob, cat, [order], now), (e: any) => e.code === "PRODUTO_NAO_ENCONTRADO");
  orderJob.rows[1].codigoitem = "3730"; orderJob.rows[1].precounitariobruto = 0; orderJob.rows[1].precounitario = 0;
  assert.throws(() => planWriterJob(orderJob, cat, [order], now), (e: any) => e.code === "PEDIDO_INVALIDO");
});
test("complementação preserva decisão fiscal existente e registra divergência sem corrigi-la silenciosamente", () => {
  const { cat, order, orderJob } = appendFixture(); orderJob.rows[1].familiadescricao = "INDEFINIDA";
  const plan = planWriterJob(orderJob, cat, [order], now);
  const added = plan.mutations.find((m) => !m.before)!;
  assert.equal(added.patch.fiscalType, "SEM_NF"); assert.equal(added.patch.teksystemSourceFiscalType, "COM_NF");
  assert.match(plan.details.avisos[0], /SEM_NF.*COM_NF/);
  assert.equal(plan.mutations.find((m) => m.before)!.patch.fiscalType, undefined);
});
test("pedido cancelado, cliente divergente e chaves repetidas não permitem adicionar itens", () => {
  const { cat, order, orderJob } = appendFixture(); order.status = "CANCELADO";
  assert.throws(() => planWriterJob(orderJob, cat, [order], now), (e: any) => e.code === "PEDIDO_CANCELADO");
  order.status = "PENDENTE"; order.customerId = 6;
  assert.throws(() => planWriterJob(orderJob, cat, [order], now), (e: any) => e.code === "IDENTIDADE_COM_OPERACAO_INICIADA");
  order.customerId = 5; orderJob.rows[1].detalheid = 900;
  assert.throws(() => planWriterJob(orderJob, cat, [order], now), (e: any) => e.code === "ITEM_DUPLICADO");
});
test("cancelamento de origem preserva o pedido e remove vínculos de produção ainda não iniciados", () => {
  const order: any = existing();
  const source = { ...sourceRow(), situacaodescricao: "DOCUMENTO CANCELADO" };
  const cancellationJob = { ...jobs()[0], rows: [source] };
  const context = {
    loaded: true, productionAgendas: [], coilCuttingPlans: [],
    productionSteps: [], logs: [],
    productionBatches: [{ id: 44, docId: "44", tenantId: "imperio", name: "LOTE 44", status: "PENDENTE", orderIds: [order.id] }],
    cargas: [{ id: "carga-1", docId: "carga-1", tenantId: "imperio", name: "CARGA 1", status: "ABERTA", orderIds: [order.id],
      orderQuantities: { [order.id]: 10 }, separatedQuantities: {} }],
  };
  const plan = planWriterJob(cancellationJob, catalog(), [order], now, context);
  assert.equal(plan.action, "CANCELADO");
  assert.equal(plan.details.historicoPreservado, true);
  assert.equal(plan.details.pdfNeedsRefresh, false);
  assert.equal(plan.mutations.find((mutation) => mutation.collection === "orders")!.patch.status, "CANCELADO");
  const batchPatch = plan.mutations.find((mutation) => mutation.collection === "productionBatches")!.patch;
  const cargaPatch = plan.mutations.find((mutation) => mutation.collection === "cargas")!.patch;
  assert.deepEqual(batchPatch.orderIds, []);
  assert.deepEqual(cargaPatch.orderIds, []);
  assert.equal((cargaPatch.auditTrail as any[])[0].userId, "teksystem-sync-agent");
});
test("cancelamento parcial sem identificar a linha fica em revisão, mas histórico iniciado é preservado", () => {
  const order: any = existing();
  const context = { loaded: true, cargas: [], productionBatches: [], productionAgendas: [], coilCuttingPlans: [], productionSteps: [], logs: [] };
  const partial = { ...jobs()[0], rows: [{ ...sourceRow(), situacaodescricao: "DOCUMENTO CANCELADO PARCIAL" }] };
  assert.throws(() => planWriterJob(partial, catalog(), [order], now, context), (error: any) => error.code === "CANCELAMENTO_PARCIAL_REQUER_REVISAO");
  const canceled = { ...jobs()[0], rows: [{ ...sourceRow(), situacaodescricao: "DOCUMENTO CANCELADO" }] };
  order.packedQuantity = 1;
  const startedContext = { ...context,
    productionBatches: [{ id: 44, docId: "44", tenantId: "imperio", name: "LOTE 44", status: "EM_PRODUCAO", orderIds: [order.id], checkedOrderIds: [order.id], liberatedOrderIds: [order.id] }],
    logs: [{ orderId: order.id }],
  };
  const plan = planWriterJob(canceled, catalog(), [order], now, startedContext);
  assert.equal(plan.mutations.find((mutation) => mutation.collection === "orders")!.patch.status, "CANCELADO");
  const batchPatch = plan.mutations.find((mutation) => mutation.collection === "productionBatches")!.patch;
  assert.deepEqual(batchPatch.orderIds, [order.id]);
  assert.deepEqual(batchPatch.checkedOrderIds, []);
  assert.deepEqual(batchPatch.liberatedOrderIds, []);
});
test("snapshot completo cancela só a linha ausente e a remove do lote pendente", () => {
  const first: any = existing();
  const second: any = { ...first, id: 124, docId: "124", teksystemLineId: "pedido:77:901" };
  const jobWithOneRemainingLine = { ...jobs()[0], rows: [sourceRow()] };
  const batch = { id: 44, docId: "44", tenantId: "imperio", name: "LOTE 44", status: "PENDENTE",
    orderIds: [first.id, second.id], checkedOrderIds: [first.id, second.id], liberatedOrderIds: [second.id] };
  const context = { loaded: true, cargas: [], productionBatches: [batch], productionAgendas: [], coilCuttingPlans: [], productionSteps: [], logs: [] };
  assert.equal(requiresOrderCancellationContext(jobWithOneRemainingLine, [first, second]), true);
  const plan = planWriterJob(jobWithOneRemainingLine, catalog(), [first, second], now, context);
  assert.equal(plan.action, "CANCELAMENTO_PARCIAL");
  const canceled = plan.mutations.find((mutation) => mutation.collection === "orders" && mutation.patch.status === "CANCELADO")!;
  assert.equal(canceled.docId, "124");
  assert.equal(canceled.patch.status, "CANCELADO");
  assert.equal(canceled.patch.isActive, false);
  const batchPatch = plan.mutations.find((mutation) => mutation.collection === "productionBatches")!.patch;
  assert.deepEqual(batchPatch.orderIds, [first.id]);
  assert.deepEqual(batchPatch.checkedOrderIds, [first.id]);
  assert.deepEqual(batchPatch.liberatedOrderIds, []);
});
test("cancelamento explícito de item não cancela as outras linhas do mesmo pedido", () => {
  const first: any = existing();
  const second: any = { ...first, id: 124, docId: "124", teksystemLineId: "pedido:77:901" };
  const activeRow = sourceRow();
  const canceledRow = { ...sourceRow(), externalId: "pedido:77:901", detalheid: 901, statusItem: "CANCELADO" };
  const jobWithItemStatus = { ...jobs()[0], rows: [activeRow, canceledRow] };
  const context = { loaded: true, cargas: [], productionBatches: [], productionAgendas: [], coilCuttingPlans: [], productionSteps: [], logs: [] };
  const plan = planWriterJob(jobWithItemStatus, catalog(), [first, second], now, context);
  assert.equal(plan.action, "CANCELAMENTO_PARCIAL");
  assert.equal(plan.mutations.filter((mutation) => mutation.collection === "orders" && mutation.patch.status === "CANCELADO").length, 1);
  assert.equal(plan.mutations.find((mutation) => mutation.docId === "124")!.patch.status, "CANCELADO");
  assert.equal(plan.mutations.some((mutation) => mutation.docId === "123" && mutation.patch.status === "CANCELADO"), false);
  for (const marker of [{ canceladoItem: "S" }, { situacaoDescricaoItem: "Item cancelado" }, { quantidadeCanceladaItem: 10 }]) {
    const markedRow = { ...sourceRow(), externalId: "pedido:77:901", detalheid: 901, ...marker };
    const markedPlan = planWriterJob({ ...jobs()[0], rows: [activeRow, markedRow] }, catalog(), [first, second], now, context);
    assert.equal(markedPlan.mutations.find((mutation) => mutation.docId === "124")!.patch.status, "CANCELADO");
    assert.equal(markedPlan.mutations.some((mutation) => mutation.docId === "123" && mutation.patch.status === "CANCELADO"), false);
  }
});
test("job de cancelamento só cancela as linhas indicadas e respeita a empresa de origem", () => {
  const first: any = { ...existing(), teksystemCompanyId: 1 };
  const second: any = { ...first, id: 124, docId: "124", teksystemLineId: "pedido:77:901" };
  const otherCompany: any = { ...first, id: 125, docId: "125", teksystemCompanyId: 0, teksystemLineId: "pedido:77:901" };
  const lineJob: WriterJob = { ...jobs()[0], lineCancellationOnly: true,
    rows: [{ empresa: 1, codigopedido: 77, detalheid: 901, itemLifecycleAction: "CANCELADO" }] };
  const context = { loaded: true, cargas: [], productionBatches: [{ id: 44, docId: "44", tenantId: "imperio", status: "PENDENTE", orderIds: [124] }],
    productionAgendas: [], coilCuttingPlans: [], productionSteps: [], logs: [] };
  assert.equal(requiresOrderCancellationContext(lineJob, [first, second, otherCompany]), true);
  const plan = planWriterJob(lineJob, catalog(), [first, second, otherCompany], now, context);
  const canceled = plan.mutations.filter((mutation) => mutation.collection === "orders" && mutation.patch.status === "CANCELADO");
  assert.deepEqual(canceled.map((mutation) => mutation.docId), ["124"]);
  assert.deepEqual(plan.mutations.find((mutation) => mutation.collection === "productionBatches")!.patch.orderIds, []);
});
test("snapshot de linhas identifica somente o detalhe ausente no pedido ainda presente", () => {
  const imported = [
    { id: 123, teksystemOrderId: "77", teksystemLineId: "pedido:77:900", teksystemCompanyId: 1, importOrigin: "TEKSYSTEM", status: "PENDENTE" },
    { id: 124, teksystemOrderId: "77", teksystemLineId: "pedido:77:901", teksystemCompanyId: 1, importOrigin: "TEKSYSTEM", status: "PENDENTE" },
    { id: 125, teksystemOrderId: "77", teksystemLineId: "pedido:77:901", teksystemCompanyId: 0, importOrigin: "TEKSYSTEM", status: "PENDENTE" },
  ];
  const lineTargets = orderPresenceLineTargets(imported);
  assert.equal(lineTargets.length, 2);
  assert.equal(orderPresenceLineTargetsHash(lineTargets).length, 64);
  const source = [{ empresa: 1, codigoPedido: "77", lineHash: orderLineIdsHash(["900"]), lineIds: ["900"] }];
  assert.deepEqual(planOrderLineCancellations(imported, source), [{ companyId: 1, orderCode: "77", lineId: "901" }]);
  const plan = planOrderPresenceReconciliation("imperio", imported, [], source, "snapshot-lines", now.toISOString());
  assert.deepEqual(plan.cancelledItemLines, [{ companyId: 1, orderCode: "77", lineId: "901" }]);
});
test("exclusão física só é confirmada em dois snapshots independentes e reseta se o pedido reaparecer", () => {
  const imported = [{ id: 123, teksystemOrderId: "77", teksystemLineId: "pedido:77:900", importOrigin: "TEKSYSTEM", status: "PENDENTE" }];
  const first = planOrderPresenceReconciliation("imperio", imported, [], [], "snapshot-1", now.toISOString());
  assert.equal(first.firstMisses, 1);
  assert.deepEqual(first.deletedOrderCodes, []);
  const candidate = { id: first.updates[0].id, orderCode: "77", ...first.updates[0].data } as any;
  const targets = orderPresenceTargetCodes(imported, [candidate]);
  assert.deepEqual(targets, ["77"]);
  assert.match(orderPresenceTargetHash(targets), /^[a-f0-9]{64}$/);
  const repeated = planOrderPresenceReconciliation("imperio", imported, [candidate], [], "snapshot-1", now.toISOString());
  assert.deepEqual(repeated.deletedOrderCodes, []);
  const second = planOrderPresenceReconciliation("imperio", imported, [candidate], [], "snapshot-2", now.toISOString());
  assert.deepEqual(second.deletedOrderCodes, ["77"]);
  const returned = planOrderPresenceReconciliation("imperio", imported, [candidate], [{ empresa: 1, codigoPedido: "77" }], "snapshot-3", now.toISOString());
  assert.equal(returned.reset.length, 1);
  assert.equal(returned.reset[0].data.missingCount, 0);
  const companyMismatch = planOrderPresenceReconciliation("imperio", imported, [], [
    { empresa: 0, codigoPedido: "77", lifecycle: "CANCELADO" },
    { empresa: 1, codigoPedido: "77" },
  ], "snapshot-4", now.toISOString());
  assert.deepEqual(companyMismatch.cancelledOrderCodes, []);
  assert.deepEqual(companyMismatch.inconsistentLifecycleCodes, ["77"]);
});
test("romaneio só fatura linhas novas depois de o pedido ter sido complementado", () => {
  const { cat, order, orderJob } = appendFixture();
  const billing: WriterJob = { ...jobs()[1], orderRows: orderJob.rows, rows: [{ ...orderJob.rows[1], externalId: "romaneio:1:2", quantidadefaturada: 50 }] };
  assert.throws(() => planWriterJob(billing, cat, [order], now), (e: any) => e.code === "ITEM_PEDIDO_AUSENTE");
  const complement = planWriterJob(orderJob, cat, [order], now);
  const completed: any[] = [order];
  for (const m of complement.mutations) { if (m.before) Object.assign(order, m.patch); else completed.push({ ...m.patch, docId: m.docId }); }
  const invoice = planWriterJob(billing, cat, completed, now);
  assert.equal(invoice.action, "FATURADO"); assert.equal(invoice.details.itens[0].quantidadeFaturada, 50);
  assert.equal(invoice.mutations.find((m) => m.collection === "logs")!.patch.skipInventoryUpdate, true);
  for (const m of invoice.mutations.filter((m) => m.collection === "orders")) Object.assign(completed.find((o) => String(o.id) === m.docId), m.patch);
  assert.equal(planWriterJob(billing, cat, completed, now).mutations.length, 0);
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
test("snapshot completo de pedidos lê situação em transação Firebird somente leitura", async () => {
  let committed = false;
  let sql = "";
  let paramsSeen: unknown[] = [];
  const tx: any = {
    queryAsync: async (statement: string, params: unknown[]) => {
      sql = statement;
      paramsSeen = params;
      assert.deepEqual(params, [0, 1, "77", "78"]);
      return [
        { empresa: 1, codigopedido: 77, status: 2, situacao: 9, situacaodescricao: "Documento cancelado" },
        { empresa: 0, codigopedido: 78, status: 1, situacao: 8, situacaodescricao: "Documento cancelado parcial" },
        { empresa: 1, codigopedido: 79, status: 1, situacao: 1, situacaodescricao: "Normal" },
      ];
    },
    commitAsync: async () => { committed = true; }, rollbackAsync: async () => {},
  };
  const db: any = { transactionAsync: async (isolation: any) => {
    assert.equal(isolation, Firebird.ISOLATION_READ_COMMITTED_READ_ONLY); return tx;
  } };
  const snapshot = await readOrderPresenceSnapshot(db, [0, 1], ["77", "78"]);
  assert.match(sql, /LEFT JOIN DOCUMENTO_ITEM_DETALHE/i);
  assert.doesNotMatch(sql, /SELECT DISTINCT/i);
  assert.doesNotMatch(sql, /DATAHORAALTERACAO/i);
  assert.match(sql, /CODIGO_DOCFAT IN/i);
  assert.deepEqual(paramsSeen, [0, 1, "77", "78"]);
  assert.equal(snapshot[0].lifecycle, "CANCELADO");
  assert.equal(snapshot[1].lifecycle, "CANCELAMENTO_PARCIAL");
  assert.equal(snapshot[2].lifecycle, undefined);
  assert.equal(committed, true);
  await assert.rejects(readOrderPresenceSnapshot(db, [2], []), /empresas autorizadas 0 e 1/);
});
test("projeção de situação do item usa apenas campos Firebird validados", () => {
  const projection = buildOrderItemStatusProjection([
    { relationName: "DOCUMENTO_ITEM", fieldName: "STATUS_DOCITEM" },
    { relationName: "DOCUMENTO_ITEM_DETALHE", fieldName: "SITUACAO_DOCITEMDET" },
    { relationName: "DOCUMENTO_ITEM_DETALHE", fieldName: "CANCELADO_DOCITEMDET" },
    { relationName: "DOCUMENTO_ITEM_DETALHE", fieldName: "QTDECANCELADA_DOCITEMDET" },
    { relationName: "OUTRA_TABELA", fieldName: "CANCELADO" },
    { relationName: "DOCUMENTO_ITEM", fieldName: "STATUS; DROP TABLE DOCUMENTO_ITEM" },
  ]);
  assert.match(projection.selectSql, /AS statusItem/);
  assert.match(projection.selectSql, /AS situacaoItem/);
  assert.match(projection.selectSql, /AS situacaoDescricaoItem/);
  assert.match(projection.selectSql, /AS canceladoItem/);
  assert.match(projection.selectSql, /AS quantidadeCanceladaItem/);
  assert.match(projection.joinSql, /LEFT JOIN SITUACAO sitItem/);
  assert.doesNotMatch(projection.selectSql, /DROP TABLE|OUTRA_TABELA/);
});
test("leitor Firebird inclui status individual do item quando a coluna existe", async () => {
  const statements: string[] = [];
  const db: any = { transactionAsync: async () => ({
    queryAsync: async (sql: string) => {
      statements.push(sql);
      if (/FROM RDB\$RELATION_FIELDS/i.test(sql)) return [
        { relationname: "DOCUMENTO_ITEM_DETALHE", fieldname: "SITUACAO_DOCITEMDET" },
        { relationname: "DOCUMENTO_ITEM_DETALHE", fieldname: "CANCELADO_DOCITEMDET" },
      ];
      if (/AS canceladoItem/i.test(sql)) return [{ empresa: 1, codigopedido: 77, detalheid: 901,
        situacaoitem: 7, situacaodescricaoitem: "Item cancelado", canceladoitem: "S" }];
      if (/SELECT d\.CODIGO_DOCFAT AS codigopedido/i.test(sql)) return [{ codigopedido: 77 }];
      return [];
    },
    commitAsync: async () => {}, rollbackAsync: async () => {},
  }) };
  const result = await readCompleteEntities(db, ["pedidos"], [0, 1]);
  assert.match(statements.find((sql) => /AS canceladoItem/i.test(sql))!, /sitItem\.DESCRICAO_SITUACAO AS situacaoDescricaoItem/);
  assert.match(statements.find((sql) => /AS canceladoItem/i.test(sql))!, /LEFT JOIN SITUACAO sitItem/);
  assert.equal(result.pedidos[0].canceladoitem, "S");
  assert.equal(result.pedidos[0].situacaodescricaoitem, "Item cancelado");
});
test("snapshot Firebird envia IDs da linha apenas quando o hash diverge do alvo", async () => {
  let committed = false;
  const rows = [
    { empresa: 1, codigopedido: 77, status: 1, situacao: 1, situacaodescricao: "Normal", detalheid: 900 },
    { empresa: 1, codigopedido: 77, status: 1, situacao: 1, situacaodescricao: "Normal", detalheid: 901 },
    { empresa: 0, codigopedido: 78, status: 1, situacao: 1, situacaodescricao: "Normal", detalheid: 700 },
  ];
  const tx: any = { queryAsync: async () => rows, commitAsync: async () => { committed = true; }, rollbackAsync: async () => {} };
  const db: any = { transactionAsync: async () => tx };
  const snapshot = await readOrderPresenceSnapshot(db, [0, 1], ["77", "78"], [
    { companyId: 1, orderCode: "77", lineHash: orderLineIdsHash(["900"]) },
    { companyId: 0, orderCode: "78", lineHash: orderLineIdsHash(["700"]) },
  ]);
  const changed = snapshot.find((row) => row.empresa === 1)!;
  const same = snapshot.find((row) => row.empresa === 0)!;
  assert.deepEqual(changed.lineIds, ["900", "901"]);
  assert.equal(changed.lineHash, orderLineIdsHash(["900", "901"]));
  assert.equal(same.lineHash, orderLineIdsHash(["700"]));
  assert.equal(same.lineIds, undefined);
  assert.equal(committed, true);
});
