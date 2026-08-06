import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm("Nova versão do sistema disponível. Deseja atualizar agora?")) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log("App pronto para uso offline");
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
