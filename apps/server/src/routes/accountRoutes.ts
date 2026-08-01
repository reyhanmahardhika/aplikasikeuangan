import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { mutationImportUpload } from "../middleware/upload.js";
import { accountAutoBudgetSchema, accountResetSchema, accountSchema, accountTargetSchema, accountUpdateSchema } from "../validators/schemas.js";
import { createAccount, deleteAccount, getAccountTarget, listAccounts, reorderAccounts, resetAccount, updateAccount, updateAccountTarget } from "../services/accountService.js";
import { deleteAutoBudget, getAutoBudget, retryAutoBudgetExecution, saveAutoBudget } from "../services/autoBudgetService.js";
import { commitAccountMutationImport, previewAccountMutationImport } from "../services/accountMutationImportService.js";

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

accountRoutes.post("/:id/auto-budget/executions/:executionId/retry", asyncHandler(async (req, res) => {
  res.json(await retryAutoBudgetExecution(req.user!.id, req.params.id as string, req.params.executionId as string));
}));

accountRoutes.post(
  "/:id/mutation-import/preview",
  mutationImportUpload.single("file"),
  asyncHandler(async (req, res) => {
    const input = z.object({ text: z.string().max(200000).optional().nullable() }).parse(req.body);
    res.json(await previewAccountMutationImport(req.user!.id, req.params.id as string, {
      text: input.text ?? undefined,
      file: req.file
    }));
  })
);

accountRoutes.post(
  "/:id/mutation-import/commit",
  asyncHandler(async (req, res) => {
    const payload = z.object({
      rows: z.array(z.object({
        importKey: z.string().min(10).max(128),
        transactionDate: z.string().date(),
        transactionType: z.enum(["income", "expense"]),
        amount: z.string(),
        description: z.string().max(500),
        categoryId: z.string().uuid().nullable().default(null),
        categoryName: z.string().max(160).nullable().default(null),
        duplicate: z.boolean().default(false),
        duplicateReason: z.string().max(160).nullable().default(null),
        confidence: z.number().default(0)
      })).min(1).max(300)
    }).parse(req.body);
    res.status(201).json(await commitAccountMutationImport(req.user!.id, req.params.id as string, payload.rows));
  })
);

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
