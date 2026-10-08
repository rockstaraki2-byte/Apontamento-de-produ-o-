import crypto from "node:crypto";
import {
  collection, doc, getCountFromServer, getDoc, getDocs, limit, query, runTransaction, where,
} from "firebase/firestore";
import { teksystemDb as db } from "./teksystemSyncFirestore.js";
import { FirestoreOrderImportRepository } from "./orderImportFirestore.js";
import { buildImportedOrderDocument } from "./orderImportDocuments.js";
import type { NormalizedTekSystemSyncPayload } from "./teksystemSync.js";
import { syncRecordKey } from "./teksystemSync.js";
import {
  buildWriterJobs, planCargaQuantityMutations, planWriterJob, signature, stableNumericId, text, WRITER_KINDS, WriterConflict,
  type WriterCatalog, type WriterCatalogEntry, type WriterJob, type WriterKind, type WriterPlan, type WriterRow,
} from "./teksystemWriter.js";

type JobState = "READY" | "PROCESSING" | "APPLIED" | "REVIEW" | "RETRY";
const scope = (tenantId: string, kind: WriterKind, state: JobState) => `${tenantId}:${kind}:${state}`;
const jobRef = (id: string) => doc(db, "teksystemWriterJobs", id);
const allowedTenant = () => process.env.TEKSYSTEM_ALLOWED_TENANT_ID || "imperio";
function assertTenant(tenantId: string) {
  if (tenantId !== allowedTenant()) throw new WriterConflict("TENANT_INVALIDO", "Empresa não autorizada para este conector.");
}
function rows(snapshot: any): WriterCatalogEntry[] {
  return snapshot.docs.map((d: any) => ({ ...d.data(), id: d.data().id ?? (Number(d.id) || d.id), docId: d.id }));
}
class ScopedOrderRepository extends FirestoreOrderImportRepository {
  async loadCatalog(tenantId: string): Promise<WriterCatalog> { return loadCatalog(tenantId); }
  async findExistingOrderIds(tenantId: string, code: string) { return (await loadOrders(tenantId, code)).map((o) => Number(o.id)); }
}
async function loadCatalog(tenantId: string, kind?: WriterKind): Promise<WriterCatalog> {
  assertTenant(tenantId);
  const names = kind === "clientes" ? ["customers"] : kind === "produtos" ? ["items"] : ["customers", "items", "users"];
  const result = await Promise.all(names.map(async (name) => [name, rows(await getDocs(query(collection(db, name), where("tenantId", "==", tenantId))))] as const));
  const map = Object.fromEntries(result);
  if (names.includes("users")) map.users = [...map.users, ...rows(await getDocs(query(collection(db, "users"), where("tenantId", "==", "global"))))];
  return { customers: map.customers || [], items: map.items || [], users: map.users || [] };
}
async function loadOrders(tenantId: string, code: string): Promise<WriterRow[]> {
  assertTenant(tenantId);
  return rows(await getDocs(query(collection(db, "orders"), where("tenantId", "==", tenantId), where("orderCode", "==", code))));
}
async function attachCargaMutations(job: WriterJob, plan: WriterPlan) {
  if (job.kind !== "pedidos" || !plan.mutations.some((mutation) => mutation.collection === "orders" &&
      (Object.hasOwn(mutation.patch, "totalQuantity") || Object.hasOwn(mutation.patch, "deliveryDate")))) return;
  const tenantCargas = rows(await getDocs(query(collection(db, "cargas"), where("tenantId", "==", job.tenantId))));
  plan.mutations.push(...planCargaQuantityMutations(job, plan, tenantCargas));
}

