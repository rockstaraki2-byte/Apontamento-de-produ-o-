import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import { OrderPdfExportBridge } from "./OrderPdfExportBridge";
import {
  isDynamicImportLoadError,
  shouldAttemptDynamicImportReload,
} from "./utils/chunkLoadRecovery";
import "./index.css";

let appServiceWorkerRegistration: ServiceWorkerRegistration | undefined;

function checkForAppUpdate() {
  if (
    !appServiceWorkerRegistration ||
    !navigator.onLine ||
    document.visibilityState !== "visible"
  ) {
    return;
  }

  void appServiceWorkerRegistration.update().catch((error) => {
    console.warn("Não foi possível verificar atualização do aplicativo:", error);
  });
}

registerSW({
  onOfflineReady() {
    console.log("App pronto para uso offline");
  },
  onRegisteredSW(_serviceWorkerUrl, registration) {
    appServiceWorkerRegistration = registration;
    checkForAppUpdate();
    window.setInterval(checkForAppUpdate, 10 * 60 * 1000);
  },
  onRegisterError(error) {
    console.error("Erro ao registrar atualização do aplicativo:", error);
  },
  immediate: true,
});

window.addEventListener("focus", checkForAppUpdate);
window.addEventListener("online", checkForAppUpdate);
document.addEventListener("visibilitychange", checkForAppUpdate);

window.addEventListener("vite:preloadError", (event) => {
  const importError = (event as unknown as { payload?: unknown }).payload;
  if (!isDynamicImportLoadError(importError)) return;

  const recoveryKey = "apontapro:chunk-recovery-last-attempt";
  let lastAttemptAt: string | null = null;
  try {
    lastAttemptAt = sessionStorage.getItem(recoveryKey);
  } catch {
    // O bloqueio do armazenamento não deve impedir a atualização da tela.
  }

  if (!shouldAttemptDynamicImportReload(lastAttemptAt)) return;
  try {
    sessionStorage.setItem(recoveryKey, String(Date.now()));
  } catch {
    // A recarga ainda pode recuperar o aplicativo sem sessionStorage.
  }

  void (async () => {
    try {
      const registration =
        appServiceWorkerRegistration ??
        (await navigator.serviceWorker?.getRegistration());

      if (registration) {
        const controllerChange = new Promise<void>((resolve) => {
          navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), {
            once: true,
          });
        });
        const updateCheck = registration.update().catch(() => undefined);
        await Promise.race([
          updateCheck,
          new Promise<void>((resolve) => window.setTimeout(resolve, 1000)),
        ]);
        registration.waiting?.postMessage({ type: "SKIP_WAITING" });
        await Promise.race([
          controllerChange,
          new Promise<void>((resolve) => window.setTimeout(resolve, 1500)),
        ]);
      }
    } catch (error) {
      console.warn("Falha ao preparar a atualização após erro de módulo:", error);
    }

    window.location.reload();
  })();
});

// Registro isolado do Service Worker do Firebase Messaging,
// separado do sw.js gerado pelo vite-plugin-pwa, evitando conflito de registro.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/firebase-messaging-sw.js", { scope: "/firebase-cloud-messaging-push-scope" })
    .then((reg) => console.log("Firebase Messaging SW registrado:", reg))
    .catch((err) => console.error("Erro ao registrar Firebase Messaging SW:", err));
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <OrderPdfExportBridge />
  </StrictMode>,
);
