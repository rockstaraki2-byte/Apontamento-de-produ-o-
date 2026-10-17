import { getFirebaseAdmin, sendMethodNotAllowed } from "../_lib/firebaseAdmin.js";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { FieldValue } from "firebase-admin/firestore";

type UserProfile = {
  id: string;
  name: string;
  role: string;
  tenantId: string;
  [key: string]: any;
};

const attempts = new Map<string, { count: number; resetAt: number }>();
const scrypt = promisify(scryptCallback);

function normalize(value: unknown): string {
  return String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function verifyPassword(password: string, credential: any): Promise<boolean> {
  try {
    const expected = Buffer.from(String(credential.passwordHash || ""), "base64url");
    if (credential.algorithm === "scrypt-v1") {
      const actual = await scrypt(password, String(credential.salt), 64) as Buffer;
      return actual.length === expected.length && timingSafeEqual(actual, expected);
    }
    if (credential.algorithm === "sha256-salted-v1") {
      const actual = Buffer.from(createHash("sha256").update(`${credential.salt}:${password}`).digest("base64url"), "base64url");
      return actual.length === expected.length && timingSafeEqual(actual, expected);
    }
    return false;
  } catch {
    return false;
  }
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const passwordHash = await scrypt(password, salt, 64) as Buffer;
  return { algorithm: "scrypt-v1", salt, passwordHash: passwordHash.toString("base64url") };
}

function rateLimited(req: any): boolean {
  const ip = String(req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  const now = Date.now();
  const existing = attempts.get(ip);
  if (!existing || existing.resetAt <= now) {
    attempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  existing.count += 1;
  return existing.count > 12;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return sendMethodNotAllowed(res, ["POST"]);
  if (rateLimited(req)) return res.status(429).json({ error: "TOO_MANY_ATTEMPTS" });

  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  const requestedTenantId = String(req.body?.tenantId || "imperio").trim().toLowerCase();
  if (!username || !password || username.length > 160 || password.length > 256) {
    return res.status(400).json({ error: "INVALID_CREDENTIALS" });
  }

  try {
    const { auth, db } = getFirebaseAdmin();
    const typed = normalize(username);
    const explicitSuffix = typed.match(/^(.+)\.([a-z0-9_-]+)$/);
    const rawSuffix = explicitSuffix?.[2] || "";
    const targetTenantId = ["imp", "imperio"].includes(rawSuffix) ? "imperio" : rawSuffix || requestedTenantId;
    const lookup = explicitSuffix?.[1] || typed;
    const identifiers = new Set([lookup, typed]);
    if (/^torno_cnc_willia[mn](\.imperio)?$/i.test(lookup)) {
      identifiers.add(lookup.replace(/m(?=\.imperio$|$)/i, "n"));
      identifiers.add(lookup.replace(/n(?=\.imperio$|$)/i, "m"));
    }
    const usersSnapshot = await db.collection("users").get();
    const candidates = usersSnapshot.docs.map((snapshot) => ({
      snapshot,
      profile: { ...(snapshot.data() as Record<string, any>), id: snapshot.id } as UserProfile,
    }));

    let matching = candidates.filter(({ profile }) => {
      const uid = normalize(profile.id);
      const tenantId = profile.id === "raul" ? "global" : String(profile.tenantId || "imperio").toLowerCase();
      if (profile.id === "raul") return typed === "raul" || (lookup === "raul" && targetTenantId === "global");
      if (tenantId !== targetTenantId || tenantId === "global") return false;
      const baseId = uid.replace(/\.[^.]+$/, "");
      const full = normalize(username);
      const name = normalize(profile.name);
      return identifiers.has(uid) || identifiers.has(baseId) || name === lookup || name === full;
    });

    // An explicit document id wins over a legacy base/name alias in the same
    // tenant. For suffix aliases such as .imp, prefer the canonical tenant id.
    const exactMatches = matching.filter(({ profile }) => normalize(profile.id) === typed);
    const canonicalMatches = matching.filter(({ profile }) => normalize(profile.id) === `${lookup}.${targetTenantId}`);
    if (exactMatches.length) matching = exactMatches;
    else if (canonicalMatches.length) matching = canonicalMatches;

    if (matching.length !== 1) return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    const { snapshot, profile } = matching[0];
    const isRaul = snapshot.id === "raul";
    const tenantId = isRaul ? "global" : String(profile.tenantId || targetTenantId).toLowerCase();
    if (!isRaul) {
      const tenant = await db.collection("tenants").doc(tenantId).get();
      if (!tenant.exists || tenantId !== targetTenantId) return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }
    const role = isRaul ? "ADMIN" : String(profile.role || "PRODUCAO");
    const credentialsRef = db.collection("userCredentials").doc(snapshot.id);
    const credentials = await credentialsRef.get();
    const credential = credentials.data();
    let verified = false;
    if (["scrypt-v1", "sha256-salted-v1"].includes(String(credential?.algorithm)) && credential.salt && credential.passwordHash) {
      verified = await verifyPassword(password, credential);
    } else if (typeof profile.password === "string" && profile.password.length > 0) {
      verified = password === profile.password;
      if (verified) {
        await credentialsRef.set({ ...await hashPassword(password), tenantId, updatedAt: Date.now() });
        await snapshot.ref.update({ password: FieldValue.delete() });
      }
    }
    if (!verified) return res.status(401).json({ error: "INVALID_CREDENTIALS" });

    const safeUser: UserProfile = {
      ...profile,
      id: snapshot.id,
      name: String(profile.name || snapshot.id),
      role,
      tenantId,
    };
    delete safeUser.password;
    delete safeUser.passwordHash;
    const customToken = await auth.createCustomToken(snapshot.id, {
      userId: snapshot.id,
      name: safeUser.name,
      role,
      tenantId,
      superAdmin: isRaul,
    });
    return res.status(200).json({ customToken, user: safeUser });
  } catch {
    return res.status(503).json({ error: "AUTHENTICATION_UNAVAILABLE" });
  }
}
