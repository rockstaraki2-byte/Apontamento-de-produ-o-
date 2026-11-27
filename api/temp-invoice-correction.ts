import { randomInt } from "node:crypto";
import {
  getFirebaseAdmin,
  requireSession,
  sendMethodNotAllowed,
} from "./_lib/firebaseAdmin.js";

const TENANT_ID = "imperio";
const ORDER_DOC_ID = "7350571457683732";
const ORDER_ID = 7350571457683732;
const ORDER_CODE = "69649";
const PRODUCT_CODE = "1653";
const DELIVERY_NUMBER = "70209";
const INVOICE_NUMBER = "6739";
const CORRECTION_ID = "invoice-correction-69649-70209-6739-1653-32";
const DOCUMENT_NAME = "Faturados 27 nov.pdf";
const TARGET_QUANTITY = 532;
const ADDITIONAL_QUANTITY = 32;
const UNIT_PRICE = 25.5;
const DISCOUNT_PERCENT = 5;
const ADDITIONAL_GROSS = 816;
const ADDITIONAL_DISCOUNT = 40.8;
const ADDITIONAL_NET = 775.2;
const EXPECTED_PRIOR_NET = 12112.5;
const INVOICE_TIMESTAMP = new Date("2026-11-27T12:00:00-03:00").getTime();

class ApiError extends Error {
  status: number;
  constructor(message: string, status = 409) {
    super(message);
    this.status = status;
  }
}

function summarizeOrder(order: any) {
  return {
    tenantId: order.tenantId,
    id: order.id,
    orderCode: order.orderCode,
    itemId: order.itemId,
    originalProductCode: order.originalProductCode,
    totalQuantity: order.totalQuantity,
    quantityScaled: order.quantityScaled,
    invoicedQuantity: order.invoicedQuantity,
    status: order.status,
    isActive: order.isActive,
    unitPrice: order.unitPrice,
    discountPercent: order.discountPercent,
    discountAmount: order.discountAmount,
    deliveryDate: order.deliveryDate,
  };
}

