import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./styles.css";

declare const __APP_VERSION__: string;

let updateRegistration: ServiceWorkerRegistration | undefined;
let lastUpdateCheck = 0;
let reloadingForUpdate = false;
let lastVersionCheck = 0;

const forceReloadForLatestVersion = async (latestVersion: string) => {
  if (reloadingForUpdate) return;
  const reloadKey = `finance-ai-version-reload:${latestVersion}`;
  if (sessionStorage.getItem(reloadKey) === "1") {
    void updateRegistration?.update().catch(() => undefined);
    return;
  }
  reloadingForUpdate = true;
  sessionStorage.setItem(reloadKey, "1");

  try {
    await updateRegistration?.update();
    if ("caches" in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    }
  } catch {
    // Reload anyway; a fresh navigation is still the best recovery path.
  } finally {
    window.location.reload();
  }
};

const checkForAppVersion = () => {
  if (document.visibilityState === "hidden" || !navigator.onLine) return;
  const now = Date.now();
  if (now - lastVersionCheck < 10_000) return;
  lastVersionCheck = now;

  void fetch(`/version.json?t=${now}`, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" }
  })
    .then((response) => response.ok ? response.json() as Promise<{ version?: string }> : null)
    .then((payload) => {
      const latestVersion = payload?.version?.trim();
      if (!latestVersion || latestVersion === __APP_VERSION__) return;
      void forceReloadForLatestVersion(latestVersion);
    })
    .catch(() => undefined);
};

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
    checkForAppVersion();
  }
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloadingForUpdate) return;
    reloadingForUpdate = true;
    window.location.reload();
  });
  const checkForUpdates = () => {
    checkForPwaUpdate();
    checkForAppVersion();
  };
  window.addEventListener("focus", checkForUpdates);
  window.addEventListener("pageshow", checkForUpdates);
  window.addEventListener("online", checkForUpdates);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkForUpdates();
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
