import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createRelationshipFinance,
  createRelationshipGoalContribution,
  createRelationshipGoal,
  getRelationshipFinance,
  getRelationshipPrivacy,
  listRelationshipGoalContributions,
  listRelationshipFinances,
  listRelationshipGoals,
  listRelationshipTimeline,
  relationshipCopilotContext,
  relationshipOverview,
  respondRelationshipInvitation,
  updateRelationshipGoal,
  updateRelationshipPrivacy
} from "../services/relationshipFinanceService.js";

const uuid = z.string().uuid();
const visibility = z.enum(["private", "summary_only", "shared"]);

const privacySchema = z.object({
  incomeVisibility: visibility.optional(),
  expenseVisibility: visibility.optional(),
  accountsVisibility: visibility.optional(),
  transactionsVisibility: visibility.optional(),
  assetsVisibility: visibility.optional(),
  liabilitiesVisibility: visibility.optional(),
  investmentsVisibility: visibility.optional(),
  goalsVisibility: visibility.optional()
});

const relationshipCreateSchema = z.object({
  partnerUserId: uuid,
  workspaceName: z.string().trim().min(2).max(140),
  relationshipType: z.enum(["partner", "married_couple", "family"]).default("partner"),
  privacy: privacySchema.optional()
});

const goalSchema = z.object({
  name: z.string().trim().min(2).max(160),
  goalType: z.enum(["wedding", "home", "vehicle", "vacation", "education", "emergency_fund", "investment", "business", "retirement", "custom"]).default("custom"),
  icon: z.string().trim().min(1).max(64).default("Target"),
  targetAmount: z.union([z.string(), z.number()]),
  currentAmount: z.union([z.string(), z.number()]).optional(),
  deadline: z.string().date().optional().nullable(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  status: z.enum(["active", "completed", "paused", "cancelled"]).default("active"),
  description: z.string().trim().max(1000).optional().nullable(),
  trackingMode: z.enum(["contribution", "linked_account"]).default("linked_account"),
  linkedAccountId: uuid.optional().nullable()
});

const contributionSchema = z.object({
  amount: z.union([z.string(), z.number()]),
  contributionDate: z.string().date().optional().nullable(),
  contributorUserId: uuid.optional().nullable(),
  sourceType: z.enum(["manual", "transaction", "linked_account", "shared_wallet", "scheduled", "income_allocation", "adjustment"]).default("manual"),
  accountId: uuid.optional().nullable(),
  transactionId: uuid.optional().nullable(),
  sharedWalletEntryId: uuid.optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  status: z.enum(["pending", "completed", "cancelled"]).default("completed"),
  adjustmentReason: z.string().trim().max(500).optional().nullable()
});

export const relationshipFinanceRoutes = Router();
relationshipFinanceRoutes.use(requireAuth);

relationshipFinanceRoutes.get("/", asyncHandler(async (req, res) => {
  res.json(await listRelationshipFinances(req.user!.id));
}));

relationshipFinanceRoutes.post("/", asyncHandler(async (req, res) => {
  res.status(201).json(await createRelationshipFinance(req.user!.id, relationshipCreateSchema.parse(req.body)));
}));

relationshipFinanceRoutes.post("/invitations/:invitationId/accept", asyncHandler(async (req, res) => {
  res.json(await respondRelationshipInvitation(req.user!.id, req.params.invitationId as string, "accept"));
}));

relationshipFinanceRoutes.post("/invitations/:invitationId/decline", asyncHandler(async (req, res) => {
  res.json(await respondRelationshipInvitation(req.user!.id, req.params.invitationId as string, "decline"));
}));

relationshipFinanceRoutes.post("/invitations/:invitationId/cancel", asyncHandler(async (req, res) => {
  res.json(await respondRelationshipInvitation(req.user!.id, req.params.invitationId as string, "cancel"));
}));

relationshipFinanceRoutes.get("/:id", asyncHandler(async (req, res) => {
  res.json(await getRelationshipFinance(req.user!.id, req.params.id as string));
}));

relationshipFinanceRoutes.get("/:id/overview", asyncHandler(async (req, res) => {
  res.json(await relationshipOverview(req.user!.id, req.params.id as string));
}));

relationshipFinanceRoutes.get("/:id/privacy", asyncHandler(async (req, res) => {
  res.json(await getRelationshipPrivacy(req.user!.id, req.params.id as string));
}));

relationshipFinanceRoutes.put("/:id/privacy", asyncHandler(async (req, res) => {
  res.json(await updateRelationshipPrivacy(req.user!.id, req.params.id as string, privacySchema.parse(req.body)));
}));

relationshipFinanceRoutes.get("/:id/goals", asyncHandler(async (req, res) => {
  res.json(await listRelationshipGoals(req.user!.id, req.params.id as string));
}));

relationshipFinanceRoutes.post("/:id/goals", asyncHandler(async (req, res) => {
  res.status(201).json(await createRelationshipGoal(req.user!.id, req.params.id as string, goalSchema.parse(req.body)));
}));

relationshipFinanceRoutes.patch("/:id/goals/:goalId", asyncHandler(async (req, res) => {
  res.json(await updateRelationshipGoal(
    req.user!.id,
    req.params.id as string,
    req.params.goalId as string,
    goalSchema.partial().parse(req.body)
  ));
}));

relationshipFinanceRoutes.get("/:id/goals/:goalId/contributions", asyncHandler(async (req, res) => {
  res.json(await listRelationshipGoalContributions(req.user!.id, req.params.id as string, req.params.goalId as string));
}));

relationshipFinanceRoutes.post("/:id/goals/:goalId/contributions", asyncHandler(async (req, res) => {
  res.status(201).json(await createRelationshipGoalContribution(
    req.user!.id,
    req.params.id as string,
    req.params.goalId as string,
    contributionSchema.parse(req.body)
  ));
}));

relationshipFinanceRoutes.post("/:id/goals/:goalId/adjustments", asyncHandler(async (req, res) => {
  const payload = contributionSchema.extend({
    adjustmentReason: z.string().trim().min(2).max(500)
  }).parse({ ...req.body, sourceType: "adjustment" });
  res.status(201).json(await createRelationshipGoalContribution(
    req.user!.id,
    req.params.id as string,
    req.params.goalId as string,
    payload
  ));
}));

relationshipFinanceRoutes.get("/:id/timeline", asyncHandler(async (req, res) => {
  const limit = z.coerce.number().int().min(1).max(100).default(30).parse(req.query.limit);
  res.json(await listRelationshipTimeline(req.user!.id, req.params.id as string, limit));
}));

relationshipFinanceRoutes.get("/:id/copilot-context", asyncHandler(async (req, res) => {
  const input = z.object({
    entityType: z.string().max(80).optional(),
    entityId: uuid.optional()
  }).parse(req.query);
  res.json(await relationshipCopilotContext(req.user!.id, req.params.id as string, input.entityType, input.entityId));
}));

relationshipFinanceRoutes.post("/:id/invitations/:invitationId/accept", asyncHandler(async (req, res) => {
  res.json(await respondRelationshipInvitation(req.user!.id, req.params.invitationId as string, "accept"));
}));

relationshipFinanceRoutes.post("/:id/invitations/:invitationId/decline", asyncHandler(async (req, res) => {
  res.json(await respondRelationshipInvitation(req.user!.id, req.params.invitationId as string, "decline"));
}));

relationshipFinanceRoutes.post("/:id/invitations/:invitationId/cancel", asyncHandler(async (req, res) => {
  res.json(await respondRelationshipInvitation(req.user!.id, req.params.invitationId as string, "cancel"));
}));
