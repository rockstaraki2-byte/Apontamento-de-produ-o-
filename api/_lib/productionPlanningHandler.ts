import { createHash, randomUUID } from "node:crypto";
import {
  PRODUCTION_PLANNING_ENABLED_TENANTS,
  PRODUCTION_PLANNING_EXECUTE_ROLES,
  PRODUCTION_PLANNING_MANAGE_ROLES,
  PRODUCTION_PLANNING_MODELS,
  PRODUCTION_PLANNING_READ_ROLES,
  aggregateProductionPlanNeeds,
  requiredQuantityForComponent,
  roundPlanningQuantity,
  type ProductionPlan,
  type ProductionPlanBomSnapshot,
  type ProductionPlanComponentSnapshot,
  type ProductionPlanReservation,
  type ProductionPlanningBom,
  type ProductionPlanningComponent,
  type ProductionPlanningStatus,
} from "../../src/productionPlanning.js";
import {
  getFirebaseAdmin,
  requireSession,
  sendMethodNotAllowed,
} from "./firebaseAdmin.js";

const MAX_SNAPSHOT_COMPONENT_ROWS = 300;
const MAX_PLAN_STOCK_ENTRIES = 150;
const MODEL_BY_KEY = new Map<string, (typeof PRODUCTION_PLANNING_MODELS)[number]>();
for (const model of PRODUCTION_PLANNING_MODELS) MODEL_BY_KEY.set(model.key, model);
const PLAN_STATUSES = new Set<ProductionPlanningStatus>([
  "draft",
  "planned",
  "in_production",
  "completed",
  "cancelled",
]);

class PlanningError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "PlanningError";
    this.status = status;
    this.details = details;
  }
}

function requireTenantRole(claims: Record<string, any>, allowedRoles: readonly string[]) {
  const tenantId = String(claims.tenantId || "");
  const role = String(claims.role || "");
  if (
    !PRODUCTION_PLANNING_ENABLED_TENANTS.includes(
      tenantId as (typeof PRODUCTION_PLANNING_ENABLED_TENANTS)[number],
    ) ||
    !tenantId ||
    tenantId === "global" ||
    !allowedRoles.includes(role)
  ) {
    throw new PlanningError("FORBIDDEN", 403);
  }
  return { tenantId, role, uid: String(claims.uid || "") };
}

