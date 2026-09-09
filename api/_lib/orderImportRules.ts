export const MONEY_SCALE = 10_000n;
export const QUANTITY_SCALE = 10_000n;
export const PERCENT_SCALE = 10_000n;

export type ImportErrorCode =
  | "PEDIDO_JA_EXISTE"
  | "CLIENTE_NAO_ENCONTRADO"
  | "CLIENTE_AMBIGUO"
  | "PRODUTO_NAO_ENCONTRADO"
  | "REPRESENTANTE_NAO_ENCONTRADO"
  | "FORMA_PAGAMENTO_INVALIDA"
  | "DATA_INVALIDA"
  | "FAMILIA_NF_CONFLITANTE"
  | "QUANTIDADE_INVALIDA"
  | "PRECO_INVALIDO"
  | "DESCONTO_INVALIDO"
  | "PEDIDO_INVALIDO"
  | "ERRO_INTERNO";

export interface ImportIssue {
  code: ImportErrorCode | string;
  message: string;
  field?: string;
  itemIndex?: number;
  details?: Record<string, unknown>;
}

export interface ExternalCustomerInput {
  codigo?: string | number | null;
  nome?: string | null;
}

export interface OrderItemImportInput {
  codigoOriginal?: string | number | null;
  codigoProduto?: string | number | null;
  descricao?: string | null;
  familia?: string | null;
  cor?: string | null;
  tamanho?: string | null;
  variacao?: string | null;
  quantidade?: string | number | null;
  precoUnitario?: string | number | null;
  descontoPercentual?: string | number | null;
  observacoes?: string | null;
}

export interface OrderImportInput {
  codigoPedido?: string | number | null;
  cliente?: ExternalCustomerInput | null;
  representante?: string | null;
  formaPagamento?: string | null;
  prazos?: Array<string | number> | string | number | null;
  comNotaFiscal?: boolean | null;
  dataLimite?: string | null;
  promEntrega?: string | null;
  previsao?: string | null;
  possuiRET?: boolean | null;
  transacaoVenda?: string | number | null;
  observacoes?: string | null;
  itens?: OrderItemImportInput[] | null;
}

export interface OrderImportPayload {
  origem?: string | null;
  tenantId?: string | null;
  solicitadoPor?: string | null;
  pedidos?: OrderImportInput[] | null;
}

export interface CatalogCustomer {
  id: string | number;
  name?: string;
  tradeName?: string;
  tenantId?: string;
}

export interface CatalogItem {
  id: string | number;
  code?: string;
  name?: string;
  tenantId?: string;
}

export interface CatalogUser {
  id: string;
  name?: string;
  role?: string;
  tenantId?: string;
}

export interface CatalogSnapshot {
  customers: CatalogCustomer[];
  items: CatalogItem[];
  users: CatalogUser[];
}

export interface ResolvedCustomer {
  id: string | number;
  name: string;
  tradeName?: string;
}

export interface ResolvedProduct {
  id: string | number;
  code: string;
  name: string;
}

export interface ResolvedRepresentative {
  id: string;
  name: string;
}

export interface ParsedLineTotals {
  quantityScaled: number;
  unitPriceScaled: number;
  discountPercentScaled: number;
  grossTotalScaled: number;
  discountAmountScaled: number;
  netTotalScaled: number;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  grossTotal: number;
  discountAmount: number;
  netTotal: number;
}

export interface ProductIdentity {
  codigoOriginal: string;
  codigoProduto: string;
  sufixoCor: string | null;
  cor: string;
  avisos: string[];
}

export interface FiscalResolution {
  fiscalType: "COM_NF" | "SEM_NF" | null;
  errors: ImportIssue[];
  warnings: string[];
}

const COLOR_BY_SUFFIX: Record<string, string> = {
  ".1": "ZINCADO",
  ".3": "PRETO FOSCO",
  ".4": "COBRE",
  ".6": "CHAMPAGNE",
  ".11": "CINZA",
  ".12": "DOURADO",
  ".14": "INOX",
};

