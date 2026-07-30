import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  getAccountCollaborators,
  inviteAccountCollaborator,
  respondAccountInvite,
  removeAccountCollaborator
} from "../services/accountCollaboratorService.js";

const uuid = z.string().uuid();
const roleEnum = z.enum(["admin", "member", "viewer"]);

export const accountCollaboratorRoutes = Router();
accountCollaboratorRoutes.use(requireAuth);

accountCollaboratorRoutes.get("/:id/collaborators", asyncHandler(async (req, res) => {
  const collaborators = await getAccountCollaborators(req.params.id as string, req.user!.id);
  res.json(collaborators);
}));

accountCollaboratorRoutes.post("/:id/collaborators", asyncHandler(async (req, res) => {
  const input = z.object({ targetUserId: uuid, role: roleEnum.default("member") }).parse(req.body);
  const result = await inviteAccountCollaborator(req.params.id as string, req.user!.id, input.targetUserId, input.role);
  res.status(201).json(result);
}));

accountCollaboratorRoutes.put("/:id/collaborators/invite", asyncHandler(async (req, res) => {
  const input = z.object({ status: z.enum(["accepted", "rejected"]) }).parse(req.body);
  const result = await respondAccountInvite(req.params.id as string, req.user!.id, input.status);
  res.json(result);
}));

accountCollaboratorRoutes.delete("/:id/collaborators/:userId", asyncHandler(async (req, res) => {
  const result = await removeAccountCollaborator(req.params.id as string, req.user!.id, req.params.userId as string);
  res.json(result);
}));
