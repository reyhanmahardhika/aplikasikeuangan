import { config } from "./config.js";
import { pool } from "./db/pool.js";
import { createApp } from "./app.js";
import { syncGoldPrice } from "./services/goldPriceService.js";
import { sendDueSchedulePushes, sendDueSharedWalletReminders } from "./services/pushNotificationService.js";
import { runDueAutoBudgets } from "./services/autoBudgetService.js";

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`API running on http://localhost:${config.port}`);
});

const pushTimer = setInterval(() => {
  sendDueSchedulePushes().catch((error) => console.error("Schedule push check failed", error));
  sendDueSharedWalletReminders().catch((error) => console.error("Shared wallet reminder check failed", error));
}, 15 * 60 * 1000);
pushTimer.unref();

let autoBudgetTimer: NodeJS.Timeout;
const scheduleAutoBudgetCheck = () => {
  const now = new Date();
  const next = new Date(now);
  next.setHours(7, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  autoBudgetTimer = setTimeout(async () => {
    await runDueAutoBudgets().catch((error) => console.error("Auto budgeting check failed", error));
    scheduleAutoBudgetCheck();
  }, next.getTime() - now.getTime());
  autoBudgetTimer.unref();
};
scheduleAutoBudgetCheck();

const goldPriceTimer = setInterval(() => {
  syncGoldPrice(true).catch((error) => console.error("Gold price sync failed", error));
}, Math.max(1, config.goldPriceSyncHours) * 60 * 60 * 1000);
goldPriceTimer.unref();

sendDueSchedulePushes().catch((error) => console.error("Initial schedule push check failed", error));
sendDueSharedWalletReminders().catch((error) => console.error("Initial shared wallet reminder check failed", error));
runDueAutoBudgets().catch((error) => console.error("Initial auto budgeting check failed", error));
syncGoldPrice(false).catch((error) => console.error("Initial gold price sync failed", error));

process.on("SIGINT", async () => {
  clearInterval(pushTimer);
  clearTimeout(autoBudgetTimer);
  clearInterval(goldPriceTimer);
  server.close();
  await pool.end();
  process.exit(0);
});
