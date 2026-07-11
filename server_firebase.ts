import { initializeApp as initializeAdminApp, cert, getApps as getAdminApps, getApp as getAdminApp } from "firebase-admin/app";
import { db as clientDb } from "./src/firebase";
import {
  collection as clientCollection,
  doc as clientDoc,
  getDoc as clientGetDoc,
  getDocs as clientGetDocs,
  setDoc as clientSetDoc,
  query as clientQuery,
  where as clientWhere,
  writeBatch as clientWriteBatch,
  deleteDoc as clientDeleteDoc
} from "firebase/firestore";
import config from "./firebase-applet-config.json";

// We still initialize the Admin SDK in case other services like Firebase Cloud Messaging are used
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

// For Firestore operations, we return the client-side db which has proper API-key-based unauthenticated/user access permissions
export function getServerDb() {
  console.log("[getServerDb] Returning Client SDK Firestore instance to bypass GCP Admin IAM restrictions.");
  return clientDb;
}

// Compatibility functional wrappers using Firebase Client SDK
export function collection(db: any, path: string) {
  return clientCollection(db, path);
}

export function doc(parent: any, ...paths: string[]) {
  // Client doc() expects (parent, ...paths)
  // If the first argument is a document ref rather than a collection/db ref, clientDoc handles it as well.
  // We join any paths provided
  const combinedPath = paths.join("/");
  return clientDoc(parent, combinedPath);
}

export async function getDoc(docRef: any) {
  const snap = await clientGetDoc(docRef);
  return {
    exists: () => snap.exists(),
    data: () => snap.data(),
    id: snap.id,
    ref: snap.ref
  };
}

export async function getDocs(queryOrCol: any) {
  const snap = await clientGetDocs(queryOrCol);
  const docs = snap.docs.map((d: any) => ({
    id: d.id,
    data: () => d.data(),
    ref: d.ref,
    exists: () => d.exists()
  }));
  return {
    size: snap.size,
    forEach: (callback: (d: any) => void) => docs.forEach(callback),
    docs: docs
  };
}

export async function setDoc(docRef: any, data: any, options?: any) {
  return await clientSetDoc(docRef, data, options || {});
}

export function query(collectionRef: any, ...constraints: any[]) {
  return clientQuery(collectionRef, ...constraints);
}

export function where(field: string, operator: any, value: any) {
  return clientWhere(field, operator, value);
}

export function writeBatch(db: any) {
  const batch = clientWriteBatch(db);
  return {
    update: (docRef: any, data: any) => batch.update(docRef, data),
    set: (docRef: any, data: any, options?: any) => batch.set(docRef, data, options || {}),
    delete: (docRef: any) => batch.delete(docRef),
    commit: async () => await batch.commit()
  };
}

export async function deleteDoc(docRef: any) {
  return await clientDeleteDoc(docRef);
}
