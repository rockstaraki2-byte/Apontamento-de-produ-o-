import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import config from "./firebase-applet-config.json";

let cachedDb: Firestore | null = null;

export function initFirebaseAdmin() {
  const existing = getApps().find((candidate) => candidate.name === "[DEFAULT]");
  if (existing) return existing;
  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (rawKey) {
    let parsed: Record<string, any>;
    try { parsed = JSON.parse(rawKey) as Record<string, any>; }
    catch { throw new Error("FIREBASE_ADMIN_NOT_CONFIGURED"); }
    const projectId = String(parsed.project_id || parsed.projectId || "");
    if (projectId !== config.projectId) throw new Error("FIREBASE_ADMIN_PROJECT_MISMATCH");
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail: String(parsed.client_email || parsed.clientEmail || ""),
        privateKey: String(parsed.private_key || parsed.privateKey || "").replace(/\\n/g, "\n"),
      }),
      projectId: config.projectId,
    });
  }
  return initializeApp({ projectId: config.projectId });
}

export function getServerDb(): Firestore {
  if (cachedDb) return cachedDb;
  const app = initFirebaseAdmin();
  cachedDb = getFirestore(app, config.firestoreDatabaseId || "(default)");
  return cachedDb;
}

export function collection(db: Firestore, path: string) {
  return db.collection(path);
}

export function doc(parent: any, ...paths: string[]) {
  return parent.doc(paths.join("/"));
}

export async function getDoc(reference: FirebaseFirestore.DocumentReference) {
  const snapshot = await reference.get();
  return {
    exists: () => snapshot.exists,
    data: () => snapshot.data(),
    id: snapshot.id,
    ref: snapshot.ref,
  };
}

export async function getDocs(reference: FirebaseFirestore.Query | FirebaseFirestore.CollectionReference) {
  const snapshot = await reference.get();
  const docs = snapshot.docs.map((document) => ({
    id: document.id,
    data: () => document.data(),
    ref: document.ref,
    exists: () => document.exists,
  }));
  return {
    size: snapshot.size,
    forEach: (callback: (document: any) => void) => docs.forEach(callback),
    docs,
  };
}

export async function setDoc(reference: FirebaseFirestore.DocumentReference, data: any, options?: FirebaseFirestore.SetOptions) {
  return options ? reference.set(data, options) : reference.set(data);
}

export function query(reference: FirebaseFirestore.Query | FirebaseFirestore.CollectionReference, ...constraints: Array<{ field: string; operator: FirebaseFirestore.WhereFilterOp; value: unknown }>) {
  return constraints.reduce((current, constraint) => current.where(constraint.field, constraint.operator, constraint.value), reference as FirebaseFirestore.Query);
}

export function where(field: string, operator: FirebaseFirestore.WhereFilterOp, value: unknown) {
  return { field, operator, value };
}

export function writeBatch(db: Firestore) {
  return db.batch();
}

export async function deleteDoc(reference: FirebaseFirestore.DocumentReference) {
  return reference.delete();
}

export { FieldValue };
