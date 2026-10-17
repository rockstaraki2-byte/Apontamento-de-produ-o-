import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin, isSuperAdmin, requireSession, sendMethodNotAllowed } from "./_lib/firebaseAdmin.js";

const scrypt = promisify(scryptCallback);
const PROFILE_FIELDS = ["name", "role", "tenantId", "phone", "email", "sectorIds", "machines", "permissions", "factorySectorId"];
const SELF_FIELDS = ["fcmToken", "phone", "email", "factorySectorId"];

function cleanProfile(input: Record<string, any>, id: string, tenantId: string) {
  const profile: Record<string, any> = { id, tenantId };
  for (const field of PROFILE_FIELDS) {
    if (field in input) profile[field] = input[field];
  }
  profile.tenantId = tenantId;
  if (typeof profile.name !== "string" || !profile.name.trim()) throw new Error("INVALID_USER");
  if (typeof profile.role !== "string" || !/^[A-Z_]+$/.test(profile.role)) throw new Error("INVALID_USER");
  return profile;
}

async function hashPassword(password: string) {
  if (password.length < 4 || password.length > 256) throw new Error("INVALID_PASSWORD");
  const salt = randomBytes(16).toString("base64url");
  const derived = await scrypt(password, salt, 64) as Buffer;
  return { algorithm: "scrypt-v1", salt, passwordHash: derived.toString("base64url"), updatedAt: Date.now() };
}

async function writeCredential(db: FirebaseFirestore.Firestore, id: string, tenantId: string, password: string) {
  if (password.length < 4 || password.length > 256) throw new Error("INVALID_PASSWORD");
  await db.collection("userCredentials").doc(id).set({ ...await hashPassword(password), tenantId }, { merge: true });
}

