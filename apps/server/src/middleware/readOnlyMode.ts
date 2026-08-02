import type { NextFunction, Request, Response } from "express";
import { forbidden } from "../utils/errors.js";

const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const allowedReadOnlyMutationPaths = new Set([
  "/api/auth/logout",
  "/api/auth/refresh-token",
  "/api/auth/superadmin/stop-impersonation"
]);

export function blockReadOnlyMutations(req: Request, _res: Response, next: NextFunction) {
  if (!req.user?.readOnly || !mutationMethods.has(req.method)) return next();
  if (allowedReadOnlyMutationPaths.has(req.originalUrl.split("?")[0] ?? req.path)) return next();
  return next(forbidden("Mode superadmin hanya bisa melihat data. Perubahan data tidak diizinkan."));
}
