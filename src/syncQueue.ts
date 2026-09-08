import { db } from "./firebase";
import { doc, setDoc, writeBatch, deleteDoc } from "firebase/firestore";

export interface QueueItem {
  id: number; // autoincrement in IndexedDB
  type: string;
  payload: any;
  createdAt: number;
}

const DB_NAME = "SyncQueueDatabase";
const STORE_NAME = "sync_queue";
const DB_VERSION = 1;

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function cleanUndefined<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (obj instanceof Date) {
    return obj;
  }
  const cleaned: any = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = (obj as any)[key];
      if (value !== undefined) {
        cleaned[key] = cleanUndefined(value);
      }
    }
  }
  return cleaned as T;
}

/**
 * Normaliza a transição de um pedido para FATURADO antes de colocá-la na fila.
 * Assim, tanto o botão de faturamento quanto uma alteração manual de status
 * carregam a data real do faturamento e uma quantidade faturada coerente.
 */
function normalizeBillingPayload(type: string, payload: any, createdAt: number): any {
  if (type !== "UPDATE_ORDERS" || !Array.isArray(payload?.orders)) {
    return payload;
  }

  const randomBase = Math.floor(Math.random() * 900);
  return {
    ...payload,
    orders: payload.orders.map((order: any, index: number) => {
      if (!order || order.status !== "FATURADO") return order;

      const invoicedAt = Number(order.invoicedAt) || createdAt;
      const totalQuantity = Number(order.totalQuantity) || 0;
      const currentInvoicedQuantity = Number(order.invoicedQuantity) || 0;
      const invoiceLogId =
        Number(order.invoiceLogId) ||
        invoicedAt * 1000 + ((randomBase + index) % 1000);

      return {
        ...order,
        status: "FATURADO",
        isActive: false,
        invoicedQuantity: Math.max(currentInvoicedQuantity, totalQuantity),
        invoicedAt,
        invoiceLogId,
      };
    }),
  };
}

/**
 * Apenas a atualização do pedido é tratada como ACK crítico.
 * Logs e movimentos de estoque continuam resilientes via fila: eles não podem
 * bloquear a chegada do fluxo ao UPDATE_ORDERS, como acontecia anteriormente.
 *
 * O próprio UPDATE_ORDERS grava pedido + log de FATURAMENTO no mesmo writeBatch,
 * então status e relatório financeiro passam a nascer juntos no Firestore.
 */
function isCriticalBillingAction(type: string, payload: any): boolean {
  return (
    type === "UPDATE_ORDERS" &&
    !!payload?.orders?.some((o: any) => o?.status === "FATURADO")
  );
}

export async function enqueueAction(type: string, payload: any): Promise<number> {
  const database = await getDB();
  const createdAt = Date.now();
  const detachedPayload = JSON.parse(JSON.stringify(payload));
  const clonedPayload = normalizeBillingPayload(type, detachedPayload, createdAt);

  const id = await new Promise<number>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const item = {
      type,
      payload: clonedPayload,
      createdAt,
    };
    const request = store.add(item);
    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });

  // O faturamento só retorna sucesso ao chamador depois de o núcleo financeiro
  // (pedido + log canônico) ter sido aceito pelo Firestore. Se falhar, o item
  // permanece na fila para retry e o erro volta para a tela.
  if (isCriticalBillingAction(type, clonedPayload)) {
    try {
      await processQueueItem({ id, type, payload: clonedPayload, createdAt });
      await removeFromQueue(id);
    } catch (error) {
      console.error(
        `Critical billing sync failed for queue item ${id} (${type}). Item kept for retry.`,
        error,
      );
      throw error;
    }
  }

  return id;
}

function isEmbalagemItem(item: QueueItem): boolean {
  if (item.payload?.isEmbalagem) return true;
  if (item.type === "ADD_LOGS") {
    return !!item.payload?.logs?.some(
      (l: any) => l.type === "EMBALAGEM" || l.operatorId === "embalagem",
    );
  }
  if (item.type === "ADD_ACTIVE_PACK") {
    return (
      item.payload?.pack?.type === "EMBALAGEM" ||
      item.payload?.pack?.operatorId === "embalagem"
    );
  }
  if (item.type === "REMOVE_ACTIVE_PACK") {
    return !!item.payload?.isEmbalagem;
  }
  return false;
}

export async function getQueue(): Promise<QueueItem[]> {
  try {
    const database = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const items = request.result as QueueItem[];
        // Sort: embalagem items first, and keep chronological order for the rest
        items.sort((a, b) => {
          const isA = isEmbalagemItem(a);
          const isB = isEmbalagemItem(b);
          if (isA && !isB) return -1;
          if (!isA && isB) return 1;
          return a.id - b.id;
        });
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Failed to fetch IndexedDB queue:", err);
    return [];
  }
}

