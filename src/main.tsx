import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import { OrderPdfExportBridge } from "./OrderPdfExportBridge";
import "./index.css";

let appServiceWorkerRegistration: ServiceWorkerRegistration | undefined;
let appUpdateAvailable = false;
let userRequestedAppUpdate = false;
const appUpdateEvent = "apontapro:app-update-available";

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

const updateAppServiceWorker = registerSW({
  onOfflineReady() {
    console.log("App pronto para uso offline");
  },
  onNeedRefresh() {
    appUpdateAvailable = true;
    window.dispatchEvent(new Event(appUpdateEvent));
  },
  onNeedReload() {
    if (!userRequestedAppUpdate) return;
    userRequestedAppUpdate = false;
    window.location.reload();
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

function AppUpdatePrompt() {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(appUpdateAvailable);

  useEffect(() => {
    const showUpdatePrompt = () => setIsUpdateAvailable(true);
    window.addEventListener(appUpdateEvent, showUpdatePrompt);
    if (appUpdateAvailable) showUpdatePrompt();
    return () => window.removeEventListener(appUpdateEvent, showUpdatePrompt);
  }, []);

  if (!isUpdateAvailable) return null;

  const applyUpdate = () => {
    userRequestedAppUpdate = true;
    void updateAppServiceWorker().catch((error) => {
      userRequestedAppUpdate = false;
      console.error("Não foi possível aplicar a atualização do aplicativo:", error);
    });
  };

  return (
    <div
      className="fixed inset-x-3 bottom-20 z-[200] mx-auto max-w-xl rounded-2xl border border-sky-300/30 bg-[#032D51] p-4 text-white shadow-2xl md:bottom-4"
      role="status"
      aria-live="polite"
    >
      <p className="font-bold">Nova versão disponível</p>
      <p className="mt-1 text-sm text-slate-100">
        O ApontaPRO vai aguardar. Continue trabalhando e atualize quando terminar.
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setIsUpdateAvailable(false)}
          className="rounded-lg px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
        >
          Agora não
        </button>
        <button
          type="button"
          onClick={applyUpdate}
          className="rounded-lg bg-sky-400 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-sky-300"
        >
          Atualizar agora
        </button>
      </div>
    </div>
  );
}

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
    <AppUpdatePrompt />
  </StrictMode>,
);
