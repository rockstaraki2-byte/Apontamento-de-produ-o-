import crypto from "node:crypto";
import { createRequire } from "node:module";
import { getApps, initializeApp } from "firebase/app";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  initializeFirestore,
  runTransaction,
} from "firebase/firestore";
import type {
  BillingCatalogItem,
  BillingPlan,
  BillingResolvedOperation,
  BillingSnapshot,
  BillingStockRecord,
  BillingOrderRecord,
} from "./billingImportCore.js";

const require = createRequire(import.meta.url);
const firebaseConfigFile = require("../../firebase-applet-config.json") as {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  firestoreDatabaseId?: string;
};

const BILLING_FIREBASE_APP_NAME = "billing-import-api";
const firebaseApp =
  getApps().find((app) => app.name === BILLING_FIREBASE_APP_NAME) ||
  initializeApp(
    {
      apiKey: firebaseConfigFile.apiKey,
      authDomain: firebaseConfigFile.authDomain,
      projectId: firebaseConfigFile.projectId,
      storageBucket: firebaseConfigFile.storageBucket,
      messagingSenderId: firebaseConfigFile.messagingSenderId,
      appId: firebaseConfigFile.appId,
    },
    BILLING_FIREBASE_APP_NAME,
  );

const db = initializeFirestore(
  firebaseApp,
  { experimentalForceLongPolling: true },
  firebaseConfigFile.firestoreDatabaseId,
);

function tenantMatches(value: any, tenantId: string): boolean {
  return String(value?.tenantId || "imperio") === tenantId;
}

function markerIdFor(tenantId: string, documentKey: string, sourceKey: string): string {
  return crypto
    .createHash("sha256")
    .update(`${tenantId}:${documentKey}:${sourceKey}`)
    .digest("hex");
}

function numericLogIds(count: number, now: number): number[] {
  const base = BigInt(now) * 1000n + BigInt(crypto.randomInt(0, 700));
  return Array.from({ length: count }, (_, index) => {
    const value = Number(base + BigInt(index));
    if (!Number.isSafeInteger(value)) throw new Error("Não foi possível gerar ID seguro para o log de faturamento.");
    return value;
  });
}

function movementId(now: number, index: number): string {
  return `${now}_${index}_${crypto.randomBytes(5).toString("hex")}`;
}

export interface BillingApplyItemResult {
  sourceKey: string;
  orderId: number;
  orderCode: string;
  itemId: number;
  quantityInvoiced: number;
  quantityBefore: number;
  quantityAfter: number;
  invoicedBefore: number;
  invoicedAfter: number;
  status: "FATURADO" | "FATURADO_PARCIAL";
}

export interface BillingApplyResult {
  sucesso: true;
  auditId?: string;
  applied: BillingApplyItemResult[];
  skippedDuplicates: string[];
  resumo: {
    aplicados: number;
    duplicadosIgnorados: number;
    quantidadeFaturada: number;
    itensComQuantidadeAjustada: number;
  };
}

export class BillingStateChangedError extends Error {
  code = "BILLING_STATE_CHANGED";
  constructor(message: string) {
    super(message);
    this.name = "BillingStateChangedError";
  }
}

export class FirestoreBillingRepository {
  async loadSnapshot(tenantId: string): Promise<BillingSnapshot> {
    const [ordersSnap, itemsSnap, stocksSnap] = await Promise.all([
      getDocs(collection(db, "orders")),
      getDocs(collection(db, "items")),
      getDocs(collection(db, "stocks")),
    ]);

    const orders = ordersSnap.docs
      .map((d) => ({ id: Number(d.id), ...d.data() } as BillingOrderRecord))
      .filter((row) => Number.isFinite(row.id) && tenantMatches(row, tenantId));
    const items = itemsSnap.docs
      .map((d) => ({ id: Number(d.id) || d.id, ...d.data() } as BillingCatalogItem))
      .filter((row) => tenantMatches(row, tenantId));
    const stocks = stocksSnap.docs
      .map((d) => ({ id: d.id, ...d.data() } as BillingStockRecord))
      .filter((row) => tenantMatches(row, tenantId));

    return { orders, items, stocks };
  }

