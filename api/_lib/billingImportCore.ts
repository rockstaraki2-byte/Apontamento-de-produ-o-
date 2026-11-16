import crypto from "node:crypto";
import { normalizeText } from "./orderImportRules.js";

export type BillingLineStatus =
  | "PRONTO"
  | "AJUSTAR_E_FATURAR"
  | "RESERVA_CONFLITANTE"
  | "PEDIDO_NAO_ENCONTRADO"
  | "ITEM_NAO_ENCONTRADO"
  | "ITEM_AMBIGUO"
  | "QUANTIDADE_INVALIDA"
  | "JA_PROCESSADO"
  | "JA_FATURADO";

export interface BillingLineInput {
  lineId?: string | number | null;
  codigoPedido?: string | number | null;
  cliente?: string | null;
  itemId?: string | number | null;
  codigoProduto?: string | number | null;
  descricao?: string | null;
  cor?: string | null;
  tamanho?: string | null;
  variacao?: string | null;
  quantidade?: string | number | null;
  numeroNota?: string | number | null;
  observacoes?: string | null;
}

export interface BillingImportPayload {
  origem?: string | null;
  tenantId?: string | null;
  solicitadoPor?: string | null;
  documentKey?: string | null;
  idempotencyKey?: string | null;
  allowBreakReservations?: boolean | null;
  expectedPreviewHash?: string | null;
  faturamentos?: BillingLineInput[] | null;
  faturarPedidosInteiros?: Array<string | number> | null;
}

export interface BillingOrderRecord {
  id: number;
  tenantId?: string;
  orderCode: string;
  itemId: number;
  color?: string;
  size?: string;
  variation?: string;
  customerName?: string;
  totalQuantity: number;
  invoicedQuantity?: number;
  packedQuantity?: number;
  producedQuantity?: number;
  paintedQuantity?: number;
  cutQuantity?: number;
  status?: string;
  isActive?: boolean;
  isUrgent?: boolean;
  unitPrice?: number;
  createdAt?: number;
  customProductName?: string;
  [key: string]: unknown;
}

export interface BillingCatalogItem {
  id: number | string;
  code?: string;
  name?: string;
  tenantId?: string;
  components?: Array<{ itemId: number; quantity: number }>;
}

export interface BillingStockRecord {
  id: string;
  tenantId?: string;
  itemId: number;
  color?: string;
  size?: string;
  variation?: string;
  stage?: string;
  quantity?: number;
  reservedQuantity?: number;
  [key: string]: unknown;
}

export interface BillingSnapshot {
  orders: BillingOrderRecord[];
  items: BillingCatalogItem[];
  stocks: BillingStockRecord[];
}

export interface BillingComponentDeduction {
  itemId: number;
  factor: number;
  quantityToDeduct: number;
  stockId: string;
  color: string;
  size: string;
  variation: string;
  stage: string;
  quantityBefore: number;
  quantityAfter: number;
  parentItemCode?: string;
  parentItemName?: string;
}

export interface BillingReservationConflict {
  orderId: number;
  orderCode: string;
  customerName: string;
  quantityToRelease: number;
}

export interface BillingResolvedOperation {
  sourceKey: string;
  sourceType: "ITEM" | "PEDIDO_INTEIRO";
  sourceLineIndex?: number;
  numeroNota?: string;
  orderId: number;
  orderCode: string;
  customerName: string;
  itemId: number;
  itemCode: string;
  itemName: string;
  color: string;
  size: string;
  variation: string;
  billingQuantity: number;
  currentTotalQuantity: number;
  currentInvoicedQuantity: number;
  newTotalQuantity: number;
  newInvoicedQuantity: number;
  quantityAdjustedBy: number;
  resultingStatus: "FATURADO" | "FATURADO_PARCIAL";
  parentStockId: string;
  parentStockExists: boolean;
  stockQuantityBefore: number;
  stockQuantityAfter: number;
  reservedQuantityBefore: number;
  reservedQuantityAfter: number;
  reservationConflict?: BillingReservationConflict;
  componentDeductions: BillingComponentDeduction[];
}

