import crypto from "node:crypto";
import { collection, doc, getDocs, query, where, writeBatch } from "./adminFirestore.js";
import { teksystemDb } from "./teksystemSyncFirestore.js";
import { enqueueTekSystemOrderItemLifecycleJobs, enqueueTekSystemOrderLifecycleJobs } from "./teksystemWriterFirestore.js";
import { orderLineIdsHash, orderLineTargetsHash, type OrderLineTarget } from "./teksystemOrderPresenceHash.js";
import { syncRecordKey } from "./teksystemSync.js";

export interface OrderPresenceRow {
  empresa: number;
  codigoPedido: string;
  lifecycle?: "CANCELADO" | "CANCELAMENTO_PARCIAL";
  lineHash?: string;
  lineIds?: string[];
}
export interface OrderLineCancellationTarget { companyId: number; orderCode: string; lineId: string }
export interface OrderPresenceCandidate {
  id: string;
  orderCode: string;
  missingCount: number;
  lastMissingSyncId?: string;
  [key: string]: unknown;
}

function orderSourceCode(order: Record<string, any>): string {
  const explicit = String(order.teksystemOrderId || "").trim();
  if (explicit) return explicit;
  return String(order.teksystemLineId || "").match(/^pedido:([^:]+):/)?.[1] || "";
}

function linkedTekSystemOrder(order: Record<string, any>): boolean {
  return Boolean(orderSourceCode(order)) &&
    (String(order.importOrigin || "").toUpperCase() === "TEKSYSTEM" || Boolean(order.teksystemLineId));
}

function lineIdFromOrder(order: Record<string, any>): string {
  return String(order.teksystemLineId || "").match(/^pedido:[^:]+:(.+)$/)?.[1]?.trim() || "";
}

function lineTargetKey(companyId: number, orderCode: string): string { return `${companyId}:${orderCode}`; }