const REPRESENTATIVE_MAP: Record<string, string> = {
  "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD": "Império Representante",
  "IMPERIO REPRESENTANTE": "Império Representante",
  KESSE: "Kesse Representante",
  "KESSE REPRESENTANTE": "Kesse Representante",
  "ANDRE MILLENIUM REPRESENTACOES": "André Representante",
  "ANDRE REPRESENTANTE": "André Representante",
  "MAPEFOR REPRESENTACOES LTDA": "Danilo Representante",
  "DANILO REPRESENTANTE": "Danilo Representante",
  LILIAN: "Lilian Representante",
  "LILIAN REPRESENTANTE": "Lilian Representante",
  ANGELO: "Ângelo representante",
  "ANGELO REPRESENTANTE": "Ângelo representante",
};

export function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

export function normalizeOrderCode(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeDecimalInput(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    const raw = String(value);
    if (!/[eE]/.test(raw)) return raw;
    return value.toFixed(12).replace(/0+$/, "").replace(/\.$/, "");
  }

  let raw = String(value)
    .trim()
    .replace(/R\$/gi, "")
    .replace(/\s+/g, "");
  if (!raw) return null;

  const negative = raw.startsWith("-");
  raw = raw.replace(/^[+-]/, "");
  raw = raw.replace(/[^0-9.,]/g, "");
  if (!raw) return null;

  if (raw.includes(",")) {
    raw = raw.replace(/\./g, "").replace(",", ".");
  } else {
    const dots = (raw.match(/\./g) || []).length;
    if (dots > 1) raw = raw.replace(/\./g, "");
  }

  if (!/^\d+(?:\.\d+)?$/.test(raw)) return null;
  return `${negative ? "-" : ""}${raw}`;
}

export function decimalToScaledInt(
  value: string | number | null | undefined,
  scaleDigits = 4,
): bigint | null {
  const normalized = normalizeDecimalInput(value);
  if (normalized === null) return null;

  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [integerPart, rawFraction = ""] = unsigned.split(".");
  const padded = (rawFraction + "0".repeat(scaleDigits + 1)).slice(0, scaleDigits + 1);
  const kept = padded.slice(0, scaleDigits) || "0";
  const roundDigit = Number(padded[scaleDigits] || "0");
  const base = BigInt(integerPart || "0") * 10n ** BigInt(scaleDigits) + BigInt(kept);
  const rounded = roundDigit >= 5 ? base + 1n : base;
  return negative ? -rounded : rounded;
}

function toSafeNumber(value: bigint, field: string): number {
  const asNumber = Number(value);
  if (!Number.isSafeInteger(asNumber)) {
    throw new Error(`${field} excede o limite numérico seguro do Firestore.`);
  }
  return asNumber;
}

export function scaledIntToNumber(value: bigint, scaleDigits = 4): number {
  return Number(value) / 10 ** scaleDigits;
}

function roundDivPositive(numerator: bigint, denominator: bigint): bigint {
  if (numerator < 0n || denominator <= 0n) {
    throw new Error("roundDivPositive requer valores não negativos.");
  }
  return (numerator + denominator / 2n) / denominator;
}