export interface BillingPlanLine {
  sourceKey: string;
  sourceType: "ITEM" | "PEDIDO_INTEIRO";
  sourceLineIndex?: number;
  status: BillingLineStatus;
  message: string;
  input?: BillingLineInput;
  operation?: BillingResolvedOperation;
  candidateOrderIds?: number[];
  candidateOrderCodes?: string[];
}

export interface BillingPlan {
  sucesso: boolean;
  tenantId: string;
  origem: string;
  solicitadoPor: string;
  documentKey: string;
  allowBreakReservations: boolean;
  previewHash: string;
  canConfirm: boolean;
  linhas: BillingPlanLine[];
  resumo: {
    total: number;
    prontos: number;
    ajustesQuantidade: number;
    conflitosReserva: number;
    jaProcessados: number;
    jaFaturados: number;
    pendencias: number;
    quantidadeAFaturar: number;
  };
}

export interface BillingPlanContext {
  tenantId: string;
  origem: string;
  solicitadoPor: string;
  processedSourceKeys?: Set<string>;
}

function toOrderCode(value: unknown): string {
  return String(value ?? "").trim();
}

function cleanAttr(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizedAttr(value: unknown): string {
  const text = cleanAttr(value);
  if (!text || text === "-") return "";
  return normalizeText(text);
}

function parsePositiveInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const normalized = typeof value === "string"
    ? value.trim().replace(/\./g, "").replace(",", ".")
    : value;
  const number = Number(normalized);
  if (!Number.isFinite(number) || number <= 0 || !Number.isInteger(number)) return null;
  return number;
}

function tenantMatches(value: any, tenantId: string): boolean {
  return String(value?.tenantId || "imperio") === tenantId;
}

function itemForOrder(order: BillingOrderRecord, itemMap: Map<string, BillingCatalogItem>) {
  return itemMap.get(String(order.itemId));
}

function itemDisplay(order: BillingOrderRecord, itemMap: Map<string, BillingCatalogItem>) {
  const item = itemForOrder(order, itemMap);
  return {
    code: String(item?.code || order.itemId || ""),
    name: String(item?.name || order.customProductName || `Item ${order.itemId}`),
  };
}

function sourceKeyForLine(line: BillingLineInput, index: number): string {
  const explicit = String(line.lineId ?? "").trim();
  if (explicit) return `item:${explicit}`;
  const canonical = [
    toOrderCode(line.codigoPedido),
    normalizeText(line.cliente),
    String(line.itemId ?? ""),
    normalizeText(line.codigoProduto),
    normalizeText(line.descricao),
    normalizedAttr(line.cor),
    normalizedAttr(line.tamanho),
    normalizedAttr(line.variacao),
    String(line.quantidade ?? ""),
    String(line.numeroNota ?? ""),
    String(index + 1),
  ].join("|");
  return `item:auto:${crypto.createHash("sha256").update(canonical).digest("hex").slice(0, 24)}`;
}

function sourceKeyForWholeOrder(orderCode: string, orderId: number): string {
  return `whole:${orderCode}:${orderId}`;
}

export function getBillingDocumentKey(payload: BillingImportPayload): string {
  return String(payload.documentKey || payload.idempotencyKey || "").trim();
}

export function collectSourceKeys(payload: BillingImportPayload, snapshot?: BillingSnapshot): string[] {
  const keys = (payload.faturamentos || []).map((line, index) => sourceKeyForLine(line, index));
  if (snapshot) {
    const tenantId = String(payload.tenantId || "imperio").trim() || "imperio";
    const wholeCodes = new Set((payload.faturarPedidosInteiros || []).map(toOrderCode).filter(Boolean));
    snapshot.orders
      .filter((o) => tenantMatches(o, tenantId) && wholeCodes.has(toOrderCode(o.orderCode)))
      .forEach((o) => keys.push(sourceKeyForWholeOrder(toOrderCode(o.orderCode), o.id)));
  }
  return keys;
}

