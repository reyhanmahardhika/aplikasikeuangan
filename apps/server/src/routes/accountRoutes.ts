import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { accountAutoBudgetSchema, accountResetSchema, accountSchema, accountTargetSchema, accountUpdateSchema } from "../validators/schemas.js";
import { createAccount, deleteAccount, getAccountTarget, listAccounts, reorderAccounts, resetAccount, updateAccount, updateAccountTarget } from "../services/accountService.js";
import { deleteAutoBudget, getAutoBudget, saveAutoBudget } from "../services/autoBudgetService.js";

export const accountRoutes = Router();
accountRoutes.use(requireAuth);

accountRoutes.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await listAccounts(req.user!.id));
  })
);

accountRoutes.post(
  "/",
  asyncHandler(async (req, res) => {
    res.status(201).json(await createAccount(req.user!.id, accountSchema.parse(req.body)));
  })
);

accountRoutes.put(
  "/order",
  asyncHandler(async (req, res) => {
    const input = z.object({
      accountIds: z.array(z.string().uuid()).min(1).max(200)
    }).parse(req.body);
    res.json(await reorderAccounts(req.user!.id, input.accountIds));
  })
);

accountRoutes.get("/:id/auto-budget", asyncHandler(async (req, res) => {
  res.json(await getAutoBudget(req.user!.id, req.params.id as string));
}));

accountRoutes.put("/:id/auto-budget", asyncHandler(async (req, res) => {
  res.json(await saveAutoBudget(req.user!.id, req.params.id as string, accountAutoBudgetSchema.parse(req.body)));
}));

accountRoutes.delete("/:id/auto-budget", asyncHandler(async (req, res) => {
  res.json(await deleteAutoBudget(req.user!.id, req.params.id as string));
}));

accountRoutes.get(
  "/:id/target",
  asyncHandler(async (req, res) => {
    res.json(await getAccountTarget(req.user!.id, req.params.id as string));
  })
);

accountRoutes.put(
  "/:id/target",
  asyncHandler(async (req, res) => {
    res.json(await updateAccountTarget(req.user!.id, req.params.id as string, accountTargetSchema.parse(req.body)));
  })
);

accountRoutes.put(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await updateAccount(req.user!.id, req.params.id as string, accountUpdateSchema.parse(req.body)));
  })
);

accountRoutes.post(
  "/:id/reset",
  asyncHandler(async (req, res) => {
    res.json(await resetAccount(req.user!.id, req.params.id as string, accountResetSchema.parse(req.body)));
  })
);

accountRoutes.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await deleteAccount(req.user!.id, req.params.id as string));
  })
);
