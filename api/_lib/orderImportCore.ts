import crypto from "node:crypto";
import {
  type CatalogSnapshot,
  type ImportIssue,
  type OrderImportInput,
  type OrderImportPayload,
  calculateLineTotals,
  deriveProductIdentity,
  mapPaymentMethod,
  matchCustomer,
  matchProduct,
  matchRepresentative,
  normalizeDeliveryDate,
  normalizeOrderCode,
  normalizePaymentTerms,
  resolveFiscalType,
  resolveRET,
} from "./orderImportRules.ts";

export interface ImportMeta {
  tenantId: string;
  origem: string;
  solicitadoPor: string;
  now?: Date;
}

export interface PreparedOrderLine {
  itemId: number | string;
  itemCode: string;
  itemName: string;
  codigoOriginal: string;
  color: string;
  size: string;
  variation: string;
  totalQuantity: number;
  quantityScaled: number;
  unitPrice: number;
  unitPriceScaled: number;
  discountPercent: number;
  discountPercentScaled: number;
  discountAmount: number;
  discountAmountScaled: number;
  grossTotalScaled: number;
  netTotalScaled: number;
  itemNotes: string;
}

export interface PreparedOrder {
  codigoPedido: string;
  customerId: string | number;
  customerName: string;
  representativeId?: string;
  representativeName?: string;
  paymentCondition: string;
  paymentTerms: string;
  paymentTermsDays: number[];
  fiscalType: "COM_NF" | "SEM_NF";
  deliveryDate: string;
  hasRET: boolean;
  orderNotes: string;
  lines: PreparedOrderLine[];
  totals: {
    grossTotalScaled: number;
    discountAmountScaled: number;
    netTotalScaled: number;
  };
  warnings: string[];
  normalizedPayloadHash: string;
}

export interface AtomicCreateInput {
  tenantId: string;
  origem: string;
  solicitadoPor: string;
  prepared: PreparedOrder;
  createdAt: number;
}

export interface AtomicCreateResult {
  created: boolean;
  orderIds: number[];
  existingOrderIds?: number[];
}

export interface ImportAuditInput {
  tenantId: string;
  origem: string;
  solicitadoPor: string;
  codigoPedido: string;
  payloadHash: string;
  result: string;
  errors?: ImportIssue[];
  warnings?: string[];
  orderIds?: number[];
  timestamp: number;
}

export interface OrderImportRepository {
  loadCatalog(tenantId: string): Promise<CatalogSnapshot>;
  findExistingOrderIds(tenantId: string, codigoPedido: string): Promise<number[]>;
  createOrderAtomically(input: AtomicCreateInput): Promise<AtomicCreateResult>;
  writeAudit(input: ImportAuditInput): Promise<void>;
}

export interface ImportResultItem {
  codigoPedido: string;
  status: "CRIADO" | "JA_EXISTE" | "ERRO" | "VALIDO";
  pedidoId?: number;
  pedidoIds?: number[];
  quantidadeItens?: number;
  clienteAssociado?: { id: string | number; nome: string };
  representanteAssociado?: { id: string; nome: string } | null;
  formaPagamento?: string;
  prazos?: number[];
  fiscalType?: "COM_NF" | "SEM_NF";
  dataLimite?: string;
  possuiRET?: boolean;
  totais?: PreparedOrder["totals"];
  avisos: string[];
  erros: ImportIssue[];
}

