import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { searchPocketInviteUsers } from "../services/userSearchService.js";

export const userRoutes = Router();
userRoutes.use(requireAuth);

userRoutes.get("/search", asyncHandler(async (req, res) => {
  const input = z.object({
    q: z.string().min(1).max(160),
    purpose: z.enum(["pocket_invite"]).default("pocket_invite")
  }).parse(req.query);

  const users = await searchPocketInviteUsers(req.user!.id, input.q);
  res.json(users);
}));