  async findProcessedSourceKeys(
    tenantId: string,
    documentKey: string,
    sourceKeys: string[],
  ): Promise<Set<string>> {
    if (!documentKey || sourceKeys.length === 0) return new Set();
    const unique = Array.from(new Set(sourceKeys));
    const snapshots = await Promise.all(
      unique.map((sourceKey) =>
        getDoc(doc(db, "billingImportKeys", markerIdFor(tenantId, documentKey, sourceKey))),
      ),
    );
    const processed = new Set<string>();
    snapshots.forEach((snap, index) => {
      if (snap.exists()) processed.add(unique[index]);
    });
    return processed;
  }

  async applyPlan(plan: BillingPlan): Promise<BillingApplyResult> {
    const operations = plan.linhas
      .map((line) => line.operation)
      .filter((operation): operation is BillingResolvedOperation => Boolean(operation));

    if (operations.length === 0) {
      return {
        sucesso: true,
        applied: [],
        skippedDuplicates: plan.linhas
          .filter((line) => line.status === "JA_PROCESSADO")
          .map((line) => line.sourceKey),
        resumo: {
          aplicados: 0,
          duplicadosIgnorados: plan.linhas.filter((line) => line.status === "JA_PROCESSADO").length,
          quantidadeFaturada: 0,
          itensComQuantidadeAjustada: 0,
        },
      };
    }

    const now = Date.now();
    const auditId = crypto.randomUUID();
    const estimatedLogs = operations.length * 2 + 8;
    const logIds = numericLogIds(estimatedLogs, now);
    let logCursor = 0;
    let movementCursor = 0;

    return runTransaction(db, async (tx) => {
      const markerEntries = operations.map((operation) => ({
        operation,
        ref: doc(
          db,
          "billingImportKeys",
          markerIdFor(plan.tenantId, plan.documentKey, operation.sourceKey),
        ),
      }));

      const orderIds = new Set<number>();
      const stockIds = new Set<string>();
      operations.forEach((operation) => {
        orderIds.add(operation.orderId);
        if (operation.reservationConflict) orderIds.add(operation.reservationConflict.orderId);
        stockIds.add(operation.parentStockId);
        operation.componentDeductions.forEach((deduction) => stockIds.add(deduction.stockId));
      });

      const orderEntries = Array.from(orderIds).map((id) => ({ id, ref: doc(db, "orders", String(id)) }));
      const stockEntries = Array.from(stockIds).map((id) => ({ id, ref: doc(db, "stocks", id) }));

      const [markerSnaps, orderSnaps, stockSnaps] = await Promise.all([
        Promise.all(markerEntries.map((entry) => tx.get(entry.ref))),
        Promise.all(orderEntries.map((entry) => tx.get(entry.ref))),
        Promise.all(stockEntries.map((entry) => tx.get(entry.ref))),
      ]);

      const markerExists = new Map<string, boolean>();
      markerEntries.forEach((entry, index) => markerExists.set(entry.operation.sourceKey, markerSnaps[index].exists()));

      const currentOrders = new Map<number, any>();
      orderEntries.forEach((entry, index) => {
        const snap = orderSnaps[index];
        if (snap.exists()) currentOrders.set(entry.id, { id: entry.id, ...snap.data() });
      });

      const currentStocks = new Map<string, any>();
      stockEntries.forEach((entry, index) => {
        const snap = stockSnaps[index];
        if (snap.exists()) currentStocks.set(entry.id, { id: entry.id, ...snap.data() });
      });

      const skippedDuplicates: string[] = [];
      const applicable = operations.filter((operation) => {
        if (markerExists.get(operation.sourceKey)) {
          skippedDuplicates.push(operation.sourceKey);
          return false;
        }
        return true;
      });

      if (applicable.length === 0) {
        return {
          sucesso: true as const,
          applied: [],
          skippedDuplicates,
          resumo: {
            aplicados: 0,
            duplicadosIgnorados: skippedDuplicates.length,
            quantidadeFaturada: 0,
            itensComQuantidadeAjustada: 0,
          },
        };
      }

      applicable.forEach((operation) => {
        const current = currentOrders.get(operation.orderId);
        if (!current || !tenantMatches(current, plan.tenantId)) {
          throw new BillingStateChangedError(`O item ${operation.orderId} do pedido ${operation.orderCode} não está mais disponível.`);
        }
        const currentTotal = Number(current.totalQuantity || 0);
        const currentInvoiced = Number(current.invoicedQuantity || 0);
        if (
          currentTotal !== operation.currentTotalQuantity ||
          currentInvoiced !== operation.currentInvoicedQuantity
        ) {
          throw new BillingStateChangedError(
            `O pedido ${operation.orderCode} mudou desde a prévia (item ${operation.orderId}). Valide novamente antes de faturar.`,
          );
        }
      });

      const mutableStocks = new Map<string, any>();
      currentStocks.forEach((value, key) => mutableStocks.set(key, { ...value }));
      const changedStockIds = new Set<string>();
      const orderPatches = new Map<number, Record<string, unknown>>();
      const applied: BillingApplyItemResult[] = [];
      const markerWrites: Array<{ ref: any; data: Record<string, unknown> }> = [];
      const logWrites: Array<{ id: number; data: Record<string, unknown> }> = [];
      const movementWrites: Array<{ id: string; data: Record<string, unknown> }> = [];
      const releasedReservationOrderIds = new Set<number>();

      applicable.forEach((operation) => {
        const current = currentOrders.get(operation.orderId);
        const newInvoiced = Number(current.invoicedQuantity || 0) + operation.billingQuantity;
        const currentTotal = Number(current.totalQuantity || 0);
        const newTotal = Math.max(currentTotal, newInvoiced);
        const resultingStatus = newInvoiced >= newTotal ? "FATURADO" : "FATURADO_PARCIAL";

        orderPatches.set(operation.orderId, {
          tenantId: plan.tenantId,
          totalQuantity: newTotal,
          invoicedQuantity: newInvoiced,
          status: resultingStatus,
          isActive: resultingStatus !== "FATURADO",
          isUrgent: resultingStatus === "FATURADO" ? false : Boolean(current.isUrgent),
          _alreadyDeducted: true,
        });

        let reservationRelease = 0;
        if (operation.reservationConflict && plan.allowBreakReservations) {
          const reservedOrder = currentOrders.get(operation.reservationConflict.orderId);
          if (
            reservedOrder &&
            tenantMatches(reservedOrder, plan.tenantId) &&
            reservedOrder.isActive !== false &&
            (reservedOrder.status === "PLANEJADO" || reservedOrder.status === "EMBALADO") &&
            !releasedReservationOrderIds.has(operation.reservationConflict.orderId)
          ) {
            releasedReservationOrderIds.add(operation.reservationConflict.orderId);
            reservationRelease = Math.max(0, Number(reservedOrder.totalQuantity || 0));
            orderPatches.set(operation.reservationConflict.orderId, {
              tenantId: plan.tenantId,
              status: "PENDENTE",
              packedQuantity: 0,
            });
            const reservationLogId = logIds[logCursor++];
            logWrites.push({
              id: reservationLogId,
              data: {
                id: reservationLogId,
                tenantId: plan.tenantId,
                orderId: operation.reservationConflict.orderId,
                operatorId: plan.solicitadoPor,
                timestamp: now,
                durationMillis: 0,
                customProductName: `Reserva desfeita (estoque direcionado para pedido ${operation.orderCode})`,
                importOrigin: plan.origem,
                billingDocumentKey: plan.documentKey,
              },
            });
          }
        }

        const parentStock = mutableStocks.get(operation.parentStockId);
        if (parentStock) {
          parentStock.quantity = Math.max(0, Number(parentStock.quantity || 0) - operation.billingQuantity);
          parentStock.reservedQuantity = Math.max(
            0,
            Number(parentStock.reservedQuantity || 0) - reservationRelease - operation.billingQuantity,
          );
          parentStock.tenantId = plan.tenantId;
          mutableStocks.set(operation.parentStockId, parentStock);
          changedStockIds.add(operation.parentStockId);
        }

        const parentMovementId = movementId(now, movementCursor++);
        movementWrites.push({
          id: parentMovementId,
          data: {
            id: parentMovementId,
            tenantId: plan.tenantId,
            itemId: operation.itemId,
            color: operation.color,
            size: operation.size,
            variation: operation.variation,
            quantity: operation.billingQuantity,
            type: "SAIDA",
            description: `${operation.sourceType === "PEDIDO_INTEIRO" ? "Saída por faturamento total" : "Saída por faturamento"} do Pedido ${operation.orderCode} (Cliente: ${operation.customerName})`,
            timestamp: now,
            importOrigin: plan.origem,
            billingDocumentKey: plan.documentKey,
          },
        });

        operation.componentDeductions.forEach((deduction) => {
          const existing = mutableStocks.get(deduction.stockId);
          const stock = existing
            ? { ...existing }
            : {
                id: deduction.stockId,
                tenantId: plan.tenantId,
                itemId: deduction.itemId,
                color: deduction.color,
                size: deduction.size,
                variation: deduction.variation,
                stage: deduction.stage,
                quantity: 0,
              };
          const childQty = operation.billingQuantity * deduction.factor;
          stock.quantity = Number(stock.quantity || 0) - childQty;
          stock.tenantId = plan.tenantId;
          mutableStocks.set(deduction.stockId, stock);
          changedStockIds.add(deduction.stockId);

          const childMovementId = movementId(now, movementCursor++);
          movementWrites.push({
            id: childMovementId,
            data: {
              id: childMovementId,
              tenantId: plan.tenantId,
              itemId: deduction.itemId,
              color: deduction.color,
              size: deduction.size,
              variation: deduction.variation,
              quantity: childQty,
              type: "SAIDA",
              description: `Consumo autom. de componente (Faturamento do pai: ${deduction.parentItemCode || operation.itemCode} - ${deduction.parentItemName || operation.itemName}) [Ref: Pedido ${operation.orderCode}]`,
              timestamp: now,
              importOrigin: plan.origem,
              billingDocumentKey: plan.documentKey,
            },
          });
        });

        const billingLogId = logIds[logCursor++];
        logWrites.push({
          id: billingLogId,
          data: {
            id: billingLogId,
            tenantId: plan.tenantId,
            orderId: operation.orderId,
            operatorId: plan.solicitadoPor,
            quantityInvoiced: operation.billingQuantity,
            type: "FATURAMENTO",
            timestamp: now,
            durationMillis: 0,
            importOrigin: plan.origem,
            billingDocumentKey: plan.documentKey,
            invoiceNumber: operation.numeroNota || "",
          },
        });

        const markerRef = markerEntries.find((entry) => entry.operation.sourceKey === operation.sourceKey)!.ref;
        markerWrites.push({
          ref: markerRef,
          data: {
            tenantId: plan.tenantId,
            documentKey: plan.documentKey,
            sourceKey: operation.sourceKey,
            origem: plan.origem,
            solicitadoPor: plan.solicitadoPor,
            orderId: operation.orderId,
            orderCode: operation.orderCode,
            itemId: operation.itemId,
            quantityInvoiced: operation.billingQuantity,
            totalQuantityBefore: currentTotal,
            totalQuantityAfter: newTotal,
            invoicedQuantityBefore: Number(current.invoicedQuantity || 0),
            invoicedQuantityAfter: newInvoiced,
            auditId,
            processedAt: now,
          },
        });

        applied.push({
          sourceKey: operation.sourceKey,
          orderId: operation.orderId,
          orderCode: operation.orderCode,
          itemId: operation.itemId,
          quantityInvoiced: operation.billingQuantity,
          quantityBefore: currentTotal,
          quantityAfter: newTotal,
          invoicedBefore: Number(current.invoicedQuantity || 0),
          invoicedAfter: newInvoiced,
          status: resultingStatus,
        });
      });

      orderPatches.forEach((patch, id) => {
        tx.set(doc(db, "orders", String(id)), patch, { merge: true });
      });
      changedStockIds.forEach((id) => {
        tx.set(doc(db, "stocks", id), mutableStocks.get(id), { merge: true });
      });
      movementWrites.forEach((write) => {
        tx.set(doc(db, "stockMovements", write.id), write.data);
      });
      logWrites.forEach((write) => {
        tx.set(doc(db, "logs", String(write.id)), write.data);
      });
      markerWrites.forEach((write) => tx.set(write.ref, write.data));

      tx.set(doc(db, "billingImportAudits", auditId), {
        tenantId: plan.tenantId,
        documentKey: plan.documentKey,
        origem: plan.origem,
        solicitadoPor: plan.solicitadoPor,
        previewHash: plan.previewHash,
        allowBreakReservations: plan.allowBreakReservations,
        applied,
        skippedDuplicates,
        timestamp: now,
      });

      return {
        sucesso: true as const,
        auditId,
        applied,
        skippedDuplicates,
        resumo: {
          aplicados: applied.length,
          duplicadosIgnorados: skippedDuplicates.length,
          quantidadeFaturada: applied.reduce((sum, item) => sum + item.quantityInvoiced, 0),
          itensComQuantidadeAjustada: applied.filter((item) => item.quantityAfter > item.quantityBefore).length,
        },
      };
    });
  }
}
