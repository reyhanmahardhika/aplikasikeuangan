import { Router } from "express";
import path from "node:path";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createPocketHistoryShare, getPublicPocketHistory, getPublicPocketHistoryAttachment, listActivePocketHistoryShares } from "../services/pocketHistoryShareService.js";

export const pocketHistoryShareRoutes = Router();
export const publicPocketHistoryRoutes = Router();

pocketHistoryShareRoutes.post("/:id/history-shares", requireAuth, asyncHandler(async (req, res) => {
  const input = z.object({
    dateFrom: z.string().date(),
    dateTo: z.string().date(),
    transactionType: z.enum(["income", "expense"]).nullable().optional(),
    categoryId: z.string().uuid().nullable().optional(),
    expiresInDays: z.number().int().min(1).max(30).default(7),
    language: z.enum(["id", "en"]).default("id")
  }).refine((value) => value.dateTo >= value.dateFrom, { message: "Rentang tanggal tidak valid" }).parse(req.body);
  const share = await createPocketHistoryShare(req.user!.id, req.params.id as string, input);
  res.status(201).json(share);
}));

pocketHistoryShareRoutes.get("/:id/history-shares", requireAuth, asyncHandler(async (req, res) => {
  res.json(await listActivePocketHistoryShares(req.user!.id, req.params.id as string));
}));

publicPocketHistoryRoutes.get("/pocket-history/:token", asyncHandler(async (req, res) => {
  const token = z.string().uuid().parse(req.params.token);
  res.json(await getPublicPocketHistory(token));
}));

publicPocketHistoryRoutes.get("/pocket-history/:token/transactions/:transactionId/attachment", asyncHandler(async (req, res) => {
  const token = z.string().uuid().parse(req.params.token);
  const transactionId = z.string().uuid().parse(req.params.transactionId);
  const file = await getPublicPocketHistoryAttachment(token, transactionId);
  res.sendFile(path.resolve(file.file_url));
}));
