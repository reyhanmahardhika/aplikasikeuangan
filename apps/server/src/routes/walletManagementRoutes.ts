import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  updateWallet,
  updateWalletMember,
  removeWalletMember,
  listGoldPrices,
  getCurrentGoldPrice,
  listWalletChangeRequests,
  reviewWalletChangeRequest,
  syncGoldPriceNow
} from "../services/walletManagementService.js";

const uuid = z.string().uuid();
const text = (max: number) => z.string().trim().min(1).max(max);

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

export const walletManagementRoutes = Router();
walletManagementRoutes.use(requireAuth);

// Update wallet details
walletManagementRoutes.put("/wallets/:id", asyncHandler(async (req, res) => {
  res.json(await updateWallet(req.user!.id, req.params.id as string, walletUpdateSchema.parse(req.body)));
}));

// Update wallet member role or status
walletManagementRoutes.put("/wallets/:id/members/:targetUserId", asyncHandler(async (req, res) => {
  res.json(await updateWalletMember(
    req.user!.id,
    req.params.id as string,
    req.params.targetUserId as string,
    walletMemberUpdateSchema.parse(req.body)
  ));
}));

// Remove member from wallet
walletManagementRoutes.delete("/wallets/:id/members/:targetUserId", asyncHandler(async (req, res) => {
  res.json(await removeWalletMember(
    req.user!.id,
    req.params.id as string,
    req.params.targetUserId as string
  ));
}));

// Get gold price history
walletManagementRoutes.get("/gold-prices", asyncHandler(async (req, res) => {
  const limit = z.coerce.number().int().min(1).max(100).default(30).parse(req.query.limit);
  res.json(await listGoldPrices(limit));
}));

// Get current gold price
walletManagementRoutes.get("/gold-prices/current", asyncHandler(async (req, res) => {
  res.json(await getCurrentGoldPrice());
}));

walletManagementRoutes.post("/gold-prices/sync", asyncHandler(async (_req, res) => {
  res.json(await syncGoldPriceNow());
}));

walletManagementRoutes.get("/wallets/:id/change-requests", asyncHandler(async (req, res) => {
  res.json(await listWalletChangeRequests(req.user!.id, req.params.id as string));
}));

walletManagementRoutes.put("/wallets/:id/change-requests/:requestId", asyncHandler(async (req, res) => {
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