export function calculateLineTotals(item: OrderItemImportInput): {
  totals: ParsedLineTotals | null;
  errors: ImportIssue[];
} {
  const errors: ImportIssue[] = [];
  const quantityScaled = decimalToScaledInt(item.quantidade, 4);
  const unitPriceScaled = decimalToScaledInt(item.precoUnitario, 4);
  const discountPercentScaled = decimalToScaledInt(item.descontoPercentual ?? 0, 4);

  if (quantityScaled === null || quantityScaled <= 0n) {
    errors.push({ code: "QUANTIDADE_INVALIDA", message: "A quantidade deve ser maior que zero.", field: "quantidade" });
  }
  if (unitPriceScaled === null || unitPriceScaled < 0n) {
    errors.push({ code: "PRECO_INVALIDO", message: "O preço unitário deve ser um valor válido e não negativo.", field: "precoUnitario" });
  }
  if (discountPercentScaled === null || discountPercentScaled < 0n || discountPercentScaled > 100n * PERCENT_SCALE) {
    errors.push({ code: "DESCONTO_INVALIDO", message: "O desconto percentual deve ficar entre 0 e 100.", field: "descontoPercentual" });
  }

  if (errors.length > 0 || quantityScaled === null || unitPriceScaled === null || discountPercentScaled === null) {
    return { totals: null, errors };
  }

  const grossTotalScaled = roundDivPositive(quantityScaled * unitPriceScaled, QUANTITY_SCALE);
  const discountAmountScaled = roundDivPositive(grossTotalScaled * discountPercentScaled, 100n * PERCENT_SCALE);
  const netTotalScaled = grossTotalScaled - discountAmountScaled;

  return {
    totals: {
      quantityScaled: toSafeNumber(quantityScaled, "quantityScaled"),
      unitPriceScaled: toSafeNumber(unitPriceScaled, "unitPriceScaled"),
      discountPercentScaled: toSafeNumber(discountPercentScaled, "discountPercentScaled"),
      grossTotalScaled: toSafeNumber(grossTotalScaled, "grossTotalScaled"),
      discountAmountScaled: toSafeNumber(discountAmountScaled, "discountAmountScaled"),
      netTotalScaled: toSafeNumber(netTotalScaled, "netTotalScaled"),
      quantity: scaledIntToNumber(quantityScaled),
      unitPrice: scaledIntToNumber(unitPriceScaled),
      discountPercent: scaledIntToNumber(discountPercentScaled),
      grossTotal: scaledIntToNumber(grossTotalScaled),
      discountAmount: scaledIntToNumber(discountAmountScaled),
      netTotal: scaledIntToNumber(netTotalScaled),
    },
    errors: [],
  };
}

export function deriveProductIdentity(item: OrderItemImportInput): ProductIdentity {
  const original = String(item.codigoOriginal ?? item.codigoProduto ?? "").trim();
  const explicitBase = String(item.codigoProduto ?? "").trim();
  const originalMatch = original.match(/^(.+?)(\.(\d+))$/);
  const suffix = originalMatch ? `.${originalMatch[3]}` : null;
  const baseFromOriginal = originalMatch ? originalMatch[1] : original;
  const base = (explicitBase || baseFromOriginal).replace(/\..*$/, "").trim();
  const explicitColor = normalizeText(item.cor);
  const mappedColor = suffix ? COLOR_BY_SUFFIX[suffix] : "";
  const warnings: string[] = [];

  if (suffix && !mappedColor) warnings.push(`Sufixo de cor ${suffix} não possui mapeamento cadastrado.`);
  if (mappedColor && explicitColor && explicitColor !== mappedColor) {
    warnings.push(`Cor informada (${explicitColor}) diverge do sufixo ${suffix}; foi usada ${mappedColor}.`);
  }

  return {
    codigoOriginal: original,
    codigoProduto: base,
    sufixoCor: suffix,
    cor: mappedColor || explicitColor || "-",
    avisos: warnings,
  };
}

export function mapPaymentMethod(value: unknown): string | null {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  if (normalized.startsWith("BOLETO")) return "Boleto Bancário";
  if (normalized.startsWith("PIX")) return "PIX";
  if (normalized === "CARTEIRA") return "Carteira";
  if (normalized === "DEPOSITO" || normalized === "DEPOSITO EM CONTA") return "Depósito em Conta";
  return null;
}

export function normalizePaymentTerms(value: OrderImportInput["prazos"]): number[] {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\/;,\s]+/)
      : value === null || value === undefined
        ? []
        : [value];

  const result: number[] = [];
  for (const raw of rawValues) {
    if (raw === "" || raw === null || raw === undefined) continue;
    const parsed = Number(String(raw).replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0) continue;
    if (!result.includes(parsed)) result.push(parsed);
  }
  return result;
}

export function mapRepresentativeName(value: unknown): string | null | undefined {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  return REPRESENTATIVE_MAP[normalized];
}

