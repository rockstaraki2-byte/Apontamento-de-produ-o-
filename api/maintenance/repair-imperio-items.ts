import crypto from "node:crypto";
import { createRequire } from "node:module";
import { getApps, initializeApp } from "firebase/app";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  initializeFirestore,
  query,
  setDoc,
  where,
} from "firebase/firestore";

const require = createRequire(import.meta.url);
const config = require("../../firebase-applet-config.json") as {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  firestoreDatabaseId?: string;
};

const APP_NAME = "imperio-item-repair-api";
const TENANT_ID = "imperio";
const TOKEN_SHA256 = "90f7cba6e4968c3617c9b826b81d15799e44dba0f965a9448a3b58757638c853";

const firebaseApp =
  getApps().find((app) => app.name === APP_NAME) ||
  initializeApp(
    {
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId,
    },
    APP_NAME,
  );

const db = initializeFirestore(
  firebaseApp,
  { experimentalForceLongPolling: true },
  config.firestoreDatabaseId,
);

function secureEquals(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function authorized(req: any): boolean {
  const raw = String(req.query?.token || "").trim();
  if (!raw) return false;
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return secureEquals(hash, TOKEN_SHA256);
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function num(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function bestString(values: unknown[]): string {
  for (const value of values) {
    const v = text(value);
    if (v) return v;
  }
  return "";
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");

  if (!authorized(req)) {
    return res.status(401).json({ success: false, error: "Não autorizado." });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Use GET." });
  }

  const execute = String(req.query?.execute || "false").toLowerCase() === "true";

  try {
    const [ordersSnap, logsSnap, stocksSnap, flowsSnap, pricesSnap] =
      await Promise.all([
        getDocs(query(collection(db, "orders"), where("tenantId", "==", TENANT_ID))),
        getDocs(query(collection(db, "logs"), where("tenantId", "==", TENANT_ID))),
        getDocs(query(collection(db, "stocks"), where("tenantId", "==", TENANT_ID))),
        getDocs(query(collection(db, "productFlows"), where("tenantId", "==", TENANT_ID))),
        getDocs(query(collection(db, "priceHistories"), where("tenantId", "==", TENANT_ID))),
      ]);

    const refs = new Map<number, any>();

    function ensure(itemId: unknown) {
      const id = num(itemId);
      if (!id || id <= 0) return null;
      if (!refs.has(id)) {
        refs.set(id, {
          itemId: id,
          orders: [],
          logs: [],
          sourceCounts: {},
        });
      }
      return refs.get(id);
    }

    ordersSnap.forEach((snap) => {
      const o: any = snap.data();
      const ref = ensure(o.itemId);
      if (!ref) return;
      ref.sourceCounts.orders = (ref.sourceCounts.orders || 0) + 1;
      if (ref.orders.length < 12) {
        ref.orders.push({
          orderId: snap.id,
          orderCode: text(o.orderCode),
          customProductName: text(o.customProductName),
          originalProductCode: text(o.originalProductCode),
          unit: text(o.unit),
          unitPrice: num(o.unitPrice),
          color: text(o.color),
          size: text(o.size),
          variation: text(o.variation),
          createdAt: num(o.createdAt),
        });
      }
    });

    logsSnap.forEach((snap) => {
      const l: any = snap.data();
      for (const value of [l.itemId, l.parentItemId]) {
        const ref = ensure(value);
        if (!ref) continue;
        ref.sourceCounts.logs = (ref.sourceCounts.logs || 0) + 1;
        if (ref.logs.length < 12) {
          ref.logs.push({
            logId: snap.id,
            customProductName: text(l.customProductName),
            nestedPartName: text(l.nestedPartName),
            processName: text(l.processName),
            timestamp: num(l.timestamp),
          });
        }
      }
    });

    stocksSnap.forEach((snap) => {
      const s: any = snap.data();
      const ref = ensure(s.itemId);
      if (!ref) return;
      ref.sourceCounts.stocks = (ref.sourceCounts.stocks || 0) + 1;
    });

    flowsSnap.forEach((snap) => {
      const f: any = snap.data();
      const ref = ensure(f.itemId);
      if (!ref) return;
      ref.sourceCounts.productFlows = (ref.sourceCounts.productFlows || 0) + 1;
    });

    pricesSnap.forEach((snap) => {
      const p: any = snap.data();
      const ref = ensure(p.itemId);
      if (!ref) return;
      ref.sourceCounts.priceHistories = (ref.sourceCounts.priceHistories || 0) + 1;
    });

    const legacyWithoutTenant: any[] = [];
    const missingDocs: any[] = [];
    const alreadyImperio: any[] = [];
    const conflicts: any[] = [];
    const repaired: any[] = [];
    const reconstructed: any[] = [];
    const unresolved: any[] = [];

    for (const ref of [...refs.values()].sort((a, b) => a.itemId - b.itemId)) {
      const itemRef = doc(db, "items", String(ref.itemId));
      const snap = await getDoc(itemRef);

      if (snap.exists()) {
        const data: any = snap.data() || {};
        const tenant = text(data.tenantId || data.companyId);

        if (!tenant) {
          const row = {
            itemId: ref.itemId,
            code: text(data.code),
            name: text(data.name),
            type: text(data.type),
            sourceCounts: ref.sourceCounts,
          };
          legacyWithoutTenant.push(row);

          if (execute) {
            await setDoc(
              itemRef,
              {
                tenantId: TENANT_ID,
                recoveredAt: Date.now(),
                recoveredReason: "legacy_item_without_tenant",
              },
              { merge: true },
            );
            repaired.push(row);
          }
        } else if (tenant === TENANT_ID) {
          alreadyImperio.push(ref.itemId);
        } else {
          conflicts.push({
            itemId: ref.itemId,
            tenantConflict: true,
            sourceCounts: ref.sourceCounts,
          });
        }
        continue;
      }

      const orderNames = ref.orders
        .map((o: any) => text(o.customProductName))
        .filter(Boolean);
      const logNames = ref.logs
        .flatMap((l: any) => [text(l.customProductName), text(l.nestedPartName)])
        .filter(Boolean);
      const codes = ref.orders
        .map((o: any) => text(o.originalProductCode))
        .filter(Boolean);
      const units = ref.orders.map((o: any) => text(o.unit)).filter(Boolean);
      const prices = ref.orders
        .map((o: any) => num(o.unitPrice))
        .filter((v: number | null): v is number => v !== null && v >= 0);

      const inferredName = bestString([...orderNames, ...logNames]);
      const inferredCode = bestString(codes);
      const inferredUnit = bestString(units);
      const inferredPrice = prices.length ? prices[0] : null;

      const evidence = {
        itemId: ref.itemId,
        inferredName,
        inferredCode,
        inferredUnit,
        inferredPrice,
        sourceCounts: ref.sourceCounts,
        examples: {
          orders: ref.orders.slice(0, 5),
          logs: ref.logs.slice(0, 5),
        },
      };

      missingDocs.push(evidence);

      const canReconstruct = Boolean(inferredName || inferredCode);

      if (execute && canReconstruct) {
        const item: any = {
          id: ref.itemId,
          tenantId: TENANT_ID,
          code: inferredCode || String(ref.itemId),
          name: inferredName || ("Produto " + (inferredCode || ref.itemId)),
          notes: "Cadastro recuperado automaticamente a partir do histórico da Império.",
          type: "PRODUTO",
          recoveredAt: Date.now(),
          recoveredReason: "missing_item_document_rebuilt_from_imperio_history",
        };
        if (inferredUnit) item.unit = inferredUnit;
        if (inferredPrice !== null) {
          item.unitPrice = inferredPrice;
          item.basePrice = inferredPrice;
        }

        await setDoc(itemRef, item, { merge: true });
        reconstructed.push(item);
      } else if (!canReconstruct) {
        unresolved.push(evidence);
      }
    }

    return res.status(200).json({
      success: true,
      tenant: TENANT_ID,
      mode: execute ? "repair" : "preview",
      counts: {
        imperioOrders: ordersSnap.size,
        referencedItemIds: refs.size,
        alreadyImperio: alreadyImperio.length,
        legacyWithoutTenant: legacyWithoutTenant.length,
        missingDocuments: missingDocs.length,
        tenantConflictsNotTouched: conflicts.length,
        repairedLegacy: repaired.length,
        reconstructedMissing: reconstructed.length,
        unresolvedMissing: unresolved.length,
      },
      legacyWithoutTenant,
      missingDocuments: missingDocs,
      tenantConflictsNotTouched: conflicts,
      repaired,
      reconstructed,
      unresolved,
    });
  } catch (error: any) {
    console.error("[repair-imperio-items]", error);
    return res.status(500).json({
      success: false,
      error: error?.message || String(error),
      code: error?.code || null,
    });
  }
}
