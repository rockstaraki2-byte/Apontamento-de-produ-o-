import crypto from "node:crypto";
import { prepareOrder, type AtomicCreateInput } from "./orderImportCore.js";
import { buildImportedOrderDocument } from "./orderImportDocuments.js";
import {
  deriveProductIdentity, mapPaymentMethod, matchProduct, normalizeText, normalizePaymentTerms, normalizeSystemPaymentCondition,
  matchRepresentative, type CatalogSnapshot, type OrderImportInput, type OrderItemImportInput,
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
  collection: "customers" | "items" | "orders" | "cargas" | "logs";
  docId: string;
  before: WriterRow | null;
  patch: WriterRow;
}
export interface WriterPlan {
  action: "CRIADO" | "ATUALIZADO" | "JA_EXISTE" | "COMPLEMENTADO" | "SEM_ALTERACAO" | "FATURADO";
  mutations: WriterMutation[];
  orderGuards?: WriterRow[];
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
const PAYMENT_START = "[Pagamento Tek-System]";
const PAYMENT_END = "[/Pagamento Tek-System]";
function tekPaymentMethod(label: unknown): string | null {
  // Legacy Tek-System label for PIX; do not classify debit as credit.
  const normalized = normalizeText(label);
  if (/^PAGAMENTO (?:INSTANTANEO|INSTATANEO) PIX$/.test(normalized)) return "PIX";
  return mapPaymentMethod(label);
}
export function sourcePayment(head: WriterRow) {
  const payments: WriterRow[] = value(head, "prazos") || [];
  const condition = text(value(head, "descricaoCondicaoPagamento"));
  const headerMethod = tekPaymentMethod(condition);
  const methods = payments.map((p) => tekPaymentMethod(value(p, "formaPagamentoDescricao")));
  const unique = [...new Set(methods)];
  // A generic OUTROS in installments can be qualified by the actual commercial table.
  const method = unique.length === 1 && unique[0] && unique[0] !== "Outra forma" ? unique[0]
    : (!unique.length || (unique.length === 1 && unique[0] === "Outra forma")) && headerMethod ? headerMethod
    : "Outra forma";
  const terms = normalizePaymentTerms(payments.map((p) => value(p, "dias"))).sort((a, b) => a - b);
  const description = [
    `Condição: ${condition || "Não informada na origem"}`,
    ...payments.map((p) => [
      `Forma: ${text(value(p, "formaPagamentoDescricao")) || `Código ${text(value(p, "formaPagamento")) || "não informado"}`}`,
      value(p, "dias") != null ? `Prazo: ${value(p, "dias")} dias` : "",
      value(p, "vencimento") ? `Vencimento: ${businessDate(value(p, "vencimento"))}` : "",
      value(p, "valor") != null ? `Valor: ${value(p, "valor")}` : "",
    ].filter(Boolean).join("; ")),
    ...(payments.length ? [] : ["Parcelas/prazos não informados na origem."]),
  ].join("\n");
  return { method, terms, description, note: `${PAYMENT_START}\n${description}\n${PAYMENT_END}` };
}
function withPaymentNote(notes: unknown, note: string): string {
  const preserved = text(notes).replace(/\[Pagamento Tek-System\][\s\S]*?\[\/Pagamento Tek-System\]/g, "").trim();
  return [preserved, note].filter(Boolean).join("\n\n");
}
const SOURCE_NOTES_START = "[Observações Tek-System]";
const SOURCE_NOTES_END = "[/Observações Tek-System]";
function withSourceNotes(notes: unknown, sourceNotes: unknown, previousSourceNotes: unknown): string {
  const source = text(sourceNotes);
  const previous = text(previousSourceNotes);
  let preserved = text(notes)
    .replace(/\[Pagamento Tek-System\][\s\S]*?\[\/Pagamento Tek-System\]/g, "")
    .replace(/\[Observações Tek-System\][\s\S]*?\[\/Observações Tek-System\]/g, "")
    .trim();
  if (previous && normalizeText(preserved) === normalizeText(previous) && normalizeText(source) === normalizeText(previous)) {
    return preserved;
  }
  if (!previous && source && normalizeText(preserved) === normalizeText(source)) return preserved;
  if (previous && preserved.includes(previous)) preserved = preserved.replace(previous, "").trim();
  const managed = source ? `${SOURCE_NOTES_START}\n${source}\n${SOURCE_NOTES_END}` : "";
  return [preserved, managed].filter(Boolean).join("\n\n");
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
  const payment = sourcePayment(head);
  const representatives: WriterRow[] = value(head, "representantes") || [];
  const salesConsultants: WriterRow[] = value(head, "consultoresVendas") || [];
  const consultants = [...new Set(salesConsultants.map((rep) => text(value(rep, "nome"))).filter(Boolean))];
  const legacyRepresentatives = [...new Set(representatives.map((rep) => text(value(rep, "nome"))).filter(Boolean))];
  const reps = consultants.length ? consultants : legacyRepresentatives;
  const storeCustomer = customerCode === "856";
  if (!storeCustomer && (consultants.length > 1 || (!identityOnly && !consultants.length && legacyRepresentatives.length > 1))) {
    throw new WriterConflict("REPRESENTANTE_AMBIGUO", `Pedido ${code} possui múltiplos consultores principais.`);
  }
  const representativeName = storeCustomer ? "PEDIDOS LOJA IMPERIO" : reps[0] || "";
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
      cor: definedDimension(value(row, "corDescricao")), tamanho: definedDimension(value(row, "gradeDescricao")),
      variacao: Number(value(row, "variacao") ?? 0) === 0 ? "-" : text(value(row, "variacaoDescricao")) || "-",
      observacoes: text(value(row, "observacoesItem")), quantidade: qty, precoUnitario: gross,
      descontoPercentual: gross ? Number(((gross - net) / gross * 100).toFixed(4)) : 0,
    };
  });
  return {
    codigoPedido: code, cliente: { codigo: customer.id, nome: customer.name }, representante: representativeName,
    formaPagamento: payment.method, prazos: payment.terms,
    promEntrega: businessDate(value(head, "promessaEntrega")), previsao: businessDate(value(head, "previsaoFaturamento")),
    possuiRET: Boolean(customer.hasRET), transacaoVenda: value(head, "transacaoVenda"),
    observacoes: withPaymentNote(value(head, "observacoes"), payment.note), itens,
  };
}
function definedDimension(v: unknown): string {
  const normalized = normalizeText(v);
  return !normalized || normalized === "INDEFINIDA" || normalized === "INDEFINIDO" ? "-" : text(v);
}
function dimension(v: unknown): string { return normalizeText(definedDimension(v)) || "-"; }
function productCode(v: unknown): string { return deriveProductIdentity({ codigoOriginal: text(v) }).codigoProduto.toUpperCase(); }
function sourceChargedPriceCents(row: WriterRow): number | null {
  const amount = Number(value(row, "precoUnitario") ?? value(row, "precoUnitarioBruto"));
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : null;
}
function orderChargedPriceCents(order: WriterRow): number | null {
  const unitPrice = Number(order.unitPrice);
  const discount = Number(order.discountPercent ?? 0);
  if (!Number.isFinite(unitPrice) || unitPrice <= 0 || !Number.isFinite(discount) || discount < 0 || discount > 100) return null;
  return Math.round(unitPrice * (1 - discount / 100) * 100);
}
function lineMatchEvidence(row: WriterRow, item: OrderItemImportInput, identity: ReturnType<typeof deriveProductIdentity>) {
  const evidence: Array<{ label: string; matches: (order: WriterRow) => boolean }> = [];
  const sourceColor = dimension(identity.cor);
  const sourceSize = dimension(item.tamanho);
  const sourceVariation = normalizeText(item.variacao);
  const sourcePrice = sourceChargedPriceCents(row);
  if (sourceColor !== "-") evidence.push({ label: "cor", matches: (order) => dimension(order.color) === sourceColor });
  if (sourceSize !== "-") evidence.push({ label: "medida", matches: (order) => dimension(order.size) === sourceSize });
  if (sourceVariation && !["-", "INDEFINIDA", "INDEFINIDO"].includes(sourceVariation)) {
    evidence.push({ label: "variação", matches: (order) => normalizeText(order.variation) === sourceVariation });
  }
  if (sourcePrice !== null) evidence.push({ label: "valor líquido unitário", matches: (order) => {
    const current = orderChargedPriceCents(order);
    return current !== null && Math.abs(current - sourcePrice) <= 1;
  } });
  return evidence;
}
export function bindSourceLines(
  rows: WriterRow[], input: OrderImportInput, orders: WriterRow[], catalog: WriterCatalog,
  missing?: WriterRow[], allowQuantityMismatch = false, allowSourceIdentityUpdate = false,
): Array<{ row: WriterRow; order: WriterRow; matchBasis: string[] }> {
  const matches: Array<{ row: WriterRow; order: WriterRow; matchBasis: string[] }> = [];
  const used = new Set<string>();
  rows.forEach((row, index) => {
    const key = sourceLineKey(row);
    const item = input.itens![index];
    const identity = deriveProductIdentity(item);
    if (!catalog.items.some((p) => productCode(p.code) === productCode(item.codigoOriginal))) throw new WriterConflict("PRODUTO_NAO_ENCONTRADO", `Código ${text(item.codigoOriginal)} ainda não foi sincronizado.`, true);
    // A stable Tek-System line ID wins for an already-linked row. Legacy rows are
    // first scoped by product code, then disambiguated by source dimensions and
    // the net unit price charged (not the gross list price).
    const sameProductCode = (o: WriterRow) => {
      const products = catalog.items.filter((p) => String(p.id) === String(o.itemId));
      return products.length === 1 && productCode(products[0].code) === productCode(item.codigoOriginal)
        && (!o.originalProductCode || productCode(o.originalProductCode) === productCode(item.codigoOriginal));
    };
    const evidence = lineMatchEvidence(row, item, identity);
    const sameIdentity = (order: WriterRow) => sameProductCode(order) && evidence.every((criterion) => criterion.matches(order));
    const linked = orders.filter((order) => order.teksystemLineId === key);
    let order: WriterRow | undefined;
    let matchBasis: string[] = [];
    if (linked.length > 1) throw new WriterConflict("ITEM_PEDIDO_AMBIGUO", `A chave de origem ${key} está associada a mais de um item no ApontaPRO.`);
    if (linked.length === 1) {
      order = linked[0];
      if (!allowSourceIdentityUpdate && !sameIdentity(order)) {
        throw new WriterConflict("IDENTIDADE_ITEM_DIVERGENTE", `Código, cor, variação ou valor líquido de ${key} diverge entre os sistemas.`);
      }
      matchBasis = ["chave da linha Tek-System"];
      if (sameProductCode(order)) matchBasis.push("código do item");
      matchBasis.push(...evidence.filter((criterion) => criterion.matches(order!)).map((criterion) => criterion.label));
    } else {
      const pool = orders.filter((candidate) => !candidate.teksystemLineId && !used.has(text(candidate.id)) && sameProductCode(candidate));
      if (allowSourceIdentityUpdate) {
        if (pool.length === 1) {
          order = pool[0];
          matchBasis = ["código do item (candidato único)", ...evidence.filter((criterion) => criterion.matches(order!)).map((criterion) => criterion.label)];
        } else if (pool.length > 1) {
          const exact = pool.filter((candidate) => evidence.every((criterion) => criterion.matches(candidate)));
          if (exact.length === 1) order = exact[0];
          else {
            const uniqueSignals = evidence.map((criterion) => ({ criterion, candidates: pool.filter(criterion.matches) }))
              .filter((entry) => entry.candidates.length === 1);
            const uniqueIds = [...new Set(uniqueSignals.map((entry) => text(entry.candidates[0].id)))];
            if (uniqueIds.length === 1) order = uniqueSignals[0].candidates[0];
            else if (uniqueIds.length > 1) throw new WriterConflict("ITEM_PEDIDO_AMBIGUO", `Cor, variação e valor apontam para linhas diferentes no item ${key}; requer revisão.`);
          }
          if (order) matchBasis = ["código do item", ...evidence.filter((criterion) => criterion.matches(order!)).map((criterion) => criterion.label)];
        }
      } else {
        const exact = pool.filter(sameIdentity);
        if (exact.length === 1) order = exact[0];
        if (order) matchBasis = ["código do item", ...evidence.map((criterion) => criterion.label)];
      }
      if (order && allowSourceIdentityUpdate) {
        const competing = rows.some((otherRow, otherIndex) => {
          if (sourceLineKey(otherRow) === key) return false;
          const otherItem = input.itens![otherIndex];
          const otherIdentity = deriveProductIdentity(otherItem);
          if (productCode(otherItem.codigoOriginal) !== productCode(item.codigoOriginal)) return false;
          return lineMatchEvidence(otherRow, otherItem, otherIdentity).every((criterion) => criterion.matches(order!));
        });
        if (competing) throw new WriterConflict("ITEM_PEDIDO_AMBIGUO", `Mais de uma linha Tek-System pode corresponder ao item ${text(order.id)}; requer revisão da chave de origem.`);
      }
    }
    if (!order) {
      const codeCandidates = orders.filter((candidate) => !candidate.teksystemLineId && sameProductCode(candidate));
      if (allowSourceIdentityUpdate && codeCandidates.length > 1) {
        throw new WriterConflict("ITEM_PEDIDO_AMBIGUO", `Não foi possível associar ${key} por código, cor, variação e valor líquido sem escolher uma linha arbitrariamente.`);
      }
      if (missing) { missing.push(row); return; }
      if (codeCandidates.length > 1) throw new WriterConflict("ITEM_PEDIDO_AMBIGUO", `Não foi possível associar ${key} por código, cor, variação e valor líquido sem escolher uma linha arbitrariamente.`);
      throw new WriterConflict("ITEM_PEDIDO_AUSENTE", `Item ${key}, código ${text(item.codigoOriginal)}, não está no pedido do ApontaPRO ou diverge dos dados de origem.`);
    }
    if (used.has(text(order.id))) throw new WriterConflict("ITEM_PEDIDO_AMBIGUO", `A linha ${text(order.id)} seria associada a mais de um item Tek-System.`);
    if (Math.abs(number(order.totalQuantity, key) - number(item.quantidade, key)) > 0.0001 && !allowQuantityMismatch) throw new WriterConflict("QUANTIDADE_PEDIDO_DIVERGENTE", `A quantidade de ${key} diverge entre os sistemas.`);
    if (!allowSourceIdentityUpdate && String(order.customerId || "") && String(order.customerId) !== String(input.cliente!.codigo)) throw new WriterConflict("CLIENTE_PEDIDO_DIVERGENTE", `Cliente do item ${key} diverge entre os sistemas.`);
    used.add(text(order.id)); matches.push({ row, order, matchBasis });
  });
  if (used.size !== orders.length) throw new WriterConflict("ITENS_PEDIDO_DIVERGENTES", "O ApontaPRO contém itens adicionais para este pedido.");
  return matches;
}
export function planOrder(job: WriterJob, catalog: WriterCatalog, orders: WriterRow[], now: Date): WriterPlan {
  const input = orderInput(job.rows, catalog);
  if (orders.length) {
    if (orders.some((order) => order.status === "CANCELADO")) {
      throw new WriterConflict("PEDIDO_CANCELADO", "Pedido cancelado no ApontaPRO requer revisão antes de sincronizar alterações.");
    }
    const missing: WriterRow[] = [];
    const matches = bindSourceLines(job.rows, input, orders, catalog, missing, true, true);
    const currentFiscalTypes = [...new Set(orders.map((order) => text(order.fiscalType)).filter(Boolean))];
    if (currentFiscalTypes.length > 1 || currentFiscalTypes.some((type) => !["COM_NF", "SEM_NF"].includes(type))) {
      throw new WriterConflict("FISCAL_PEDIDO_DIVERGENTE", "Itens existentes possuem classificações fiscais inconsistentes.");
    }
    const families = new Set((input.itens || []).map((item) => normalizeText(item.familia)).filter(Boolean));
    const hasGerencial = families.has("GERENCIAL");
    const hasIndefinida = families.has("INDEFINIDA");
    const fiscalWarnings: string[] = [];
    let sourceFiscalType = currentFiscalTypes[0] as "COM_NF" | "SEM_NF" | undefined;
    if (hasGerencial && hasIndefinida) {
      fiscalWarnings.push(`O pedido contém famílias GERENCIAL e INDEFINIDA; classificação ${sourceFiscalType || "atual"} preservada e requer conferência.`);
    } else if (hasGerencial) sourceFiscalType = "SEM_NF";
    else if (hasIndefinida) sourceFiscalType = "COM_NF";
    if (!sourceFiscalType) throw new WriterConflict("FISCAL_PEDIDO_DIVERGENTE", "Não foi possível determinar a classificação fiscal do pedido existente.");
    const preparedByLine = new Map<string, NonNullable<ReturnType<typeof prepareOrder>["prepared"]>["lines"][number]>();
    const validationWarnings: string[] = [];
    let sourceHasRET = false;
    const representativeMatch = input.representante
      ? matchRepresentative(input.representante, catalog.users)
      : null;
    if (representativeMatch && !representativeMatch.representative) {
      validationWarnings.push(`Consultor Tek-System "${input.representante}" sem correspondência única no ApontaPRO; representante existente preservado até o cadastro ser associado.`);
    }
    job.rows.forEach((row, index) => {
      const validation = prepareOrder({
        ...input, representante: representativeMatch?.representative ? input.representante : "",
        itens: [input.itens![index]], comNotaFiscal: sourceFiscalType === "COM_NF",
      }, catalog, now);
      if (!validation.prepared) throw new WriterConflict("PEDIDO_INVALIDO", validation.errors.map((e) => e.message).join("; "), validation.errors.some((e) => /NAO_ENCONTRADO/.test(e.code)));
      preparedByLine.set(sourceLineKey(row), validation.prepared.lines[0]);
      sourceHasRET = validation.prepared.hasRET;
      validationWarnings.push(...validation.warnings);
    });
    const sourceHead = job.rows[0];
    const rawDeliveryDate = value(sourceHead, "promessaEntrega") || value(sourceHead, "previsaoFaturamento");
    const sourceDeliveryDate = businessDate(rawDeliveryDate);
    const deliveryDate = /^\d{4}-\d{2}-\d{2}$/.test(sourceDeliveryDate || "") ? sourceDeliveryDate : undefined;
    const payment = sourcePayment(job.rows[0]);
    const representativePatch = representativeMatch?.representative
      ? { representativeId: representativeMatch.representative.id, representativeName: representativeMatch.representative.name }
      : {};
    const mutations = matches.map(({ row, order }) => {
      const key = sourceLineKey(row);
      const line = preparedByLine.get(key);
      if (!line) throw new WriterConflict("PEDIDO_INCOMPLETO", `Não foi possível calcular os dados da linha ${key}.`);
      const quantityChanged = Math.abs(number(order.totalQuantity, key) - line.totalQuantity) > 0.0001;
      const currentInvoiced = number(order.invoicedQuantity || (order.status === "FATURADO" ? order.totalQuantity : 0), key);
      const identityChanged = String(order.itemId ?? "") !== String(line.itemId)
        || dimension(order.color) !== dimension(line.color)
        || dimension(order.size) !== dimension(line.size)
        || normalizeText(order.variation) !== normalizeText(line.variation)
        || (order.originalProductCode && productCode(order.originalProductCode) !== productCode(line.codigoOriginal));
      const customerChanged = String(order.customerId ?? "") !== String(input.cliente!.codigo);
      const operationStarted = currentInvoiced > 0 || number(order.packedQuantity || 0, key) > 0 || number(order.producedQuantity || 0, key) > 0
        || number(order.paintedQuantity || 0, key) > 0 || number(order.cutQuantity || 0, key) > 0
        || Boolean(text(order.status) && !["PENDENTE", "AGUARDANDO_APROVACAO"].includes(text(order.status)));
      if ((identityChanged || customerChanged) && operationStarted) {
        throw new WriterConflict("IDENTIDADE_COM_OPERACAO_INICIADA", `Código, variação ou cliente de ${key} divergiu, mas o item já tem operação iniciada; requer revisão para preservar o histórico.`);
      }
      if (quantityChanged && (
        currentInvoiced > 0 || number(order.packedQuantity, key) > 0 || number(order.producedQuantity, key) > 0 ||
        number(order.paintedQuantity, key) > 0 || number(order.cutQuantity, key) > 0 ||
        !["PENDENTE", "AGUARDANDO_APROVACAO"].includes(text(order.status))
      )) {
        throw new WriterConflict("QUANTIDADE_COM_OPERACAO_INICIADA", `A quantidade de ${key} mudou, mas o item já tem operação/faturamento ou saiu de PENDENTE. Requer revisão antes de ajustar.`);
      }
      const commercialFieldsChanged = [
        ["unitPrice", line.unitPrice], ["discountPercent", line.discountPercent],
        ["discountAmount", line.discountAmount], ["fiscalType", sourceFiscalType],
      ].some(([field, next]) => signature(order[field as string] ?? null) !== signature(next ?? null));
      if (commercialFieldsChanged && currentInvoiced > 0) {
        throw new WriterConflict("PEDIDO_FATURADO_REQUER_REVISAO", `Dados comerciais da linha ${key} mudaram após faturamento. Requer revisão.`);
      }
      const sourceObservations = text(value(sourceHead, "observacoes"));
      const notes = withPaymentNote(
        withSourceNotes(order.notes, sourceObservations, order.teksystemOrderObservations), payment.note,
      );
      const patch = {
        teksystemLineId: key, teksystemOrderId: job.externalKey,
        teksystemCompanyId: value(row, "empresa"), teksystemCustomerCode: text(value(row, "cliente")),
        customerId: input.cliente!.codigo, customerName: input.cliente!.nome,
        paymentCondition: normalizeSystemPaymentCondition(payment.method),
        paymentTerms: payment.terms.length ? `${payment.terms.join("/")} Dias` : "", paymentTermsDays: payment.terms,
        billingRule: "cadastro", teksystemPaymentDescription: payment.description,
        teksystemOrderObservations: sourceObservations, notes,
        totalQuantity: line.totalQuantity, quantityScaled: line.quantityScaled,
        itemId: line.itemId, color: line.color, size: line.size, variation: line.variation,
        originalProductCode: line.codigoOriginal,
        unitPrice: line.unitPrice, unitPriceScaled: line.unitPriceScaled,
        discountPercent: line.discountPercent, discountPercentScaled: line.discountPercentScaled,
        discountAmount: line.discountAmount, discountAmountScaled: line.discountAmountScaled,
        grossTotalScaled: line.grossTotalScaled, netTotalScaled: line.netTotalScaled,
        itemNotes: line.itemNotes, fiscalType: sourceFiscalType,
        hasRET: sourceHasRET,
        ...(deliveryDate ? { deliveryDate } : {}),
        ...representativePatch,
      };
      return patchMutation("orders", order.id, order, patch);
    }).filter((m): m is WriterMutation => Boolean(m));
    const added: WriterRow[] = [];
    const warnings: string[] = [];
    if (missing.length) {
      if (orders.some((o) => o.status === "CANCELADO")) throw new WriterConflict("PEDIDO_CANCELADO", "Pedido cancelado requer revisão antes de acrescentar itens.");
      if (job.rows.length > 180) throw new WriterConflict("PEDIDO_MUITO_GRANDE", "Pedido excede 180 itens para complementação atômica.");
      // Reuse the existing creation path to validate codes, money, customer,
      // representatives and source dates ONLY for genuinely new source lines.
      const creation = planOrder({ ...job, rows: missing }, catalog, [], now).createOrder!;
      const sourceFiscalType = creation.prepared.fiscalType;
      const fiscalTypes = [...new Set(orders.map((o) => text(o.fiscalType)).filter(Boolean))];
      if (fiscalTypes.length > 1 || fiscalTypes.some((f) => !["COM_NF", "SEM_NF"].includes(f))) throw new WriterConflict("FISCAL_PEDIDO_DIVERGENTE", "Itens existentes possuem classificações fiscais inconsistentes.");
      if (fiscalTypes.length) {
        // Appending a line must not change an existing order's fiscal decision.
        creation.prepared.fiscalType = fiscalTypes[0] as "COM_NF" | "SEM_NF";
        if (sourceFiscalType !== creation.prepared.fiscalType) warnings.push(`Classificação fiscal ${creation.prepared.fiscalType} do pedido preservada; origem dos novos itens indica ${sourceFiscalType}.`);
      }
      creation.prepared.normalizedPayloadHash = signature({ ...creation.prepared, normalizedPayloadHash: undefined });
      missing.forEach((row, index) => {
        const key = sourceLineKey(row);
        const id = stableNumericId(job.tenantId, "pedido-linha", key);
        if (orders.some((o) => text(o.id) === text(id)) || added.some((o) => o.id === id)) throw new WriterConflict("ID_LINHA_OCUPADO", "Identificador determinístico de linha ocupado; requer revisão.");
        const document = buildImportedOrderDocument(creation, index, id, normalizeSystemPaymentCondition(payment.method), "cadastro");
        mutations.push({ collection: "orders", docId: text(id), before: null,
          patch: { ...document, teksystemPaymentDescription: payment.description, teksystemSourceFiscalType: sourceFiscalType } });
        added.push({ id, codigo: text(value(row, "codigoItem")), quantidade: document.totalQuantity, sourceLineId: key });
      });
    }
    const pdfFields = new Set([
      "customerId", "customerName", "itemId", "originalProductCode", "color", "size", "variation",
      "paymentCondition", "paymentTerms", "paymentTermsDays", "billingRule", "notes", "representativeName", "representativeId",
      "deliveryDate", "totalQuantity", "unitPrice", "discountPercent", "discountAmount", "fiscalType", "hasRET", "itemNotes",
    ]);
    const updatedFields = [...new Set(mutations.flatMap((m) => Object.keys(m.patch)).filter((field) => pdfFields.has(field)))].sort();
    return { action: missing.length ? "COMPLEMENTADO" : updatedFields.length ? "ATUALIZADO" : "JA_EXISTE", mutations,
      ...(missing.length ? { orderGuards: orders } : {}),
      details: { codigoPedido: job.externalKey, orderIds: [...matches.map(({ order }) => order.id), ...added.map((o) => o.id)],
        pdfNeedsRefresh: missing.length > 0 || updatedFields.length > 0,
        camposAtualizados: updatedFields, quantidadeItensIncluidos: added.length, itensIncluidos: added,
        vinculosItens: matches.map(({ row, order, matchBasis }) => ({ linhaTekSystem: sourceLineKey(row), itemApontaPRO: order.id, criterio: matchBasis })),
        avisos: [...new Set([...warnings, ...fiscalWarnings, ...validationWarnings])] } };
  }
  // The legacy manual importer may use exact descriptions as a fallback. The
  // integration must validate every product by code BEFORE invoking that importer.
  for (const item of input.itens!) {
    if (!matchProduct({ ...item, descricao: undefined }, catalog.items as any).product) throw new WriterConflict("PRODUTO_NAO_ENCONTRADO", `Código ${text(item.codigoOriginal)} não foi encontrado de forma única.`, true);
  }
  const prepared = prepareOrder(input, catalog, now);
  if (!prepared.prepared) throw new WriterConflict("PEDIDO_INVALIDO", prepared.errors.map((e) => e.message).join("; "), prepared.errors.some((e) => /NAO_ENCONTRADO/.test(e.code)));
  if (prepared.prepared.lines.length > 180) throw new WriterConflict("PEDIDO_MUITO_GRANDE", "Pedido excede 180 itens para criação atômica.");
  const date = new Date(text(value(job.rows[0], "cadastradoEm") || value(job.rows[0], "emitidoEm"))).getTime();
  return {
    action: "CRIADO", mutations: [], details: { codigoPedido: job.externalKey, quantidadeItens: prepared.prepared.lines.length, avisos: prepared.warnings, pdfNeedsRefresh: true },
    createOrder: {
      tenantId: job.tenantId, origem: "TEKSYSTEM", solicitadoPor: "teksystem-writer-agent",
      prepared: prepared.prepared, createdAt: Number.isFinite(date) ? date : now.getTime(), importedAt: now.getTime(),
      teksystem: { jobId: job.id, jobHash: job.hash, companyId: value(job.rows[0], "empresa"),
        customerCode: text(value(job.rows[0], "cliente")), lineIds: job.rows.map(sourceLineKey) },
    },
  };
}
export function planCargaQuantityMutations(
  job: WriterJob, plan: WriterPlan, cargas: WriterRow[], now = new Date(),
): WriterMutation[] {
  if (job.kind !== "pedidos") return [];
  const linked = (orderId: number) => cargas.filter((carga) =>
    carga.tenantId === job.tenantId && Array.isArray(carga.orderIds) &&
    carga.orderIds.some((id: unknown) => Number(id) === orderId),
  );
  const targets = new Map<string, { before: WriterRow; quantities: Record<string, number>; auditTrail: WriterRow[] }>();
  const warnings = new Set<string>();
  for (const mutation of plan.mutations.filter((entry) => entry.collection === "orders" && entry.before)) {
    const orderId = Number(mutation.docId);
    if (!Number.isSafeInteger(orderId)) continue;
    const loads = linked(orderId);
    if (Object.hasOwn(mutation.patch, "deliveryDate") && loads.length) {
      warnings.add(`Pedido ${job.externalKey}: data de entrega atualizada; vínculo existente com carga preservado. Confira a programação da expedição.`);
    }
    if (!Object.hasOwn(mutation.patch, "totalQuantity") || !loads.length) continue;
    if (loads.length > 1) throw new WriterConflict("PEDIDO_EM_MULTIPLAS_CARGAS", `A quantidade do item ${orderId} mudou, mas ele está distribuído em mais de uma carga. Requer revisão para preservar a alocação.`);
    const carga = loads[0];
    if (!["ABERTA", "PLANEJADA"].includes(text(carga.status))) {
      throw new WriterConflict("CARGA_OPERACIONAL_REQUER_REVISAO", `A quantidade do item ${orderId} mudou, mas a carga ${text(carga.name || carga.id)} já avançou na operação.`);
    }
    if (number(carga.separatedQuantities?.[orderId] || 0, String(orderId)) > 0) {
      throw new WriterConflict("CARGA_SEPARADA_REQUER_REVISAO", `A quantidade do item ${orderId} mudou, mas já há separação registrada na carga ${text(carga.name || carga.id)}.`);
    }
    const key = text(carga.docId || carga.id);
    let target = targets.get(key);
    if (!target) {
      target = {
        before: carga,
        quantities: { ...(carga.orderQuantities || {}) },
        auditTrail: Array.isArray(carga.auditTrail) ? [...carga.auditTrail] : [],
      };
      targets.set(key, target);
    }
    target.quantities[String(orderId)] = number(mutation.patch.totalQuantity, String(orderId));
    target.auditTrail.push({
      timestamp: now.getTime(), userId: "teksystem-writer-agent", userName: "Tek-System",
      action: `Quantidade do item ${orderId} atualizada para ${mutation.patch.totalQuantity} un conforme o pedido ${job.externalKey}`,
    });
  }
  if (warnings.size) plan.details.avisos = [...new Set([...(Array.isArray(plan.details.avisos) ? plan.details.avisos : []), ...warnings])];
  const mutations: WriterMutation[] = [];
  for (const [docId, target] of targets) {
    const patch = { orderQuantities: target.quantities, auditTrail: target.auditTrail };
    if (signature(target.before.orderQuantities || {}) === signature(patch.orderQuantities) &&
        signature(target.before.auditTrail || []) === signature(patch.auditTrail)) continue;
    mutations.push({ collection: "cargas", docId, before: target.before, patch });
  }
  return mutations;
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