export async function enqueueTekSystemWriter(payload: NormalizedTekSystemSyncPayload) {
  assertTenant(payload.tenantId);
  const jobs = buildWriterJobs(payload);
  let enqueued = 0;
  for (let i = 0; i < jobs.length; i += 10) {
    const outcomes = await Promise.all(jobs.slice(i, i + 10).map(async (job) => runTransaction(db, async (tx) => {
      const ref = jobRef(job.id);
      const snapshot = await tx.get(ref);
      const current = snapshot.exists() ? snapshot.data() : undefined;
      if (current && current.tenantId !== job.tenantId) throw new WriterConflict("TENANT_INVALIDO", "Trabalho pertence a outra empresa.");
      if (current?.hash === job.hash || (current && current.generatedAt > job.generatedAt)) return false;
      tx.set(ref, { ...job, state: "READY", queueScope: scope(job.tenantId, job.kind, "READY"),
        attempts: 0, retryAt: 0, leaseUntil: 0, leaseOwner: "", issues: [],
        receivedAt: Date.now(), result: null });
      return true;
    })));
    enqueued += outcomes.filter(Boolean).length;
  }
  return { jobs: jobs.length, enqueued };
}

export async function writerStatus(tenantId: string) {
  assertTenant(tenantId);
  const states: JobState[] = ["READY", "PROCESSING", "APPLIED", "REVIEW", "RETRY"];
  const entries = await Promise.all(WRITER_KINDS.map(async (kind) => {
    const counts = await Promise.all(states.map(async (state) => [state, (await getCountFromServer(query(collection(db, "teksystemWriterJobs"), where("queueScope", "==", scope(tenantId, kind, state))))).data().count]));
    const reviewJobs = rows(await getDocs(query(collection(db, "teksystemWriterJobs"), where("queueScope", "==", scope(tenantId, kind, "REVIEW")), limit(10))))
      .map((job) => ({ id: job.id, codigo: job.externalKey, issues: job.issues }));
    return [kind, { ...Object.fromEntries(counts), reviewJobs }] as const;
  }));
  return { tenantId, kinds: Object.fromEntries(entries) };
}
export async function requeueWriterJobs(tenantId: string, ids: string[]) {
  assertTenant(tenantId);
  if (!ids.length || ids.length > 50 || ids.some((id) => !/^[a-f0-9]{64}$/.test(id))) throw new WriterConflict("IDS_INVALIDOS", "Informe de 1 a 50 identificadores de trabalhos.");
  return Promise.all([...new Set(ids)].map((id) => runTransaction(db, async (tx) => {
    const ref = jobRef(id); const snap = await tx.get(ref);
    if (!snap.exists() || snap.data().tenantId !== tenantId) throw new WriterConflict("TRABALHO_NAO_ENCONTRADO", "Trabalho não pertence à empresa autorizada.");
    const job = snap.data();
    if (!["REVIEW", "RETRY"].includes(job.state)) return { id, requeued: false };
    tx.update(ref, { state: "READY", queueScope: scope(tenantId, job.kind, "READY"), retryAt: 0, issues: [], leaseOwner: "", leaseUntil: 0 });
    return { id, requeued: true };
  })));
}
async function candidates(tenantId: string, kind: WriterKind, pageSize: number): Promise<WriterJob[]> {
  const pages = await Promise.all((["READY", "RETRY", "PROCESSING"] as JobState[]).map((state) => getDocs(query(collection(db, "teksystemWriterJobs"), where("queueScope", "==", scope(tenantId, kind, state)), ...(state === "READY" ? [limit(pageSize)] : [])))));
  const now = Date.now();
  return pages.flatMap(rows).filter((j) => j.tenantId === tenantId && (j.state === "READY" || (j.state === "RETRY" && j.retryAt <= now) || (j.state === "PROCESSING" && j.leaseUntil <= now))).slice(0, pageSize) as WriterJob[];
}
async function claim(job: WriterJob, owner: string): Promise<WriterJob | null> {
  return runTransaction(db, async (tx) => {
    const ref = jobRef(job.id); const snapshot = await tx.get(ref);
    if (!snapshot.exists()) return null;
    const current = snapshot.data(); const now = Date.now();
    if (current.tenantId !== job.tenantId || current.hash !== job.hash || current.state === "APPLIED" || current.state === "REVIEW" || (current.state === "PROCESSING" && current.leaseUntil > now) || (current.state === "RETRY" && current.retryAt > now)) return null;
    tx.update(ref, { state: "PROCESSING", queueScope: scope(job.tenantId, job.kind, "PROCESSING"), leaseOwner: owner, leaseUntil: now + 90_000, attempts: Number(current.attempts || 0) + 1 });
    return current as WriterJob;
  });
}
async function fail(job: WriterJob, owner: string, error: any) {
  const conflict = error instanceof WriterConflict;
  const state: JobState = conflict && !error.retryable ? "REVIEW" : "RETRY";
  const issue = { code: conflict ? error.code : "FALHA_TRANSITORIA", message: String(error?.message || "Falha no processamento").slice(0, 1600) };
  await runTransaction(db, async (tx) => {
    const ref = jobRef(job.id); const snapshot = await tx.get(ref);
    if (!snapshot.exists() || snapshot.data().tenantId !== job.tenantId || snapshot.data().hash !== job.hash || snapshot.data().leaseOwner !== owner) return;
    tx.update(ref, { state, queueScope: scope(job.tenantId, job.kind, state), issues: [issue], retryAt: Date.now() + 180_000, leaseUntil: 0, leaseOwner: "", processedAt: Date.now() });
  });
  return { id: job.id, kind: job.kind, codigo: job.externalKey, state, issues: [issue] };
}
function updateCatalog(catalog: WriterCatalog, plan: WriterPlan) {
  for (const mutation of plan.mutations) {
    const list = mutation.collection === "customers" ? catalog.customers : mutation.collection === "items" ? catalog.items : undefined;
    if (!list) continue;
    const index = list.findIndex((row) => text(row.docId || row.id) === mutation.docId);
    const next: WriterCatalogEntry = { ...(index >= 0 ? list[index] : {}), ...mutation.patch, id: mutation.patch.id ?? list[index]?.id ?? mutation.docId, docId: mutation.docId };
    if (index >= 0) list[index] = next; else list.push(next);
  }
}
async function applyPlan(job: WriterJob, owner: string, plan: WriterPlan) {
  const auditRef = doc(db, "teksystemWriterAudits", `${job.id}-${job.hash}`);
  const ref = jobRef(job.id);
  return runTransaction(db, async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists() || snapshot.data().tenantId !== job.tenantId || snapshot.data().hash !== job.hash || snapshot.data().state !== "PROCESSING" || snapshot.data().leaseOwner !== owner) throw new WriterConflict("REVISAO_ALTERADA", "A fonte foi atualizada durante o processamento.", true);
    const targets = await Promise.all(plan.mutations.map((m) => tx.get(doc(db, m.collection, m.docId))));
    // Guard even unchanged parent lines: no new lines are committed if an
    // existing line was removed or changed after planning the complement.
    const guards = await Promise.all((plan.orderGuards || []).map((o) => tx.get(doc(db, "orders", text(o.docId || o.id)))));
    guards.forEach((snapshot, index) => {
      const previous = plan.orderGuards![index];
      const current = snapshot.exists() ? snapshot.data() : null;
      const keys = ["id", "tenantId", "itemId", "customerId", "totalQuantity", "color", "size", "teksystemLineId", "fiscalType", "status"];
      if (!current || keys.some((key) => signature(current[key] ?? null) !== signature(previous[key] ?? null))) throw new WriterConflict("CADASTRO_ALTERADO", "Item existente mudou durante a complementação; será reavaliado.", true);
    });
    const changes: WriterRow[] = [];
    plan.mutations.forEach((mutation, index) => {
      const target = targets[index]; const current = target.exists() ? target.data() : null;
      if (current && current.tenantId !== job.tenantId) throw new WriterConflict("CADASTRO_ID_OCUPADO", "O identificador está reservado e precisa de revisão de cadastro.");
      if (mutation.patch.tenantId && mutation.patch.tenantId !== job.tenantId) throw new WriterConflict("TENANT_INVALIDO", "Atribuição de empresa inválida.");
      if (mutation.collection !== "logs") {
        if (!mutation.before && current) throw new WriterConflict("CADASTRO_ALTERADO", "Cadastro criado por outra operação; será verificado novamente.", true);
        if (mutation.before && !current) throw new WriterConflict("CADASTRO_REMOVIDO", "Cadastro removido por outra operação; será verificado novamente.", true);
        const checkKeys = [...new Set([
          ...Object.keys(mutation.patch), "id", "tenantId",
          ...(mutation.collection === "orders" ? ["totalQuantity", "invoicedQuantity", "itemId", "status", "customerId", "packedQuantity", "producedQuantity", "paintedQuantity", "cutQuantity"] : []),
          ...(mutation.collection === "cargas" ? ["status", "separatedQuantities", "orderIds"] : []),
        ])];
        if (current && mutation.before && checkKeys.some((key) => signature(current[key] ?? null) !== signature(mutation.before![key] ?? null))) throw new WriterConflict("CADASTRO_ALTERADO", "O registro mudou durante o processamento; será verificado novamente.", true);
      }
      const before = Object.fromEntries(Object.keys(mutation.patch).map((key) => [key, current?.[key] ?? null]));
      changes.push({ collection: mutation.collection, docId: mutation.docId, before, after: mutation.patch });
    });
    plan.mutations.forEach((m) => tx.set(doc(db, m.collection, m.docId), m.patch, { merge: true }));
    tx.set(auditRef, { tenantId: job.tenantId, kind: job.kind, externalKey: job.externalKey, syncId: job.syncId,
      hash: job.hash, action: plan.action, details: plan.details, changes, timestamp: Date.now() });
    tx.update(ref, { state: "APPLIED", queueScope: scope(job.tenantId, job.kind, "APPLIED"),
      leaseUntil: 0, leaseOwner: "", issues: [], processedAt: Date.now(), result: { action: plan.action, ...plan.details } });
    return { id: job.id, kind: job.kind, codigo: job.externalKey, state: "APPLIED", action: plan.action, ...plan.details };
  });
}