function stableHash(value: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function sumSafe(values: number[]): number {
  const total = values.reduce((acc, value) => acc + value, 0);
  if (!Number.isSafeInteger(total)) throw new Error("Total escalado excede o limite numérico seguro.");
  return total;
}

export function prepareOrder(
  order: OrderImportInput,
  catalog: CatalogSnapshot,
  now = new Date(),
): { prepared: PreparedOrder | null; errors: ImportIssue[]; warnings: string[]; preview: Partial<ImportResultItem> } {
  const errors: ImportIssue[] = [];
  const warnings: string[] = [];
  const codigoPedido = normalizeOrderCode(order.codigoPedido);
  if (!codigoPedido) errors.push({ code: "PEDIDO_INVALIDO", message: "codigoPedido é obrigatório.", field: "codigoPedido" });

  const customerMatch = matchCustomer(order.cliente, catalog.customers);
  errors.push(...customerMatch.errors);
  const representativeMatch = matchRepresentative(order.representante, catalog.users);
  errors.push(...representativeMatch.errors);

  const paymentCondition = mapPaymentMethod(order.formaPagamento);
  if (!paymentCondition) {
    errors.push({ code: "FORMA_PAGAMENTO_INVALIDA", message: `Forma de pagamento não reconhecida: ${String(order.formaPagamento ?? "")}.`, field: "formaPagamento" });
  }
  const paymentTermsDays = normalizePaymentTerms(order.prazos);
  const dateResolution = normalizeDeliveryDate(order, now);
  errors.push(...dateResolution.errors);
  warnings.push(...dateResolution.warnings);
  const fiscalResolution = resolveFiscalType(order);
  errors.push(...fiscalResolution.errors);
  warnings.push(...fiscalResolution.warnings);

  const sourceLines = Array.isArray(order.itens) ? order.itens : [];
  if (sourceLines.length === 0) errors.push({ code: "PEDIDO_INVALIDO", message: "O pedido deve possuir pelo menos um item.", field: "itens" });

  const lines: PreparedOrderLine[] = [];
  sourceLines.forEach((item, index) => {
    const productMatch = matchProduct(item, catalog.items);
    errors.push(...productMatch.errors.map((e) => ({ ...e, itemIndex: index })));
    warnings.push(...productMatch.identity.avisos.map((w) => `Item ${index + 1}: ${w}`));
    const totalsResolution = calculateLineTotals(item);
    errors.push(...totalsResolution.errors.map((e) => ({ ...e, itemIndex: index })));
    if (!productMatch.product || !totalsResolution.totals) return;
    const identity = deriveProductIdentity(item);
    const t = totalsResolution.totals;
    lines.push({
      itemId: productMatch.product.id,
      itemCode: productMatch.product.code,
      itemName: productMatch.product.name,
      codigoOriginal: identity.codigoOriginal,
      color: identity.cor,
      size: String(item.tamanho ?? "-").trim() || "-",
      variation: String(item.variacao ?? "-").trim() || "-",
      totalQuantity: t.quantity,
      quantityScaled: t.quantityScaled,
      unitPrice: t.unitPrice,
      unitPriceScaled: t.unitPriceScaled,
      discountPercent: t.discountPercent,
      discountPercentScaled: t.discountPercentScaled,
      discountAmount: t.discountAmount,
      discountAmountScaled: t.discountAmountScaled,
      grossTotalScaled: t.grossTotalScaled,
      netTotalScaled: t.netTotalScaled,
      itemNotes: String(item.observacoes ?? "").trim(),
    });
  });

  const preview: Partial<ImportResultItem> = {
    clienteAssociado: customerMatch.customer ? { id: customerMatch.customer.id, nome: customerMatch.customer.tradeName || customerMatch.customer.name } : undefined,
    representanteAssociado: representativeMatch.representative
      ? { id: representativeMatch.representative.id, nome: representativeMatch.representative.name }
      : representativeMatch.errors.length === 0 ? null : undefined,
    formaPagamento: paymentCondition || undefined,
    prazos: paymentTermsDays,
    fiscalType: fiscalResolution.fiscalType || undefined,
    dataLimite: dateResolution.date || undefined,
    possuiRET: resolveRET(order),
  };

  if (errors.length > 0 || !customerMatch.customer || !paymentCondition || !dateResolution.date || !fiscalResolution.fiscalType) {
    return { prepared: null, errors, warnings, preview };
  }

  const totals = {
    grossTotalScaled: sumSafe(lines.map((l) => l.grossTotalScaled)),
    discountAmountScaled: sumSafe(lines.map((l) => l.discountAmountScaled)),
    netTotalScaled: sumSafe(lines.map((l) => l.netTotalScaled)),
  };
  preview.totais = totals;

  const preparedBase = {
    codigoPedido,
    customerId: customerMatch.customer.id,
    customerName: customerMatch.customer.tradeName || customerMatch.customer.name,
    representativeId: representativeMatch.representative?.id,
    representativeName: representativeMatch.representative?.name,
    paymentCondition,
    paymentTerms: paymentTermsDays.length ? `${paymentTermsDays.join("/")} Dias` : "",
    paymentTermsDays,
    fiscalType: fiscalResolution.fiscalType,
    deliveryDate: dateResolution.date,
    hasRET: resolveRET(order),
    orderNotes: String(order.observacoes ?? "").trim(),
    lines,
    totals,
    warnings,
  };

  return {
    prepared: { ...preparedBase, normalizedPayloadHash: stableHash(preparedBase) },
    errors: [],
    warnings,
    preview,
  };
}

export async function processOrderImport(
  repository: OrderImportRepository,
  payload: OrderImportPayload,
  meta: ImportMeta,
  dryRun = false,
): Promise<{
  sucesso: boolean;
  dryRun: boolean;
  resumo: { recebidos: number; criados: number; jaExistentes: number; comErro: number; validos: number };
  resultados: ImportResultItem[];
}> {
  const pedidos = Array.isArray(payload.pedidos) ? payload.pedidos : [];
  const catalog = await repository.loadCatalog(meta.tenantId);
  const resultados: ImportResultItem[] = [];
  const now = meta.now || new Date();

  for (const order of pedidos) {
    const codigoPedido = normalizeOrderCode(order.codigoPedido);
    const preparedResult = prepareOrder(order, catalog, now);
    const existingIds = codigoPedido ? await repository.findExistingOrderIds(meta.tenantId, codigoPedido) : [];

    if (existingIds.length > 0) {
      const duplicateError: ImportIssue = { code: "PEDIDO_JA_EXISTE", message: `Pedido ${codigoPedido} já existe e não será alterado.` };
      resultados.push({
        codigoPedido,
        status: "JA_EXISTE",
        pedidoId: existingIds[0],
        pedidoIds: existingIds,
        quantidadeItens: preparedResult.prepared?.lines.length ?? (order.itens || []).length,
        avisos: preparedResult.warnings,
        erros: [duplicateError],
        ...preparedResult.preview,
      });
      if (!dryRun) {
        await repository.writeAudit({
          tenantId: meta.tenantId,
          origem: meta.origem,
          solicitadoPor: meta.solicitadoPor,
          codigoPedido,
          payloadHash: preparedResult.prepared?.normalizedPayloadHash || stableHash(order),
          result: "JA_EXISTE",
          errors: [duplicateError],
          warnings: preparedResult.warnings,
          orderIds: existingIds,
          timestamp: Date.now(),
        });
      }
      continue;
    }

    if (!preparedResult.prepared) {
      resultados.push({ codigoPedido, status: "ERRO", quantidadeItens: (order.itens || []).length, avisos: preparedResult.warnings, erros: preparedResult.errors, ...preparedResult.preview });
      if (!dryRun) {
        await repository.writeAudit({
          tenantId: meta.tenantId,
          origem: meta.origem,
          solicitadoPor: meta.solicitadoPor,
          codigoPedido,
          payloadHash: stableHash(order),
          result: "ERRO_VALIDACAO",
          errors: preparedResult.errors,
          warnings: preparedResult.warnings,
          timestamp: Date.now(),
        });
      }
      continue;
    }

    if (dryRun) {
      resultados.push({ codigoPedido, status: "VALIDO", quantidadeItens: preparedResult.prepared.lines.length, avisos: preparedResult.warnings, erros: [], ...preparedResult.preview });
      continue;
    }

    try {
      const createResult = await repository.createOrderAtomically({
        tenantId: meta.tenantId,
        origem: meta.origem,
        solicitadoPor: meta.solicitadoPor,
        prepared: preparedResult.prepared,
        createdAt: Date.now(),
      });

      if (!createResult.created) {
        const duplicateError: ImportIssue = { code: "PEDIDO_JA_EXISTE", message: `Pedido ${codigoPedido} foi criado por outra requisição simultânea e não será duplicado.` };
        resultados.push({
          codigoPedido,
          status: "JA_EXISTE",
          pedidoId: createResult.existingOrderIds?.[0],
          pedidoIds: createResult.existingOrderIds,
          quantidadeItens: preparedResult.prepared.lines.length,
          avisos: preparedResult.warnings,
          erros: [duplicateError],
          ...preparedResult.preview,
        });
        await repository.writeAudit({
          tenantId: meta.tenantId,
          origem: meta.origem,
          solicitadoPor: meta.solicitadoPor,
          codigoPedido,
          payloadHash: preparedResult.prepared.normalizedPayloadHash,
          result: "JA_EXISTE_CONCORRENTE",
          errors: [duplicateError],
          warnings: preparedResult.warnings,
          orderIds: createResult.existingOrderIds,
          timestamp: Date.now(),
        });
        continue;
      }

      resultados.push({
        codigoPedido,
        status: "CRIADO",
        pedidoId: createResult.orderIds[0],
        pedidoIds: createResult.orderIds,
        quantidadeItens: preparedResult.prepared.lines.length,
        avisos: preparedResult.warnings,
        erros: [],
        ...preparedResult.preview,
      });
    } catch (error: any) {
      const issue: ImportIssue = { code: "ERRO_INTERNO", message: error?.message || "Erro interno ao criar pedido." };
      resultados.push({ codigoPedido, status: "ERRO", quantidadeItens: preparedResult.prepared.lines.length, avisos: preparedResult.warnings, erros: [issue], ...preparedResult.preview });
      await repository.writeAudit({
        tenantId: meta.tenantId,
        origem: meta.origem,
        solicitadoPor: meta.solicitadoPor,
        codigoPedido,
        payloadHash: preparedResult.prepared.normalizedPayloadHash,
        result: "ERRO_INTERNO",
        errors: [issue],
        warnings: preparedResult.warnings,
        timestamp: Date.now(),
      });
    }
  }

  const resumo = {
    recebidos: pedidos.length,
    criados: resultados.filter((r) => r.status === "CRIADO").length,
    jaExistentes: resultados.filter((r) => r.status === "JA_EXISTE").length,
    comErro: resultados.filter((r) => r.status === "ERRO").length,
    validos: resultados.filter((r) => r.status === "VALIDO").length,
  };
  return { sucesso: resumo.comErro === 0, dryRun, resumo, resultados };
}