function exactOrUniqueContains(candidate: string, query: string): "EXACT" | "CONTAINS" | "NONE" {
  if (!query) return "NONE";
  if (candidate === query) return "EXACT";
  if (candidate.includes(query) || query.includes(candidate)) return "CONTAINS";
  return "NONE";
}

function filterOrdersForLine(
  line: BillingLineInput,
  orders: BillingOrderRecord[],
  itemMap: Map<string, BillingCatalogItem>,
): { matches: BillingOrderRecord[]; baseMatches: BillingOrderRecord[] } {
  const orderCode = toOrderCode(line.codigoPedido);
  const customerQuery = normalizeText(line.cliente);

  let base = orders;
  if (orderCode) {
    const exact = orders.filter((o) => toOrderCode(o.orderCode) === orderCode);
    base = exact.length > 0
      ? exact
      : orders.filter((o) => normalizeText(o.orderCode) === normalizeText(orderCode));
  } else if (customerQuery) {
    const exactCustomers = orders.filter((o) => normalizeText(o.customerName) === customerQuery);
    base = exactCustomers.length > 0
      ? exactCustomers
      : orders.filter((o) => {
          const candidate = normalizeText(o.customerName);
          return candidate.includes(customerQuery) || customerQuery.includes(candidate);
        });
  }

  const baseMatches = base;
  if (base.length === 0) return { matches: [], baseMatches };

  const requestedItemId = String(line.itemId ?? "").trim();
  const requestedCode = normalizeText(line.codigoProduto);
  const requestedDescription = normalizeText(line.descricao);
  const requestedColor = normalizedAttr(line.cor);
  const requestedSize = normalizedAttr(line.tamanho);
  const requestedVariation = normalizedAttr(line.variacao);

  let matches = base.filter((order) => {
    const item = itemForOrder(order, itemMap);
    if (requestedItemId && String(order.itemId) !== requestedItemId) return false;
    if (requestedCode && normalizeText(item?.code) !== requestedCode) return false;
    if (requestedColor && normalizeText(order.color) !== requestedColor) return false;
    if (requestedSize && normalizeText(order.size) !== requestedSize) return false;
    if (requestedVariation && normalizeText(order.variation) !== requestedVariation) return false;
    return true;
  });

  if (requestedDescription && !requestedItemId && !requestedCode) {
    const exact = matches.filter((order) => {
      const display = itemDisplay(order, itemMap);
      return (
        normalizeText(display.name) === requestedDescription ||
        normalizeText(order.customProductName) === requestedDescription
      );
    });
    if (exact.length > 0) {
      matches = exact;
    } else {
      const contains = matches.filter((order) => {
        const display = itemDisplay(order, itemMap);
        const candidates = [normalizeText(display.name), normalizeText(order.customProductName)].filter(Boolean);
        return candidates.some((candidate) => exactOrUniqueContains(candidate, requestedDescription) === "CONTAINS");
      });
      matches = contains;
    }
  }

  return { matches, baseMatches };
}

function chooseComponentStock(
  stocks: BillingStockRecord[],
  componentItemId: number,
  color: string,
  size: string,
  variation: string,
): BillingStockRecord | undefined {
  const childStocks = stocks.filter((s) => Number(s.itemId) === componentItemId);
  let matchingStock = childStocks.find(
    (s) =>
      cleanAttr(s.color) === color &&
      cleanAttr(s.size) === size &&
      cleanAttr(s.variation) === variation,
  );
  if (!matchingStock && childStocks.length > 0) {
    matchingStock =
      childStocks.find((s) => {
        const c = normalizeText(s.color);
        return c === "PADRAO" || c === "SEM COR" || c === "OUTROS" || c === "";
      }) || childStocks[0];
  }
  return matchingStock;
}

