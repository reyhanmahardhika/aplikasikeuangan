import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./styles.css";

let updateRegistration: ServiceWorkerRegistration | undefined;
let lastUpdateCheck = 0;
let reloadingForUpdate = false;

const checkForPwaUpdate = () => {
  if (document.visibilityState === "hidden" || !navigator.onLine) return;
  const now = Date.now();
  if (now - lastUpdateCheck < 10_000) return;
  lastUpdateCheck = now;
  void updateRegistration?.update().catch(() => undefined);
};

const updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh() {
    void updateServiceWorker(true);
  },
  onRegisteredSW(_swUrl, registration) {
    updateRegistration = registration;
    checkForPwaUpdate();
  }
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloadingForUpdate) return;
    reloadingForUpdate = true;
    window.location.reload();
  });
  window.addEventListener("focus", checkForPwaUpdate);
  window.addEventListener("pageshow", checkForPwaUpdate);
  window.addEventListener("online", checkForPwaUpdate);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkForPwaUpdate();
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
