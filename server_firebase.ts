import { initializeApp as initializeAdminApp, cert, getApps as getAdminApps, getApp as getAdminApp } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import config from "./firebase-applet-config.json";

let adminDbInstance: any = null;

export function getServerDb() {
  if (adminDbInstance) return adminDbInstance;

  const projectId = config.projectId;
  const databaseId = config.firestoreDatabaseId || "producao";

  if (!projectId) {
    console.warn("[getServerDb] Danger: config.projectId is empty or invalid in firebase-applet-config.json.");
    throw new Error("FIRESTORE_CONFIG_MISSING_PROJECT_ID");
  }

  // Ensure Admin app is initialized
  initFirebaseAdmin();

  try {
    const adminApp = getAdminApp();
    adminDbInstance = getAdminFirestore(adminApp, databaseId);
    console.log(`[getServerDb] Firestore Admin SDK resolved successfully for databaseId: "${databaseId}"`);
    return adminDbInstance;
  } catch (err: any) {
    console.error(`[getServerDb] Error initializing Admin Firestore:`, err);
    throw err;
  }
}

export function initFirebaseAdmin() {
  const projectId = config.projectId;
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (getAdminApps().length === 0) {
    if (serviceAccountEnv && serviceAccountEnv.trim() && !serviceAccountEnv.startsWith("Conteudo_JSON")) {
      try {
        const sa = JSON.parse(serviceAccountEnv);
        initializeAdminApp({ credential: cert(sa), projectId });
        console.log("[initFirebaseAdmin] Admin SDK initialized successfully with Service Account.");
      } catch (e) {
        console.error("[initFirebaseAdmin] Failed to parse SA. Initializing with defaults.", e);
        initializeAdminApp({ projectId });
      }
    } else {
      console.log("[initFirebaseAdmin] No Service Account. Initializing Admin SDK with ADC.");
      initializeAdminApp({ projectId });
    }
  }
}

// Compatibility wrappers for Firebase Client SDK to Admin SDK
export function collection(db: any, path: string) {
  return db.collection(path);
}

export function doc(parent: any, ...paths: string[]) {
  if (typeof parent.doc === "function") {
    return parent.doc(paths.join("/"));
  }
  return parent.doc(paths.join("/"));
}

export async function getDoc(docRef: any) {
  const snap = await docRef.get();
  return {
    exists: () => snap.exists,
    data: () => snap.data(),
    id: snap.id,
    ref: snap.ref
  };
}

export async function getDocs(queryOrCol: any) {
  const snap = await queryOrCol.get();
  const docs = snap.docs.map((d: any) => ({
    id: d.id,
    data: () => d.data(),
    ref: d.ref,
    exists: () => d.exists
  }));
  return {
    size: snap.size,
    forEach: (callback: (d: any) => void) => docs.forEach(callback),
    docs: docs
  };
}

export async function setDoc(docRef: any, data: any, options?: any) {
  return await docRef.set(data, options || {});
}

export function query(collectionRef: any, ...constraints: any[]) {
  let q = collectionRef;
  for (const constraint of constraints) {
    if (constraint && typeof constraint.apply === "function") {
      q = constraint.apply(q);
    }
  }
  return q;
}

export function where(field: string, operator: any, value: any) {
  return {
    apply: (q: any) => q.where(field, operator, value)
  };
}

export function writeBatch(db: any) {
  const batch = db.batch();
  return {
    update: (docRef: any, data: any) => batch.update(docRef, data),
    set: (docRef: any, data: any, options?: any) => batch.set(docRef, data, options || {}),
    delete: (docRef: any) => batch.delete(docRef),
    commit: async () => await batch.commit()
  };
}

export async function deleteDoc(docRef: any) {
  return await docRef.delete();
}
