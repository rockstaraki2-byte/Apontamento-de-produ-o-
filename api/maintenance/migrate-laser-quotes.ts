import crypto from "node:crypto";
import { createRequire } from "node:module";
import {
  cert,
  getApps,
  initializeApp,
  type App as FirebaseAdminApp,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const require = createRequire(import.meta.url);
const firebaseConfigFile = require("../../firebase-applet-config.json") as {
  projectId: string;
  firestoreDatabaseId?: string;
};

const APP_NAME = "laser-quote-tenant-migration";
const MIGRATION_TOKEN_SHA256 =
  "835c527d6b554c159e9942bc60b0d1b9e9da89f64174a768b726eaf25aa05dac";

type QuoteRow = {
  ref: FirebaseFirestore.DocumentReference;
  id: string;
  data: Record<string, any>;
};

function normalizeText(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function normalizeTenantId(value: unknown): string {
  const normalized = normalizeText(value).replace(/^empresa[_-]/, "");
  if (normalized === "imperio" || normalized === "imperiojomarci") {
    return "imperio";
  }
  if (normalized === "global") return "global";
  return normalized;
}

function getAccessToken(req: any): string {
  const header = String(req.headers?.authorization || "");
  const bearerMatch = header.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch) return bearerMatch[1].trim();
  return String(req.query?.token || "").trim();
}

function secureEquals(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function isAuthorized(req: any): boolean {
  const providedToken = getAccessToken(req);
  if (!providedToken) return false;
  const providedHash = crypto
    .createHash("sha256")
    .update(providedToken)
    .digest("hex");
  return secureEquals(providedHash, MIGRATION_TOKEN_SHA256);
}

function getAdminDb(): Firestore {
  let adminApp: FirebaseAdminApp | undefined = getApps().find(
    (app) => app.name === APP_NAME,
  );

  if (!adminApp) {
    const serviceAccountRaw = String(
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "",
    ).trim();

    if (
      serviceAccountRaw &&
      !serviceAccountRaw.startsWith("Conteudo_JSON")
    ) {
      const serviceAccount = JSON.parse(serviceAccountRaw);
      adminApp = initializeApp(
        {
          credential: cert(serviceAccount),
          projectId: firebaseConfigFile.projectId,
        },
        APP_NAME,
      );
    } else {
      adminApp = initializeApp(
        { projectId: firebaseConfigFile.projectId },
        APP_NAME,
      );
    }
  }

  return firebaseConfigFile.firestoreDatabaseId
    ? getFirestore(adminApp, firebaseConfigFile.firestoreDatabaseId)
    : getFirestore(adminApp);
}

function customerTenantEvidence(
  quote: Record<string, any>,
  customerRows: Array<{ id: string; data: Record<string, any> }>,
): string | null {
  const quoteCustomerId = String(quote.customerId ?? "").trim();
  const quoteCustomerName = normalizeText(quote.customerName);

  const candidates = customerRows.filter((customer) => {
    const customerData = customer.data;
    const customerId = String(customerData.id ?? customer.id).trim();
    if (quoteCustomerId && customerId === quoteCustomerId) return true;
    if (!quoteCustomerName) return false;

    return (
      normalizeText(customerData.name) === quoteCustomerName ||
      normalizeText(customerData.tradeName) === quoteCustomerName
    );
  });

  const tenantIds = new Set(
    candidates
      .map((customer) =>
        normalizeTenantId(
          customer.data.tenantId ?? customer.data.companyId,
        ),
      )
      .filter(Boolean),
  );

  return tenantIds.size === 1 ? [...tenantIds][0] : null;
}

function classifyQuote(
  row: QuoteRow,
  customerRows: Array<{ id: string; data: Record<string, any> }>,
) {
  const declaredTenant = normalizeTenantId(row.data.tenantId);
  const legacyCompany = normalizeTenantId(row.data.companyId);
  const currentTenant = declaredTenant || legacyCompany;

  if (currentTenant === "imperio") {
    return {
      ...row,
      action: "already_scoped",
      reason: declaredTenant ? "tenantId=imperio" : "companyId=imperio",
    };
  }

  if (currentTenant) {
    return {
      ...row,
      action: "skip_other_tenant",
      reason: `tenant=${currentTenant}`,
    };
  }

  const evidenceTenant = customerTenantEvidence(row.data, customerRows);
  if (evidenceTenant === "imperio") {
    return {
      ...row,
      action: "repairable",
      reason: "customer_match=imperio",
    };
  }

  return {
    ...row,
    action: "unscoped_ambiguous",
    reason: evidenceTenant
      ? `customer_match=${evidenceTenant}`
      : "no_safe_tenant_evidence",
  };
}

function publicRow(row: ReturnType<typeof classifyQuote>) {
  return {
    id: row.id,
    quoteCode: row.data.quoteCode || null,
    customerName: row.data.customerName || null,
    customerId: row.data.customerId ?? null,
    declaredTenantId: row.data.tenantId ?? null,
    companyId: row.data.companyId ?? null,
    createdAt: row.data.createdAt ?? null,
    status: row.data.status ?? null,
    action: row.action,
    reason: row.reason,
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ sucesso: false, erro: "METODO_NAO_PERMITIDO" });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ sucesso: false, erro: "NAO_AUTORIZADO" });
  }

  const body =
    typeof req.body === "string"
      ? (() => {
          try {
            return JSON.parse(req.body);
          } catch {
            return {};
          }
        })()
      : req.body || {};
  const apply =
    body.apply === true || String(req.query?.apply || "").toLowerCase() === "true";
  const targetTenantId = normalizeTenantId(
    body.targetTenantId ?? req.query?.targetTenantId ?? "imperio",
  );

  if (targetTenantId !== "imperio") {
    return res.status(400).json({
      sucesso: false,
      erro: "TENANT_NAO_AUTORIZADO",
      mensagem: "Esta rotina só pode corrigir o tenant imperio.",
    });
  }

  try {
    const db = getAdminDb();
    const [quotesSnapshot, customersSnapshot] = await Promise.all([
      db.collection("laserQuotes").get(),
      db.collection("customers").get(),
    ]);

    const customerRows = customersSnapshot.docs.map((doc) => ({
      id: doc.id,
      data: doc.data() as Record<string, any>,
    }));

    const rows = quotesSnapshot.docs.map((doc) =>
      classifyQuote(
        {
          ref: doc.ref,
          id: doc.id,
          data: doc.data() as Record<string, any>,
        },
        customerRows,
      ),
    );

    const repairable = rows.filter((row) => row.action === "repairable");
    const ambiguous = rows.filter((row) => row.action === "unscoped_ambiguous");
    const otherTenant = rows.filter((row) => row.action === "skip_other_tenant");

    let updatedIds: string[] = [];
    if (apply && repairable.length > 0) {
      for (let index = 0; index < repairable.length; index += 400) {
        const chunk = repairable.slice(index, index + 400);
        const batch = db.batch();
        chunk.forEach((row) => {
          batch.update(row.ref, { tenantId: "imperio" });
        });
        await batch.commit();
        updatedIds = updatedIds.concat(chunk.map((row) => row.id));
      }
    }

    return res.status(200).json({
      sucesso: true,
      modo: apply ? "aplicacao" : "diagnostico",
      tenantAlvo: "imperio",
      totalDocumentos: rows.length,
      jaVinculadosImperio: rows.filter(
        (row) => row.action === "already_scoped",
      ).length,
      elegiveisParaCorrecao: repairable.length,
      ambiguosNaoAlterados: ambiguous.length,
      outrosTenantsNaoAlterados: otherTenant.length,
      documentosAtualizados: updatedIds.length,
      idsAtualizados: updatedIds,
      amostraElegiveis: repairable.slice(0, 30).map(publicRow),
      amostraAmbigua: ambiguous.slice(0, 30).map(publicRow),
      amostraOutrosTenants: otherTenant.slice(0, 30).map(publicRow),
    });
  } catch (error: any) {
    console.error("[migrate-laser-quotes] Failed:", error);
    return res.status(500).json({
      sucesso: false,
      erro: "FALHA_NA_MIGRACAO",
      mensagem: error?.message || String(error),
    });
  }
}