function buildComponentDeductions(
  order: BillingOrderRecord,
  billingQuantity: number,
  items: BillingCatalogItem[],
  stocks: BillingStockRecord[],
  itemMap: Map<string, BillingCatalogItem>,
): BillingComponentDeduction[] {
  const parentItem = itemForOrder(order, itemMap);
  if (!parentItem?.components?.length) return [];
  const color = cleanAttr(order.color);
  const size = cleanAttr(order.size);
  const variation = cleanAttr(order.variation);

  return parentItem.components
    .filter((component) => Number.isFinite(Number(component.itemId)) && Number(component.quantity) > 0)
    .map((component) => {
      const componentItemId = Number(component.itemId);
      const factor = Number(component.quantity);
      const selected = chooseComponentStock(stocks, componentItemId, color, size, variation);
      const resolvedColor = selected ? cleanAttr(selected.color) : (color || "Padrão");
      const resolvedSize = selected ? cleanAttr(selected.size) : (size || "Único");
      const resolvedVariation = selected ? cleanAttr(selected.variation) : (variation || "Padrão");
      const resolvedStage = selected ? (cleanAttr(selected.stage) || "ACABADO") : "ACABADO";
      const stockId = selected?.id || `${componentItemId}|${resolvedColor}|${resolvedSize}|${resolvedVariation}|${resolvedStage}`;
      const quantityBefore = Number(selected?.quantity || 0);
      const quantityToDeduct = billingQuantity * factor;
      return {
        itemId: componentItemId,
        factor,
        quantityToDeduct,
        stockId,
        color: resolvedColor,
        size: resolvedSize,
        variation: resolvedVariation,
        stage: resolvedStage,
        quantityBefore,
        quantityAfter: quantityBefore - quantityToDeduct,
        parentItemCode: parentItem.code,
        parentItemName: parentItem.name,
      };
    });
}

function buildOperation(
  order: BillingOrderRecord,
  billingQuantity: number,
  sourceKey: string,
  sourceType: "ITEM" | "PEDIDO_INTEIRO",
  itemMap: Map<string, BillingCatalogItem>,
  items: BillingCatalogItem[],
  stocks: BillingStockRecord[],
  allOrders: BillingOrderRecord[],
  allowBreakReservations: boolean,
  sourceLineIndex?: number,
  numeroNota?: string,
): BillingResolvedOperation {
  const currentTotal = Math.max(0, Number(order.totalQuantity || 0));
  const currentInvoiced = Math.max(0, Number(order.invoicedQuantity || 0));
  const newInvoiced = currentInvoiced + billingQuantity;
  const newTotal = Math.max(currentTotal, newInvoiced);
  const quantityAdjustedBy = newTotal - currentTotal;
  const resultingStatus = newInvoiced >= newTotal ? "FATURADO" : "FATURADO_PARCIAL";
  const display = itemDisplay(order, itemMap);
  const color = cleanAttr(order.color);
  const size = cleanAttr(order.size);
  const variation = cleanAttr(order.variation);
  const parentStockId = `${order.itemId}|${color}|${size}|${variation}|ACABADO`;
  const parentStock = stocks.find((s) => s.id === parentStockId);
  const stockBefore = Number(parentStock?.quantity || 0);
  const reservedBefore = Number(parentStock?.reservedQuantity || 0);

  const alternateReservedOrders = reservedBefore > 0
    ? allOrders
        .filter(
          (candidate) =>
            candidate.id !== order.id &&
            candidate.itemId === order.itemId &&
            cleanAttr(candidate.color) === color &&
            cleanAttr(candidate.size) === size &&
            cleanAttr(candidate.variation) === variation &&
            (candidate.status === "PLANEJADO" || candidate.status === "EMBALADO") &&
            candidate.isActive !== false,
        )
        .sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0))
    : [];

  const alternate = alternateReservedOrders[0];
  const reservationConflict = alternate
    ? {
        orderId: alternate.id,
        orderCode: toOrderCode(alternate.orderCode),
        customerName: String(alternate.customerName || ""),
        quantityToRelease: Math.max(0, Number(alternate.totalQuantity || 0)),
      }
    : undefined;
  const reservationRelease = reservationConflict && allowBreakReservations
    ? reservationConflict.quantityToRelease
    : 0;

  return {
    sourceKey,
    sourceType,
    sourceLineIndex,
    numeroNota,
    orderId: order.id,
    orderCode: toOrderCode(order.orderCode),
    customerName: String(order.customerName || ""),
    itemId: order.itemId,
    itemCode: display.code,
    itemName: display.name,
    color,
    size,
    variation,
    billingQuantity,
    currentTotalQuantity: currentTotal,
    currentInvoicedQuantity: currentInvoiced,
    newTotalQuantity: newTotal,
    newInvoicedQuantity: newInvoiced,
    quantityAdjustedBy,
    resultingStatus,
    parentStockId,
    parentStockExists: Boolean(parentStock),
    stockQuantityBefore: stockBefore,
    stockQuantityAfter: parentStock ? Math.max(0, stockBefore - billingQuantity) : stockBefore,
    reservedQuantityBefore: reservedBefore,
    reservedQuantityAfter: parentStock
      ? Math.max(0, reservedBefore - reservationRelease - billingQuantity)
      : reservedBefore,
    reservationConflict,
    componentDeductions: buildComponentDeductions(order, billingQuantity, items, stocks, itemMap),
  };
}

