import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const TENANT_ID = "imperio";
const DATABASE_ID = "producao";

const COLLECTIONS = [
  "activePacks",
  "agentReports",
  "attendances",
  "attributes",
  "billingImportAudits",
  "billingImportKeys",
  "cargas",
  "coilCuttingPlans",
  "customers",
  "employees",
  "epiDistributions",
  "expeditionRoutes",
  "extraHours",
  "flows",
  "items",
  "laserQuotes",
  "logs",
  "machineStops",
  "nestTasks",
  "notifications",
  "orderImportAudits",
  "orderImportKeys",
  "orderRepairKeys",
  "orders",
  "performanceReviews",
  "prensaPendingProductions",
  "priceHistories",
  "productFlows",
  "productionAgendas",
  "productionBatches",
  "productionSchedules",
  "productionSteps",
  "rejectionReasons",
  "sectors",
  "sheetStockMovements",
  "sheetStocks",
  "stockMovements",
  "stock_movements",
  "stocks",
  "systemSettings",
  "tornoEvents",
  "uniformDistributions",
  "uniforms",
  "users",
];

const EXCLUDED_COLLECTIONS = [
  {
    collection: "tenants",
    reason: "metadados do tenant; não recebe tenantId",
  },
];

const TENANT_MARKER_FIELDS = [
  "companyId",
  "company_id",
  "empresaId",
  "empresa_id",
  "tenant",
  "tenantKey",
  "tenant_id",
];

function text(value) {
  return String(value ?? "").trim();
}

function normalized(value) {
  return text(value).toLowerCase();
}

function isImperioMarker(value) {
  const valueText = normalized(value);
  return (
    valueText === TENANT_ID ||
    valueText.includes("imperio") ||
    valueText.includes("império") ||
    valueText.includes("jomarci")
  );
}

function isGlobalRecord(collectionName, docId, data) {
  const tenant = normalized(data.tenantId);
  if (tenant === "global" || tenant === "system") return true;

  if (collectionName === "users") {
    const id = normalized(docId);
    const scope = normalized(data.scope);
    return id === "raul" || scope === "global" || data.isGlobal === true;
  }

  if (collectionName === "systemSettings") {
    const id = normalized(docId);
    return id === "global" || id === "system";
  }

  return false;
}

function classify(collectionName, docId, data) {
  const tenantId = normalized(data.tenantId);

  if (tenantId === TENANT_ID) {
    return { action: "alreadyImperio", reason: "tenantId já é imperio" };
  }

  if (tenantId) {
    if (isGlobalRecord(collectionName, docId, data)) {
      return { action: "global", reason: "registro global/sistêmico" };
    }
    return {
      action: "conflict",
      reason: "tenantId explícito diferente de imperio",
    };
  }

  if (isGlobalRecord(collectionName, docId, data)) {
    return { action: "global", reason: "registro global/sistêmico sem alteração" };
  }

  for (const field of TENANT_MARKER_FIELDS) {
    if (!(field in data)) continue;

    const marker = text(data[field]);
    if (!marker) continue;

    if (isImperioMarker(marker)) {
      return {
        action: "planned",
        reason: field + " identifica a Império",
      };
    }

    return {
      action: "ambiguous",
      reason: field + " possui valor explícito não identificado como imperio",
    };
  }

  return {
    action: "planned",
    reason: "registro legado anterior ao isolamento multi-tenant",
  };
}

function newCounts() {
  return {
    total: 0,
    alreadyImperio: 0,
    tenantless: 0,
    planned: 0,
    updated: 0,
    verified: 0,
    globalOrSystem: 0,
    explicitOtherTenant: 0,
    ambiguous: 0,
    failures: 0,
    samplePlannedIds: [],
    sampleConflicts: [],
    sampleAmbiguous: [],
  };
}

function getServiceAccount() {
  const raw =
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!raw || !raw.trim()) {
    throw new Error(
      "Credencial administrativa não configurada.",
    );
  }

  const parsed = JSON.parse(raw);
  if (!parsed.project_id && !parsed.projectId) {
    throw new Error("A credencial não informa o projeto Firebase.");
  }

  return parsed;
}

function getDb() {
  const serviceAccount = getServiceAccount();
  const app =
    getApps()[0] ||
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id || serviceAccount.projectId,
    });

  return getFirestore(app, DATABASE_ID);
}

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

