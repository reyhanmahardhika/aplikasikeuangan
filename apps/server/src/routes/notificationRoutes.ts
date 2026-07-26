import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { pool } from "../db/pool.js";
import {
  getPushConfig,
  removePushSubscription,
  savePushSubscription
} from "../services/pushNotificationService.js";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1)
  })
});

export const notificationRoutes = Router();
notificationRoutes.use(requireAuth);

notificationRoutes.get("/push/config", (_req, res) => {
  res.json(getPushConfig());
});

notificationRoutes.post("/push/subscribe", asyncHandler(async (req, res) => {
  const subscription = subscriptionSchema.parse(req.body);
  res.status(201).json(await savePushSubscription(
    req.user!.id,
    subscription,
    req.headers["user-agent"]
  ));
}));

notificationRoutes.delete("/push/subscribe", asyncHandler(async (req, res) => {
  const input = z.object({ endpoint: z.string().url() }).parse(req.body);
  res.json(await removePushSubscription(req.user!.id, input.endpoint));
}));

notificationRoutes.put("/language", asyncHandler(async (req, res) => {
  const input = z.object({ language: z.enum(["en", "id"]) }).parse(req.body);
  await pool.query("UPDATE users SET preferred_language = $1 WHERE id = $2", [input.language, req.user!.id]);
  res.json({ language: input.language });
}));
