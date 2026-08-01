import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import fs from "node:fs/promises";
import path from "node:path";
import pkg from "./package.json";

const appVersion = process.env.VITE_APP_VERSION?.trim() || `${pkg.version}-${Date.now()}`;
const versionPayload = JSON.stringify({ version: appVersion }, null, 2);

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion)
  },
  plugins: [
    {
      name: "finance-ai-version-file",
      configureServer(server) {
        server.middlewares.use("/version.json", (_req, res) => {
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
          res.end(versionPayload);
        });
      },
      async closeBundle() {
        await fs.writeFile(path.resolve("dist", "version.json"), versionPayload, "utf8");
      }
    },
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      includeAssets: ["icons/apple-touch-icon.png", "push-sw.js"],
      manifest: {
        name: "Keuangan AI",
        short_name: "Keuangan AI",
        description: "Pencatatan dan pengelolaan keuangan pribadi berbasis AI.",
        theme_color: "#101713",
        background_color: "#F4F6F2",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        scope: "/",
        lang: "id",
        categories: ["finance", "productivity"],
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        importScripts: ["/push-sw.js"]
      }
    })
  ],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true
  },
  server: {
    port: 5173
  }
});