export function orderPresenceTargetCodes(importedOrders: Record<string, any>[], candidates: OrderPresenceCandidate[]): string[] {
  return [...new Set([
    ...importedOrders.filter(linkedTekSystemOrder).map(orderSourceCode),
    ...candidates.filter((candidate) => Number(candidate.missingCount) > 0).map((candidate) => String(candidate.orderCode || "").trim()),
  ].filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function orderPresenceTargetHash(codes: string[]): string {
  return crypto.createHash("sha256").update(JSON.stringify([...codes].sort((a, b) => a.localeCompare(b)))).digest("hex");
}

export function orderPresenceLineTargets(importedOrders: Record<string, any>[]): OrderLineTarget[] {
  const byOrder = new Map<string, { companyId: number; orderCode: string; lineIds: Set<string> }>();
  for (const order of importedOrders) {
    if (!linkedTekSystemOrder(order) || order.status === "CANCELADO") continue;
    const companyId = Number(order.teksystemCompanyId);
    const orderCode = orderSourceCode(order);
    const lineId = lineIdFromOrder(order);
    if (![0, 1].includes(companyId) || !orderCode || !lineId) continue;
    const key = lineTargetKey(companyId, orderCode);
    const target = byOrder.get(key) || { companyId, orderCode, lineIds: new Set<string>() };
    target.lineIds.add(lineId);
    byOrder.set(key, target);
  }
  return [...byOrder.values()]
    .map(({ companyId, orderCode, lineIds }) => ({ companyId, orderCode, lineHash: orderLineIdsHash([...lineIds]) }))
    .sort((a, b) => a.companyId - b.companyId || (a.orderCode < b.orderCode ? -1 : a.orderCode > b.orderCode ? 1 : 0));
}

export function orderPresenceLineTargetsHash(targets: OrderLineTarget[]): string {
  return orderLineTargetsHash(targets);
}

export function planOrderLineCancellations(importedOrders: Record<string, any>[], sourceOrders: OrderPresenceRow[]): OrderLineCancellationTarget[] {
  const sourceByOrder = new Map(sourceOrders.map((row) => [lineTargetKey(Number(row.empresa), String(row.codigoPedido).trim()), row]));
  const cancelled: OrderLineCancellationTarget[] = [];
  for (const order of importedOrders) {
    if (!linkedTekSystemOrder(order) || order.status === "CANCELADO") continue;
    const companyId = Number(order.teksystemCompanyId);
    const orderCode = orderSourceCode(order);
    const lineId = lineIdFromOrder(order);
    if (![0, 1].includes(companyId) || !orderCode || !lineId) continue;
    const source = sourceByOrder.get(lineTargetKey(companyId, orderCode));
    if (!source || source.lifecycle === "CANCELADO" || !Array.isArray(source.lineIds)) continue;
    if (!source.lineIds.includes(lineId)) cancelled.push({ companyId, orderCode, lineId });
  }
  return [...new Map(cancelled.map((target) => [`${target.companyId}:${target.orderCode}:${target.lineId}`, target])).values()]
    .sort((a, b) => a.companyId - b.companyId || a.orderCode.localeCompare(b.orderCode) || a.lineId.localeCompare(b.lineId));
}

async function loadPresenceSource(tenantId: string) {
  const [orderSnapshot, candidateSnapshot] = await Promise.all([
    getDocs(query(collection(teksystemDb, "orders"), where("tenantId", "==", tenantId))),
    getDocs(query(collection(teksystemDb, "teksystemOrderPresence"), where("tenantId", "==", tenantId))),
  ]);
  const importedOrders: Record<string, any>[] = orderSnapshot.docs.map((entry) => ({ ...entry.data(), id: entry.data().id ?? (Number(entry.id) || entry.id), docId: entry.id }));
  const candidates = candidateSnapshot.docs.map((entry) => ({ ...entry.data(), id: entry.id })) as OrderPresenceCandidate[];
  return { importedOrders, candidates };
}

export async function getTekSystemOrderPresenceTargets(tenantId: string) {
  if (tenantId !== (process.env.TEKSYSTEM_ALLOWED_TENANT_ID || "imperio")) throw new Error("TENANT_INVALIDO");
  const { importedOrders, candidates } = await loadPresenceSource(tenantId);
  const codes = orderPresenceTargetCodes(importedOrders, candidates);
  if (codes.length > 25_000) throw new Error("SNAPSHOT_ALVO_MUITO_GRANDE");
  const lineTargets = orderPresenceLineTargets(importedOrders);
  if (lineTargets.length > 50_000) throw new Error("SNAPSHOT_LINHAS_ALVO_MUITO_GRANDE");
  return { complete: true, companyIds: [0, 1], targetCodes: codes, targetHash: orderPresenceTargetHash(codes),
    lineTargets, lineTargetHash: orderPresenceLineTargetsHash(lineTargets) };
}

export function planOrderPresenceReconciliation(
  tenantId: string, importedOrders: Record<string, any>[], candidates: OrderPresenceCandidate[],
  sourceOrders: OrderPresenceRow[], snapshotId: string, generatedAt: string,
) {
  const presentCodes = new Set(sourceOrders.map((row) => String(row.codigoPedido || "").trim()).filter(Boolean));
  const lifecycleByCode = new Map<string, Set<string>>();
  sourceOrders.forEach((row) => {
    const code = row.codigoPedido.trim();
    lifecycleByCode.set(code, new Set([...(lifecycleByCode.get(code) || []), row.lifecycle || "ATIVO"]));
  });
  const cancelledOrderCodes: string[] = [];
  const partialCancellationCodes: string[] = [];
  const inconsistentLifecycleCodes: string[] = [];
  lifecycleByCode.forEach((states, code) => {
    if (states.size > 1 && [...states].some((state) => state !== "ATIVO")) inconsistentLifecycleCodes.push(code);
    else if (states.size === 1 && states.has("CANCELADO")) cancelledOrderCodes.push(code);
    else if (states.size === 1 && states.has("CANCELAMENTO_PARCIAL")) partialCancellationCodes.push(code);
  });
  const linkedOrders = importedOrders.filter(linkedTekSystemOrder);
  const ordersByCode = new Map<string, Record<string, any>[]>();
  linkedOrders.forEach((order) => {
    const code = orderSourceCode(order);
    ordersByCode.set(code, [...(ordersByCode.get(code) || []), order]);
  });
  const candidateByCode = new Map(candidates.map((candidate) => [candidate.orderCode, candidate]));
  const cancelledItemLines = planOrderLineCancellations(importedOrders, sourceOrders);
  const reviewOnlyPartialCancellationCodes = partialCancellationCodes.filter((code) => {
    const partialRows = sourceOrders.filter((row) => row.codigoPedido.trim() === code && row.lifecycle === "CANCELAMENTO_PARCIAL");
    return partialRows.some((row) => !cancelledItemLines.some((target) =>
      target.companyId === Number(row.empresa) && target.orderCode === code,
    ));
  });
  const reset: Array<{ id: string; data: Record<string, unknown> }> = [];
  const updates: Array<{ id: string; data: Record<string, unknown> }> = [];
  const deletedOrderCodes: string[] = [];

  for (const candidate of candidates) {
    if (candidate.missingCount > 0 && presentCodes.has(candidate.orderCode)) {
      reset.push({ id: candidate.id, data: { missingCount: 0, state: "PRESENT", lastSeenSyncId: snapshotId, lastSeenAt: generatedAt, updatedAt: generatedAt } });
    }
  }
  for (const [code, orders] of ordersByCode) {
    if (presentCodes.has(code) || orders.every((order) => order.status === "CANCELADO")) continue;
    const previous = candidateByCode.get(code);
    const alreadyObserved = previous?.lastMissingSyncId === snapshotId;
    const count = alreadyObserved ? Number(previous?.missingCount || 1) : Math.min(2, Number(previous?.missingCount || 0) + 1);
    const candidateId = previous?.id || syncRecordKey(tenantId, "pedidos", `presence:${code}`);
    const data = {
      tenantId, orderCode: code, missingCount: count, state: count >= 2 ? "CONFIRMED_MISSING" : "FIRST_MISS",
      firstMissingAt: previous?.firstMissingAt || generatedAt, lastMissingAt: generatedAt,
      lastMissingSyncId: snapshotId, linkedOrderIds: orders.map((order) => order.id), updatedAt: generatedAt,
    };
    updates.push({ id: candidateId, data });
    if (count >= 2) deletedOrderCodes.push(code);
  }
  return { presentOrderCodes: presentCodes.size, linkedOrderCodes: ordersByCode.size, firstMisses: updates.filter((row) => row.data.missingCount === 1).length,
    confirmedMissing: deletedOrderCodes.length, deletedOrderCodes, cancelledOrderCodes,
    partialCancellationCodes: reviewOnlyPartialCancellationCodes, inconsistentLifecycleCodes, cancelledItemLines, updates, reset };
}

export async function reconcileTekSystemOrderPresence(args: {
  tenantId: string; snapshotId: string; generatedAt: string; companyIds: number[];
  sourceOrders: OrderPresenceRow[]; checkedOrderCodes: string[]; targetHash: string; lineTargetHash?: string; dryRun?: boolean;
}) {
  const { tenantId, snapshotId, generatedAt, sourceOrders } = args;
  const companySet = [...new Set(args.companyIds.map(Number))].sort((a, b) => a - b);
  if (tenantId !== (process.env.TEKSYSTEM_ALLOWED_TENANT_ID || "imperio")) throw new Error("TENANT_INVALIDO");
  if (companySet.length !== 2 || companySet[0] !== 0 || companySet[1] !== 1) throw new Error("ESCOPO_EMPRESA_INVALIDO");
  if (!snapshotId.trim() || !Number.isFinite(Date.parse(generatedAt))) throw new Error("SNAPSHOT_INVALIDO");
  const { importedOrders, candidates } = await loadPresenceSource(tenantId);
  const expectedLineTargets = orderPresenceLineTargets(importedOrders);
  const expectedLineTargetHash = orderPresenceLineTargetsHash(expectedLineTargets);
  if (args.lineTargetHash !== undefined && args.lineTargetHash !== expectedLineTargetHash) {
    return { ...planOrderPresenceReconciliation(tenantId, importedOrders, candidates, sourceOrders, snapshotId, generatedAt),
      blocked: true, reason: "A lista de linhas vinculadas mudou durante a extração; nenhuma reconciliação foi enfileirada.",
      dryRun: Boolean(args.dryRun), queued: 0, queuedItemCancellations: 0, stateWrites: 0 };
  }
  const plan = planOrderPresenceReconciliation(tenantId, importedOrders, candidates, sourceOrders, snapshotId, generatedAt);
  const expectedCodes = orderPresenceTargetCodes(importedOrders, candidates);
  const checkedCodes = [...new Set(args.checkedOrderCodes.map((code) => String(code).trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  if (expectedCodes.length > 25_000 || JSON.stringify(expectedCodes) !== JSON.stringify(checkedCodes) ||
    orderPresenceTargetHash(checkedCodes) !== args.targetHash) {
    return { ...plan, blocked: true, reason: "A lista de pedidos vinculados mudou durante a extração; nenhuma exclusão foi enfileirada.", dryRun: Boolean(args.dryRun), queued: 0, queuedItemCancellations: 0, stateWrites: 0 };
  }
  if (args.lineTargetHash !== undefined) {
    const targetsByOrder = new Map(expectedLineTargets.map((target) => [lineTargetKey(target.companyId, target.orderCode), target]));
    const sourceByOrder = new Map(sourceOrders.map((row) => [lineTargetKey(Number(row.empresa), String(row.codigoPedido).trim()), row]));
    for (const [key, target] of targetsByOrder) {
      const source = sourceByOrder.get(key);
      if (!source) continue;
      if (!/^[a-f0-9]{64}$/.test(source.lineHash || "")) {
        return { ...plan, blocked: true, reason: "O snapshot não confirmou o hash das linhas de um pedido presente; nenhuma reconciliação foi enfileirada.", dryRun: Boolean(args.dryRun), queued: 0, queuedItemCancellations: 0, stateWrites: 0 };
      }
      if (source.lineHash !== target.lineHash && !Array.isArray(source.lineIds)) {
        return { ...plan, blocked: true, reason: "O snapshot divergiu das linhas esperadas sem enviar os identificadores; nenhuma reconciliação foi enfileirada.", dryRun: Boolean(args.dryRun), queued: 0, queuedItemCancellations: 0, stateWrites: 0 };
      }
      if (source.lineIds && orderLineIdsHash(source.lineIds) !== source.lineHash) {
        return { ...plan, blocked: true, reason: "Os identificadores de linha não correspondem ao hash do snapshot; nenhuma reconciliação foi enfileirada.", dryRun: Boolean(args.dryRun), queued: 0, queuedItemCancellations: 0, stateWrites: 0 };
      }
    }
  }
  const linkedActive = importedOrders.filter((order) => order.status !== "CANCELADO" && linkedTekSystemOrder(order));
  const massDeletionThreshold = Math.max(3, Math.ceil(plan.linkedOrderCodes * 0.2));
  if (linkedActive.length > 0 && sourceOrders.length === 0) {
    return { ...plan, blocked: true, reason: "Snapshot completo veio vazio, mas há pedidos Tek-System ativos no ApontaPRO.", dryRun: Boolean(args.dryRun), queued: 0, queuedItemCancellations: 0, stateWrites: 0 };
  }
  if (plan.confirmedMissing >= massDeletionThreshold && plan.confirmedMissing > 0) {
    return { ...plan, blocked: true, reason: "Muitos pedidos desapareceram no mesmo snapshot; o cancelamento automático foi suspenso para revisão.", dryRun: Boolean(args.dryRun), queued: 0, queuedItemCancellations: 0, stateWrites: 0 };
  }
  if (args.dryRun) return { ...plan, blocked: false, reason: undefined, dryRun: true, queued: 0, queuedItemCancellations: 0, stateWrites: 0 };

  const [deletedQueue, cancelledQueue, partialQueue, inconsistentQueue, itemCancellationQueue] = await Promise.all([
    enqueueTekSystemOrderLifecycleJobs(tenantId, plan.deletedOrderCodes, "EXCLUIDO_NO_TEKSYSTEM", snapshotId, generatedAt),
    enqueueTekSystemOrderLifecycleJobs(tenantId, plan.cancelledOrderCodes, "CANCELADO", snapshotId, generatedAt),
    enqueueTekSystemOrderLifecycleJobs(tenantId, plan.partialCancellationCodes, "CANCELAMENTO_PARCIAL", snapshotId, generatedAt),
    enqueueTekSystemOrderLifecycleJobs(tenantId, plan.inconsistentLifecycleCodes, "STATUS_INCONSISTENTE", snapshotId, generatedAt),
    enqueueTekSystemOrderItemLifecycleJobs(tenantId, plan.cancelledItemLines, snapshotId, generatedAt),
  ]);
  const writes = [...plan.reset, ...plan.updates];
  for (let offset = 0; offset < writes.length; offset += 400) {
    const batch = writeBatch(teksystemDb);
    writes.slice(offset, offset + 400).forEach((entry) => batch.set(doc(teksystemDb, "teksystemOrderPresence", entry.id), entry.data, { merge: true }));
    await batch.commit();
  }
  return { ...plan, blocked: false, reason: undefined, dryRun: false,
    queued: deletedQueue.enqueued + cancelledQueue.enqueued + partialQueue.enqueued + inconsistentQueue.enqueued + itemCancellationQueue.enqueued,
    queuedItemCancellations: itemCancellationQueue.enqueued, stateWrites: writes.length };
}
