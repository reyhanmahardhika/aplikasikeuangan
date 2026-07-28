import { config } from "./config.js";
import { pool } from "./db/pool.js";
import { createApp } from "./app.js";
import { syncGoldPrice } from "./services/goldPriceService.js";
import { sendDueSchedulePushes, sendDueSharedWalletReminders } from "./services/pushNotificationService.js";

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`API running on http://localhost:${config.port}`);
});

const pushTimer = setInterval(() => {
  sendDueSchedulePushes().catch((error) => console.error("Schedule push check failed", error));
  sendDueSharedWalletReminders().catch((error) => console.error("Shared wallet reminder check failed", error));
}, 15 * 60 * 1000);
pushTimer.unref();

const goldPriceTimer = setInterval(() => {
  syncGoldPrice(true).catch((error) => console.error("Gold price sync failed", error));
}, Math.max(1, config.goldPriceSyncHours) * 60 * 60 * 1000);
goldPriceTimer.unref();

sendDueSchedulePushes().catch((error) => console.error("Initial schedule push check failed", error));
sendDueSharedWalletReminders().catch((error) => console.error("Initial shared wallet reminder check failed", error));
syncGoldPrice(false).catch((error) => console.error("Initial gold price sync failed", error));

process.on("SIGINT", async () => {
  clearInterval(pushTimer);
  clearInterval(goldPriceTimer);
  server.close();
  await pool.end();
  process.exit(0);
});