async function inspectCollection(db, collectionName) {
  const snapshot = await db.collection(collectionName).get();
  const counts = newCounts();
  const planned = [];

  for (const document of snapshot.docs) {
    const data = document.data() || {};
    const classification = classify(collectionName, document.id, data);

    counts.total += 1;
    if (!text(data.tenantId)) counts.tenantless += 1;

    if (classification.action === "alreadyImperio") {
      counts.alreadyImperio += 1;
    } else if (classification.action === "planned") {
      counts.planned += 1;
      planned.push(document.ref);
      if (counts.samplePlannedIds.length < 10) {
        counts.samplePlannedIds.push(document.id);
      }
    } else if (classification.action === "global") {
      counts.globalOrSystem += 1;
    } else if (classification.action === "conflict") {
      counts.explicitOtherTenant += 1;
      if (counts.sampleConflicts.length < 10) {
        counts.sampleConflicts.push(document.id);
      }
    } else if (classification.action === "ambiguous") {
      counts.ambiguous += 1;
      if (counts.sampleAmbiguous.length < 10) {
        counts.sampleAmbiguous.push(document.id);
      }
    }
  }

  return { collectionName, counts, planned };
}

async function applyCollection(db, inspected) {
  const { counts, planned } = inspected;
  if (planned.length === 0) return;

  for (const refs of chunk(planned, 400)) {
    const batch = db.batch();
    for (const ref of refs) {
      batch.set(ref, { tenantId: TENANT_ID }, { merge: true });
    }
    await batch.commit();
    counts.updated += refs.length;
  }

  for (const refs of chunk(planned, 100)) {
    const verifiedSnapshots = await db.getAll(...refs);
    for (const snapshot of verifiedSnapshots) {
      if (normalized(snapshot.data()?.tenantId) === TENANT_ID) {
        counts.verified += 1;
      } else {
        counts.failures += 1;
      }
    }
  }
}

async function main() {
  const mode = normalized(process.env.MIGRATION_MODE || "preview");
  if (mode !== "preview" && mode !== "execute") {
    throw new Error("MIGRATION_MODE deve ser preview ou execute.");
  }

  const db = getDb();
  const startedAt = new Date().toISOString();
  const inspected = [];
  const failures = [];

  for (const group of chunk(COLLECTIONS, 5)) {
    const results = await Promise.all(
      group.map(async (collectionName) => {
        try {
          return await inspectCollection(db, collectionName);
        } catch (error) {
          failures.push({
            collection: collectionName,
            message: error?.message || String(error),
            code: error?.code || null,
          });
          return {
            collectionName,
            counts: newCounts(),
            planned: [],
          };
        }
      }),
    );
    inspected.push(...results);
  }

  if (mode === "execute") {
    for (const result of inspected) {
      try {
        await applyCollection(db, result);
      } catch (error) {
        result.counts.failures += result.planned.length;
        failures.push({
          collection: result.collectionName,
          message: error?.message || String(error),
          code: error?.code || null,
        });
      }
    }
  }

  const collections = Object.fromEntries(
    inspected.map(({ collectionName, counts }) => [collectionName, counts]),
  );

  const totals = Object.values(collections).reduce(
    (acc, counts) => {
      for (const key of [
        "total",
        "alreadyImperio",
        "tenantless",
        "planned",
        "updated",
        "verified",
        "globalOrSystem",
        "explicitOtherTenant",
        "ambiguous",
        "failures",
      ]) {
        acc[key] += counts[key] || 0;
      }
      return acc;
    },
    {
      total: 0,
      alreadyImperio: 0,
      tenantless: 0,
      planned: 0,
      updated: 0,
      verified: 0,
      globalOrSystem: 0,
      explicitOtherTenant: 0,
      ambiguous: 0,
      failures: 0,
    },
  );

  const result = {
    executedAt: new Date().toISOString(),
    startedAt,
    mode,
    tenant: TENANT_ID,
    database: DATABASE_ID,
    scannedCollections: COLLECTIONS,
    excludedCollections: EXCLUDED_COLLECTIONS,
    totals,
    collections,
    failures,
    success:
      failures.length === 0 &&
      (mode === "preview" || totals.failures === 0) &&
      (mode === "preview" || totals.updated === totals.verified),
  };

  console.log(JSON.stringify(result, null, 2));

  if (!result.success) process.exitCode = 1;
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        success: false,
        mode: normalized(process.env.MIGRATION_MODE || "preview"),
        error: error?.message || String(error),
        code: error?.code || null,
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
