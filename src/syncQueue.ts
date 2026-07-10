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
    request.onupgradeneeded = (e) => {
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
  if (obj === null || typeof obj !== 'object') {
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

export async function enqueueAction(type: string, payload: any): Promise<number> {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const item = {
      type,
      payload: JSON.parse(JSON.stringify(payload)), // Deep clone to detach proxy representations
      createdAt: Date.now()
    };
    const request = store.add(item);
    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
}

function isEmbalagemItem(item: QueueItem): boolean {
  if (item.payload?.isEmbalagem) return true;
  if (item.type === "ADD_LOGS") {
    return !!item.payload?.logs?.some((l: any) => l.type === "EMBALAGEM" || l.operatorId === "embalagem");
  }
  if (item.type === "ADD_ACTIVE_PACK") {
    return item.payload?.pack?.type === "EMBALAGEM" || item.payload?.pack?.operatorId === "embalagem";
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
      payload.logs.forEach((l: any) => {
        batch.set(doc(db, "logs", l.id.toString()), cleanUndefined(l), { merge: true });
      });
      await batch.commit();
      break;
    }
    case "UPDATE_ORDERS": {
      const batch = writeBatch(db);
      payload.orders.forEach((o: any) => {
        batch.set(doc(db, "orders", o.id.toString()), cleanUndefined(o), { merge: true });
      });
      await batch.commit();
      break;
    }
    case "UPDATE_STOCKS": {
      const batch = writeBatch(db);
      payload.stocks.forEach((s: any) => {
        batch.set(doc(db, "stocks", s.id), cleanUndefined(s), { merge: true });
      });
      await batch.commit();
      break;
    }
    case "ADD_STOCK_MOVEMENT": {
      const m = payload.movement;
      await setDoc(doc(db, "stock_movements", m.id), cleanUndefined(m), { merge: true });
      break;
    }
    case "UPDATE_NEST_TASKS": {
      const batch = writeBatch(db);
      payload.tasks.forEach((t: any) => {
        batch.set(doc(db, "nestTasks", t.id.toString()), cleanUndefined(t), { merge: true });
      });
      await batch.commit();
      break;
    }
    case "ADD_ACTIVE_PACK": {
      const p = payload.pack;
      await setDoc(doc(db, "activePacks", p.id.toString()), cleanUndefined(p), { merge: true });
      break;
    }
    case "REMOVE_ACTIVE_PACK": {
      await deleteDoc(doc(db, "activePacks", payload.id.toString()));
      break;
    }
    case "UPDATE_LOG": {
      const l = payload.log;
      await setDoc(doc(db, "logs", l.id.toString()), cleanUndefined(l), { merge: true });
      break;
    }
    case "DELETE_LOG": {
      await deleteDoc(doc(db, "logs", payload.id.toString()));
      break;
    }
    default:
      console.warn("Unknown action type on queue processing:", type);
  }
}