function getBody(req: any): Record<string, any> {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      const parsed = JSON.parse(req.body);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function getBomDocumentId(tenantId: string, modelKey: string): string {
  return tenantId + "__" + modelKey;
}

function getReservationDocumentId(tenantId: string, planId: string, stockEntryId: string): string {
  const suffix = createHash("sha256").update(stockEntryId).digest("hex").slice(0, 32);
  return tenantId + "__" + planId + "__" + suffix;
}

function getMovementDocumentId(tenantId: string, planId: string, stockEntryId: string): string {
  const suffix = createHash("sha256").update(stockEntryId).digest("hex").slice(0, 32);
  return "production_planning_" + tenantId + "_" + planId + "_" + suffix;
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function normalizePlanLines(rawLines: unknown, reusableLineIds = new Set<string>()) {
  if (!Array.isArray(rawLines) || rawLines.length === 0 || rawLines.length > 30) {
    throw new PlanningError("INVALID_PLAN_LINES");
  }
  const usedLineIds = new Set<string>();
  return rawLines.map((rawLine: any) => {
    const modelKey = String(rawLine?.modelKey || "");
    const model = MODEL_BY_KEY.get(modelKey);
    const quantity = Number(rawLine?.quantity);
    const variantName = String(rawLine?.variantName || "").trim();
    const requestedLineId = String(rawLine?.lineId || "");
    const lineId =
      reusableLineIds.has(requestedLineId) && !usedLineIds.has(requestedLineId)
        ? requestedLineId
        : randomUUID();
    if (
      !model ||
      !Number.isSafeInteger(quantity) ||
      quantity <= 0 ||
      quantity > 100000 ||
      variantName.length > 100
    ) {
      throw new PlanningError("INVALID_PLAN_LINE");
    }
    usedLineIds.add(lineId);
    return {
      lineId,
      modelKey,
      productName: model.name,
      variantName,
      quantity,
    };
  });
}

function normalizeBomComponent(raw: any, index: number): ProductionPlanningComponent {
  const name = String(raw?.name || "").trim();
  const material = String(raw?.material || "").trim();
  const unit = String(raw?.unit || "").trim();
  const quantityPerUnit = Number(raw?.quantityPerUnit);
  const lossPercent = Number(raw?.lossPercent ?? 0);
  const active = raw?.active === true;
  const stockEntryId = String(raw?.stockEntryId || "").trim() || null;
  const rawStockItemId = raw?.stockItemId;
  const stockItemId =
    rawStockItemId === null || rawStockItemId === undefined || rawStockItemId === ""
      ? null
      : Number(rawStockItemId);

  if (
    !name ||
    name.length > 120 ||
    material.length > 120 ||
    !unit ||
    unit.length > 24 ||
    !Number.isFinite(quantityPerUnit) ||
    quantityPerUnit < 0 ||
    quantityPerUnit > 100000 ||
    (active && quantityPerUnit <= 0) ||
    !Number.isFinite(lossPercent) ||
    lossPercent < 0 ||
    lossPercent > 100 ||
    (stockItemId !== null && (!Number.isSafeInteger(stockItemId) || stockItemId <= 0)) ||
    (stockEntryId !== null &&
      (stockItemId === null || stockEntryId.length > 180 || stockEntryId.includes("/")))
  ) {
    throw new PlanningError("INVALID_BOM_COMPONENT");
  }

  const row: ProductionPlanningComponent = {
    id: String(raw?.id || "").trim() || "component-" + String(index + 1) + "-" + randomUUID(),
    name,
    material,
    quantityPerUnit,
    unit,
    lossPercent,
    active,
    stockItemId,
    stockEntryId,
  };
  if (row.id.length > 120) throw new PlanningError("INVALID_BOM_COMPONENT");

  for (const field of ["widthMm", "lengthMm", "thicknessMm"] as const) {
    const value = raw?.[field];
    if (value === null || value === undefined || value === "") continue;
    const dimension = Number(value);
    if (!Number.isFinite(dimension) || dimension <= 0 || dimension > 100000) {
      throw new PlanningError("INVALID_BOM_COMPONENT");
    }
    row[field] = dimension;
  }
  return row;
}

function aggregateNeedsWithItems(snapshot: ProductionPlanBomSnapshot[]) {
  const needs = new Map<string, { quantity: number; itemId: number }>();
  for (const line of snapshot) {
    for (const row of line.components) {
      if (!row.active) continue;
      const quantity = requiredQuantityForComponent(line.quantity, row);
      if (quantity <= 0) continue;
      if (!row.stockEntryId || !row.stockItemId) {
        throw new PlanningError("STOCK_TO_REPORT", 409, {
          component: row.name,
          model: line.productName,
        });
      }
      const current = needs.get(row.stockEntryId);
      if (current && current.itemId !== row.stockItemId) {
        throw new PlanningError("STOCK_LINK_MISMATCH", 409);
      }
      needs.set(row.stockEntryId, {
        itemId: row.stockItemId,
        quantity: roundPlanningQuantity((current?.quantity || 0) + quantity),
      });
    }
  }
  return needs;
}

async function loadPlanningData(
  db: ReturnType<typeof getFirebaseAdmin>["db"],
  tenantId: string,
) {
  const [bomSnapshot, planSnapshot, reservationSnapshot, itemSnapshot, stockSnapshot] =
    await Promise.all([
      db.collection("productionPlanningBoms").where("tenantId", "==", tenantId).get(),
      db.collection("productionPlans").where("tenantId", "==", tenantId).get(),
      db.collection("productionPlanReservations").where("tenantId", "==", tenantId).get(),
      db.collection("items").where("tenantId", "==", tenantId).get(),
      db.collection("stocks").where("tenantId", "==", tenantId).get(),
    ]);

  const boms = bomSnapshot.docs
    .filter((entry) => entry.data().tenantId === tenantId)
    .map((entry) => ({ ...entry.data(), id: entry.data().modelKey || entry.id }) as ProductionPlanningBom);
  const plans = planSnapshot.docs
    .filter((entry) => entry.data().tenantId === tenantId)
    .map((entry) => ({ ...entry.data(), id: entry.id }) as ProductionPlan)
    .sort((a, b) => b.plannedDate.localeCompare(a.plannedDate) || b.createdAt - a.createdAt);
  const reservations = reservationSnapshot.docs
    .filter((entry) => entry.data().tenantId === tenantId)
    .map((entry) => ({ ...entry.data(), id: entry.id }) as ProductionPlanReservation);

  const itemsById = new Map<number, any>();
  for (const entry of itemSnapshot.docs) {
    const data = entry.data();
    const itemId = Number(data.id ?? entry.id);
    if (data.tenantId === tenantId && Number.isSafeInteger(itemId) && itemId > 0) {
      itemsById.set(itemId, { ...data, id: itemId });
    }
  }

  const stockItems = stockSnapshot.docs.flatMap((entry) => {
    const stock = entry.data();
    const itemId = Number(stock.itemId);
    const item = itemsById.get(itemId);
    if (
      stock.tenantId !== tenantId ||
      !item ||
      (stock.stage !== "INTERMEDIARIO" && stock.stage !== "ACABADO")
    ) return [];
    const quantity = Number(stock.quantity);
    const reservedQuantity = Number(stock.reservedQuantity);
    return [{
      stockEntryId: entry.id,
      itemId,
      itemCode: String(item.code || itemId),
      itemName: String(item.name || "Item " + itemId),
      itemUnit: String(item.unit || ""),
      color: String(stock.color || ""),
      size: String(stock.size || ""),
      variation: String(stock.variation || ""),
      stage: stock.stage,
      quantity: typeof stock.quantity === "number" && Number.isFinite(quantity) ? quantity : null,
      reservedQuantity: Number.isFinite(reservedQuantity) ? Math.max(0, reservedQuantity) : 0,
    }];
  }).sort((a, b) => a.itemCode.localeCompare(b.itemCode) || a.stockEntryId.localeCompare(b.stockEntryId));

  return { boms, plans, reservations, stockItems, models: PRODUCTION_PLANNING_MODELS };
}

async function saveBom(
  db: ReturnType<typeof getFirebaseAdmin>["db"],
  tenantId: string,
  uid: string,
  rawBom: any,
) {
  const modelKey = String(rawBom?.modelKey || "");
  const model = MODEL_BY_KEY.get(modelKey);
  if (!model) throw new PlanningError("INVALID_MODEL");
  if (!Array.isArray(rawBom?.components) || rawBom.components.length === 0 || rawBom.components.length > 100) {
    throw new PlanningError("INVALID_BOM_COMPONENTS");
  }
  const components = rawBom.components.map(normalizeBomComponent);
  if (new Set(components.map((row) => row.id)).size !== components.length) {
    throw new PlanningError("DUPLICATE_BOM_COMPONENT");
  }
  const stockIds = [...new Set(components.flatMap((row) => row.stockEntryId ? [row.stockEntryId] : []))];
  const stockRefs = new Map<string, any>();
  for (const id of stockIds) stockRefs.set(id, db.collection("stocks").doc(id));
  const itemRefs = new Map<number, any>();
  for (const id of new Set(components.flatMap((row) => row.stockItemId ? [row.stockItemId] : []))) {
    itemRefs.set(id, db.collection("items").doc(String(id)));
  }
  const bomRef = db.collection("productionPlanningBoms").doc(getBomDocumentId(tenantId, modelKey));
  const now = Date.now();

  return db.runTransaction(async (transaction) => {
    const currentBomSnapshot = await transaction.get(bomRef);
    const stockSnapshots = new Map<string, any>();
    for (const [id, ref] of stockRefs) stockSnapshots.set(id, await transaction.get(ref));
    const itemSnapshots = new Map<number, any>();
    for (const [id, ref] of itemRefs) itemSnapshots.set(id, await transaction.get(ref));

    const storedComponents = components.map((row) => {
      if (!row.stockEntryId) {
        return { ...row, stockItemId: null, stockItemCode: "", stockItemName: "" };
      }
      const stockSnapshot = stockSnapshots.get(row.stockEntryId);
      const stock = stockSnapshot?.exists ? stockSnapshot.data() : null;
      const itemSnapshot = row.stockItemId ? itemSnapshots.get(row.stockItemId) : null;
      const item = itemSnapshot?.exists ? itemSnapshot.data() : null;
      if (
        !stock ||
        stock.tenantId !== tenantId ||
        Number(stock.itemId) !== row.stockItemId ||
        !item ||
        item.tenantId !== tenantId
      ) {
        throw new PlanningError("STOCK_ITEM_NOT_FOUND", 409, { component: row.name });
      }
      return {
        ...row,
        stockItemCode: String(item.code || row.stockItemId),
        stockItemName: String(item.name || "Item " + row.stockItemId),
      };
    });
    const version = currentBomSnapshot.exists
      ? Math.max(0, Number(currentBomSnapshot.data()?.version) || 0) + 1
      : 1;
    const bom: ProductionPlanningBom = {
      id: modelKey,
      tenantId,
      modelKey,
      productName: model.name,
      version,
      components: storedComponents,
      updatedAt: now,
      updatedByUid: uid,
    };
    transaction.set(bomRef, bom);
    return bom;
  });
}

async function createPlan(
  db: ReturnType<typeof getFirebaseAdmin>["db"],
  tenantId: string,
  uid: string,
  body: Record<string, any>,
) {
  const plannedDate = body.plannedDate;
  if (!isValidDate(plannedDate)) throw new PlanningError("INVALID_PLANNED_DATE");
  const notes = String(body.notes || "").trim();
  if (notes.length > 2000) throw new PlanningError("INVALID_NOTES");
  const lines = normalizePlanLines(body.lines);
  const planRef = db.collection("productionPlans").doc();
  const now = Date.now();

  return db.runTransaction(async (transaction) => {
    const bomByKey = new Map<string, ProductionPlanningBom>();
    for (const modelKey of [...new Set(lines.map((line) => line.modelKey))]) {
      const bomRef = db.collection("productionPlanningBoms").doc(getBomDocumentId(tenantId, modelKey));
      const snapshot = await transaction.get(bomRef);
      const data = snapshot.exists ? snapshot.data() : null;
      if (!data || data.tenantId !== tenantId || data.modelKey !== modelKey) {
        throw new PlanningError("BOM_NOT_CONFIGURED", 409, { modelKey });
      }
      bomByKey.set(modelKey, data as ProductionPlanningBom);
    }

    const bomSnapshot: ProductionPlanBomSnapshot[] = lines.map((line) => {
      const bom = bomByKey.get(line.modelKey);
      if (!bom) throw new PlanningError("BOM_NOT_CONFIGURED", 409);
      return {
        lineId: line.lineId,
        modelKey: line.modelKey,
        productName: bom.productName,
        variantName: line.variantName,
        quantity: line.quantity,
        bomVersion: bom.version,
        components: (bom.components || []).map((row) => ({ ...row })),
      };
    });
    if (bomSnapshot.reduce((total, line) => total + line.components.length, 0) > MAX_SNAPSHOT_COMPONENT_ROWS) {
      throw new PlanningError("PLAN_TOO_LARGE", 400);
    }
    const plan: ProductionPlan = {
      id: planRef.id,
      tenantId,
      plannedDate,
      notes,
      status: "draft",
      lines,
      bomSnapshot,
      createdAt: now,
      updatedAt: now,
      createdByUid: uid,
    };
    transaction.create(planRef, plan);
    return plan;
  });
}

async function updateDraftPlan(
  db: ReturnType<typeof getFirebaseAdmin>["db"],
  tenantId: string,
  planId: string,
  body: Record<string, any>,
) {
  if (!planId || planId.length > 160 || planId.includes("/")) {
    throw new PlanningError("INVALID_PLAN_ID");
  }
  const plannedDate = body.plannedDate;
  if (!isValidDate(plannedDate)) throw new PlanningError("INVALID_PLANNED_DATE");
  const notes = String(body.notes || "").trim();
  if (notes.length > 2000) throw new PlanningError("INVALID_NOTES");
  if (!Array.isArray(body.lines) || body.lines.length === 0 || body.lines.length > 30) {
    throw new PlanningError("INVALID_PLAN_LINES");
  }
  const planRef = db.collection("productionPlans").doc(planId);

  return db.runTransaction(async (transaction) => {
    const planSnapshot = await transaction.get(planRef);
    const current = planSnapshot.exists ? planSnapshot.data() : null;
    if (!current || current.tenantId !== tenantId) throw new PlanningError("PLAN_NOT_FOUND", 404);
    if (current.status !== "draft") throw new PlanningError("ONLY_DRAFTS_CAN_BE_EDITED", 409);

    const reusableIds = new Set<string>((current.lines || []).map((line: any) => String(line.lineId || "")));
    const lines = normalizePlanLines(body.lines, reusableIds);
    const oldSnapshots = new Map<string, ProductionPlanBomSnapshot>();
    for (const line of current.bomSnapshot || []) oldSnapshots.set(line.lineId, line);
    const bomByKey = new Map<string, ProductionPlanningBom>();
    for (const line of lines) {
      const oldSnapshot = oldSnapshots.get(line.lineId);
      if (oldSnapshot?.modelKey === line.modelKey) continue;
      if (bomByKey.has(line.modelKey)) continue;
      const bomRef = db.collection("productionPlanningBoms").doc(getBomDocumentId(tenantId, line.modelKey));
      const bomSnapshot = await transaction.get(bomRef);
      const data = bomSnapshot.exists ? bomSnapshot.data() : null;
      if (!data || data.tenantId !== tenantId || data.modelKey !== line.modelKey) {
        throw new PlanningError("BOM_NOT_CONFIGURED", 409, { modelKey: line.modelKey });
      }
      bomByKey.set(line.modelKey, data as ProductionPlanningBom);
    }

    const bomSnapshot: ProductionPlanBomSnapshot[] = lines.map((line) => {
      const existing = oldSnapshots.get(line.lineId);
      if (existing?.modelKey === line.modelKey) {
        return {
          ...existing,
          productName: line.productName,
          variantName: line.variantName,
          quantity: line.quantity,
        };
      }
      const bom = bomByKey.get(line.modelKey);
      if (!bom) throw new PlanningError("BOM_NOT_CONFIGURED", 409);
      return {
        lineId: line.lineId,
        modelKey: line.modelKey,
        productName: bom.productName,
        variantName: line.variantName,
        quantity: line.quantity,
        bomVersion: bom.version,
        components: (bom.components || []).map((row) => ({ ...row })),
      };
    });
    if (bomSnapshot.reduce((total, line) => total + line.components.length, 0) > MAX_SNAPSHOT_COMPONENT_ROWS) {
      throw new PlanningError("PLAN_TOO_LARGE", 400);
    }
    const updated = {
      ...current,
      id: planId,
      plannedDate,
      notes,
      lines,
      bomSnapshot,
      updatedAt: Date.now(),
    };
    transaction.set(planRef, updated);
    return updated;
  });
}

async function changePlanStatus(
  db: ReturnType<typeof getFirebaseAdmin>["db"],
  tenantId: string,
  planId: string,
  nextStatus: ProductionPlanningStatus,
) {
  if (!planId || planId.length > 160 || planId.includes("/")) {
    throw new PlanningError("INVALID_PLAN_ID");
  }
  if (!PLAN_STATUSES.has(nextStatus)) throw new PlanningError("INVALID_STATUS");
  const planRef = db.collection("productionPlans").doc(planId);

  return db.runTransaction(async (transaction) => {
    const planSnapshot = await transaction.get(planRef);
    const current = planSnapshot.exists ? planSnapshot.data() : null;
    if (!current || current.tenantId !== tenantId) throw new PlanningError("PLAN_NOT_FOUND", 404);
    if (current.status === nextStatus) return { ...current, id: planId };
    if (current.status === "completed" || current.status === "cancelled") {
      throw new PlanningError("INVALID_STATUS_TRANSITION", 409);
    }
    const allowedNext: Record<string, string[]> = {
      draft: ["planned", "cancelled"],
      planned: ["in_production", "completed", "cancelled"],
      in_production: ["completed", "cancelled"],
    };
    if (!(allowedNext[current.status] || []).includes(nextStatus)) {
      throw new PlanningError("INVALID_STATUS_TRANSITION", 409);
    }

    const now = Date.now();
    const updated = { ...current, id: planId, status: nextStatus, updatedAt: now };
    if (nextStatus === "completed") {
      throw new PlanningError("COMPLETION_REQUIRES_INVENTORY_TRANSACTION", 409);
    }

    if (nextStatus === "planned") {
      const needs = aggregateProductionPlanNeeds(current.bomSnapshot || []);
      if (needs.size > MAX_PLAN_STOCK_ENTRIES) throw new PlanningError("PLAN_TOO_LARGE", 400);
      for (const [stockEntryId, quantity] of needs) {
        const matchingComponent = (current.bomSnapshot || [])
          .flatMap((line: ProductionPlanBomSnapshot) => line.components)
          .find((row: ProductionPlanComponentSnapshot) => row.stockEntryId === stockEntryId);
        if (!matchingComponent?.stockItemId) continue;
        const reservationId = getReservationDocumentId(tenantId, planId, stockEntryId);
        const reservationRef = db.collection("productionPlanReservations").doc(reservationId);
        const reservation: ProductionPlanReservation = {
          id: reservationId,
          tenantId,
          planId,
          stockEntryId,
          itemId: matchingComponent.stockItemId,
          quantity,
          active: true,
        };
        transaction.set(reservationRef, reservation);
      }
    } else if (nextStatus === "cancelled") {
      const needs = aggregateProductionPlanNeeds(current.bomSnapshot || []);
      for (const stockEntryId of needs.keys()) {
        const reservationId = getReservationDocumentId(tenantId, planId, stockEntryId);
        transaction.delete(
          db.collection("productionPlanReservations").doc(reservationId),
        );
      }
    }

    transaction.set(planRef, updated);
    return updated;
  });
}

async function completePlan(
  db: ReturnType<typeof getFirebaseAdmin>["db"],
  tenantId: string,
  planId: string,
) {
  if (!planId || planId.length > 160 || planId.includes("/")) {
    throw new PlanningError("INVALID_PLAN_ID");
  }
  const planRef = db.collection("productionPlans").doc(planId);

  return db.runTransaction(async (transaction) => {
    const planSnapshot = await transaction.get(planRef);
    const current = planSnapshot.exists ? planSnapshot.data() : null;
    if (!current || current.tenantId !== tenantId) throw new PlanningError("PLAN_NOT_FOUND", 404);
    if (current.status === "completed") {
      return { ...current, id: planId, alreadyCompleted: true };
    }
    if (current.status !== "planned" && current.status !== "in_production") {
      throw new PlanningError("INVALID_STATUS_TRANSITION", 409);
    }

    const needs = aggregateNeedsWithItems(current.bomSnapshot || []);
    if (needs.size > MAX_PLAN_STOCK_ENTRIES) throw new PlanningError("PLAN_TOO_LARGE", 400);
    const reservationsQuery = db
      .collection("productionPlanReservations")
      .where("tenantId", "==", tenantId);
    const reservationSnapshot = await transaction.get(reservationsQuery);
    const otherReserved = new Map<string, number>();
    const ownReservations: any[] = [];
    for (const entry of reservationSnapshot.docs) {
      const data = entry.data();
      if (data.tenantId !== tenantId || data.active !== true) continue;
      if (data.planId === planId) {
        ownReservations.push(entry);
        continue;
      }
      const stockEntryId = String(data.stockEntryId || "");
      if (!stockEntryId) continue;
      const amount = Number(data.quantity);
      if (Number.isFinite(amount) && amount > 0) {
        otherReserved.set(
          stockEntryId,
          roundPlanningQuantity((otherReserved.get(stockEntryId) || 0) + amount),
        );
      }
    }

    const stockRefs = new Map<string, any>();
    const movementRefs = new Map<string, any>();
    const itemRefs = new Map<number, any>();
    for (const stockEntryId of needs.keys()) {
      stockRefs.set(stockEntryId, db.collection("stocks").doc(stockEntryId));
      movementRefs.set(
        stockEntryId,
        db.collection("stock_movements").doc(getMovementDocumentId(tenantId, planId, stockEntryId)),
      );
    }
    for (const need of needs.values()) {
      itemRefs.set(need.itemId, db.collection("items").doc(String(need.itemId)));
    }
    const stockSnapshots = new Map<string, any>();
    const movementSnapshots = new Map<string, any>();
    const itemSnapshots = new Map<number, any>();
    for (const [stockEntryId, ref] of stockRefs) {
      stockSnapshots.set(stockEntryId, await transaction.get(ref));
    }
    for (const [stockEntryId, ref] of movementRefs) {
      movementSnapshots.set(stockEntryId, await transaction.get(ref));
    }
    for (const [itemId, ref] of itemRefs) {
      itemSnapshots.set(itemId, await transaction.get(ref));
    }

    const shortages: Array<Record<string, unknown>> = [];
    for (const [stockEntryId, need] of needs) {
      const stockSnapshot = stockSnapshots.get(stockEntryId);
      const stock = stockSnapshot?.exists ? stockSnapshot.data() : null;
      const itemSnapshot = itemSnapshots.get(need.itemId);
      const item = itemSnapshot?.exists ? itemSnapshot.data() : null;
      if (
        !stock ||
        stock.tenantId !== tenantId ||
        Number(stock.itemId) !== need.itemId ||
        !item ||
        item.tenantId !== tenantId ||
        Number(item.id ?? String(need.itemId)) !== need.itemId ||
        typeof stock.quantity !== "number" ||
        !Number.isFinite(stock.quantity)
      ) {
        throw new PlanningError("STOCK_TO_REPORT", 409, { stockEntryId });
      }
      const available =
        Number(stock.quantity) -
        Math.max(0, Number(stock.reservedQuantity) || 0) -
        (otherReserved.get(stockEntryId) || 0);
      if (need.quantity > available + 0.0001) {
        shortages.push({
          stockEntryId,
          required: need.quantity,
          available: roundPlanningQuantity(Math.max(0, available)),
          deficit: roundPlanningQuantity(need.quantity - Math.max(0, available)),
        });
      }
      if (movementSnapshots.get(stockEntryId)?.exists) {
        throw new PlanningError("STOCK_MOVEMENT_ALREADY_EXISTS", 409, { stockEntryId });
      }
    }
    if (shortages.length > 0) {
      throw new PlanningError("INSUFFICIENT_STOCK", 409, shortages);
    }

    const now = Date.now();
    for (const [stockEntryId, need] of needs) {
      const stockSnapshot = stockSnapshots.get(stockEntryId);
      const stock = stockSnapshot.data();
      const movementId = getMovementDocumentId(tenantId, planId, stockEntryId);
      const movement = {
        id: movementId,
        tenantId,
        itemId: need.itemId,
        color: String(stock.color || ""),
        size: String(stock.size || ""),
        variation: String(stock.variation || ""),
        quantity: need.quantity,
        type: "SAIDA",
        description: "Consumo do planejamento da produção — lote " + planId,
        timestamp: now,
        productionPlanId: planId,
        operatorName: "Planejamento da produção",
      };
      transaction.set(stockRefs.get(stockEntryId)!, {
        ...stock,
        id: stockEntryId,
        tenantId,
        quantity: roundPlanningQuantity(Number(stock.quantity) - need.quantity),
      });
      transaction.create(movementRefs.get(stockEntryId)!, movement);
    }
    for (const reservation of ownReservations) transaction.delete(reservation.ref);

    const completed = {
      ...current,
      id: planId,
      status: "completed",
      inventoryAppliedAt: now,
      updatedAt: now,
    };
    transaction.set(planRef, completed);
    return { ...completed, alreadyCompleted: false };
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET" && req.method !== "POST") {
    return sendMethodNotAllowed(res, ["GET", "POST"]);
  }

  try {
    const claims = await requireSession(req);
    if (req.method === "GET") {
      const access = requireTenantRole(claims, PRODUCTION_PLANNING_READ_ROLES);
      const data = await loadPlanningData(getFirebaseAdmin().db, access.tenantId);
      return res.status(200).json(data);
    }

    const body = getBody(req);
    const action = String(body.action || "");
    if (action === "changeStatus") {
      const requestedStatus = String(body.status || "") as ProductionPlanningStatus;
      const roles =
        requestedStatus === "in_production"
          ? PRODUCTION_PLANNING_EXECUTE_ROLES
          : PRODUCTION_PLANNING_MANAGE_ROLES;
      const access = requireTenantRole(claims, roles);
      if (requestedStatus === "completed") {
        const result = await completePlan(
          getFirebaseAdmin().db,
          access.tenantId,
          String(body.planId || ""),
        );
        return res.status(200).json({ plan: result });
      }
      const plan = await changePlanStatus(
        getFirebaseAdmin().db,
        access.tenantId,
        String(body.planId || ""),
        requestedStatus,
      );
      return res.status(200).json({ plan });
    }

    const access = requireTenantRole(claims, PRODUCTION_PLANNING_MANAGE_ROLES);
    if (action === "saveBom") {
      const bom = await saveBom(getFirebaseAdmin().db, access.tenantId, access.uid, body.bom);
      return res.status(200).json({ bom });
    }
    if (action === "updateDraftPlan") {
      const plan = await updateDraftPlan(
        getFirebaseAdmin().db,
        access.tenantId,
        String(body.planId || ""),
        body,
      );
      return res.status(200).json({ plan });
    }
    if (action === "createPlan") {
      const plan = await createPlan(getFirebaseAdmin().db, access.tenantId, access.uid, body);
      return res.status(201).json({ plan });
    }
    return res.status(400).json({ error: "UNKNOWN_ACTION" });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED") {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }
    if (
      error?.message === "FIREBASE_ADMIN_NOT_CONFIGURED" ||
      error?.message === "FIREBASE_ADMIN_PROJECT_MISMATCH"
    ) {
      return res.status(503).json({ error: "AUTHENTICATION_UNAVAILABLE" });
    }
    if (error instanceof PlanningError) {
      return res.status(error.status).json({
        error: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      });
    }
    console.error("Production planning request failed:", error);
    return res.status(500).json({ error: "PRODUCTION_PLANNING_FAILED" });
  }
}
