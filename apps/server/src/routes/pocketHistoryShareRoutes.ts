import { Router } from "express";
import path from "node:path";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createPocketHistoryShare, getPublicPocketHistory, getPublicPocketHistoryAttachment, listActivePocketHistoryShares } from "../services/pocketHistoryShareService.js";

export const pocketHistoryShareRoutes = Router();
export const publicPocketHistoryRoutes = Router();

function contentTypeFromFileName(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  if ([".jpg", ".jpeg"].includes(extension)) return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".gif") return "image/gif";
  if (extension === ".webp") return "image/webp";
  if ([".heic", ".heif"].includes(extension)) return "image/heic";
  if (extension === ".mp4") return "video/mp4";
  if (extension === ".mov") return "video/quicktime";
  if (extension === ".webm") return "video/webm";
  if (extension === ".pdf") return "application/pdf";
  return "application/octet-stream";
}

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
  const headers = {
    "Content-Type": file.content_type || contentTypeFromFileName(file.file_name),
    "Content-Disposition": `inline; filename="${file.file_name.replace(/"/g, "")}"`,
    "Cache-Control": "private, max-age=300"
  };
  if (file.file_data) {
    res.set(headers);
    res.send(file.file_data);
    return;
  }
  res.sendFile(path.resolve(file.file_url), { headers });
}));
