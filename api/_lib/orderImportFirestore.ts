import crypto from "node:crypto";
import { createRequire } from "node:module";
import { getApps, initializeApp } from "firebase/app";
import {
  collection,
  doc,
  getDocs,
  initializeFirestore,
  query,
  runTransaction,
  setDoc,
  where,
} from "firebase/firestore";
import type {
  AtomicCreateInput,
  AtomicCreateResult,
  ImportAuditInput,
  OrderImportRepository,
} from "./orderImportCore.js";
import {
  normalizePaymentTerms,
  normalizeSystemPaymentCondition,
  type CatalogSnapshot,
} from "./orderImportRules.js";
import { buildImportedOrderDocument } from "./orderImportDocuments.js";

// Vercel transpiles these API files to native ESM. Loading the shared JSON config
// through createRequire avoids Node's ESM JSON import-attribute requirement while
// keeping this serverless module isolated from the browser Firebase bootstrap.
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

const ORDER_IMPORT_FIREBASE_APP_NAME = "order-import-api";
const firebaseApp =
  getApps().find((app) => app.name === ORDER_IMPORT_FIREBASE_APP_NAME) ||
  initializeApp(
    {
      apiKey: firebaseConfigFile.apiKey,
      authDomain: firebaseConfigFile.authDomain,
      projectId: firebaseConfigFile.projectId,
      storageBucket: firebaseConfigFile.storageBucket,
      messagingSenderId: firebaseConfigFile.messagingSenderId,
      appId: firebaseConfigFile.appId,
    },
    ORDER_IMPORT_FIREBASE_APP_NAME,
  );

const db = initializeFirestore(
  firebaseApp,
  { experimentalForceLongPolling: true },
  firebaseConfigFile.firestoreDatabaseId,
);

function tenantMatches(value: any, tenantId: string): boolean {
  return String(value?.tenantId || "imperio") === tenantId;
}

function keyForOrder(tenantId: string, orderCode: string): string {
  return crypto.createHash("sha256").update(`${tenantId}:${orderCode}`).digest("hex");
}

function nextOrderLineIds(count: number, seed = Date.now()): number[] {
  const base = BigInt(seed) * 4096n + BigInt(crypto.randomInt(0, 2048));
  const ids: number[] = [];
  for (let i = 0; i < count; i++) {
    const candidate = base + BigInt(i);
    const n = Number(candidate);
    if (!Number.isSafeInteger(n)) throw new Error("Não foi possível gerar ID numérico seguro para o pedido.");
    ids.push(n);
  }
  return ids;
}

function samePaymentTerms(current: number[], previous: number[]): boolean {
  if (current.length !== previous.length) return false;
  return current.every((value, index) => value === previous[index]);
}

interface PreviousCustomerPayment {
  paymentCondition: string;
  paymentTerms: string;
  paymentTermsDays: number[];
  createdAt: number;
}

export class FirestoreOrderImportRepository implements OrderImportRepository {
  async loadCatalog(tenantId: string): Promise<CatalogSnapshot> {
    const [customersSnap, itemsSnap, usersSnap] = await Promise.all([
      getDocs(collection(db, "customers")),
      getDocs(collection(db, "items")),
      getDocs(collection(db, "users")),
    ]);

    return {
      customers: customersSnap.docs
        .map((d) => ({ id: Number(d.id) || d.id, ...d.data() }))
        .filter((row) => tenantMatches(row, tenantId)),
      items: itemsSnap.docs
        .map((d) => ({ id: Number(d.id) || d.id, ...d.data() }))
        .filter((row) => tenantMatches(row, tenantId)),
      users: usersSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((row: any) => row.tenantId === "global" || tenantMatches(row, tenantId)),
    };
  }

  async findExistingOrderIds(tenantId: string, codigoPedido: string): Promise<number[]> {
    const snap = await getDocs(query(collection(db, "orders"), where("orderCode", "==", codigoPedido)));
    return snap.docs
      .map((d) => ({ id: Number(d.id), data: d.data() }))
      .filter((row) => Number.isFinite(row.id) && tenantMatches(row.data, tenantId))
      .map((row) => row.id);
  }

