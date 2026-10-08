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
  selectOrderLoad,
  type ExpeditionCargaForOrderLoad,
  type ExpeditionRouteForOrderLoad,
} from "./orderImportLoads.js";
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

function automaticCargaDocumentId(tenantId: string, routeId: string, scheduledDate: string): string {
  const key = crypto.createHash("sha256").update(`${tenantId}:${routeId}:${scheduledDate}`).digest("hex");
  return `teksystem-${key.slice(0, 40)}`;
}

function dayNameForDate(dateKey: string): string {
  const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  return dayNames[new Date(`${dateKey}T12:00:00.000Z`).getUTCDay()] || "";
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
  private routeCache = new Map<string, Promise<ExpeditionRouteForOrderLoad[]>>();
  private cargaCache = new Map<string, Promise<ExpeditionCargaForOrderLoad[]>>();

  private routesForTenant(tenantId: string): Promise<ExpeditionRouteForOrderLoad[]> {
    let pending = this.routeCache.get(tenantId);
    if (!pending) {
      pending = getDocs(query(
        collection(db, "expeditionRoutes"),
        where("tenantId", "==", tenantId),
      )).then((snapshot) => snapshot.docs.map((routeDoc) => ({
        ...routeDoc.data(), id: routeDoc.id,
      })) as ExpeditionRouteForOrderLoad[]);
      this.routeCache.set(tenantId, pending);
    }
    return pending;
  }

  private cargasForTenant(tenantId: string): Promise<ExpeditionCargaForOrderLoad[]> {
    let pending = this.cargaCache.get(tenantId);
    if (!pending) {
      pending = getDocs(query(
        collection(db, "cargas"),
        where("tenantId", "==", tenantId),
      )).then((snapshot) => snapshot.docs.map((cargaDoc) => ({
        ...cargaDoc.data(), id: cargaDoc.id,
      })) as ExpeditionCargaForOrderLoad[]);
      this.cargaCache.set(tenantId, pending);
    }
    return pending;
  }

  private async selectCargaForOrder(input: AtomicCreateInput) {
    const routes = await this.routesForTenant(input.tenantId);
    const routeSelection = selectOrderLoad(
      input.tenantId,
      input.prepared.customerId,
      input.prepared.customerCity || "",
      input.prepared.deliveryDate,
      routes,
      [],
    );
    if (!routeSelection.plan) return routeSelection;
    return selectOrderLoad(
      input.tenantId,
      input.prepared.customerId,
      input.prepared.customerCity || "",
      input.prepared.deliveryDate,
      routes,
      await this.cargasForTenant(input.tenantId),
    );
  }

  async previewCargaForOrder(input: AtomicCreateInput) {
    const selection = await this.selectCargaForOrder(input);
    if (!selection.plan) return { cargaAviso: selection.warning };
    const plan = selection.plan;
    const id = plan.cargaId || automaticCargaDocumentId(input.tenantId, plan.routeId, plan.scheduledDate);
    const existing = plan.cargaId
      ? (await this.cargasForTenant(input.tenantId)).find((carga) => carga.id === plan.cargaId)
      : undefined;
    return {
      cargaAssociada: {
        id,
        nome: existing?.name || plan.routeName || "Carga",
        rota: plan.routeName,
        data: plan.scheduledDate,
      },
      cargaCriada: plan.createCarga,
    };
  }

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

    const loadSelection = await this.selectCargaForOrder(input);
    const loadPlan = loadSelection.plan;
    const selectedCargaId = loadPlan
      ? loadPlan.cargaId || automaticCargaDocumentId(input.tenantId, loadPlan.routeId, loadPlan.scheduledDate)
      : "";
    const selectedCargaRef = selectedCargaId ? doc(db, "cargas", selectedCargaId) : null;
    const selectedRouteRef = loadPlan ? doc(db, "expeditionRoutes", loadPlan.routeId) : null;

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
        return {
          created: false,
          orderIds: [],
          existingOrderIds,
          cargaAssociada: data.cargaAssociada || undefined,
          cargaCriada: Boolean(data.cargaCriada),
          cargaAviso: data.cargaAviso || undefined,
        };
      }

      let cargaAssociada: AtomicCreateResult["cargaAssociada"];
      let cargaCriada = false;
      let cargaAviso = loadSelection.warning;
      if (loadPlan && selectedCargaRef && selectedRouteRef) {
        const [routeSnap, cargaSnap] = await Promise.all([
          tx.get(selectedRouteRef),
          tx.get(selectedCargaRef),
        ]);
        const route = routeSnap.data() || {};
        const routePlan = routeSnap.exists()
          ? selectOrderLoad(
              input.tenantId,
              input.prepared.customerId,
              input.prepared.customerCity || "",
              input.prepared.deliveryDate,
              [{ ...route, id: loadPlan.routeId }],
              [],
            ).plan
          : undefined;
        const routeStillEligible = route.tenantId === input.tenantId &&
          !!routePlan &&
          routePlan.routeId === loadPlan.routeId &&
          routePlan.scheduledDate === loadPlan.scheduledDate;
        const carga = cargaSnap.data() || {};
        const cargaDate = String(carga.scheduledDate || carga.departureDate || "").split("T")[0];
        const existingCargaStillEligible = cargaSnap.exists() &&
          carga.tenantId === input.tenantId &&
          String(carga.routeId || "") === loadPlan.routeId &&
          cargaDate === loadPlan.scheduledDate &&
          (carga.status === "ABERTA" || carga.status === "PLANEJADA");
        const canCreateCarga = !cargaSnap.exists() && loadPlan.createCarga && routeStillEligible;

        if (routeStillEligible && (existingCargaStillEligible || canCreateCarga)) {
          const routeName = String(route.name || loadPlan.routeName || "");
          const cargaName = String(carga.name || routeName || "Carga");
          const existingOrderIds = Array.isArray(carga.orderIds)
            ? carga.orderIds.map(Number).filter(Number.isSafeInteger)
            : [];
          const linkedOrderIds = Array.from(new Set([...existingOrderIds, ...orderIds]));
          const existingQuantities = carga.orderQuantities &&
            typeof carga.orderQuantities === "object" && !Array.isArray(carga.orderQuantities)
            ? carga.orderQuantities
            : {};
          const orderQuantities = { ...existingQuantities } as Record<string, number>;
          input.prepared.lines.forEach((line, index) => {
            orderQuantities[String(orderIds[index])] = line.totalQuantity;
          });
          const existingAuditTrail = Array.isArray(carga.auditTrail) ? carga.auditTrail : [];
          const actionUser = input.solicitadoPor || "teksystem-sync-agent";
          const linkedQuantity = input.prepared.lines.reduce((sum, line) => sum + line.totalQuantity, 0);
          const linkedAt = Date.now();
          const auditEntry = {
            timestamp: linkedAt,
            userId: actionUser,
            userName: actionUser,
            action: canCreateCarga
              ? `Carga criada automaticamente e pedido ${input.prepared.codigoPedido} vinculado (${linkedQuantity} un em ${input.prepared.lines.length} item(ns))`
              : `Pedido ${input.prepared.codigoPedido} vinculado na importação (${linkedQuantity} un em ${input.prepared.lines.length} item(ns))`,
          };

          if (canCreateCarga) {
            tx.set(selectedCargaRef, {
              id: selectedCargaId,
              tenantId: input.tenantId,
              name: cargaName,
              routeId: loadPlan.routeId,
              routeName,
              route: [routeName],
              shift: route.shift,
              scheduledDate: loadPlan.scheduledDate,
              departureDate: loadPlan.scheduledDate,
              dayOfWeek: dayNameForDate(loadPlan.scheduledDate),
              orderIds: linkedOrderIds,
              orderQuantities,
              separatedQuantities: {},
              status: "ABERTA",
              createdAt: linkedAt,
              notes: `Carga criada automaticamente para a data elegível do pedido ${input.prepared.codigoPedido}.`,
              auditTrail: [auditEntry],
            });
          } else {
            tx.set(selectedCargaRef, {
              orderIds: linkedOrderIds,
              orderQuantities,
              auditTrail: [...existingAuditTrail, auditEntry],
            }, { merge: true });
          }

          cargaAssociada = { id: selectedCargaId, nome: cargaName, rota: routeName, data: loadPlan.scheduledDate };
          cargaCriada = canCreateCarga;
          cargaAviso = undefined;
        } else if (!routeStillEligible) {
          cargaAviso = "Pedido criado sem carga: a rota ou o dia elegível mudou durante a gravação.";
        } else if (cargaSnap.exists()) {
          cargaAviso = "Pedido criado sem carga: a carga da rota/data deixou de estar aberta, planejada ou pertencer ao tenant durante a gravação.";
        } else {
          cargaAviso = "Pedido criado sem carga: a carga elegível selecionada deixou de existir antes da gravação.";
        }
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
        cargaAssociada: cargaAssociada || null,
        cargaCriada,
        cargaAviso: cargaAviso || null,
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
        cargaId: cargaAssociada?.id || null,
        cargaCriada,
        cargaAviso: cargaAviso || null,
        timestamp: input.createdAt,
      });

      return { created: true, orderIds, cargaAssociada, cargaCriada, cargaAviso };
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
