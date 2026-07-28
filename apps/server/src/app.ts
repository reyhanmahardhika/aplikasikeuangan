import express from "express";
import cors from "cors";
import helmet from "helmet";
import fs from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";
import { apiRateLimiter } from "./middleware/rateLimit.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";
import { authRoutes } from "./routes/authRoutes.js";
import { accountRoutes } from "./routes/accountRoutes.js";
import { assistantRoutes } from "./routes/assistantRoutes.js";
import { budgetRoutes } from "./routes/budgetRoutes.js";
import { categoryRoutes } from "./routes/categoryRoutes.js";
import { dashboardRoutes } from "./routes/dashboardRoutes.js";
import { receiptRoutes } from "./routes/receiptRoutes.js";
import { reportRoutes } from "./routes/reportRoutes.js";
import { scheduleRoutes } from "./routes/scheduleRoutes.js";
import { transactionRoutes } from "./routes/transactionRoutes.js";
import { transferRoutes } from "./routes/transferRoutes.js";
import { socialRoutes } from "./routes/socialRoutes.js";
import { notificationRoutes } from "./routes/notificationRoutes.js";
import { walletManagementRoutes } from "./routes/walletManagementRoutes.js";

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        const localDevelopmentOrigin = config.nodeEnv !== "production"
          && Boolean(origin?.match(/^http:\/\/(localhost|127\.0\.0\.1):\d+$/));
        if (!origin || origin === config.clientUrl || localDevelopmentOrigin) {
          callback(null, true);
          return;
        }
        callback(new Error("Origin tidak diizinkan"));
      },
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(apiRateLimiter);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, name: "Aplikasi Keuangan AI" });
  });

  if (config.nodeEnv !== "production") {
    const sanitizeSessionId = (value: unknown) => {
      const normalized = (typeof value === "string" ? value : "unknown")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 64);
      return normalized || "unknown";
    };

    const debugDir = path.resolve(process.cwd(), ".dbg");

    app.post("/api/__debug/log", async (req, res, next) => {
      try {
        const sessionId = sanitizeSessionId(req.body?.sessionId);
        const logPath = path.join(debugDir, `trae-debug-log-${sessionId}.ndjson`);
        const payload = {
          ts: new Date().toISOString(),
          sessionId,
          event: req.body?.event ?? null,
          data: req.body?.data ?? null
        };
        await fs.mkdir(debugDir, { recursive: true });
        await fs.appendFile(logPath, `${JSON.stringify(payload)}\n`, "utf8");
        res.json({ ok: true });
      } catch (error) {
        next(error);
      }
    });

    app.get("/api/__debug/logs", async (req, res, next) => {
      try {
        const sessionId = sanitizeSessionId(req.query.sessionId);
        const tail = Math.max(1, Math.min(Number(req.query.tail ?? 200), 2000));
        const logPath = path.join(debugDir, `trae-debug-log-${sessionId}.ndjson`);
        const raw = await fs.readFile(logPath, "utf8").catch(() => "");
        if (!raw) {
          res.json({ sessionId, lines: [] });
          return;
        }
        const lines = raw.split("\n").filter(Boolean);
        res.json({ sessionId, lines: lines.slice(-tail) });
      } catch (error) {
        next(error);
      }
    });

    app.delete("/api/__debug/logs", async (req, res, next) => {
      try {
        const sessionId = sanitizeSessionId(req.query.sessionId);
        const logPath = path.join(debugDir, `trae-debug-log-${sessionId}.ndjson`);
        await fs.unlink(logPath).catch(() => undefined);
        res.json({ ok: true });
      } catch (error) {
        next(error);
      }
    });
  }

  app.use("/api/auth", authRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/accounts", accountRoutes);
  app.use("/api/transactions", transactionRoutes);
  app.use("/api/receipts", receiptRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/budgets", budgetRoutes);
  app.use("/api/transfers", transferRoutes);
  app.use("/api/schedules", scheduleRoutes);
  app.use("/api/reports", reportRoutes);
  app.use("/api/assistant", assistantRoutes);
  app.use("/api/social", socialRoutes);
  app.use("/api/social", walletManagementRoutes);
  app.use("/api/notifications", notificationRoutes);

  app.use(errorMiddleware);
  return app;
}