function summarizeHistory(snapshot: any) {
  return snapshot.docs
    .map((doc: any) => ({ documentId: doc.id, ...doc.data() }))
    .filter((row: any) => row.tenantId === TENANT_ID && Number(row.orderId) === ORDER_ID)
    .filter((row: any) => ["FATURAMENTO", "CANCELAMENTO_FATURAMENTO"].includes(String(row.type || "")))
    .map((row: any) => ({
      documentId: row.documentId,
      id: row.id,
      type: row.type,
      quantityInvoiced: row.quantityInvoiced,
      invoiceNumber: row.invoiceNumber || "",
      deliveryNumber: row.deliveryNumber || "",
      invoiceDate: row.invoiceDate || "",
      invoiceGrossAmount: row.invoiceGrossAmount,
      invoiceDiscountAmount: row.invoiceDiscountAmount,
      invoiceNetAmount: row.invoiceNetAmount,
      invoiceDocument: row.invoiceDocument || "",
      invoiceLineKey: row.invoiceLineKey || "",
    }));
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

    const action = String(req.body?.action || "");
    if (!["inspect", "apply"].includes(action)) {
      return res.status(400).json({ error: "INVALID_ACTION" });
    }

    const { db } = getFirebaseAdmin();
    const orderRef = db.collection("orders").doc(ORDER_DOC_ID);
    const itemRef = db.collection("items").doc(PRODUCT_CODE);
    const historyQuery = db.collection("logs").where("orderId", "==", ORDER_ID);
    const logRef = db.collection("logs").doc(CORRECTION_ID);
    const markerRef = db.collection("billingReconciliationKeys").doc(CORRECTION_ID);

    if (action === "inspect") {
      const [orderSnap, itemSnap, historySnap, markerSnap, correctionLogSnap] = await Promise.all([
        orderRef.get(),
        itemRef.get(),
        historyQuery.get(),
        markerRef.get(),
        logRef.get(),
      ]);
      if (!orderSnap.exists) return res.status(404).json({ error: "TARGET_ORDER_NOT_FOUND" });
      const order = orderSnap.data() || {};
      const item = itemSnap.data() || {};
      return res.status(200).json({
        action,
        target: { orderDocumentId: orderSnap.id, productCode: PRODUCT_CODE, deliveryNumber: DELIVERY_NUMBER, invoiceNumber: INVOICE_NUMBER },
        order: summarizeOrder(order),
        product: { exists: itemSnap.exists, tenantId: item.tenantId, id: item.id, code: item.code, name: item.name },
        history: summarizeHistory(historySnap),
        correctionAlreadyRecorded: markerSnap.exists || correctionLogSnap.exists,
      });
    }

    const result = await db.runTransaction(async (transaction: any) => {
      const [orderSnap, itemSnap, historySnap, markerSnap, correctionLogSnap] = await Promise.all([
        transaction.get(orderRef),
        transaction.get(itemRef),
        transaction.get(historyQuery),
        transaction.get(markerRef),
        transaction.get(logRef),
      ]);
      if (!orderSnap.exists) throw new ApiError("TARGET_ORDER_NOT_FOUND", 404);
      const order = orderSnap.data() || {};
      const item = itemSnap.data() || {};
      const history = summarizeHistory(historySnap);
      if (markerSnap.exists || correctionLogSnap.exists) {
        const existingCorrection = correctionLogSnap.exists ? correctionLogSnap.data() : null;
        if (
          Number(order.totalQuantity) === TARGET_QUANTITY &&
          Number(order.invoicedQuantity) === TARGET_QUANTITY &&
          existingCorrection &&
          Number(existingCorrection.quantityInvoiced) === ADDITIONAL_QUANTITY
        ) {
          return { action: "already_applied", order: summarizeOrder(order), correction: existingCorrection };
        }
        throw new ApiError("CORRECTION_MARKER_EXISTS_BUT_STATE_MISMATCH");
      }

      if (
        order.tenantId !== TENANT_ID ||
        String(order.orderCode) !== ORDER_CODE ||
        Number(order.itemId) !== Number(PRODUCT_CODE) ||
        String(order.originalProductCode || PRODUCT_CODE) !== PRODUCT_CODE
      ) {
        throw new ApiError("TARGET_ORDER_IDENTITY_MISMATCH");
      }
      if (!itemSnap.exists || item.tenantId !== TENANT_ID || String(item.code) !== PRODUCT_CODE) {
        throw new ApiError("TARGET_PRODUCT_IDENTITY_MISMATCH");
      }
      if (
        Number(order.totalQuantity) !== 500 ||
        Number(order.invoicedQuantity) !== 500 ||
        String(order.status || "") !== "FATURADO" ||
        Number(order.unitPrice) !== UNIT_PRICE
      ) {
        throw new ApiError("TARGET_ORDER_PRECONDITION_MISMATCH");
      }
      if (order.discountPercent !== undefined && Number(order.discountPercent) !== DISCOUNT_PERCENT) {
        throw new ApiError("TARGET_DISCOUNT_PRECONDITION_MISMATCH");
      }

      const invoiceRows = history.filter((row: any) => row.type === "FATURAMENTO");
      const cancellationRows = history.filter((row: any) => row.type === "CANCELAMENTO_FATURAMENTO");
      const priorQuantity = invoiceRows.reduce((sum: number, row: any) => sum + Number(row.quantityInvoiced || 0), 0);
      const matchingPriorInvoice = invoiceRows.some((row: any) =>
        String(row.invoiceNumber) === INVOICE_NUMBER &&
        String(row.deliveryNumber) === DELIVERY_NUMBER &&
        Number(row.quantityInvoiced) === 500 &&
        Number(row.invoiceNetAmount) === EXPECTED_PRIOR_NET
      );
      if (cancellationRows.length || priorQuantity !== 500 || !matchingPriorInvoice) {
        throw new ApiError("BILLING_HISTORY_PRECONDITION_MISMATCH");
      }

      const logId = Date.now() * 1000 + randomInt(1, 999);
      const now = Date.now();
      const lineKey = "16|27|69649|70209|6739|1653|complemento-32";
      const correction = {
        id: logId,
        tenantId: TENANT_ID,
        orderId: ORDER_ID,
        itemId: order.itemId,
        operatorId: String(claims.uid || ""),
        quantityInvoiced: ADDITIONAL_QUANTITY,
        type: "FATURAMENTO",
        timestamp: INVOICE_TIMESTAMP,
        durationMillis: 0,
        invoiceNumber: INVOICE_NUMBER,
        deliveryNumber: DELIVERY_NUMBER,
        invoiceDate: "2026-11-27",
        invoiceDocument: DOCUMENT_NAME,
        invoiceDocumentKey: CORRECTION_ID,
        invoiceLineKey: lineKey,
        documentQuantity: ADDITIONAL_QUANTITY,
        invoiceUnitPrice: UNIT_PRICE,
        invoiceEffectiveUnitPrice: UNIT_PRICE,
        invoiceGrossAmount: ADDITIONAL_GROSS,
        invoiceDiscountAmount: ADDITIONAL_DISCOUNT,
        invoiceDiscountPercent: DISCOUNT_PERCENT,
        invoiceNetAmount: ADDITIONAL_NET,
      };
      const orderUpdate: Record<string, any> = {
        totalQuantity: TARGET_QUANTITY,
        invoicedQuantity: TARGET_QUANTITY,
        status: "FATURADO",
        isActive: false,
        discountAmount: 678.3,
        _alreadyDeducted: true,
        invoicedAt: now,
        invoicedBy: String(claims.uid || ""),
      };
      if (order.quantityScaled !== undefined) orderUpdate.quantityScaled = 5320000;
      if (order.totalQuantityScaled !== undefined) orderUpdate.totalQuantityScaled = 5320000;
      if (order.quantity !== undefined) orderUpdate.quantity = TARGET_QUANTITY;

      transaction.update(orderRef, orderUpdate);
      transaction.create(logRef, correction);
      transaction.create(markerRef, {
        id: CORRECTION_ID,
        tenantId: TENANT_ID,
        sourceDocument: DOCUMENT_NAME,
        invoiceDocumentKey: CORRECTION_ID,
        invoiceLineKey: lineKey,
        orderId: ORDER_ID,
        createdAt: now,
      });
      return {
        action: "applied",
        order: { ...summarizeOrder(order), ...orderUpdate },
        correction,
        previousInvoiceHistoryPreserved: true,
      };
    });

    return res.status(200).json(result);
  } catch (error: any) {
    const status = Number(error?.status) || (error?.message === "UNAUTHORIZED" ? 401 : 500);
    return res.status(status).json({ error: error?.message || "INTERNAL_ERROR" });
  }
}
