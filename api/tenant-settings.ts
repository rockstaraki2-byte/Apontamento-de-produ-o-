import {
  getFirebaseAdmin,
  requireSession,
  sendMethodNotAllowed,
} from "./_lib/firebaseAdmin.js";
import { systemSettingsDocumentId } from "../src/systemSettingsKey.js";

const SETTINGS_ROLES = new Set(["ADMIN", "GERENCIA", "PCP"]);
const MAX_LOGO_LENGTH = 900_000;

export default async function handler(req: any, res: any) {
  if (req.method !== "PUT") return sendMethodNotAllowed(res, ["PUT"]);

  try {
    const claims = await requireSession(req);
    const tenantId = String(claims.tenantId || "").trim().toLowerCase();
    const role = String(claims.role || "").trim().toUpperCase();

    if (
      !SETTINGS_ROLES.has(role) ||
      !tenantId ||
      tenantId === "global" ||
      !/^[a-z0-9_-]{2,40}$/.test(tenantId)
    ) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const companyName = typeof body.companyName === "string" ? body.companyName.trim() : "";
    const companyLogoUrl =
      typeof body.companyLogoUrl === "string" ? body.companyLogoUrl.trim() : "";
    const systemName = typeof body.systemName === "string" ? body.systemName.trim() : "";
    const primaryColor = typeof body.primaryColor === "string" ? body.primaryColor.trim() : "";
    const processesInput = body.soldaProcesses;

    if (
      !companyName ||
      companyName.length > 160 ||
      systemName.length > 120 ||
      companyLogoUrl.length > MAX_LOGO_LENGTH ||
      !/^#[0-9a-f]{6}$/i.test(primaryColor) ||
      typeof body.exigirQualidadeNaEmbalagem !== "boolean" ||
      !Array.isArray(processesInput) ||
      processesInput.length > 30 ||
      processesInput.some(
        (process: unknown) =>
          typeof process !== "string" ||
          process.trim().length === 0 ||
          process.trim().length > 80,
      )
    ) {
      return res.status(400).json({ error: "INVALID_CONFIGURATION" });
    }

    const monthlyBillingGoal =
      body.monthlyBillingGoal === undefined ||
      body.monthlyBillingGoal === null ||
      body.monthlyBillingGoal === ""
        ? undefined
        : Number(body.monthlyBillingGoal);
    if (
      monthlyBillingGoal !== undefined &&
      (!Number.isFinite(monthlyBillingGoal) || monthlyBillingGoal < 0)
    ) {
      return res.status(400).json({ error: "INVALID_CONFIGURATION" });
    }

    const exigirQualidadeNaEmbalagem = body.exigirQualidadeNaEmbalagem;
    const soldaProcesses = [...new Set<string>(
      processesInput.map((process: string) => process.trim()),
    )];

    const { db } = getFirebaseAdmin();
    const tenantRef = db.collection("tenants").doc(tenantId);
    const currentTenant = await tenantRef.get();
    if (!currentTenant.exists) return res.status(404).json({ error: "TENANT_NOT_FOUND" });

    const updatedAt = Date.now();
    const tenant = {
      id: tenantId,
      name: companyName,
      logoUrl: companyLogoUrl,
      systemName,
      primaryColor,
      exigirQualidadeNaEmbalagem,
      soldaProcesses,
      updatedAt,
    };
    const settings: Record<string, unknown> = {
      id: "default",
      tenantId,
      companyName,
      companyLogoUrl,
      systemName,
      primaryColor,
      updatedAt,
    };
    if (monthlyBillingGoal !== undefined) {
      settings.monthlyBillingGoal = monthlyBillingGoal;
    }

    const settingsRef = db
      .collection("systemSettings")
      .doc(systemSettingsDocumentId(tenantId, "default"));
    const batch = db.batch();
    batch.set(tenantRef, tenant, { merge: true });
    batch.set(settingsRef, settings, { merge: true });
    await batch.commit();

    return res.status(200).json({ ok: true, tenant, settings });
  } catch (error: any) {
    const message = String(error?.message || "");
    if (message === "UNAUTHORIZED") return res.status(401).json({ error: "UNAUTHORIZED" });
    if (
      message === "FIREBASE_ADMIN_NOT_CONFIGURED" ||
      message === "FIREBASE_ADMIN_PROJECT_MISMATCH"
    ) {
      return res.status(503).json({ error: "AUTHENTICATION_UNAVAILABLE" });
    }
    return res.status(500).json({ error: "TENANT_SETTINGS_SAVE_FAILED" });
  }
}
