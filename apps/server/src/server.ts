import { config } from "./config.js";
import { pool } from "./db/pool.js";
import { createApp } from "./app.js";
import { sendDueSchedulePushes } from "./services/pushNotificationService.js";
import { runDueAutoBudgets } from "./services/autoBudgetService.js";

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`API running on http://localhost:${config.port}`);
});

const pushTimer = setInterval(() => {
  sendDueSchedulePushes().catch((error) => console.error("Schedule push check failed", error));
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

sendDueSchedulePushes().catch((error) => console.error("Initial schedule push check failed", error));
runDueAutoBudgets().catch((error) => console.error("Initial auto budgeting check failed", error));

process.on("SIGINT", async () => {
  clearInterval(pushTimer);
  clearTimeout(autoBudgetTimer);
  server.close();
  await pool.end();
  process.exit(0);
});
