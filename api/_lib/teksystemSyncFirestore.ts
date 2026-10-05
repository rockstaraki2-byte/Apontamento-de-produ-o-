import { createRequire } from "node:module";
import { getApps, initializeApp } from "firebase/app";
import {
  collection,
  doc,
  initializeFirestore,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import {
  syncRecordKey,
  type NormalizedTekSystemSyncPayload,
  type TekSystemEntityType,
} from "./teksystemSync.js";

const require = createRequire(import.meta.url);
const firebaseConfigFile = require("../../firebase-applet-config.json") as {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  firestoreDatabaseId?: string;
};

const APP_NAME = "teksystem-sync-api";
const firebaseApp =
  getApps().find((app) => app.name === APP_NAME) ||
  initializeApp(
    {
      apiKey: firebaseConfigFile.apiKey,
      authDomain: firebaseConfigFile.authDomain,
      projectId: firebaseConfigFile.projectId,
      storageBucket: firebaseConfigFile.storageBucket,
      messagingSenderId: firebaseConfigFile.messagingSenderId,
      appId: firebaseConfigFile.appId,
    },
    APP_NAME,
  );

const db = initializeFirestore(
  firebaseApp,
  { experimentalForceLongPolling: true },
  firebaseConfigFile.firestoreDatabaseId,
);

const FIRESTORE_BATCH_LIMIT = 400;

function countRecords(payload: NormalizedTekSystemSyncPayload): number {
  return Object.values(payload.entities).reduce((total, rows) => total + rows.length, 0);
}

function allRecords(payload: NormalizedTekSystemSyncPayload) {
  return (Object.entries(payload.entities) as [TekSystemEntityType, Record<string, unknown>[]][])
    .flatMap(([entityType, rows]) => rows.map((data) => ({ entityType, data })));
}

/**
 * Persiste somente uma área de staging. Esta função não altera customers,
 * items, orders, logs ou qualquer outra coleção operacional do Apontador.
 */
export async function stageTekSystemSync(payload: NormalizedTekSystemSyncPayload): Promise<{
  syncId: string;
  recordCount: number;
}> {
  const receivedAt = new Date().toISOString();
  const records = allRecords(payload);
  const runRef = doc(db, "teksystemSyncRuns", payload.syncId);

  await setDoc(
    runRef,
    {
      syncId: payload.syncId,
      tenantId: payload.tenantId,
      origem: payload.origem,
      solicitadoPor: payload.solicitadoPor,
      modo: payload.modo,
      schemaVersion: payload.schemaVersion,
      generatedAt: payload.generatedAt,
      receivedAt,
      source: payload.source,
      counts: Object.fromEntries(
        Object.entries(payload.entities).map(([entity, rows]) => [entity, rows.length]),
      ),
      recordCount: records.length,
      payloadHash: payload.payloadHash,
      status: "RECEBIDO",
    },
    { merge: true },
  );

  for (let offset = 0; offset < records.length; offset += FIRESTORE_BATCH_LIMIT) {
    const batch = writeBatch(db);
    const slice = records.slice(offset, offset + FIRESTORE_BATCH_LIMIT);

    slice.forEach(({ entityType, data }) => {
      const externalId = String(data.externalId);
      const recordRef = doc(
        collection(db, "teksystemSyncRecords"),
        syncRecordKey(payload.tenantId, entityType, externalId),
      );

      batch.set(
        recordRef,
        {
          tenantId: payload.tenantId,
          entityType,
          externalId,
          syncId: payload.syncId,
          origem: payload.origem,
          modo: payload.modo,
          generatedAt: payload.generatedAt,
          receivedAt,
          source: payload.source,
          payloadHash: payload.payloadHash,
          data,
        },
        { merge: true },
      );
    });

    await batch.commit();
  }

  await setDoc(
    runRef,
    { status: "STAGED", stagedAt: new Date().toISOString() },
    { merge: true },
  );

  return { syncId: payload.syncId, recordCount: records.length };
}