function hashPlan(planParts: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(planParts)).digest("hex");
}

export function buildBillingPlan(
  snapshot: BillingSnapshot,
  payload: BillingImportPayload,
  context: BillingPlanContext,
): BillingPlan {
  const tenantId = context.tenantId || "imperio";
  const origem = context.origem || "CHATGPT";
  const solicitadoPor = context.solicitadoPor || "chatgpt-integration";
  const documentKey = getBillingDocumentKey(payload);
  const allowBreakReservations = payload.allowBreakReservations === true;
  const processed = context.processedSourceKeys || new Set<string>();

  const orders = snapshot.orders.filter((o) => tenantMatches(o, tenantId));
  const items = snapshot.items.filter((item) => tenantMatches(item, tenantId));
  const stocks = snapshot.stocks.filter((stock) => tenantMatches(stock, tenantId));
  const itemMap = new Map(items.map((item) => [String(item.id), item]));
  const linhas: BillingPlanLine[] = [];
  const targetedOrderIds = new Set<number>();

  (payload.faturamentos || []).forEach((line, index) => {
    const sourceKey = sourceKeyForLine(line, index);
    if (processed.has(sourceKey)) {
      linhas.push({
        sourceKey,
        sourceType: "ITEM",
        sourceLineIndex: index,
        status: "JA_PROCESSADO",
        message: "Esta linha deste documento já foi processada anteriormente e não será faturada novamente.",
        input: line,
      });
      return;
    }

    const quantity = parsePositiveInteger(line.quantidade);
    if (quantity === null) {
      linhas.push({
        sourceKey,
        sourceType: "ITEM",
        sourceLineIndex: index,
        status: "QUANTIDADE_INVALIDA",
        message: "A quantidade a faturar deve ser um número inteiro maior que zero.",
        input: line,
      });
      return;
    }

    const { matches, baseMatches } = filterOrdersForLine(line, orders, itemMap);
    if (baseMatches.length === 0) {
      linhas.push({
        sourceKey,
        sourceType: "ITEM",
        sourceLineIndex: index,
        status: "PEDIDO_NAO_ENCONTRADO",
        message: line.codigoPedido
          ? `Pedido ${toOrderCode(line.codigoPedido)} não encontrado para o tenant ${tenantId}.`
          : `Nenhum pedido foi localizado para o cliente ${String(line.cliente || "informado")}.`,
        input: line,
      });
      return;
    }
    if (matches.length === 0) {
      linhas.push({
        sourceKey,
        sourceType: "ITEM",
        sourceLineIndex: index,
        status: "ITEM_NAO_ENCONTRADO",
        message: `O pedido foi localizado, mas nenhum item corresponde aos dados informados na linha ${index + 1}.`,
        input: line,
        candidateOrderIds: baseMatches.map((o) => o.id),
        candidateOrderCodes: Array.from(new Set(baseMatches.map((o) => toOrderCode(o.orderCode)))),
      });
      return;
    }
    if (matches.length > 1) {
      linhas.push({
        sourceKey,
        sourceType: "ITEM",
        sourceLineIndex: index,
        status: "ITEM_AMBIGUO",
        message: `Foram encontrados ${matches.length} itens possíveis. Informe código do produto, itemId ou atributos para evitar faturamento no item errado.`,
        input: line,
        candidateOrderIds: matches.map((o) => o.id),
        candidateOrderCodes: Array.from(new Set(matches.map((o) => toOrderCode(o.orderCode)))),
      });
      return;
    }

    const order = matches[0];
    if (targetedOrderIds.has(order.id)) {
      linhas.push({
        sourceKey,
        sourceType: "ITEM",
        sourceLineIndex: index,
        status: "ITEM_AMBIGUO",
        message: `O item do pedido ${order.orderCode} apareceu mais de uma vez no mesmo lote. Consolide a quantidade ou use uma única linha para evitar dupla baixa.`,
        input: line,
        candidateOrderIds: [order.id],
        candidateOrderCodes: [toOrderCode(order.orderCode)],
      });
      return;
    }
    targetedOrderIds.add(order.id);

    const operation = buildOperation(
      order,
      quantity,
      sourceKey,
      "ITEM",
      itemMap,
      items,
      stocks,
      orders,
      allowBreakReservations,
      index,
      String(line.numeroNota ?? "").trim() || undefined,
    );
    const hasReservationConflict = Boolean(operation.reservationConflict) && !allowBreakReservations;
    const status: BillingLineStatus = hasReservationConflict
      ? "RESERVA_CONFLITANTE"
      : operation.quantityAdjustedBy > 0
        ? "AJUSTAR_E_FATURAR"
        : "PRONTO";
    const message = hasReservationConflict
      ? `Há estoque reservado para o pedido ${operation.reservationConflict?.orderCode}. É necessária autorização explícita para desfazer a reserva.`
      : operation.quantityAdjustedBy > 0
        ? `O faturamento acumulado ficará acima da quantidade atual. A quantidade do item será ajustada de ${operation.currentTotalQuantity} para ${operation.newTotalQuantity} antes do faturamento.`
        : `Pronto para faturar ${quantity} unidade(s).`;

    linhas.push({ sourceKey, sourceType: "ITEM", sourceLineIndex: index, status, message, input: line, operation });
  });

  const wholeCodes = Array.from(
    new Set((payload.faturarPedidosInteiros || []).map(toOrderCode).filter(Boolean)),
  );
  wholeCodes.forEach((orderCode) => {
    const orderLines = orders.filter((o) => toOrderCode(o.orderCode) === orderCode);
    if (orderLines.length === 0) {
      linhas.push({
        sourceKey: `whole:${orderCode}:missing`,
        sourceType: "PEDIDO_INTEIRO",
        status: "PEDIDO_NAO_ENCONTRADO",
        message: `Pedido ${orderCode} não encontrado. Lance o pedido pela API de importação e valide novamente antes de faturar.`,
        candidateOrderCodes: [orderCode],
      });
      return;
    }

    orderLines.forEach((order) => {
      const sourceKey = sourceKeyForWholeOrder(orderCode, order.id);
      if (processed.has(sourceKey)) {
        linhas.push({
          sourceKey,
          sourceType: "PEDIDO_INTEIRO",
          status: "JA_PROCESSADO",
          message: `Este item do pedido ${orderCode} já foi processado anteriormente por este documento.`,
        });
        return;
      }
      if (targetedOrderIds.has(order.id)) {
        linhas.push({
          sourceKey,
          sourceType: "PEDIDO_INTEIRO",
          status: "ITEM_AMBIGUO",
          message: `O item ${order.id} do pedido ${orderCode} também foi informado individualmente. Remova a duplicidade antes de confirmar.`,
          candidateOrderIds: [order.id],
          candidateOrderCodes: [orderCode],
        });
        return;
      }
      const remaining = Math.max(0, Number(order.totalQuantity || 0) - Number(order.invoicedQuantity || 0));
      if (remaining <= 0) {
        linhas.push({
          sourceKey,
          sourceType: "PEDIDO_INTEIRO",
          status: "JA_FATURADO",
          message: `O item ${order.id} do pedido ${orderCode} já está totalmente faturado.`,
          candidateOrderIds: [order.id],
          candidateOrderCodes: [orderCode],
        });
        return;
      }
      targetedOrderIds.add(order.id);
      const operation = buildOperation(
        order,
        remaining,
        sourceKey,
        "PEDIDO_INTEIRO",
        itemMap,
        items,
        stocks,
        orders,
        allowBreakReservations,
      );
      const hasReservationConflict = Boolean(operation.reservationConflict) && !allowBreakReservations;
      linhas.push({
        sourceKey,
        sourceType: "PEDIDO_INTEIRO",
        status: hasReservationConflict ? "RESERVA_CONFLITANTE" : "PRONTO",
        message: hasReservationConflict
          ? `Há estoque reservado para o pedido ${operation.reservationConflict?.orderCode}. É necessária autorização explícita para desfazer a reserva.`
          : `Pronto para faturar o saldo integral de ${remaining} unidade(s) deste item.`,
        operation,
      });
    });
  });

  const prontos = linhas.filter((l) => l.status === "PRONTO").length;
  const ajustesQuantidade = linhas.filter((l) => l.status === "AJUSTAR_E_FATURAR").length;
  const conflitosReserva = linhas.filter((l) => l.status === "RESERVA_CONFLITANTE").length;
  const jaProcessados = linhas.filter((l) => l.status === "JA_PROCESSADO").length;
  const jaFaturados = linhas.filter((l) => l.status === "JA_FATURADO").length;
  const actionableStatuses = new Set<BillingLineStatus>(["PRONTO", "AJUSTAR_E_FATURAR", "JA_PROCESSADO", "JA_FATURADO"]);
  const pendencias = linhas.filter((l) => !actionableStatuses.has(l.status)).length;
  const quantidadeAFaturar = linhas.reduce((sum, l) => sum + (l.operation?.billingQuantity || 0), 0);
  const canConfirm = Boolean(documentKey) && pendencias === 0 && linhas.some((l) => Boolean(l.operation));

  const previewHash = hashPlan({
    tenantId,
    documentKey,
    allowBreakReservations,
    lines: linhas.map((line) => ({
      sourceKey: line.sourceKey,
      status: line.status,
      operation: line.operation
        ? {
            orderId: line.operation.orderId,
            billingQuantity: line.operation.billingQuantity,
            currentTotalQuantity: line.operation.currentTotalQuantity,
            currentInvoicedQuantity: line.operation.currentInvoicedQuantity,
            newTotalQuantity: line.operation.newTotalQuantity,
            newInvoicedQuantity: line.operation.newInvoicedQuantity,
            reservationConflict: line.operation.reservationConflict?.orderId || null,
          }
        : null,
    })),
  });

  return {
    sucesso: pendencias === 0,
    tenantId,
    origem,
    solicitadoPor,
    documentKey,
    allowBreakReservations,
    previewHash,
    canConfirm,
    linhas,
    resumo: {
      total: linhas.length,
      prontos,
      ajustesQuantidade,
      conflitosReserva,
      jaProcessados,
      jaFaturados,
      pendencias,
      quantidadeAFaturar,
    },
  };
}