  /**
   * Busca somente pedidos do tenant ativo e somente do cliente atual.
   * A combinação tenantId + customerName preserva o isolamento multi-tenant
   * aprovado para esta alteração e evita consultar histórico de outra empresa.
   */
  private async findLatestCustomerPayment(
    tenantId: string,
    customerName: string,
  ): Promise<PreviousCustomerPayment | null> {
    if (!tenantId || !customerName) return null;

    const snap = await getDocs(
      query(
        collection(db, "orders"),
        where("tenantId", "==", tenantId),
        where("customerName", "==", customerName),
      ),
    );

    const latest = snap.docs
      .map((d) => d.data())
      .filter((row) => tenantMatches(row, tenantId))
      .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0))[0];

    if (!latest) return null;

    const previousTermsDays = Array.isArray(latest.paymentTermsDays)
      ? normalizePaymentTerms(latest.paymentTermsDays)
      : normalizePaymentTerms(latest.paymentTerms || "");

    return {
      paymentCondition: normalizeSystemPaymentCondition(latest.paymentCondition),
      paymentTerms: String(latest.paymentTerms || ""),
      paymentTermsDays: previousTermsDays,
      createdAt: Number(latest.createdAt) || 0,
    };
  }

  async createOrderAtomically(input: AtomicCreateInput): Promise<AtomicCreateResult> {
    const markerId = keyForOrder(input.tenantId, input.prepared.codigoPedido);
    const markerRef = doc(db, "orderImportKeys", markerId);
    const auditId = crypto.randomUUID();
    const auditRef = doc(db, "orderImportAudits", auditId);
    const orderIds = nextOrderLineIds(input.prepared.lines.length, input.createdAt);

    const normalizedPaymentCondition = normalizeSystemPaymentCondition(
      input.prepared.paymentCondition,
    );
    const previousPayment = input.teksystem ? null : await this.findLatestCustomerPayment(
      input.tenantId,
      input.prepared.customerName,
    );
    const shouldReuseLastPayment =
      !input.teksystem && !!previousPayment &&
      previousPayment.paymentCondition === normalizedPaymentCondition &&
      samePaymentTerms(
        input.prepared.paymentTermsDays,
        previousPayment.paymentTermsDays,
      );
    const billingRule: "cadastro" | "ultimo_pedido" = shouldReuseLastPayment
      ? "ultimo_pedido"
      : "cadastro";

    return runTransaction(db, async (tx) => {
      if (input.teksystem) {
        const job = await tx.get(doc(db, "teksystemWriterJobs", input.teksystem.jobId));
        if (!job.exists() || job.data().tenantId !== input.tenantId || job.data().hash !== input.teksystem.jobHash || job.data().state !== "PROCESSING") {
          throw new Error("A revisão do pedido na fila mudou antes da criação; reprocesse o trabalho.");
        }
      }
      const markerSnap = await tx.get(markerRef);
      if (markerSnap.exists()) {
        const data = markerSnap.data() || {};
        const existingOrderIds = Array.isArray(data.orderIds)
          ? data.orderIds.map(Number).filter(Number.isFinite)
          : [];
        return { created: false, orderIds: [], existingOrderIds };
      }

      input.prepared.lines.forEach((line, index) => {
        const id = orderIds[index];
        const orderRef = doc(db, "orders", String(id));
        tx.set(orderRef, buildImportedOrderDocument(input, index, id, normalizedPaymentCondition, billingRule));
      });

      tx.set(markerRef, {
        tenantId: input.tenantId,
        orderCode: input.prepared.codigoPedido,
        orderIds,
        createdAt: input.createdAt,
        origem: input.origem,
        payloadHash: input.prepared.normalizedPayloadHash,
      });

      tx.set(auditRef, {
        tenantId: input.tenantId,
        origem: input.origem,
        solicitadoPor: input.solicitadoPor,
        codigoPedido: input.prepared.codigoPedido,
        payloadHash: input.prepared.normalizedPayloadHash,
        result: "CRIADO",
        warnings: input.prepared.warnings,
        orderIds,
        timestamp: input.createdAt,
      });

      return { created: true, orderIds };
    });
  }

  async writeAudit(input: ImportAuditInput): Promise<void> {
    const id = crypto.randomUUID();
    await setDoc(doc(db, "orderImportAudits", id), {
      ...input,
      errors: input.errors || [],
      warnings: input.warnings || [],
      orderIds: input.orderIds || [],
    });
  }
}
