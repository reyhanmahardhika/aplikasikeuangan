import { config } from "./config.js";
import { pool } from "./db/pool.js";
import { createApp } from "./app.js";
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
sendDueSchedulePushes().catch((error) => console.error("Initial schedule push check failed", error));
sendDueSharedWalletReminders().catch((error) => console.error("Initial shared wallet reminder check failed", error));

process.on("SIGINT", async () => {
  clearInterval(pushTimer);
  server.close();
  await pool.end();
  process.exit(0);
});