async function verifySelfPassword(db: FirebaseFirestore.Firestore, id: string, password: string) {
  const snap = await db.collection("userCredentials").doc(id).get();
  const value = snap.data();
  if (!value || value.algorithm !== "scrypt-v1" || !value.salt || !value.passwordHash) return false;
  const derived = await scrypt(password, String(value.salt), 64) as Buffer;
  const expected = Buffer.from(String(value.passwordHash), "base64url");
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

export default async function handler(req: any, res: any) {
  if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return sendMethodNotAllowed(res, ["GET", "POST", "PUT", "PATCH", "DELETE"]);
  try {
    const claims = await requireSession(req);
    const { db, auth } = getFirebaseAdmin();
    const globalAdmin = isSuperAdmin(claims as any);
    const id = String(req.body?.id || req.query?.id || "").trim().toLowerCase();

    if (req.method === "GET") {
      const usersSnapshot = globalAdmin
        ? await db.collection("users").get()
        : await db.collection("users").where("tenantId", "==", String(claims.tenantId || "")).get();
      const users = usersSnapshot.docs.map((snapshot) => {
        const profile = { ...snapshot.data(), id: snapshot.id } as Record<string, any>;
        delete profile.password;
        delete profile.passwordHash;
        return {
          ...profile,
          name: String(profile.name || snapshot.id),
          role: snapshot.id === "raul" ? "ADMIN" : String(profile.role || "PRODUCAO"),
          tenantId: snapshot.id === "raul" ? "global" : String(profile.tenantId || "imperio"),
        };
      });
      return res.status(200).json({ users });
    }

    if (req.method === "PATCH") {
      if (id !== claims.uid && id !== String(claims.uid)) return res.status(403).json({ error: "FORBIDDEN" });
      const patch: Record<string, any> = {};
      for (const field of SELF_FIELDS) if (field in (req.body || {})) patch[field] = req.body[field];
      if (Object.keys(patch).length) await db.collection("users").doc(String(claims.uid)).set(patch, { merge: true });
      if ("password" in (req.body || {})) {
        const profile = await db.collection("users").doc(String(claims.uid)).get();
        if (!profile.exists || claims.uid === "raul" || profile.get("tenantId") !== claims.tenantId) return res.status(403).json({ error: "FORBIDDEN" });
        await writeCredential(db, String(claims.uid), String(claims.tenantId), String(req.body.password || ""));
        await profile.ref.update({ password: (await import("firebase-admin/firestore")).FieldValue.delete() });
      }
      return res.status(200).json({ ok: true });
    }

    if (req.method === "POST") {
      const requestedTenantId = String(req.body?.tenantId || (globalAdmin ? "" : claims.tenantId) || "").trim().toLowerCase();
      if (!globalAdmin && (!["ADMIN", "GERENCIA"].includes(String(claims.role)) || requestedTenantId !== claims.tenantId)) return res.status(403).json({ error: "FORBIDDEN" });
      if (!requestedTenantId || requestedTenantId === "global" || !/^[a-z0-9_.-]{2,80}$/.test(id) || id === "raul") return res.status(400).json({ error: "INVALID_USER" });
      const tenant = await db.collection("tenants").doc(requestedTenantId).get();
      if (!tenant.exists) return res.status(400).json({ error: "INVALID_TENANT" });
      const profile = cleanProfile(req.body || {}, id, requestedTenantId);
      const password = String(req.body?.password || "");
      if (!password) return res.status(400).json({ error: "PASSWORD_REQUIRED" });
      const profileRef = db.collection("users").doc(id);
      if ((await profileRef.get()).exists) return res.status(409).json({ error: "USER_ALREADY_EXISTS" });
      const batch = db.batch();
      batch.create(profileRef, profile);
      batch.create(db.collection("userCredentials").doc(id), { ...await hashPassword(password), tenantId: requestedTenantId });
      await batch.commit();
      return res.status(201).json({ user: profile });
    }

    if (!id || id === "raul") return res.status(400).json({ error: "INVALID_USER" });
    const profileRef = db.collection("users").doc(id);
    const existing = await profileRef.get();
    if (!existing.exists) return res.status(404).json({ error: "USER_NOT_FOUND" });
    const currentTenantId = String(existing.get("tenantId") || "imperio");
    if (!globalAdmin && (!["ADMIN", "GERENCIA"].includes(String(claims.role)) || currentTenantId !== claims.tenantId)) return res.status(403).json({ error: "FORBIDDEN" });

    if (req.method === "PUT") {
      const requestedTenantId = globalAdmin ? String(req.body?.tenantId || currentTenantId).trim().toLowerCase() : String(claims.tenantId);
      if (requestedTenantId === "global" || requestedTenantId !== currentTenantId) return res.status(400).json({ error: "INVALID_TENANT" });
      const profile = cleanProfile(req.body || {}, id, requestedTenantId);
      const password = String(req.body?.password || "");
      const batch = db.batch();
      batch.update(profileRef, { ...profile, ...(password ? { password: FieldValue.delete() } : {}) }, { lastUpdateTime: existing.updateTime! });
      if (password) batch.set(db.collection("userCredentials").doc(id), { ...await hashPassword(password), tenantId: requestedTenantId });
      await batch.commit();
      const savedProfile = { ...existing.data(), ...profile };
      delete savedProfile.password;
      delete savedProfile.passwordHash;
      return res.status(200).json({ user: savedProfile });
    }

    if (!globalAdmin && id === claims.uid) return res.status(400).json({ error: "SELF_DELETE_NOT_ALLOWED" });
    const batch = db.batch();
    batch.delete(profileRef, { lastUpdateTime: existing.updateTime! });
    batch.delete(db.collection("userCredentials").doc(id));
    await batch.commit();
    try { await auth.deleteUser(id); } catch { /* Custom-token users may not have a Firebase Auth account. */ }
    return res.status(200).json({ ok: true });
  } catch (error: any) {
    const message = String(error?.message || "");
    if (error?.code === 6 || error?.code === "already-exists") return res.status(409).json({ error: "USER_ALREADY_EXISTS" });
    if (error?.code === 9 || error?.code === "failed-precondition") return res.status(409).json({ error: "USER_CHANGED_RETRY" });
    if (message === "UNAUTHORIZED") return res.status(401).json({ error: "UNAUTHORIZED" });
    if (message === "FIREBASE_ADMIN_NOT_CONFIGURED" || message === "FIREBASE_ADMIN_PROJECT_MISMATCH") return res.status(503).json({ error: "AUTHENTICATION_UNAVAILABLE" });
    if (message.startsWith("INVALID_")) return res.status(400).json({ error: message });
    return res.status(500).json({ error: "USER_OPERATION_FAILED" });
  }
}