export async function previewWriterPayload(payload: NormalizedTekSystemSyncPayload) {
  assertTenant(payload.tenantId);
  const jobs = buildWriterJobs(payload);
  const catalog = await loadCatalog(payload.tenantId);
  const orderRepository = new ScopedOrderRepository();
  const ordersByCode = new Map<string, WriterRow[]>();
  const results: WriterRow[] = [];
  for (const job of jobs) {
    try {
      let orders: WriterRow[] = [];
      if (job.kind === "pedidos" || job.kind === "romaneios") {
        if (!ordersByCode.has(job.externalKey)) ordersByCode.set(job.externalKey, await loadOrders(job.tenantId, job.externalKey));
        orders = ordersByCode.get(job.externalKey)!;
      }
      const plan = planWriterJob(job, catalog, orders);
      await attachCargaMutations(job, plan);
      updateCatalog(catalog, plan);
      if (plan.createOrder) {
        const cargaPreview = await orderRepository.previewCargaForOrder(plan.createOrder);
        if (cargaPreview.cargaAssociada) {
          plan.details.cargaAssociada = cargaPreview.cargaAssociada;
          plan.details.cargaCriada = cargaPreview.cargaCriada;
        }
        if (cargaPreview.cargaAviso) {
          plan.details.avisos = [...(Array.isArray(plan.details.avisos) ? plan.details.avisos : []), cargaPreview.cargaAviso];
        }
        orders = plan.createOrder.prepared.lines.map((_, index) => buildImportedOrderDocument(plan.createOrder!, index,
          stableNumericId(job.tenantId, "preview-pedido", `${job.externalKey}:${index}`), plan.createOrder!.prepared.paymentCondition, "cadastro"));
        ordersByCode.set(job.externalKey, orders);
      } else if (orders.length) {
        for (const m of plan.mutations.filter((m) => m.collection === "orders")) {
          const order = orders.find((o) => text(o.docId || o.id) === m.docId);
          if (order) Object.assign(order, m.patch);
          else if (!m.before) orders.push({ ...m.patch, docId: m.docId });
        }
      }
      results.push({ kind: job.kind, codigo: job.externalKey, action: plan.action, ...plan.details,
        changes: plan.mutations.map((m) => ({ collection: m.collection, docId: m.docId, after: m.patch })) });
    } catch (error: any) {
      results.push({ kind: job.kind, codigo: job.externalKey, state: error.retryable ? "RETRY" : "REVIEW", issues: [{ code: error.code || "FALHA", message: error.message }] });
    }
  }
  return { dryRun: true, jobs: jobs.length, results };
}

