import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import {
  addWalletMember,
  approveWalletEntry,
  createWallet,
  createWalletEntry,
  createWalletReminder,
  getPrivacy,
  listWalletReminders,
  listWallets,
  respondWalletInvite,
  searchPeople,
  updatePrivacy,
  walletDetail
} from "../services/socialService.js";
import {
  getCurrentGoldPrice,
  listGoldPrices,
  listWalletChangeRequests,
  removeWalletMember,
  reviewWalletChangeRequest,
  syncGoldPriceNow,
  updateWallet,
  updateWalletMember
} from "../services/walletManagementService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const uuid = z.string().uuid();
const text = (max: number) => z.string().trim().min(1).max(max);

const walletSchema = z.object({
  name: text(120),
  description: z.string().trim().max(500).optional(),
  spendingLimit: z.union([z.string(), z.number()]).optional(),
  requireApproval: z.boolean().optional(),
  memberIds: z.array(uuid).max(50).optional(),
  adminIds: z.array(uuid).max(50).optional(),
  storageAccountId: uuid.optional().nullable(),
  storageType: z.enum(["cash", "bank", "e_wallet", "gold", "other"]).default("cash"),
  storageProvider: z.string().trim().max(120).optional(),
  storageAccountNumber: z.string().trim().max(120).optional()
});

const walletUpdateSchema = z.object({
  name: text(120).optional(),
  description: z.string().trim().max(500).optional(),
  spendingLimit: z.union([z.string(), z.number()]).optional(),
  requireApproval: z.boolean().optional(),
  storageAccountId: uuid.optional().nullable(),
  storageType: z.enum(["cash", "bank", "e_wallet", "gold", "other"]).optional(),
  storageProvider: z.string().trim().max(120).optional(),
  storageAccountNumber: z.string().trim().max(120).optional(),
  expenseSplitRule: z.enum(["equal", "percentage", "manual"]).optional(),
  activeUntil: z.union([z.string().datetime(), z.null()]).optional()
});

const walletMemberUpdateSchema = z.object({
  role: z.enum(["admin", "member", "viewer"]).optional(),
  status: z.enum(["accepted", "rejected", "pending"]).optional(),
  displayName: z.string().trim().min(1).max(120).optional(),
  memberNote: z.union([z.string().trim().max(255), z.null()]).optional()
});

export const socialRoutes = Router();
socialRoutes.use(requireAuth);

socialRoutes.get("/people/search", asyncHandler(async (req, res) => {
  res.json(await searchPeople(req.user!.id, String(req.query.q ?? ""), {
    exact: String(req.query.exact ?? "") === "1",
    pocketInvite: String(req.query.purpose ?? "") === "pocket_invite"
  }));
}));

socialRoutes.get("/wallets", asyncHandler(async (req, res) => {
  res.json(await listWallets(req.user!.id));
}));

socialRoutes.post("/wallets", asyncHandler(async (req, res) => {
  res.status(201).json(await createWallet(req.user!.id, walletSchema.parse(req.body)));
}));

socialRoutes.get("/wallets/:id", asyncHandler(async (req, res) => {
  res.json(await walletDetail(req.user!.id, req.params.id as string));
}));

socialRoutes.put("/wallets/:id", asyncHandler(async (req, res) => {
  res.json(await updateWallet(req.user!.id, req.params.id as string, walletUpdateSchema.parse(req.body)));
}));

socialRoutes.post("/wallets/:id/members", asyncHandler(async (req, res) => {
  const input = z.object({ userId: uuid, role: z.enum(["admin", "member", "viewer"]) }).parse(req.body);
  res.status(201).json(await addWalletMember(req.user!.id, req.params.id as string, input));
}));

socialRoutes.put("/wallets/:id/members/:targetUserId", asyncHandler(async (req, res) => {
  res.json(await updateWalletMember(
    req.user!.id,
    req.params.id as string,
    req.params.targetUserId as string,
    walletMemberUpdateSchema.parse(req.body)
  ));
}));

