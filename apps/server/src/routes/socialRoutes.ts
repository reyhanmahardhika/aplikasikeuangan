import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  addComment,
  addGroupMember,
  addWalletMember,
  approveWalletEntry,
  confirmExpense,
  confirmSettlement,
  createGroup,
  createGroupExpense,
  createSettlement,
  createWallet,
  createWalletEntry,
  friendProfile,
  getPrivacy,
  groupDetail,
  listActivity,
  listComments,
  listFriends,
  listGroups,
  listWallets,
  listWalletReminders,
  markActivityRead,
  removeOrBlockFriend,
  reportUser,
  requestFriend,
  respondFriend,
  respondGroupInvite,
  respondWalletInvite,
  searchPeople,
  socialSummary,
  updatePrivacy,
  updateGroupExpense,
  createWalletReminder,
  walletDetail
} from "../services/socialService.js";

const uuid = z.string().uuid();
const text = (max: number) => z.string().trim().min(1).max(max);

const groupSchema = z.object({
  name: text(120),
  description: z.string().trim().max(500).optional(),
  memberIds: z.array(uuid).max(50).optional()
});

const expenseSchema = z.object({
  description: text(220),
  amount: z.union([z.string(), z.number()]),
  paidBy: uuid,
  participantIds: z.array(uuid).min(1).max(100),
  customShares: z.array(z.object({
    userId: uuid,
    amount: z.union([z.string(), z.number()])
  })).max(100).optional(),
  expenseDate: z.string().datetime().optional()
});

const walletSchema = z.object({
  name: text(120),
  description: z.string().trim().max(500).optional(),
  spendingLimit: z.union([z.string(), z.number()]).optional(),
  requireApproval: z.boolean().optional(),
  memberIds: z.array(uuid).max(50).optional(),
  adminIds: z.array(uuid).max(50).optional(),
  storageAccountId: uuid.optional().nullable(),
  storageType: z.enum(["cash", "bank", "e_wallet", "other"]).default("cash"),
  storageProvider: z.string().trim().max(120).optional(),
  storageAccountNumber: z.string().trim().max(120).optional()
});

export const socialRoutes = Router();
socialRoutes.use(requireAuth);

socialRoutes.get("/summary", asyncHandler(async (req, res) => {
  res.json(await socialSummary(req.user!.id));
}));

socialRoutes.get("/people/search", asyncHandler(async (req, res) => {
  res.json(await searchPeople(req.user!.id, String(req.query.q ?? "")));
}));

socialRoutes.get("/friends", asyncHandler(async (req, res) => {
  res.json(await listFriends(req.user!.id));
}));

socialRoutes.post("/friends/request", asyncHandler(async (req, res) => {
  const input = z.object({
    identifier: text(255),
    targetUserId: uuid.optional()
  }).parse(req.body);
  res.status(201).json(await requestFriend(req.user!.id, input.identifier, input.targetUserId));
}));

socialRoutes.put("/friends/:id/respond", asyncHandler(async (req, res) => {
  const input = z.object({ status: z.enum(["accepted", "rejected"]) }).parse(req.body);
  res.json(await respondFriend(req.user!.id, req.params.id as string, input.status));
}));

socialRoutes.delete("/friends/:id", asyncHandler(async (req, res) => {
  res.json(await removeOrBlockFriend(req.user!.id, req.params.id as string, false));
}));

socialRoutes.post("/friends/:id/block", asyncHandler(async (req, res) => {
  res.json(await removeOrBlockFriend(req.user!.id, req.params.id as string, true));
}));

socialRoutes.get("/friends/profile/:userId", asyncHandler(async (req, res) => {
  res.json(await friendProfile(req.user!.id, req.params.userId as string));
}));

socialRoutes.post("/people/:userId/report", asyncHandler(async (req, res) => {
  const input = z.object({ reason: text(500) }).parse(req.body);
  res.status(201).json(await reportUser(req.user!.id, req.params.userId as string, input.reason));
}));

socialRoutes.get("/groups", asyncHandler(async (req, res) => {
  res.json(await listGroups(req.user!.id));
}));

