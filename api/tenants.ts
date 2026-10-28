import { randomInt } from "node:crypto";
import { getFirebaseAdmin, isSuperAdmin, requireSession, sendMethodNotAllowed } from "./_lib/firebaseAdmin.js";
import { getDefaultTenantScreens, getDefaultTenantSubTabs } from "../src/types.js";

const ALLOWED_TENANT_FIELDS = [
  "name",
  "logoUrl",
  "primaryColor",
  "systemName",
  "machines",
  "exigirQualidadeNaEmbalagem",
  "allowedScreens",
  "allowedSubTabs",
  "screenAccessConfigured",
  "subTabAccessConfigured",
  "soldaProcesses",
];

export default async function handler(req: any, res: any) {
  if (!["GET", "POST", "PUT", "DELETE"].includes(req.method)) return sendMethodNotAllowed(res, ["GET", "POST", "PUT", "DELETE"]);
  try {
    const claims = await requireSession(req);
    if (!isSuperAdmin(claims as any)) return res.status(403).json({ error: "FORBIDDEN" });
    const { db } = getFirebaseAdmin();
    if (req.method === "GET") {
      const snapshot = await db.collection("tenants").get();
      const tenants = snapshot.docs.map((tenantDoc) => ({
        ...tenantDoc.data(),
        id: tenantDoc.id,
      }));
      return res.status(200).json({ tenants });
    }
    const body = req.body || {};
    const id = String(body.id || req.query?.id || "").trim().toLowerCase();
    if (!/^[a-z0-9_-]{2,40}$/.test(id) || id === "global") return res.status(400).json({ error: "INVALID_TENANT" });
    if (req.method === "DELETE") {
      if (id === "imperio") return res.status(400).json({ error: "DEFAULT_TENANT_CANNOT_BE_DELETED" });
      await db.collection("tenants").doc(id).delete();
      return res.status(200).json({ ok: true });
    }

    const tenant: Record<string, any> = { id };
    for (const field of ALLOWED_TENANT_FIELDS) if (field in body) tenant[field] = body[field];
    if (typeof tenant.name !== "string" || !tenant.name.trim()) return res.status(400).json({ error: "INVALID_TENANT" });
    const sectorNames: string[] = Array.isArray(body.sectorNames)
      ? [...new Set<string>((body.sectorNames as unknown[]).map((name) => String(name).trim()).filter((name) => name.length > 0))].slice(0, 100)
      : [];
    const tenantRef = db.collection("tenants").doc(id);
    const currentTenant = await tenantRef.get();
    if (req.method === "POST" && currentTenant.exists) return res.status(409).json({ error: "TENANT_ALREADY_EXISTS" });
    if (req.method === "PUT" && !currentTenant.exists) return res.status(404).json({ error: "TENANT_NOT_FOUND" });

    const existingMetadata = Array.isArray(currentTenant.get("sectorMetadata"))
      ? currentTenant.get("sectorMetadata") as Array<{ id: number; name: string }>
      : [];
    const existingSectors = req.method === "PUT"
      ? await db.collection("sectors").where("tenantId", "==", id).get()
      : null;
    for (const sector of existingSectors?.docs || []) {
      const data = sector.data();
      const sectorId = Number(data.id ?? sector.id);
      if (Number.isSafeInteger(sectorId) && !existingMetadata.some((entry) => entry.id === sectorId)) {
        existingMetadata.push({ id: sectorId, name: String(data.name || "") });
      }
    }
    const sectorMetadata = [...existingMetadata];
    const newSectorNames = sectorNames.filter((name) => !sectorMetadata.some((entry) => entry.name.toLowerCase() === name.toLowerCase()));

    if (id !== "imperio") {
      tenant.screenAccessConfigured = body.screenAccessConfigured === true;
      tenant.subTabAccessConfigured = body.subTabAccessConfigured === true;
      if (!tenant.screenAccessConfigured) {
        tenant.allowedScreens = getDefaultTenantScreens(sectorNames);
      }
      if (!tenant.subTabAccessConfigured) {
        tenant.allowedSubTabs = getDefaultTenantSubTabs(sectorNames);
      }
    }

    const batch = db.batch();
    for (const name of newSectorNames) {
      const sectorId = Date.now() * 1000 + randomInt(0, 1000);
      sectorMetadata.push({ id: sectorId, name });
      batch.set(db.collection("sectors").doc(String(sectorId)), { id: sectorId, name, tenantId: id, active: true });
    }
    const savedTenant = { ...tenant, sectorNames: sectorMetadata.map((entry) => entry.name), sectorMetadata, updatedAt: Date.now() };
    batch.set(tenantRef, savedTenant, { merge: true });
    await batch.commit();
    return res.status(req.method === "POST" ? 201 : 200).json({ tenant: savedTenant });
  } catch (error: any) {
    const message = String(error?.message || "");
    if (message === "UNAUTHORIZED") return res.status(401).json({ error: "UNAUTHORIZED" });
    if (message === "FIREBASE_ADMIN_NOT_CONFIGURED" || message === "FIREBASE_ADMIN_PROJECT_MISMATCH") return res.status(503).json({ error: "AUTHENTICATION_UNAVAILABLE" });
    return res.status(500).json({ error: "TENANT_OPERATION_FAILED" });
  }
}