export function getTodayInSaoPaulo(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function parseDateCandidate(value: string): string | null {
  const clean = value.trim();
  if (!clean || /^0+$/.test(clean.replace(/\D/g, ""))) return null;
  let y: number;
  let m: number;
  let d: number;
  let match = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    y = Number(match[1]); m = Number(match[2]); d = Number(match[3]);
  } else {
    match = clean.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
    if (!match) return null;
    d = Number(match[1]); m = Number(match[2]); y = Number(match[3]);
  }
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return null;
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function normalizeDeliveryDate(order: OrderImportInput, now = new Date()): {
  date: string | null;
  errors: ImportIssue[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const today = getTodayInSaoPaulo(now);
  const candidates = [order.dataLimite, order.promEntrega, order.previsao];
  const firstNonEmpty = candidates.find((v) => String(v ?? "").trim() !== "");

  if (!firstNonEmpty || /^0+$/.test(String(firstNonEmpty).replace(/\D/g, ""))) {
    warnings.push("Data limite ausente/zerada; foi utilizada a data atual de São Paulo.");
    return { date: today, errors: [], warnings };
  }

  const parsed = parseDateCandidate(String(firstNonEmpty));
  if (!parsed) {
    return { date: null, errors: [{ code: "DATA_INVALIDA", message: `Data inválida: ${String(firstNonEmpty)}`, field: "dataLimite" }], warnings };
  }
  if (parsed < today) {
    warnings.push(`Data ${parsed} está no passado; foi utilizada a data atual (${today}).`);
    return { date: today, errors: [], warnings };
  }
  return { date: parsed, errors: [], warnings };
}

export function resolveFiscalType(order: OrderImportInput): FiscalResolution {
  const warnings: string[] = [];
  const errors: ImportIssue[] = [];
  const knownFamilies = new Set<string>();
  const unknownFamilies = new Set<string>();
  for (const item of order.itens || []) {
    const family = normalizeText(item.familia);
    if (!family) continue;
    if (family === "GERENCIAL" || family === "INDEFINIDA") knownFamilies.add(family);
    else unknownFamilies.add(family);
  }
  if (knownFamilies.has("GERENCIAL") && knownFamilies.has("INDEFINIDA")) {
    errors.push({ code: "FAMILIA_NF_CONFLITANTE", message: "O pedido contém famílias GERENCIAL e INDEFINIDA ao mesmo tempo.", field: "itens[].familia" });
    return { fiscalType: null, errors, warnings };
  }
  if (unknownFamilies.size > 0) warnings.push(`Famílias sem regra automática: ${Array.from(unknownFamilies).join(", ")}.`);
  if (knownFamilies.has("GERENCIAL")) return { fiscalType: "SEM_NF", errors, warnings };
  if (knownFamilies.has("INDEFINIDA")) return { fiscalType: "COM_NF", errors, warnings };
  if (typeof order.comNotaFiscal === "boolean") {
    warnings.push("Família não informada; regra de NF foi recebida já interpretada no campo comNotaFiscal.");
    return { fiscalType: order.comNotaFiscal ? "COM_NF" : "SEM_NF", errors, warnings };
  }
  warnings.push("Família e comNotaFiscal não informados; a API não inferiu silenciosamente a regra fiscal.");
  errors.push({ code: "FAMILIA_NF_CONFLITANTE", message: "Não foi possível determinar COM NF/SEM NF sem família ou comNotaFiscal.", field: "comNotaFiscal" });
  return { fiscalType: null, errors, warnings };
}

export function resolveRET(order: OrderImportInput): boolean {
  if (order.transacaoVenda !== null && order.transacaoVenda !== undefined && String(order.transacaoVenda).trim() !== "") {
    return Number(order.transacaoVenda) === 74;
  }
  return Boolean(order.possuiRET);
}

export function matchCustomer(input: ExternalCustomerInput | null | undefined, customers: CatalogCustomer[]): { customer: ResolvedCustomer | null; errors: ImportIssue[] } {
  const errors: ImportIssue[] = [];
  const code = String(input?.codigo ?? "").trim();
  const nameNorm = normalizeText(input?.nome);
  let matches: CatalogCustomer[] = [];
  if (code) {
    matches = customers.filter((c) => String(c.id).trim() === code);
    if (matches.length === 1) return { customer: normalizeCustomer(matches[0]), errors };
    if (matches.length > 1) return { customer: null, errors: [{ code: "CLIENTE_AMBIGUO", message: `Mais de um cliente encontrado para o código ${code}.` }] };
  }
  if ((code === "25" || nameNorm === "MOVEIS B P LTDA") && customers.length > 0) {
    const special = customers.filter((c) => {
      const combined = `${normalizeText(c.name)} ${normalizeText(c.tradeName)}`;
      return String(c.id) === "25" || combined.includes("MOVEIS BOM PASTOR");
    });
    if (special.length === 1) return { customer: normalizeCustomer(special[0]), errors };
    if (special.length > 1) return { customer: null, errors: [{ code: "CLIENTE_AMBIGUO", message: "Regra especial do cliente 25 encontrou mais de um cadastro interno." }] };
  }
  if (nameNorm) {
    matches = customers.filter((c) => normalizeText(c.name) === nameNorm || normalizeText(c.tradeName) === nameNorm);
    if (matches.length === 1) return { customer: normalizeCustomer(matches[0]), errors };
    if (matches.length > 1) return { customer: null, errors: [{ code: "CLIENTE_AMBIGUO", message: `Mais de um cliente corresponde ao nome ${String(input?.nome)}.` }] };
  }
  return { customer: null, errors: [{ code: "CLIENTE_NAO_ENCONTRADO", message: `Cliente não encontrado (código: ${code || "-"}, nome: ${String(input?.nome ?? "-")}).` }] };
}

function normalizeCustomer(customer: CatalogCustomer): ResolvedCustomer {
  return { id: customer.id, name: String(customer.name || customer.tradeName || customer.id), tradeName: customer.tradeName };
}

export function matchProduct(input: OrderItemImportInput, items: CatalogItem[]): { product: ResolvedProduct | null; identity: ProductIdentity; errors: ImportIssue[] } {
  const identity = deriveProductIdentity(input);
  const errors: ImportIssue[] = [];
  let matches: CatalogItem[] = [];
  if (identity.codigoProduto) {
    const baseNorm = normalizeText(identity.codigoProduto);
    matches = items.filter((item) => normalizeText(String(item.code || "").replace(/\..*$/, "")) === baseNorm);
    if (matches.length === 1) return { product: normalizeProduct(matches[0]), identity, errors };
    if (matches.length > 1) return { product: null, identity, errors: [{ code: "PRODUTO_NAO_ENCONTRADO", message: `Código base ${identity.codigoProduto} é ambíguo no cadastro.`, details: { motivo: "AMBIGUO", quantidadeResultados: matches.length } }] };
  }
  const descriptionNorm = normalizeText(input.descricao);
  if (descriptionNorm) {
    matches = items.filter((item) => normalizeText(item.name) === descriptionNorm);
    if (matches.length === 1) return { product: normalizeProduct(matches[0]), identity, errors };
    if (matches.length > 1) return { product: null, identity, errors: [{ code: "PRODUTO_NAO_ENCONTRADO", message: `Descrição ${String(input.descricao)} é ambígua no cadastro.`, details: { motivo: "AMBIGUO", quantidadeResultados: matches.length } }] };
  }
  errors.push({ code: "PRODUTO_NAO_ENCONTRADO", message: `Produto não encontrado (código: ${identity.codigoProduto || "-"}, descrição: ${String(input.descricao ?? "-")}).`, details: { codigoOriginal: identity.codigoOriginal, codigoProduto: identity.codigoProduto } });
  return { product: null, identity, errors };
}

function normalizeProduct(item: CatalogItem): ResolvedProduct {
  return { id: item.id, code: String(item.code || ""), name: String(item.name || item.code || item.id) };
}

export function matchRepresentative(externalName: unknown, users: CatalogUser[]): { representative: ResolvedRepresentative | null; errors: ImportIssue[] } {
  const mappedName = mapRepresentativeName(externalName);
  if (mappedName === null) return { representative: null, errors: [] };
  if (mappedName === undefined) return { representative: null, errors: [{ code: "REPRESENTANTE_NAO_ENCONTRADO", message: `Consultor/representante não possui mapeamento: ${String(externalName ?? "")}.` }] };
  const mappedNorm = normalizeText(mappedName);
  const matches = users.filter((u) => u.role === "REPRESENTANTE" && normalizeText(u.name) === mappedNorm);
  if (matches.length !== 1) return { representative: null, errors: [{ code: "REPRESENTANTE_NAO_ENCONTRADO", message: `Representante interno ${mappedName} não foi encontrado de forma única.` }] };
  return { representative: { id: matches[0].id, name: String(matches[0].name || mappedName) }, errors: [] };
}