export async function removeFromQueue(id: number): Promise<void> {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function processQueueItem(item: QueueItem): Promise<void> {
  const { type, payload } = item;
  switch (type) {
    case "ADD_LOGS": {
      const batch = writeBatch(db);
      if (payload?.logs && Array.isArray(payload.logs)) {
        payload.logs.forEach((l: any) => {
          if (l && l.id) {
            // Um pedido faturado possui um único documento canônico de faturamento.
            // A chamada antiga de addLogs pode acontecer depois do UPDATE_ORDERS;
            // apontando para o mesmo documento evitamos duplicar quantidade no relatório.
            const logDocId =
              l.type === "FATURAMENTO" && l.orderId
                ? `faturamento_${l.orderId}`
                : l.id.toString();
            batch.set(doc(db, "logs", logDocId), cleanUndefined(l), {
              merge: true,
            });
          }
        });
      }
      await batch.commit();
      break;
    }
    case "UPDATE_ORDERS": {
      const batch = writeBatch(db);
      if (payload?.orders && Array.isArray(payload.orders)) {
        payload.orders.forEach((o: any, index: number) => {
          if (!o || !o.id) return;

          const normalizedOrder =
            o.status === "FATURADO"
              ? {
                  ...o,
                  isActive: false,
                  invoicedQuantity: Math.max(
                    Number(o.invoicedQuantity) || 0,
                    Number(o.totalQuantity) || 0,
                  ),
                  invoicedAt: Number(o.invoicedAt) || item.createdAt,
                  invoiceLogId:
                    Number(o.invoiceLogId) || item.createdAt * 1000 + index,
                }
              : o;

          batch.set(
            doc(db, "orders", normalizedOrder.id.toString()),
            cleanUndefined(normalizedOrder),
            { merge: true },
          );

          if (normalizedOrder.status === "FATURADO") {
            const invoiceLog = cleanUndefined({
              id: normalizedOrder.invoiceLogId,
              orderId: normalizedOrder.id,
              operatorId:
                normalizedOrder.invoicedBy ||
                normalizedOrder.lastUpdatedBy ||
                "faturamento",
              quantityInvoiced:
                Number(normalizedOrder.invoicedQuantity) ||
                Number(normalizedOrder.totalQuantity) ||
                0,
              type: "FATURAMENTO",
              timestamp: normalizedOrder.invoicedAt,
              durationMillis: 0,
              skipInventoryUpdate: true,
              tenantId: normalizedOrder.tenantId,
              processName: "Faturamento",
            });

            batch.set(
              doc(db, "logs", `faturamento_${normalizedOrder.id}`),
              invoiceLog,
              { merge: true },
            );
          }
        });
      }
      await batch.commit();
      break;
    }
    case "UPDATE_STOCKS": {
      const batch = writeBatch(db);
      if (payload?.stocks && Array.isArray(payload.stocks)) {
        payload.stocks.forEach((s: any) => {
          if (s && s.id) {
            batch.set(doc(db, "stocks", s.id), cleanUndefined(s), {
              merge: true,
            });
          }
        });
      }
      await batch.commit();
      break;
    }
    case "ADD_STOCK_MOVEMENT": {
      const m = payload?.movement;
      if (m && m.id) {
        await setDoc(
          doc(db, "stock_movements", m.id),
          cleanUndefined(m),
          { merge: true },
        );
      }
      break;
    }
    case "UPDATE_NEST_TASKS": {
      const batch = writeBatch(db);
      if (payload?.tasks && Array.isArray(payload.tasks)) {
        payload.tasks.forEach((t: any) => {
          if (t && t.id) {
            batch.set(
              doc(db, "nestTasks", t.id.toString()),
              cleanUndefined(t),
              { merge: true },
            );
          }
        });
      }
      await batch.commit();
      break;
    }
    case "ADD_ACTIVE_PACK": {
      const p = payload?.pack;
      if (p && p.id) {
        await setDoc(
          doc(db, "activePacks", p.id.toString()),
          cleanUndefined(p),
          { merge: true },
        );
      } else {
        console.warn(
          "ADD_ACTIVE_PACK skipped in processQueueItem: payload or pack.id is missing",
          payload,
        );
      }
      break;
    }
    case "REMOVE_ACTIVE_PACK": {
      if (payload && payload.id) {
        await deleteDoc(doc(db, "activePacks", payload.id.toString()));
      }
      break;
    }
    case "UPDATE_LOG": {
      const l = payload?.log;
      if (l && l.id) {
        await setDoc(
          doc(db, "logs", l.id.toString()),
          cleanUndefined(l),
          { merge: true },
        );
      }
      break;
    }
    case "DELETE_LOG": {
      if (payload && payload.id) {
        await deleteDoc(doc(db, "logs", payload.id.toString()));
      }
      break;
    }
    default:
      console.warn("Unknown action type on queue processing:", type);
  }
}