socialRoutes.post("/groups", asyncHandler(async (req, res) => {
  res.status(201).json(await createGroup(req.user!.id, groupSchema.parse(req.body)));
}));

socialRoutes.get("/groups/:id", asyncHandler(async (req, res) => {
  res.json(await groupDetail(req.user!.id, req.params.id as string));
}));

socialRoutes.put("/groups/:id/invite", asyncHandler(async (req, res) => {
  const input = z.object({ status: z.enum(["accepted", "rejected"]) }).parse(req.body);
  res.json(await respondGroupInvite(req.user!.id, req.params.id as string, input.status));
}));

socialRoutes.post("/groups/:id/members", asyncHandler(async (req, res) => {
  const input = z.object({ userId: uuid }).parse(req.body);
  res.status(201).json(await addGroupMember(req.user!.id, req.params.id as string, input.userId));
}));

socialRoutes.post("/groups/:id/expenses", asyncHandler(async (req, res) => {
  res.status(201).json(await createGroupExpense(req.user!.id, req.params.id as string, expenseSchema.parse(req.body)));
}));

socialRoutes.put("/expenses/:id", asyncHandler(async (req, res) => {
  res.json(await updateGroupExpense(req.user!.id, req.params.id as string, expenseSchema.parse(req.body)));
}));

socialRoutes.put("/expenses/:id/confirm", asyncHandler(async (req, res) => {
  const input = z.object({ status: z.enum(["confirmed", "rejected", "paid"]) }).parse(req.body);
  res.json(await confirmExpense(req.user!.id, req.params.id as string, input.status));
}));

socialRoutes.post("/groups/:id/settlements", asyncHandler(async (req, res) => {
  const input = z.object({ toUserId: uuid, amount: z.union([z.string(), z.number()]) }).parse(req.body);
  res.status(201).json(await createSettlement(req.user!.id, req.params.id as string, input));
}));

socialRoutes.put("/settlements/:id/confirm", asyncHandler(async (req, res) => {
  const input = z.object({ status: z.enum(["confirmed", "cancelled"]) }).parse(req.body);
  res.json(await confirmSettlement(req.user!.id, req.params.id as string, input.status));
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

socialRoutes.post("/wallets/:id/members", asyncHandler(async (req, res) => {
  const input = z.object({ userId: uuid, role: z.enum(["admin", "member", "viewer"]) }).parse(req.body);
  res.status(201).json(await addWalletMember(req.user!.id, req.params.id as string, input));
}));

socialRoutes.put("/wallets/:id/invite", asyncHandler(async (req, res) => {
  const input = z.object({ status: z.enum(["accepted", "rejected"]) }).parse(req.body);
  res.json(await respondWalletInvite(req.user!.id, req.params.id as string, input.status));
}));

socialRoutes.post("/wallets/:id/entries", asyncHandler(async (req, res) => {
  const input = z.object({
    entryType: z.enum(["deposit", "expense"]),
    amount: z.union([z.string(), z.number()]),
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

socialRoutes.get("/activity", asyncHandler(async (req, res) => {
  const query = z.object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    offset: z.coerce.number().int().min(0).default(0)
  }).parse(req.query);
  res.json(await listActivity(req.user!.id, query.limit, query.offset));
}));

socialRoutes.put("/activity/read", asyncHandler(async (req, res) => {
  const input = z.object({ eventId: uuid.optional() }).parse(req.body);
  res.json(await markActivityRead(req.user!.id, input.eventId));
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

socialRoutes.get("/comments/:entityType/:entityId", asyncHandler(async (req, res) => {
  res.json(await listComments(req.user!.id, req.params.entityType as string, req.params.entityId as string));
}));

socialRoutes.post("/comments/:entityType/:entityId", asyncHandler(async (req, res) => {
  const input = z.object({ message: text(1000) }).parse(req.body);
  res.status(201).json(await addComment(
    req.user!.id,
    req.params.entityType as string,
    req.params.entityId as string,
    input.message
  ));
}));
