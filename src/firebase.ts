import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";
import config from "../firebase-applet-config.json";

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
};

export const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
const isServer = typeof window === "undefined";

export const db = initializeFirestore(
  app,
  isServer
    ? { experimentalForceLongPolling: true }
    : {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
        experimentalForceLongPolling: true,
      },
  config.firestoreDatabaseId,
);

export const messagingPromise = isServer
  ? Promise.resolve(null)
  : isSupported().then((supported) =>
      supported ? getMessaging(app) : null,
    );
