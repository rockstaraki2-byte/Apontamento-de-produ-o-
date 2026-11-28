import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

registerSW({
  onOfflineReady() {
    console.log("App pronto para uso offline");
  },
  // A versão atual permanece em uso até o próximo acesso. Nenhuma aba é
  // recarregada quando outro service worker assume o controle.
  onNeedReload() {
    console.info("Nova versão disponível no próximo acesso ao ApontaPRO.");
  },
  onRegisteredSW(_serviceWorkerUrl, registration) {
    // Verifica uma vez ao abrir para preparar a versão offline seguinte.
    if (registration && navigator.onLine) {
      void registration.update().catch((error) => {
        console.warn("Não foi possível verificar atualização do aplicativo:", error);
      });
    }
  },
  onRegisterError(error) {
    console.error("Erro ao registrar atualização do aplicativo:", error);
  },
  immediate: true,
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
  </StrictMode>,
);
