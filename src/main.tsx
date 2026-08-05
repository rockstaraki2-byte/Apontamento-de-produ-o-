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

// SW do Firebase Messaging separado do SW principal do PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/firebase-messaging-sw.js", {
        scope: "/firebase-cloud-messaging-push-scope",
      })
      .then((reg) => console.log("Firebase Messaging SW registrado:", reg))
      .catch((err) => console.error("Erro ao registrar Firebase Messaging SW:", err));
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
