import { initializeApp as initializeAdminApp, cert, getApps as getAdminApps, getApp as getAdminApp } from "firebase-admin/app";
import { initializeApp as initializeClientApp, getApps as getClientApps, getApp as getClientApp } from "firebase/app";
import { getFirestore as getClientFirestore } from "firebase/firestore";
import config from "./firebase-applet-config.json";

let clientDbInstance: any = null;

export function getServerDb() {
  if (clientDbInstance) return clientDbInstance;

  const projectId = config.projectId;
  const databaseId = config.firestoreDatabaseId || "producao";

  if (!projectId) {
    console.warn("[getServerDb] Danger: config.projectId is empty or invalid in firebase-applet-config.json.");
    throw new Error("FIRESTORE_CONFIG_MISSING_PROJECT_ID");
  }

  console.log(`[getServerDb] Initializing Firebase Client SDK in Node.js for database: "${databaseId}"`);

  try {
    let app;
    if (getClientApps().length === 0) {
      app = initializeClientApp({
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        storageBucket: config.storageBucket,
        messagingSenderId: config.messagingSenderId,
        appId: config.appId
      });
    } else {
      app = getClientApp();
    }

    clientDbInstance = getClientFirestore(app, databaseId);
    console.log(`[getServerDb] Firestore Client SDK resolved successfully for databaseId: "${databaseId}"`);
    return clientDbInstance;
  } catch (err: any) {
    console.error(`[getServerDb] Error initializing Client Firestore:`, err);
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
