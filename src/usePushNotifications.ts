import React, { useEffect, useRef } from "react";
import { messagingPromise } from "./firebase";
import { getToken, onMessage } from "firebase/messaging";
import type { User } from "./types";
import { useDatabase } from "./useDatabase";

const FIREBASE_MESSAGING_SW_URL = "/firebase-messaging-sw.js";
const FIREBASE_MESSAGING_SW_SCOPE = "/firebase-cloud-messaging-push-scope";

async function getFirebaseMessagingServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Este navegador não oferece suporte a Service Worker.");
  }

  // Register with the exact scope used by main.tsx. Calling register again is
  // idempotent and returns this registration instead of the root Workbox SW.
  const registration = await navigator.serviceWorker.register(
    FIREBASE_MESSAGING_SW_URL,
    { scope: FIREBASE_MESSAGING_SW_SCOPE },
  );

  if (registration.active?.state === "activated") return registration;

  const worker = registration.installing ?? registration.waiting ?? registration.active;
  if (!worker) {
    throw new Error("O Service Worker do Firebase Messaging não foi ativado.");
  }

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      window.clearTimeout(timeoutId);
      worker.removeEventListener("statechange", onStateChange);
    };

    const onStateChange = () => {
      if (registration.active?.state === "activated" || worker.state === "activated") {
        cleanup();
        resolve();
      } else if (worker.state === "redundant") {
        cleanup();
        reject(new Error("O Service Worker do Firebase Messaging foi substituído antes de ativar."));
      }
    };

    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("Tempo esgotado aguardando o Service Worker do Firebase Messaging."));
    }, 15000);

    worker.addEventListener("statechange", onStateChange);
    onStateChange();
  });

  return registration;
}

export function usePushNotifications(
  currentUser: User | null,
  db: ReturnType<typeof useDatabase>,
  setCurrentUser?: React.Dispatch<React.SetStateAction<User | null>>,
) {
  const registeredUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentUser || !messagingPromise) {
      registeredUserIdRef.current = null;
      return;
    }

    // Prevent multiple registrations for the same user in the same session
    if (registeredUserIdRef.current === currentUser.id) {
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const setupFCM = async () => {
      try {
        const messaging = await messagingPromise;
        if (!messaging) {
          console.log("FCM não é suportado neste navegador.");
          return;
        }

        // Permissão já solicitada na tela de login
        const permission = Notification.permission;
        if (permission === "granted") {
          const vapidKey = (import.meta as any).env.VITE_FIREBASE_VAPID_KEY;

          if (!vapidKey) {
            console.warn(
              "VITE_FIREBASE_VAPID_KEY não está definido. FCM Push notifications não funcionarão para receber mensagens no dispositivo.",
            );
            return;
          }

          const swRegistration = await getFirebaseMessagingServiceWorkerRegistration();
          console.log(
            "Utilizando Service Worker do Firebase Messaging com escopo:",
            swRegistration.scope,
          );

          const currentToken = await getToken(messaging, {
            vapidKey,
            serviceWorkerRegistration: swRegistration,
          });

          if (currentToken) {
            console.log("Token FCM Obtido:", currentToken);
            registeredUserIdRef.current = currentUser.id;
            if (currentUser.fcmToken !== currentToken) {
              // Update user doc with new FCM token so backend can target them
              await db.updateUser(currentUser.id, { fcmToken: currentToken });

              // Also update local state to avoid future mismatches
              if (setCurrentUser) {
                setCurrentUser((prev) => {
                  if (prev && prev.id === currentUser.id) {
                    return { ...prev, fcmToken: currentToken };
                  }
                  return prev;
                });
              }
            }
          } else {
            console.log(
              "Nenhum token FCM retornado. Solicite permissão para gerar um token.",
            );
          }

          // Handle foreground messages
          unsubscribe = onMessage(messaging, (payload) => {
            console.log("Mensagem FCM recebida em primeiro plano:", payload);
            if (payload.notification) {
              // Quando o app está aberto, a notificação push pode ser mostrada via Notification API manual,
              // ou podemos usar um toast da UI. Para compatibilidade, usaremos a Notification API nativa.
              new Notification(payload.notification.title || "Notificação", {
                body: payload.notification.body,
                icon: payload.notification.icon || "/icon.png",
              });
            }
          });
        }
      } catch (err) {
        console.error("Erro ao registrar FCM token:", err);
      }
    };

    setupFCM();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser]);
}
