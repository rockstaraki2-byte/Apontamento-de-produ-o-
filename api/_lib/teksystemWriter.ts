import crypto from "node:crypto";
import { prepareOrder, type AtomicCreateInput } from "./orderImportCore.js";
import {
  deriveProductIdentity, mapPaymentMethod, matchProduct, normalizeText,
  type CatalogSnapshot, type OrderImportInput,
} from "./orderImportRules.js";
import { syncRecordKey, type NormalizedTekSystemSyncPayload } from "./teksystemSync.js";

export const WRITER_KINDS = ["clientes", "produtos", "pedidos", "romaneios"] as const;
export type WriterKind = typeof WRITER_KINDS[number];
export type WriterRow = Record<string, any>;
export type WriterCatalogEntry = WriterRow & { id: any };
export interface WriterJob {
  id: string;
  tenantId: string;
  kind: WriterKind;
  externalKey: string;
  syncId: string;
  generatedAt: string;
  hash: string;
  rows: WriterRow[];
  orderRows: WriterRow[];
}
export interface WriterCatalog extends CatalogSnapshot {
  customers: WriterCatalogEntry[];
  items: WriterCatalogEntry[];
  users: WriterCatalogEntry[];
}
export interface WriterMutation {
  collection: "customers" | "items" | "orders" | "logs";
  docId: string;
  before: WriterRow | null;
  patch: WriterRow;
}
export interface WriterPlan {
  action: "CRIADO" | "ATUALIZADO" | "JA_EXISTE" | "SEM_ALTERACAO" | "FATURADO";
  mutations: WriterMutation[];
  createOrder?: AtomicCreateInput;
  details: WriterRow;
}
export class WriterConflict extends Error {
  constructor(public code: string, message: string, public retryable = false) { super(message); }
}
export function value(row: WriterRow, ...keys: string[]): any {
  for (const key of keys) {
    const found = Object.keys(row).find((candidate) => candidate.toLowerCase() === key.toLowerCase());
    if (found !== undefined && row[found] !== undefined && row[found] !== null) return row[found];
  }
  return undefined;
}
export const text = (v: unknown): string => String(v ?? "").trim();
function canonical(v: any): any {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, canonical(x)]));
  return v;
}
export const signature = (v: unknown): string => crypto.createHash("sha256").update(JSON.stringify(canonical(v))).digest("hex");
export function sourceOrderCode(row: WriterRow): string { return text(value(row, "codigoPedido")); }
export function sourceLineKey(row: WriterRow): string {
  const code = sourceOrderCode(row);
  const item = value(row, "detalheId") || value(row, "itemId");
  if (!code || !item) throw new WriterConflict("ITEM_SEM_CHAVE", "Item de pedido sem código ou identificador de origem.");
  return `pedido:${code}:${item}`;
}
export function stableNumericId(tenantId: string, kind: string, code: string): number {
  return 1_000_000_000_000 + Number.parseInt(signature([tenantId, kind, code]).slice(0, 11), 16);
}
function assertCompanies(rows: WriterRow[]) {
  for (const row of rows) {
    const company = value(row, "empresa");
    if (company !== undefined && ![0, 1].includes(Number(company))) throw new WriterConflict("EMPRESA_NAO_AUTORIZADA", "O leitor está autorizado para as empresas 0 e 1.");
  }
}
function group(rows: WriterRow[], key: (row: WriterRow) => string): Map<string, WriterRow[]> {
  const groups = new Map<string, WriterRow[]>();
  for (const row of rows) {
    const code = key(row);
    if (!code) throw new WriterConflict("CHAVE_OBRIGATORIA", "Registro sem identificador da origem.");
    groups.set(code, [...(groups.get(code) || []), row]);
  }
  return groups;
}
export function buildWriterJobs(payload: NormalizedTekSystemSyncPayload): WriterJob[] {
  if (payload.source.readerVersion !== 2 || payload.source.completeOrderSnapshots !== true) {
    throw new WriterConflict("LEITOR_DESATUALIZADO", "A escrita exige o leitor v2 com snapshots completos de pedidos e romaneios.");
  }
  const entities = payload.entities;
  assertCompanies(Object.values(entities).flat());
  const orderGroups = group(entities.pedidos, sourceOrderCode);
  const billingGroups = group(entities.romaneios, sourceOrderCode);
  for (const code of orderGroups.keys()) if (!billingGroups.has(code)) billingGroups.set(code, []);
  const groups: Record<WriterKind, Map<string, WriterRow[]>> = {
    clientes: group(entities.clientes, (row) => text(value(row, "codigo"))),
    produtos: group(entities.produtos, (row) => deriveProductIdentity({ codigoOriginal: value(row, "codigo") }).codigoProduto),
    pedidos: orderGroups,
    romaneios: billingGroups,
  };
  return WRITER_KINDS.flatMap((kind) => [...groups[kind]].map(([externalKey, rows]) => {
    const orderRows = kind === "romaneios" ? orderGroups.get(externalKey) || [] : [];
    const sortedRows = [...rows].sort((a, b) => text(value(a, "externalId")).localeCompare(text(value(b, "externalId"))));
    const sortedOrderRows = [...orderRows].sort((a, b) => sourceLineKey(a).localeCompare(sourceLineKey(b)));
    if (Buffer.byteLength(JSON.stringify({ rows: sortedRows, orderRows: sortedOrderRows })) > 850_000) throw new WriterConflict("PEDIDO_MUITO_GRANDE", `Grupo ${kind}:${externalKey} excede o tamanho permitido para processamento.`);
    return {
      id: syncRecordKey(payload.tenantId, kind, externalKey), tenantId: payload.tenantId,
      kind, externalKey, syncId: payload.syncId, generatedAt: payload.generatedAt,
      hash: signature({ kind, externalKey, rows: sortedRows, orderRows: sortedOrderRows }),
      rows: sortedRows, orderRows: sortedOrderRows,
    };
  }));
}
export function hasTransaction74(notes: unknown): boolean {
  return /\bTRANS(?:ACAO|ACOES)?\s*(?:DE\s+VENDA\s*)?74\b/.test(normalizeText(notes));
}
function sourceMetadata(job: WriterJob): WriterRow {
  return { teksystemCode: job.externalKey, teksystemGeneratedAt: job.generatedAt, teksystemSyncId: job.syncId, importOrigin: "TEKSYSTEM" };
}
function patchMutation(collection: WriterMutation["collection"], id: string | number, current: WriterRow | undefined, patch: WriterRow): WriterMutation | null {
  const changed = Object.fromEntries(Object.entries(patch).filter(([key, next]) => signature(current?.[key] ?? null) !== signature(next ?? null)));
  if (current && !Object.keys(changed).length) return null;
  return { collection, docId: text(current?.docId || id), before: current || null, patch: changed };
}
function sourceCustomer(code: string, catalog: WriterCatalog): WriterRow | undefined {
  const matches = catalog.customers.filter((row) => text(row.teksystemCode || row.id) === code);
  if (matches.length > 1) throw new WriterConflict("CLIENTE_AMBIGUO", `Código de cliente ${code} corresponde a mais de um cadastro.`);
  return matches[0];
}
export function planCustomer(job: WriterJob, catalog: WriterCatalog): WriterPlan {
  if (job.rows.length !== 1) throw new WriterConflict("CLIENTE_AMBIGUO", "O snapshot contém mais de um cadastro para o mesmo cliente.");
  const row = job.rows[0];
  const name = text(value(row, "nome"));
  if (!name) throw new WriterConflict("CLIENTE_SEM_NOME", `Cliente ${job.externalKey} sem razão social.`);
  let current = sourceCustomer(job.externalKey, catalog);
  if (!current) {
    const names = [name, text(value(row, "nomeFantasia"))].filter(Boolean).map(normalizeText);
    const matches = catalog.customers.filter((c) => !c.teksystemCode && [c.name, c.tradeName].some((n) => names.includes(normalizeText(n))));
    if (matches.length > 1) throw new WriterConflict("CLIENTE_AMBIGUO", `Cliente ${job.externalKey} corresponde a mais de um nome no cadastro.`);
    current = matches[0];
  }
  const numericCode = Number(job.externalKey);
  const id = current?.id ?? (Number.isSafeInteger(numericCode) && numericCode > 0 ? numericCode : stableNumericId(job.tenantId, "clientes", job.externalKey));
  const city = text(value(row, "cidade"));
  const state = text(value(row, "estado")).toUpperCase();
  const terms = (value(row, "prazosPadrao") || []).map(Number).filter((n: number) => Number.isFinite(n) && n >= 0).sort((a: number, b: number) => a - b);
  const defaultCondition = text(value(row, "descricaoCondicaoPadrao"));
  const payment = defaultCondition || (terms.length ? `${[...new Set(terms)].join("/")} Dias` : ({ 0: "", 1: "À vista", 2: "Outros", 3: "A prazo" } as Record<string, string>)[text(value(row, "condicaoPagamento"))] || "");
  const patch = {
    id, tenantId: job.tenantId, name, tradeName: text(value(row, "nomeFantasia")),
    city, state, uf: state, address: [city, state].filter(Boolean).join(" - "),
    streetAddress: [value(row, "endereco"), value(row, "numero"), value(row, "complemento")].map(text).filter(Boolean).join(", "),
    neighborhood: text(value(row, "bairro")), bairro: text(value(row, "bairro")),
    phone: text(value(row, "telefone")), email: text(value(row, "email")).toLowerCase(),
    defaultPaymentTerms: payment, hasRET: hasTransaction74(value(row, "observacoesCompraVenda")),
    ...sourceMetadata(job),
  };
  const mutation = patchMutation("customers", id, current, patch);
  return { action: current ? "ATUALIZADO" : "CRIADO", mutations: mutation ? [mutation] : [], details: { id, codigo: job.externalKey } };
}
export function planProduct(job: WriterJob, catalog: WriterCatalog): WriterPlan {
  const primary = job.rows.find((row) => text(value(row, "codigo")) === job.externalKey) || job.rows[0];
  const match = matchProduct({ codigoOriginal: job.externalKey }, catalog.items as any);
  if (!match.product && match.errors.some((e) => e.details?.motivo?.toString().includes("AMBIGUO") || e.message.includes("ambíguo"))) throw new WriterConflict("PRODUTO_AMBIGUO", `Código ${job.externalKey} é ambíguo no cadastro.`);
  const current = match.product ? catalog.items.find((i) => String(i.id) === String(match.product!.id)) : undefined;
  const id = current?.id ?? stableNumericId(job.tenantId, "produtos", job.externalKey);
  const name = text(value(primary, "descricao"));
  if (!name) throw new WriterConflict("PRODUTO_SEM_NOME", `Produto ${job.externalKey} sem descrição.`);
  const exactBase = text(value(primary, "codigo")) === job.externalKey;
  const unit = text(value(primary, "unidadeSigla")) || (/[^\d]/.test(text(value(primary, "unidade"))) ? text(value(primary, "unidade")) : "");
  const patch = {
    id, tenantId: job.tenantId, code: current?.code || job.externalKey,
    name: current && !exactBase ? current.name : name,
    ...(unit ? { unit } : current ? {} : { unit: "PÇS" }),
    ...(current ? {} : { notes: "", type: value(primary, "ePeca") === true || value(primary, "ePeca") === 1 ? "PECA" : "PRODUTO" }),
    teksystemVariants: job.rows.map((row) => ({ codigo: text(value(row, "codigo")), descricao: text(value(row, "descricao")), tipo: text(value(row, "tipoProdutoDescricao")) })),
    ...sourceMetadata(job),
  };
  const mutation = patchMutation("items", id, current, patch);
  return { action: current ? "ATUALIZADO" : "CRIADO", mutations: mutation ? [mutation] : [], details: { id, codigo: job.externalKey } };
}
function businessDate(v: unknown): string | undefined {
  const raw = text(v);
  if (!raw || raw.startsWith("1899") || raw.startsWith("1900")) return undefined;
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return raw;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
function number(v: unknown, code: string): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new WriterConflict("NUMERO_INVALIDO", `${code}: quantidade ou valor inválido.`);
  return n;
}
export function orderInput(rows: WriterRow[], catalog: WriterCatalog, identityOnly = false): OrderImportInput {
  if (!rows.length) throw new WriterConflict("PEDIDO_INCOMPLETO", "O processamento exige o snapshot completo do pedido.", true);
  const head = rows[0];
  const code = sourceOrderCode(head);
  if (rows.some((row) => sourceOrderCode(row) !== code || text(value(row, "cliente")) !== text(value(head, "cliente")))) throw new WriterConflict("PEDIDO_INCONSISTENTE", "Cabeçalhos diferentes no snapshot do pedido.");
  if (/CANCEL|REJEIT|ORCAMENTO/.test(normalizeText(value(head, "situacaoDescricao")))) throw new WriterConflict("PEDIDO_NAO_ATIVO", `Pedido ${code} tem situação ${text(value(head, "situacaoDescricao"))}.`);
  const customerCode = text(value(head, "cliente"));
  const customer = sourceCustomer(customerCode, catalog);
  if (!customer) throw new WriterConflict("CLIENTE_NAO_ENCONTRADO", `Cliente ${customerCode} ainda não foi sincronizado.`, true);
  const payments: WriterRow[] = value(head, "prazos") || [];
  const methods = [...new Set(payments.map((p) => mapPaymentMethod(value(p, "formaPagamentoDescricao"))).filter(Boolean))];
  if (!identityOnly && (methods.length > 1 || payments.some((p) => !mapPaymentMethod(value(p, "formaPagamentoDescricao"))))) throw new WriterConflict("FORMA_PAGAMENTO_INVALIDA", `Pedido ${code} possui forma de pagamento sem mapeamento ou múltiplas formas.`);
  const representatives: WriterRow[] = value(head, "representantes") || [];
  const reps = [...new Set(representatives.map((rep) => text(value(rep, "nome"))).filter(Boolean))];
  if (!identityOnly && reps.length > 1) throw new WriterConflict("REPRESENTANTE_AMBIGUO", `Pedido ${code} possui múltiplos representantes.`);
  const sourceKeys = new Set<string>();
  const itens = rows.map((row) => {
    const key = sourceLineKey(row);
    if (sourceKeys.has(key)) throw new WriterConflict("ITEM_DUPLICADO", `Item ${key} duplicado no snapshot.`);
    sourceKeys.add(key);
    const qty = number(value(row, "quantidade"), key);
    if (qty <= 0 || !text(value(row, "codigoItem"))) throw new WriterConflict("ITEM_INVALIDO", `Item ${key} sem quantidade positiva ou código.`);
    const gross = identityOnly ? 0 : number(value(row, "precoUnitarioBruto") ?? value(row, "precoUnitario"), key);
    const net = identityOnly ? 0 : number(value(row, "precoUnitario") ?? gross, key);
    if (!identityOnly && net > gross + 0.0001) throw new WriterConflict("PRECO_INVALIDO", `Preço líquido supera o bruto no item ${key}.`);
    const familyCode = value(row, "familiaCodigo");
    return {
      codigoOriginal: text(value(row, "codigoItem")), descricao: text(value(row, "descricaoItem")),
      familia: text(value(row, "familiaDescricao")) || (Number(familyCode) === 1 ? "GERENCIAL" : ""),
      cor: text(value(row, "corDescricao")), tamanho: text(value(row, "gradeDescricao")) || "-",
      variacao: Number(value(row, "variacao") ?? 0) === 0 ? "-" : text(value(row, "variacaoDescricao")) || "-",
      observacoes: text(value(row, "observacoesItem")), quantidade: qty, precoUnitario: gross,
      descontoPercentual: gross ? Number(((gross - net) / gross * 100).toFixed(4)) : 0,
    };
  });
  return {
    codigoPedido: code, cliente: { codigo: customer.id, nome: customer.name }, representante: reps[0] || "",
    formaPagamento: methods[0] || text(value(head, "descricaoCondicaoPagamento")),
    prazos: payments.map((p) => value(p, "dias")).filter((d) => d !== undefined),
    promEntrega: businessDate(value(head, "promessaEntrega")), previsao: businessDate(value(head, "previsaoFaturamento")),
    possuiRET: Boolean(customer.hasRET), transacaoVenda: value(head, "transacaoVenda"),
    observacoes: text(value(head, "observacoes")), itens,
  };
}
function dimension(v: unknown): string { return normalizeText(text(v) || "-"); }
export function bindSourceLines(rows: WriterRow[], input: OrderImportInput, orders: WriterRow[], catalog: WriterCatalog): Array<{ row: WriterRow; order: WriterRow }> {
  const matches: Array<{ row: WriterRow; order: WriterRow }> = [];
  const used = new Set<string>();
  rows.forEach((row, index) => {
    const key = sourceLineKey(row);
    const item = input.itens![index];
    const product = matchProduct(item, catalog.items as any).product;
    if (!product) throw new WriterConflict("PRODUTO_NAO_ENCONTRADO", `Produto ${text(item.codigoOriginal)} ainda não foi sincronizado.`, true);
    const identity = deriveProductIdentity(item);
    const variation = text(item.variacao) && text(item.variacao) !== "-" ? item.variacao : text(item.observacoes) || "-";
    const sameIdentity = (o: WriterRow) => String(o.itemId) === String(product.id) && dimension(o.color) === dimension(identity.cor) && dimension(o.size) === dimension(item.tamanho) && dimension(o.variation) === dimension(variation);
    let candidates = orders.filter((o) => o.teksystemLineId === key);
    if (candidates.some((o) => !sameIdentity(o))) throw new WriterConflict("IDENTIDADE_ITEM_DIVERGENTE", `Produto/cor/medida/variação de ${key} mudou entre os sistemas.`);
    if (!candidates.length) candidates = orders.filter((o) => !o.teksystemLineId && sameIdentity(o));
    candidates = candidates.filter((o) => !used.has(text(o.id)));
    if (candidates.length !== 1) throw new WriterConflict("ITEM_PEDIDO_AMBIGUO", `Não foi possível associar unicamente ${key} aos itens do ApontaPRO.`);
    const order = candidates[0];
    if (Math.abs(number(order.totalQuantity, key) - number(item.quantidade, key)) > 0.0001) throw new WriterConflict("QUANTIDADE_PEDIDO_DIVERGENTE", `A quantidade de ${key} diverge entre os sistemas.`);
    if (String(order.customerId || "") && String(order.customerId) !== String(input.cliente!.codigo)) throw new WriterConflict("CLIENTE_PEDIDO_DIVERGENTE", `Cliente do item ${key} diverge entre os sistemas.`);
    used.add(text(order.id)); matches.push({ row, order });
  });
  if (used.size !== orders.length) throw new WriterConflict("ITENS_PEDIDO_DIVERGENTES", "O ApontaPRO contém itens adicionais para este pedido.");
  return matches;
}
export function planOrder(job: WriterJob, catalog: WriterCatalog, orders: WriterRow[], now: Date): WriterPlan {
  const input = orderInput(job.rows, catalog, Boolean(orders.length));
  if (orders.length) {
    const matches = bindSourceLines(job.rows, input, orders, catalog);
    const mutations = matches.map(({ row, order }) => patchMutation("orders", order.id, order, {
      teksystemLineId: sourceLineKey(row), teksystemOrderId: job.externalKey,
      teksystemCompanyId: value(row, "empresa"), teksystemCustomerCode: text(value(row, "cliente")),
    })).filter((m): m is WriterMutation => Boolean(m));
    return { action: "JA_EXISTE", mutations, details: { codigoPedido: job.externalKey, orderIds: matches.map(({ order }) => order.id) } };
  }
  const prepared = prepareOrder(input, catalog, now);
  if (!prepared.prepared) throw new WriterConflict("PEDIDO_INVALIDO", prepared.errors.map((e) => e.message).join("; "), prepared.errors.some((e) => /NAO_ENCONTRADO/.test(e.code)));
  if (prepared.prepared.lines.length > 180) throw new WriterConflict("PEDIDO_MUITO_GRANDE", "Pedido excede 180 itens para criação atômica.");
  const date = new Date(text(value(job.rows[0], "cadastradoEm") || value(job.rows[0], "emitidoEm"))).getTime();
  return {
    action: "CRIADO", mutations: [], details: { codigoPedido: job.externalKey, quantidadeItens: prepared.prepared.lines.length, avisos: prepared.warnings },
    createOrder: {
      tenantId: job.tenantId, origem: "TEKSYSTEM", solicitadoPor: "teksystem-writer-agent",
      prepared: prepared.prepared, createdAt: Number.isFinite(date) ? date : now.getTime(), importedAt: now.getTime(),
      teksystem: { jobId: job.id, jobHash: job.hash, companyId: value(job.rows[0], "empresa"),
        customerCode: text(value(job.rows[0], "cliente")), lineIds: job.rows.map(sourceLineKey) },
    },
  };
}
export function planBilling(job: WriterJob, catalog: WriterCatalog, orders: WriterRow[], now: Date): WriterPlan {
  if (!orders.length) throw new WriterConflict("PEDIDO_NAO_ENCONTRADO", `Pedido ${job.externalKey} ainda não foi lançado.`, true);
  const input = orderInput(job.orderRows, catalog, true);
  const matches = bindSourceLines(job.orderRows, input, orders, catalog);
  const totals = new Map<string, { quantity: number; rows: WriterRow[] }>();
  const seen = new Set<string>();
  for (const row of job.rows) {
    const externalId = text(value(row, "externalId"));
    if (!externalId || seen.has(externalId)) throw new WriterConflict("ROMANEIO_DUPLICADO", "Identificador de item de romaneio ausente ou repetido.");
    seen.add(externalId);
    const key = sourceLineKey(row);
    if (!matches.some((m) => sourceLineKey(m.row) === key)) throw new WriterConflict("ROMANEIO_SEM_ITEM", `Romaneio sem item de pedido correspondente: ${key}.`);
    const quantity = number(value(row, "quantidadeFaturada"), externalId);
    const total = totals.get(key) || { quantity: 0, rows: [] };
    total.quantity = Math.round((total.quantity + quantity) * 10_000) / 10_000;
    total.rows.push(row); totals.set(key, total);
  }
  const mutations: WriterMutation[] = [];
  const billed: WriterRow[] = [];
  for (const { row, order } of matches) {
    const source = totals.get(sourceLineKey(row)) || { quantity: 0, rows: [] };
    const target = source.quantity;
    const current = number(order.invoicedQuantity || (order.status === "FATURADO" ? order.totalQuantity : 0), sourceLineKey(row));
    if (target > number(order.totalQuantity, sourceLineKey(row)) + 0.0001) throw new WriterConflict("FATURAMENTO_EXCEDE_PEDIDO", `Romaneios superam a quantidade do item ${sourceLineKey(row)}.`);
    if (target + 0.0001 < current) throw new WriterConflict("ESTORNO_REQUER_REVISAO", `Tek-System informa ${target}, mas o ApontaPRO já registra ${current} no item ${sourceLineKey(row)}.`);
    if (target <= current + 0.0001) continue;
    if (order.status === "CANCELADO") throw new WriterConflict("PEDIDO_CANCELADO", "Item cancelado no ApontaPRO requer revisão antes do faturamento.");
    const dates = source.rows.filter((r) => Number(value(r, "quantidadeFaturada")) > 0).map((r) => new Date(text(value(r, "liberadoFaturamentoEm") || value(r, "emitidoEm") || value(r, "atualizadoEm"))).getTime()).filter(Number.isFinite);
    if (!dates.length) throw new WriterConflict("DATA_FATURAMENTO_AUSENTE", "Romaneio faturado sem data válida.");
    const invoicedAt = Math.max(...dates);
    const complete = target + 0.0001 >= Number(order.totalQuantity);
    const invoiceLogId = Number(order.invoiceLogId) || stableNumericId(job.tenantId, "faturamento", text(order.id));
    const orderPatch = {
      invoicedQuantity: target, status: complete ? "FATURADO" : "FATURADO_PARCIAL", isActive: !complete,
      invoicedAt, invoiceLogId, invoicedBy: "teksystem-writer-agent",
      billingPreviousStatus: order.billingPreviousStatus || order.status || "PENDENTE",
      billingPreviousIsActive: order.billingPreviousIsActive ?? Boolean(order.isActive),
      billingPreviousIsUrgent: order.billingPreviousIsUrgent ?? Boolean(order.isUrgent),
      ...(complete ? { isUrgent: false } : {}),
      teksystemInvoicedQuantity: target, teksystemBillingSyncId: job.syncId,
      teksystemBillingSourceIds: source.rows.map((r) => text(value(r, "externalId"))),
    };
    mutations.push({ collection: "orders", docId: text(order.docId || order.id), before: order, patch: orderPatch });
    mutations.push({ collection: "logs", docId: `faturamento_${order.id}`, before: null, patch: {
      id: invoiceLogId, tenantId: job.tenantId, orderId: order.id, itemId: order.itemId,
      operatorId: "teksystem-writer-agent", quantityInvoiced: target, type: "FATURAMENTO",
      timestamp: invoicedAt, durationMillis: 0, skipInventoryUpdate: true,
      processName: "Faturamento Tek-System (romaneio)", importOrigin: "TEKSYSTEM", syncId: job.syncId,
    } });
    billed.push({ orderId: order.id, quantidadeAnterior: current, quantidadeFaturada: target, acrescimo: target - current, status: orderPatch.status });
  }
  return { action: mutations.length ? "FATURADO" : "SEM_ALTERACAO", mutations, details: { codigoPedido: job.externalKey, itens: billed, timestamp: now.getTime() } };
}
export function planWriterJob(job: WriterJob, catalog: WriterCatalog, orders: WriterRow[], now = new Date()): WriterPlan {
  if ([...catalog.customers, ...catalog.items].some((row) => row.tenantId !== job.tenantId) || catalog.users.some((row) => row.tenantId !== job.tenantId && row.tenantId !== "global")) throw new WriterConflict("TENANT_INVALIDO", "Catálogo não pertence à empresa autorizada.");
  if (orders.some((o) => o.tenantId !== job.tenantId)) throw new WriterConflict("TENANT_INVALIDO", "Pedido não pertence à empresa autorizada.");
  if (job.kind === "clientes") return planCustomer(job, catalog);
  if (job.kind === "produtos") return planProduct(job, catalog);
  if (job.kind === "pedidos") return planOrder(job, catalog, orders, now);
  return planBilling(job, catalog, orders, now);
}
