import { createHash, randomInt } from "node:crypto";
import {
  getFirebaseAdmin,
  requireSession,
  sendMethodNotAllowed,
} from "./_lib/firebaseAdmin.js";
import { deriveProductIdentity } from "./_lib/orderImportRules.js";
import { getSystemRepresentativeByCanonicalName } from "./_lib/systemRepresentatives.js";

const TENANT_ID = "imperio";
const MAX_LINES = 200;
const SCALE = 10000;

class ApiError extends Error {
  status: number;
  code: string;
  constructor(code: string, status = 400) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

function normalizeName(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function cleanCode(value: unknown): string {
  return String(value ?? "").trim();
}

function toCustomerId(value: unknown): string | number {
  const raw = cleanCode(value);
  if (/^[0-9]+$/.test(raw)) {
    const numeric = Number(raw);
    return Number.isSafeInteger(numeric) ? numeric : raw;
  }
  return raw;
}

function rounded(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function scaled(value: number): number {
  return Math.round((value + Number.EPSILON) * SCALE);
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

function lineTimestamp(dateText: string): number {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dateText)) {
    throw new ApiError("INVOICE_DATE_REQUIRED");
  }
  const value = new Date(dateText + "T12:00:00-03:00").getTime();
  if (!Number.isFinite(value)) throw new ApiError("INVALID_INVOICE_DATE");
  return value;
}

function normalizeManifest(raw: any) {
  const manifest = raw && typeof raw === "object" ? raw : {};
  const documentName = cleanCode(manifest.documentName) || "Faturados 27 nov.pdf";
  const documentDate = cleanCode(manifest.documentDate) || "2026-11-27";
  const inputLines = Array.isArray(manifest.lines) ? manifest.lines : [];
  if (inputLines.length > MAX_LINES) throw new ApiError("TOO_MANY_LINES", 413);

  const excluded: any[] = [];
  const lines: any[] = [];
  inputLines.forEach((row: any, index: number) => {
    if (!row || typeof row !== "object") {
      excluded.push({ index, reason: "INVALID_LINE" });
      return;
    }
    if (row.nonCommercial === true || String(row.documentType || "").toUpperCase() === "ASSISTENCIA") {
      excluded.push({ orderCode: cleanCode(row.orderCode), reason: "NON_COMMERCIAL_ASSISTANCE" });
      return;
    }

    const orderCode = cleanCode(row.orderCode);
    const productCode = cleanCode(row.productCode);
    const customerCode = cleanCode(row.customerCode);
    const customerName = cleanCode(row.customerName);
    const quantity = rounded(Number(row.quantity), 4);
    const unitPrice = rounded(Number(row.unitPrice), 4);
    const discountAmount = rounded(Number(row.discountAmount || 0), 2);
    const grossAmount = rounded(
      row.grossAmount === undefined || row.grossAmount === null || row.grossAmount === ""
        ? quantity * unitPrice
        : Number(row.grossAmount),
      2,
    );
    const netAmount = rounded(
      row.netAmount === undefined || row.netAmount === null || row.netAmount === ""
        ? grossAmount - discountAmount
        : Number(row.netAmount),
      2,
    );
    const discountPercent =
      row.discountPercent === undefined || row.discountPercent === null || row.discountPercent === ""
        ? undefined
        : rounded(Number(row.discountPercent), 4);
    const invoiceDate = cleanCode(row.invoiceDate) || documentDate;
    const timestamp = lineTimestamp(invoiceDate);

    if (
      !orderCode ||
      !productCode ||
      !customerCode ||
      !customerName ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !Number.isFinite(unitPrice) ||
      unitPrice <= 0 ||
      !Number.isFinite(grossAmount) ||
      grossAmount < 0 ||
      !Number.isFinite(discountAmount) ||
      discountAmount < 0 ||
      !Number.isFinite(netAmount) ||
      netAmount < 0 ||
      discountAmount > grossAmount + 0.01
    ) {
      excluded.push({ orderCode, productCode, reason: "INVALID_COMMERCIAL_LINE" });
      return;
    }

    const explicitColor = cleanCode(row.color);
    const identity = deriveProductIdentity({
      codigoOriginal: productCode,
      codigoProduto: productCode,
      cor: explicitColor,
      tamanho: cleanCode(row.size),
      variacao: cleanCode(row.variation || row.itemNotes),
    });
    const productBaseCode = cleanCode(identity.codigoProduto || productCode);
    const color = explicitColor || (identity.sufixoCor ? identity.cor : "");
    const representativeInput = cleanCode(row.representativeName);
    const representativeName =
      customerCode === "856" || normalizeName(representativeInput).includes("recepcao")
        ? "Pedidos LOJA imperio"
        : representativeInput;
    const representative = getSystemRepresentativeByCanonicalName(representativeName);
    const lineKey = cleanCode(row.lineKey) || [
      cleanCode(row.sourcePage) || String(index + 1),
      cleanCode(row.lineNumber) || String(index + 1),
      orderCode,
      cleanCode(row.deliveryNumber),
      cleanCode(row.invoiceNumber),
      productCode,
    ].join("|");
    if (lines.some((existing: any) => existing.lineKey === lineKey)) {
      excluded.push({ orderCode, productCode, reason: "DUPLICATE_MANIFEST_LINE_KEY" });
      return;
    }
    if (netAmount <= 0) {
      excluded.push({ orderCode, productCode, reason: "NO_COMMERCIAL_VALUE" });
      return;
    }

    lines.push({
      index,
      lineKey,
      orderCode,
      customerCode,
      customerId: toCustomerId(customerCode),
      customerName: customerCode === "1749" ? "Facilita Decor" : customerName,
      representativeName,
      representativeId: representative?.id || cleanCode(row.representativeId),
      productCode,
      productBaseCode,
      productDescription: cleanCode(row.productDescription),
      quantity,
      unitPrice,
      grossAmount,
      discountAmount,
      netAmount,
      ...(discountPercent === undefined ? {} : { discountPercent }),
      color,
      size: cleanCode(row.size),
      variation: cleanCode(row.variation || row.itemNotes),
      itemNotes: cleanCode(row.itemNotes),
      deliveryNumber: cleanCode(row.deliveryNumber),
      invoiceNumber: cleanCode(row.invoiceNumber),
      invoiceDate,
      timestamp,
      sourcePage: Number(row.sourcePage) || null,
    });
  });

  if (lines.length === 0) throw new ApiError("NO_VALID_COMMERCIAL_LINES");
  return { documentName, documentDate, lines, excluded };
}

function invoiceKey(documentName: string, line: any): string {
  return createHash("sha256")
    .update(documentName + "|" + line.lineKey)
    .digest("hex");
}

function makeId(index: number): number {
  const id = Date.now() * 1000 + randomInt(1, 999) + index;
  if (!Number.isSafeInteger(id)) throw new ApiError("ID_RANGE_EXCEEDED", 500);
  return id;
}

function orderCodeQuery(db: any, tenantId: string, orderCodes: string[]) {
  return chunks(orderCodes, 30).map((group) =>
    db.collection("orders")
      .where("tenantId", "==", tenantId)
      .where("orderCode", "in", group),
  );
}

function itemCodeMap(items: any[]) {
  const byId = new Map<string, any>();
  const byCode = new Map<string, any[]>();
  for (const item of items) {
    byId.set(String(item.id), item);
    const code = cleanCode(item.code);
    if (code) byCode.set(code, [...(byCode.get(code) || []), item]);
  }
  return { byId, byCode };
}

function serializeOrder(order: any, item: any, docId: string) {
  return {
    documentId: docId,
    id: order.id,
    orderCode: order.orderCode,
    customerId: order.customerId,
    customerName: order.customerName,
    itemId: order.itemId,
    productCode: cleanCode(order.originalProductCode) || cleanCode(item?.code),
    productDescription: item?.name || order.customProductName || "",
    color: order.color || "",
    size: order.size || "",
    variation: order.variation || "",
    totalQuantity: Number(order.totalQuantity || 0),
    invoicedQuantity: Number(order.invoicedQuantity || 0),
    status: order.status || "",
    isActive: order.isActive,
    unitPrice: Number(order.unitPrice || 0),
    discountPercent: order.discountPercent,
    discountAmount: order.discountAmount,
    deliveryDate: order.deliveryDate || "",
  };
}

async function inspect(db: any, manifest: any) {
  const tenantOrders = await db.collection("orders").where("tenantId", "==", TENANT_ID).get();
  const orderCodes = new Set(manifest.lines.map((line: any) => line.orderCode));
  const orders = tenantOrders.docs
    .filter((entry: any) => orderCodes.has(cleanCode(entry.data().orderCode)))
    .map((entry: any) => ({ ...entry.data(), _docId: entry.id }));

  const [itemSnapshot, customerSnapshot] = await Promise.all([
    db.collection("items").where("tenantId", "==", TENANT_ID).get(),
    db.collection("customers").where("tenantId", "==", TENANT_ID).get(),
  ]);
  const items = itemSnapshot.docs.map((entry: any) => ({ ...entry.data(), _docId: entry.id }));
  const { byId } = itemCodeMap(items);
  const requestedBaseCodes = new Set(manifest.lines.map((line: any) => line.productBaseCode));
  const requestedCodes = new Set(manifest.lines.map((line: any) => line.productCode));
  const products = items
    .filter((item: any) =>
      requestedBaseCodes.has(cleanCode(item.code)) || requestedCodes.has(cleanCode(item.code)),
    )
    .map((item: any) => ({
      documentId: item._docId,
      id: item.id,
      code: item.code,
      name: item.name,
      tenantId: item.tenantId,
    }));

  const customers = customerSnapshot.docs
    .map((entry: any) => ({ ...entry.data(), _docId: entry.id }))
    .filter((customer: any) =>
      manifest.lines.some((line: any) =>
        String(customer.id ?? customer._docId) === line.customerCode,
      ),
    )
    .map((customer: any) => ({
      documentId: customer._docId,
      id: customer.id,
      name: customer.name,
      tradeName: customer.tradeName,
      city: customer.city,
      tenantId: customer.tenantId,
    }));

  const orderIds = unique(orders.map((order: any) => String(order.id ?? order._docId)));
  const logSnapshots = await Promise.all(
    chunks(orderIds, 30).map((group) =>
      db.collection("logs")
        .where("tenantId", "==", TENANT_ID)
        .where("orderId", "in", group.map((id) => Number(id))),
    ).map((query: any) => query.get()),
  );
  const histories = logSnapshots.flatMap((snapshot: any) =>
    snapshot.docs
      .map((entry: any) => ({ ...entry.data(), _docId: entry.id }))
      .filter((log: any) =>
        log.tenantId === TENANT_ID && ["FATURAMENTO", "CANCELAMENTO_FATURAMENTO"].includes(log.type),
      )
      .map((log: any) => ({
        documentId: log._docId,
        id: log.id,
        orderId: log.orderId,
        type: log.type,
        quantityInvoiced: log.quantityInvoiced,
        timestamp: log.timestamp,
        invoiceNumber: log.invoiceNumber || "",
        deliveryNumber: log.deliveryNumber || "",
        invoiceNetAmount: log.invoiceNetAmount,
      })),
  );

  return {
    tenantId: TENANT_ID,
    documentName: manifest.documentName,
    counts: {
      requestedCommercialLines: manifest.lines.length,
      ordersFound: orders.length,
      productsFound: products.length,
      customersFound: customers.length,
      invoiceHistoryRows: histories.length,
      excludedNonCommercialOrInvalidLines: manifest.excluded.length,
    },
    orders: orders.map((order: any) =>
      serializeOrder(order, byId.get(String(order.itemId)), order._docId),
    ),
    products,
    customers,
    history: histories,
    excluded: manifest.excluded,
  };
}

function selectOrderCandidate(
  line: any,
  orderRows: any[],
  itemById: Map<string, any>,
) {
  const orderCodeRows = orderRows.filter(
    (row) => cleanCode(row.data.orderCode) === line.orderCode,
  );
  if (orderCodeRows.length === 0) return { order: null, reason: "" };

  const sameCustomer = orderCodeRows.filter((row) => {
    const customerId = cleanCode(row.data.customerId);
    if (customerId) return customerId === line.customerCode;
    return normalizeName(row.data.customerName) === normalizeName(line.customerName);
  });
  if (sameCustomer.length === 0) return { order: null, reason: "CUSTOMER_MISMATCH" };

  const exactOriginalCode = sameCustomer.filter(
    (row) => cleanCode(row.data.originalProductCode) === line.productCode,
  );
  let candidates = exactOriginalCode.length
    ? exactOriginalCode
    : sameCustomer.filter((row) => {
        const item = itemById.get(String(row.data.itemId));
        return cleanCode(item?.code) === line.productBaseCode;
      });

  if (line.color && candidates.length > 1) {
    const colorMatched = candidates.filter(
      (row) => normalizeName(row.data.color) === normalizeName(line.color),
    );
    if (colorMatched.length) candidates = colorMatched;
  }
  if (line.size && candidates.length > 1) {
    const sizeMatched = candidates.filter(
      (row) => normalizeName(row.data.size) === normalizeName(line.size),
    );
    if (sizeMatched.length) candidates = sizeMatched;
  }
  if (line.variation && candidates.length > 1) {
    const variationMatched = candidates.filter(
      (row) => normalizeName(row.data.variation) === normalizeName(line.variation),
    );
    if (variationMatched.length) candidates = variationMatched;
  }
  if (candidates.length === 1) return { order: candidates[0], reason: "" };
  if (candidates.length > 1) return { order: null, reason: "AMBIGUOUS_ORDER_ITEM" };
  return { order: null, reason: "" };
}

async function apply(db: any, manifest: any, claims: any) {
  const { lines, documentName } = manifest;
  const logIds = new Map(lines.map((line: any) => [line.lineKey, "invoice-" + invoiceKey(documentName, line)]));
  const result = await db.runTransaction(async (transaction: any) => {
    const [orderSnapshots, itemSnapshot, markerSnapshots] = await Promise.all([
      Promise.all(orderCodeQuery(db, TENANT_ID, unique(lines.map((line: any) => line.orderCode))).map((query: any) => transaction.get(query))),
      transaction.get(db.collection("items").where("tenantId", "==", TENANT_ID)),
      Promise.all(lines.map((line: any) =>
        transaction.get(db.collection("billingReconciliationKeys").doc(logIds.get(line.lineKey))),
      )),
    ]);

    const orderRows = orderSnapshots.flatMap((snapshot: any) =>
      snapshot.docs
        .map((entry: any) => ({ id: entry.id, ref: entry.ref, data: entry.data() }))
        .filter((row: any) => row.data.tenantId === TENANT_ID),
    );
    const itemRows = itemSnapshot.docs
      .map((entry: any) => ({ id: entry.id, ref: entry.ref, data: entry.data() }))
      .filter((row: any) => row.data.tenantId === TENANT_ID);
    const itemsById = new Map(itemRows.map((row: any) => [String(row.data.id ?? row.id), row.data]));
    const itemsByCode = new Map<string, any[]>();
    for (const row of itemRows) {
      const code = cleanCode(row.data.code);
      if (code) itemsByCode.set(code, [...(itemsByCode.get(code) || []), row]);
    }

    const orderIds = unique(orderRows.map((row: any) => String(row.data.id ?? row.id)))
      .map((id) => Number(id))
      .filter((id) => Number.isSafeInteger(id));
    const historySnapshots = await Promise.all(
      chunks(orderIds, 30).map((group) =>
        transaction.get(
          db.collection("logs")
            .where("tenantId", "==", TENANT_ID)
            .where("orderId", "in", group),
        ),
      ),
    );
    const historyByOrder = new Map<number, any[]>();
    for (const snapshot of historySnapshots) {
      for (const entry of snapshot.docs) {
        const data = entry.data();
        if (data.tenantId !== TENANT_ID) continue;
        const orderId = Number(data.orderId);
        historyByOrder.set(orderId, [...(historyByOrder.get(orderId) || []), data]);
      }
    }

    const markerExists = new Map<string, boolean>();
    lines.forEach((line: any, index: number) =>
      markerExists.set(line.lineKey, markerSnapshots[index].exists),
    );

    const outcomes: any[] = [];
    const productToCreate = new Map<string, any>();
    const missingOrderGroups = new Map<string, any>();
    const assignmentByLine = new Map<string, any>();

    for (const line of lines) {
      if (markerExists.get(line.lineKey)) {
        outcomes.push({ lineKey: line.lineKey, orderCode: line.orderCode, productCode: line.productCode, action: "IGNORED", reason: "DOCUMENT_LINE_ALREADY_RECONCILED", quantity: 0, balance: null });
        continue;
      }

      const selected = selectOrderCandidate(line, orderRows, itemsById);
      if (selected.reason === "CUSTOMER_MISMATCH" || selected.reason === "AMBIGUOUS_ORDER_ITEM") {
        outcomes.push({ lineKey: line.lineKey, orderCode: line.orderCode, productCode: line.productCode, action: "PENDING", reason: selected.reason, quantity: 0, balance: null });
        continue;
      }

      if (selected.order && selected.order.data.status === "CANCELADO") {
        outcomes.push({ lineKey: line.lineKey, orderCode: line.orderCode, productCode: line.productCode, action: "IGNORED", reason: "ORDER_CANCELLED", quantity: 0, balance: 0 });
        continue;
      }
      if (
        selected.order &&
        (selected.order.data.status === "FATURADO" ||
          Number(selected.order.data.invoicedQuantity || 0) >= Number(selected.order.data.totalQuantity || 0))
      ) {
        outcomes.push({ lineKey: line.lineKey, orderCode: line.orderCode, productCode: line.productCode, action: "IGNORED", reason: "ALREADY_FULLY_BILLED", quantity: 0, balance: 0 });
        continue;
      }

      let productCandidates = itemsByCode.get(line.productBaseCode) || [];
      if (productCandidates.length > 1) {
        const exactName = productCandidates.filter(
          (row: any) => normalizeName(row.data.name) === normalizeName(line.productDescription),
        );
        if (exactName.length === 1) productCandidates = exactName;
        else {
          outcomes.push({ lineKey: line.lineKey, orderCode: line.orderCode, productCode: line.productCode, action: "PENDING", reason: "DUPLICATE_PRODUCT_CODE_REQUIRES_REVIEW", quantity: 0, balance: null });
          continue;
        }
      }

      let product = productCandidates[0]?.data || productToCreate.get(line.productBaseCode);
      if (!product) {
        const productId = makeId(productToCreate.size);
        product = {
          id: productId,
          tenantId: TENANT_ID,
          code: line.productBaseCode,
          name: line.productDescription,
          notes: "",
        };
        productToCreate.set(line.productBaseCode, {
          id: productId,
          ref: db.collection("items").doc(String(productId)),
          data: product,
          created: true,
        });
      }

      let assignment = selected.order;
      if (!assignment) {
        const groupKey = [
          line.orderCode,
          line.customerCode,
          line.productCode,
          normalizeName(line.color),
          normalizeName(line.size),
          normalizeName(line.variation),
        ].join("|");
        let group = missingOrderGroups.get(groupKey);
        if (!group) {
          group = {
            groupKey,
            lines: [],
            id: makeId(orderRows.length + missingOrderGroups.size + 1000),
            item: product,
            first: line,
            quantity: 0,
            grossAmount: 0,
            discountAmount: 0,
            netAmount: 0,
          };
          missingOrderGroups.set(groupKey, group);
        }
        group.lines.push(line);
        group.quantity = rounded(group.quantity + line.quantity, 4);
        group.grossAmount = rounded(group.grossAmount + line.grossAmount, 2);
        group.discountAmount = rounded(group.discountAmount + line.discountAmount, 2);
        group.netAmount = rounded(group.netAmount + line.netAmount, 2);
        assignment = { id: String(group.id), ref: db.collection("orders").doc(String(group.id)), data: null, newGroup: group };
      }
      assignmentByLine.set(line.lineKey, { assignment, product });
    }

    const orderState = new Map<string, any>();
    const plannedLogs: any[] = [];
    const createdOrders: any[] = [];
    const createdProducts = [...productToCreate.values()].map((row: any) => ({
      id: row.id,
      code: row.data.code,
      name: row.data.name,
    }));

    for (const line of lines) {
      const assigned = assignmentByLine.get(line.lineKey);
      if (!assigned || markerExists.get(line.lineKey)) continue;

      const assignment = assigned.assignment;
      const stateKey = String(assignment.id);
      let state = orderState.get(stateKey);
      if (!state) {
        if (assignment.newGroup) {
          const group = assignment.newGroup;
          const first = group.first;
          const product = assigned.product;
          const unitPrice = group.quantity > 0 ? rounded(group.grossAmount / group.quantity, 4) : first.unitPrice;
          const initial = {
            id: group.id,
            tenantId: TENANT_ID,
            orderCode: first.orderCode,
            itemId: product.id,
            color: first.color,
            size: first.size,
            variation: first.variation,
            customerName: first.customerName,
            customerId: first.customerId,
            representativeName: first.representativeName || "",
            representativeId: first.representativeId || "",
            totalQuantity: group.quantity,
            quantityScaled: scaled(group.quantity),
            packedQuantity: 0,
            producedQuantity: 0,
            paintedQuantity: 0,
            cutQuantity: 0,
            invoicedQuantity: 0,
            isActive: true,
            createdAt: Date.now(),
            deliveryDate: "",
            paymentCondition: "",
            paymentTerms: "",
            paymentTermsDays: [],
            billingRule: "cadastro",
            unitPrice,
            unitPriceScaled: scaled(unitPrice),
            ...(first.discountPercent === undefined ? {} : {
              discountPercent: first.discountPercent,
              discountPercentScaled: scaled(first.discountPercent),
            }),
            discountAmount: group.discountAmount,
            discountAmountScaled: scaled(group.discountAmount),
            grossTotalScaled: scaled(group.grossAmount),
            netTotalScaled: scaled(group.netAmount),
            ...(first.invoiceNumber ? { fiscalType: "COM_NF" } : {}),
            hasRET: false,
            status: "PENDENTE",
            statusOriginalPdf: documentName,
            notes: "",
            itemNotes: first.itemNotes,
            originalProductCode: first.productCode,
            importOrigin: documentName,
          };
          state = {
            id: group.id,
            ref: assignment.ref,
            data: initial,
            totalQuantity: group.quantity,
            billedBefore: 0,
            billedNew: 0,
            isNew: true,
            created: false,
          };
          createdOrders.push({ id: group.id, orderCode: first.orderCode, customerId: first.customerId, productCode: first.productCode });
        } else {
          const order = assignment.data;
          const orderId = Number(order.id ?? assignment.id);
          const history = historyByOrder.get(orderId) || [];
          const loggedBilled = history.reduce((sum, log) => {
            if (log.type === "FATURAMENTO") return sum + Number(log.quantityInvoiced || 0);
            if (log.type === "CANCELAMENTO_FATURAMENTO") return sum - Number(log.quantityInvoiced || 0);
            return sum;
          }, 0);
          const legacyFullyBilled = order.status === "FATURADO";
          const billedBefore = Math.max(
            Number(order.invoicedQuantity || 0),
            Math.max(0, loggedBilled),
            legacyFullyBilled ? Number(order.totalQuantity || 0) : 0,
          );
          state = {
            id: orderId,
            ref: assignment.ref,
            data: order,
            totalQuantity: Number(order.totalQuantity || 0),
            billedBefore,
            billedNew: 0,
            isNew: false,
            created: false,
          };
        }
        orderState.set(stateKey, state);
      }

      const remaining = Math.max(0, rounded(state.totalQuantity - state.billedBefore - state.billedNew, 4));
      const acceptedQuantity = Math.min(line.quantity, remaining);
      if (acceptedQuantity <= 0) {
        outcomes.push({ lineKey: line.lineKey, orderCode: line.orderCode, productCode: line.productCode, action: "IGNORED", reason: "NO_REMAINING_BALANCE", quantity: 0, balance: 0 });
        continue;
      }

      const factor = acceptedQuantity / line.quantity;
      const invoiceGrossAmount = rounded(line.grossAmount * factor, 2);
      const invoiceDiscountAmount = rounded(line.discountAmount * factor, 2);
      const invoiceNetAmount = rounded(line.netAmount * factor, 2);
      state.billedNew = rounded(state.billedNew + acceptedQuantity, 4);
      const balance = Math.max(0, rounded(state.totalQuantity - state.billedBefore - state.billedNew, 4));
      const action = balance <= 0 ? "FATURADO" : "FATURADO_PARCIAL";
      const id = "invoice-" + invoiceKey(documentName, line);
      const logId = makeId(plannedLogs.length + 5000);
      const log = {
        id: logId,
        tenantId: TENANT_ID,
        orderId: state.id,
        itemId: assigned.product.id,
        operatorId: String(claims.uid || ""),
        quantityInvoiced: acceptedQuantity,
        type: "FATURAMENTO",
        timestamp: line.timestamp,
        durationMillis: 0,
        invoiceNumber: line.invoiceNumber,
        deliveryNumber: line.deliveryNumber,
        invoiceDate: line.invoiceDate,
        invoiceDocument: documentName,
        invoiceDocumentKey: invoiceKey(documentName, line),
        invoiceLineKey: line.lineKey,
        documentQuantity: line.quantity,
        invoiceUnitPrice: line.unitPrice,
        invoiceEffectiveUnitPrice: rounded(line.grossAmount / line.quantity, 6),
        invoiceGrossAmount,
        invoiceDiscountAmount,
        invoiceDiscountPercent: line.discountPercent ?? null,
        invoiceNetAmount,
      };
      plannedLogs.push({ id, ref: db.collection("logs").doc(id), markerRef: db.collection("billingReconciliationKeys").doc(id), log });
      outcomes.push({
        lineKey: line.lineKey,
        orderCode: line.orderCode,
        productCode: line.productCode,
        action: acceptedQuantity < line.quantity ? "PARTIAL_EVIDENCE_EXCEEDS_BALANCE" : action,
        reason: acceptedQuantity < line.quantity ? "INVOICE_QUANTITY_EXCEEDS_ORDER_BALANCE" : "",
        quantity: acceptedQuantity,
        documentQuantity: line.quantity,
        balance,
        invoiceNumber: line.invoiceNumber,
        deliveryNumber: line.deliveryNumber,
        invoiceNetAmount,
      });
    }

    const orderWrites = [...orderState.values()].filter((state: any) => state.billedNew > 0);
    const duplicateProductRows = [...productToCreate.values()].filter((row: any) =>
      itemRows.some((existing: any) => cleanCode(existing.data.code) === cleanCode(row.data.code)),
    );
    if (duplicateProductRows.length) throw new ApiError("PRODUCT_CATALOG_CHANGED_RETRY", 409);

    for (const product of productToCreate.values()) {
      transaction.create(product.ref, product.data);
    }
    for (const state of orderWrites) {
      const invoicedQuantity = rounded(state.billedBefore + state.billedNew, 4);
      const isComplete = invoicedQuantity >= state.totalQuantity;
      if (state.isNew) {
        state.data.invoicedQuantity = invoicedQuantity;
        state.data.status = isComplete ? "FATURADO" : "FATURADO_PARCIAL";
        state.data.isActive = !isComplete;
        state.data._alreadyDeducted = true;
        state.data.invoicedAt = Date.now();
        state.data.invoicedBy = String(claims.uid || "");
        transaction.create(state.ref, state.data);
      } else {
        transaction.update(state.ref, {
          invoicedQuantity,
          status: isComplete ? "FATURADO" : "FATURADO_PARCIAL",
          isActive: !isComplete,
          _alreadyDeducted: true,
          invoicedAt: Date.now(),
          invoicedBy: String(claims.uid || ""),
        });
      }
    }
    for (const planned of plannedLogs) {
      transaction.create(planned.ref, planned.log);
      transaction.create(planned.markerRef, {
        id: planned.id,
        tenantId: TENANT_ID,
        sourceDocument: documentName,
        invoiceDocumentKey: planned.log.invoiceDocumentKey,
        invoiceLineKey: planned.log.invoiceLineKey,
        orderId: planned.log.orderId,
        createdAt: Date.now(),
      });
    }

    return { outcomes, createdProducts, createdOrders };
  });

  const applied = result.outcomes.filter((row: any) => Number(row.quantity || 0) > 0);
  return {
    tenantId: TENANT_ID,
    sourceDocument: manifest.documentName,
    counts: {
      linesReceived: manifest.lines.length,
      linesApplied: applied.length,
      linesIgnored: result.outcomes.filter((row: any) => row.action === "IGNORED").length,
      linesPending: result.outcomes.filter((row: any) => row.action === "PENDING" || row.action === "PARTIAL_EVIDENCE_EXCEEDS_BALANCE").length,
      createdProducts: result.createdProducts.length,
      createdOrderLines: result.createdOrders.length,
      excludedNonCommercialOrInvalidLines: manifest.excluded.length,
    },
    valueAdded: rounded(applied.reduce((sum: number, row: any) => sum + Number(row.invoiceNetAmount || 0), 0), 2),
    createdProducts: result.createdProducts,
    createdOrders: result.createdOrders,
    rows: result.outcomes,
    excluded: manifest.excluded,
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return sendMethodNotAllowed(res, ["POST"]);

  try {
    const claims = await requireSession(req);
    const tenantId = String(claims.tenantId || "").trim().toLowerCase();
    const role = String(claims.role || "").trim().toUpperCase();
    if (tenantId !== TENANT_ID || role !== "GERENCIA") {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const { db } = getFirebaseAdmin();
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const manifest = normalizeManifest(body.manifest || body);
    const action = String(body.action || "inspect").trim().toLowerCase();

    if (action === "inspect") {
      return res.status(200).json(await inspect(db, manifest));
    }
    if (action === "apply") {
      const result = await apply(db, manifest, claims);
      return res.status(200).json(result);
    }
    return res.status(400).json({ error: "INVALID_ACTION" });
  } catch (error: any) {
    const message = String(error?.message || "");
    if (message === "UNAUTHORIZED") return res.status(401).json({ error: "UNAUTHORIZED" });
    if (message.startsWith("FIREBASE_ADMIN_")) {
      return res.status(503).json({ error: "FIREBASE_ADMIN_UNAVAILABLE" });
    }
    const status = Number(error?.status) || (error instanceof ApiError ? error.status : 500);
    const code = error instanceof ApiError ? error.code : "TEMPORARY_INVOICE_FAILED";
    console.error("[Temporary Invoice API]", code);
    return res.status(status).json({ error: code });
  }
}