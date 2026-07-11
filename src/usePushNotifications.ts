import React, { useEffect, useRef } from "react";
import { messagingPromise } from "./firebase";
import { getToken, onMessage } from "firebase/messaging";
import type { User } from "./types";
import { useDatabase } from "./useDatabase";

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

          let swRegistration = null;
          try {
            // Usa o service worker principal ativo (/sw.js) que importa as funcionalidades de mensagens
            swRegistration = await navigator.serviceWorker.ready;
            console.log('Utilizando Service Worker ativo para FCM com escopo:', swRegistration.scope);
          } catch(e) {
            console.error('Falha ao obter Service Worker ativo para FCM:', e);
          }

          const currentToken = await getToken(messaging, { 
            vapidKey,
            serviceWorkerRegistration: swRegistration || undefined 
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