export async function processWriterQueue(tenantId: string, requestedLimit = 80) {
  assertTenant(tenantId);
  const pageSize = Math.max(1, Math.min(100, Math.floor(requestedLimit)));
  const owner = crypto.randomUUID();
  const leaseRef = doc(db, "teksystemWriterLeases", signature(tenantId));
  const acquired = await runTransaction(db, async (tx) => {
    const snap = await tx.get(leaseRef);
    if (snap.exists() && snap.data().tenantId !== tenantId) throw new WriterConflict("TENANT_INVALIDO", "Reserva inválida.");
    if (snap.exists() && snap.data().until > Date.now()) return false;
    tx.set(leaseRef, { tenantId, owner, until: Date.now() + 90_000 }); return true;
  });
  if (!acquired) return { busy: true, hasMore: true, results: [] };
  const results: WriterRow[] = [];
  const deadline = Date.now() + 35_000;
  try {
    let jobs: WriterJob[] = [];
    let kind: WriterKind | undefined;
    for (const candidateKind of WRITER_KINDS) {
      jobs = await candidates(tenantId, candidateKind, candidateKind === "pedidos" || candidateKind === "romaneios" ? Math.min(pageSize, 20) : pageSize);
      if (jobs.length) { kind = candidateKind; break; }
    }
    if (!kind) return { busy: false, hasMore: false, results: [], status: await writerStatus(tenantId) };
    const catalog = await loadCatalog(tenantId, kind);
    const repository = new ScopedOrderRepository();
    const processOne = async (candidate: WriterJob) => {
      if (Date.now() >= deadline) return;
      const job = await claim(candidate, owner);
      if (!job) return;
      try {
        const orders = job.kind === "pedidos" || job.kind === "romaneios" ? await loadOrders(tenantId, job.externalKey) : [];
        if (job.kind === "romaneios" && !orders.length) {
          const parent = await getDoc(jobRef(syncRecordKey(tenantId, "pedidos", job.externalKey)));
          if (parent.exists() && parent.data().tenantId === tenantId && parent.data().state === "REVIEW") throw new WriterConflict("PEDIDO_REQUER_REVISAO", "O lançamento do pedido precisa de revisão antes do faturamento.");
        }
        const plan = planWriterJob(job, catalog, orders);
        await attachCargaMutations(job, plan);
        if (plan.createOrder) {
          const result = await repository.createOrderAtomically(plan.createOrder);
          plan.details.orderIds = result.created ? result.orderIds : result.existingOrderIds || [];
          if (!result.created) throw new WriterConflict("PEDIDO_CRIADO_CONCORRENTEMENTE", "Pedido foi criado simultaneamente e será conferido no próximo processamento.", true);
          plan.details.cargaAssociada = result.cargaAssociada || null;
          plan.details.cargaCriada = Boolean(result.cargaCriada);
          if (result.cargaAviso) {
            plan.details.avisos = [...(Array.isArray(plan.details.avisos) ? plan.details.avisos : []), result.cargaAviso];
          }
        }
        results.push(await applyPlan(job, owner, plan));
        updateCatalog(catalog, plan);
      } catch (error) { results.push(await fail(job, owner, error)); }
    };
    const concurrency = kind === "clientes" || kind === "produtos" ? 8 : 1;
    for (let offset = 0; offset < jobs.length && Date.now() < deadline; offset += concurrency) {
      await Promise.all(jobs.slice(offset, offset + concurrency).map(processOne));
    }
    let hasMore = false;
    for (const candidateKind of WRITER_KINDS) if ((await candidates(tenantId, candidateKind, 1)).length) { hasMore = true; break; }
    return { busy: false, hasMore, kind, results };
  } finally {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(leaseRef);
      if (snap.exists() && snap.data().owner === owner && snap.data().tenantId === tenantId) tx.update(leaseRef, { until: 0, owner: "" });
    });
  }
}
