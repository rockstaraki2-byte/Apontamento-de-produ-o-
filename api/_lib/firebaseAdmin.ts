import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const EXPECTED_PROJECT_ID = "gen-lang-client-0901917587";
const DATABASE_ID = "producao";
const APP_NAME = "apontapro-production-api";

export function parseServiceAccountKey(rawKey: string): Record<string, any> {
  const trimmed = rawKey.trim().replace(/^\uFEFF/, "");
  const withoutCodeFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const normalizePrivateKeyNewlines = (value: string) =>
    value.replace(/("private_key"\s*:\s*")((?:\\.|[^"])*?)(")/, (_match, prefix, key, suffix) =>
      `${prefix}${key.replace(/\r\n?|\n/g, "\\n")}${suffix}`,
    );

  const candidates = [
    trimmed,
    withoutCodeFence,
    normalizePrivateKeyNewlines(withoutCodeFence),
  ];

  for (const candidate of candidates) {
    const jsonCandidates = [
      candidate,
      Buffer.from(candidate, "base64").toString("utf8"),
    ];
    for (const jsonCandidate of jsonCandidates) {
      try {
        let parsed: unknown = JSON.parse(jsonCandidate);
        if (typeof parsed === "string") parsed = JSON.parse(parsed);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, any>;
        }
      } catch {
        // Try the next supported representation without logging credential data.
      }
    }
  }

  throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY_INVALID_JSON");
}

export function getFirebaseAdmin() {
  const useEmulators = Boolean(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST);
  const projectId = useEmulators ? (process.env.GCLOUD_PROJECT || "demo-apontapro") : EXPECTED_PROJECT_ID;
  let serviceAccount: ServiceAccount | undefined;
  if (!useEmulators) {
    const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!rawKey?.trim()) throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY_MISSING");
    const parsed = parseServiceAccountKey(rawKey);
    serviceAccount = {
      projectId: String(parsed.project_id || parsed.projectId || ""),
      clientEmail: String(parsed.client_email || parsed.clientEmail || ""),
      privateKey: String(parsed.private_key || parsed.privateKey || "").replace(/\\n/g, "\n").replace(/\r\n/g, "\n"),
    };
    if (serviceAccount.projectId !== EXPECTED_PROJECT_ID || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
      throw new Error("FIREBASE_ADMIN_PROJECT_MISMATCH");
    }
  }

  const app = getApps().find((candidate) => candidate.name === APP_NAME) ||
    initializeApp({
      ...(serviceAccount ? { credential: cert(serviceAccount) } : {}),
      projectId,
    }, APP_NAME);

  return {
    app,
    auth: getAuth(app),
    db: getFirestore(app, DATABASE_ID),
  };
}

export function getBearerToken(req: any): string {
  const match = String(req.headers?.authorization || "").match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

export async function requireSession(req: any) {
  const token = getBearerToken(req);
  if (!token) throw new Error("UNAUTHORIZED");
  const { auth } = getFirebaseAdmin();
  try {
    return await auth.verifyIdToken(token, true);
  } catch {
    throw new Error("UNAUTHORIZED");
  }
}

export function isSuperAdmin(claims: Record<string, any>): boolean {
  return claims.uid === "raul" && claims.superAdmin === true &&
    claims.tenantId === "global" && claims.role === "ADMIN";
}

export function sendMethodNotAllowed(res: any, allowed: string[]) {
  res.setHeader("Allow", allowed.join(", "));
  return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
}