socialRoutes.delete("/wallets/:id/members/:targetUserId", asyncHandler(async (req, res) => {
  res.json(await removeWalletMember(req.user!.id, req.params.id as string, req.params.targetUserId as string));
}));

socialRoutes.put("/wallets/:id/invite", asyncHandler(async (req, res) => {
  const input = z.object({ status: z.enum(["accepted", "rejected"]) }).parse(req.body);
  res.json(await respondWalletInvite(req.user!.id, req.params.id as string, input.status));
}));

socialRoutes.get("/wallets/:id/reminders", asyncHandler(async (req, res) => {
  res.json(await listWalletReminders(req.user!.id, req.params.id as string));
}));

socialRoutes.post("/wallets/:id/reminders", asyncHandler(async (req, res) => {
  const input = z.object({
    intervalType: z.enum(["daily", "weekly", "monthly"]),
    reminderTime: z.string().regex(/^\d{2}:\d{2}$/),
    dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
    dayOfMonth: z.number().int().min(1).max(31).optional().nullable(),
    entryType: z.enum(["deposit", "expense"]),
    message: text(240),
    targetUserId: uuid.optional().nullable(),
    timezone: z.literal("Asia/Jakarta").default("Asia/Jakarta")
  }).parse(req.body);
  res.status(201).json(await createWalletReminder(req.user!.id, req.params.id as string, input));
}));

socialRoutes.get("/wallets/:id/change-requests", asyncHandler(async (req, res) => {
  res.json(await listWalletChangeRequests(req.user!.id, req.params.id as string));
}));

socialRoutes.put("/wallets/:id/change-requests/:requestId", asyncHandler(async (req, res) => {
  const input = z.object({
    decision: z.enum(["approved", "rejected"]),
    comment: z.string().trim().max(255).optional()
  }).parse(req.body);
  res.json(await reviewWalletChangeRequest(
    req.user!.id,
    req.params.id as string,
    req.params.requestId as string,
    input
  ));
}));

socialRoutes.post("/wallets/:id/entries", asyncHandler(async (req, res) => {
  const input = z.object({
    entryType: z.enum(["deposit", "expense"]),
    amount: z.union([z.string(), z.number()]).optional(),
    goldWeightGrams: z.number().optional(),
    description: text(220),
    transactionDate: z.string().date(),
    receiptId: uuid.optional().nullable()
  }).parse(req.body);
  res.status(201).json(await createWalletEntry(req.user!.id, req.params.id as string, input));
}));

socialRoutes.put("/wallet-entries/:id/approve", asyncHandler(async (req, res) => {
  const input = z.object({ status: z.enum(["approved", "rejected"]) }).parse(req.body);
  res.json(await approveWalletEntry(req.user!.id, req.params.id as string, input.status));
}));

socialRoutes.get("/gold-prices", asyncHandler(async (req, res) => {
  const limit = z.coerce.number().int().min(1).max(100).default(30).parse(req.query.limit);
  res.json(await listGoldPrices(limit));
}));

socialRoutes.get("/gold-prices/current", asyncHandler(async (_req, res) => {
  res.json(await getCurrentGoldPrice());
}));

socialRoutes.post("/gold-prices/sync", asyncHandler(async (_req, res) => {
  res.json(await syncGoldPriceNow());
}));

socialRoutes.get("/privacy", asyncHandler(async (req, res) => {
  res.json(await getPrivacy(req.user!.id));
}));

socialRoutes.put("/privacy", asyncHandler(async (req, res) => {
  const input = z.object({
    allowWalletInvites: z.boolean(),
    allowGroupInvites: z.boolean(),
    searchableBy: z.enum(["everyone", "username", "friends", "nobody"]),
    hidePhone: z.boolean()
  }).parse(req.body);
  res.json(await updatePrivacy(req.user!.id, input));
}));
