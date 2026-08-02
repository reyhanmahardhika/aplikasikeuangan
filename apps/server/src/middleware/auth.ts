import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";
import { unauthorized } from "../utils/errors.js";
import { blockReadOnlyMutations } from "./readOnlyMode.js";

type AccessPayload = {
  sub: string;
  email: string;
  fullName: string;
  isSuperAdmin?: boolean;
  readOnly?: boolean;
  impersonatedByUserId?: string | null;
  impersonatedByEmail?: string | null;
};

export function signAccessToken(user: Express.User) {
  const options: jwt.SignOptions = {
    subject: user.id,
    expiresIn: config.jwtAccessExpiresIn as jwt.SignOptions["expiresIn"]
  };

  return jwt.sign(
    {
      email: user.email,
      fullName: user.fullName,
      isSuperAdmin: user.isSuperAdmin === true,
      readOnly: user.readOnly === true,
      impersonatedByUserId: user.impersonatedByUserId ?? null,
      impersonatedByEmail: user.impersonatedByEmail ?? null
    },
    config.jwtAccessSecret,
    options
  );
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(unauthorized("Token akses diperlukan"));
  }

  try {
    const payload = jwt.verify(authHeader.slice(7), config.jwtAccessSecret) as AccessPayload;
    req.user = {
      id: payload.sub,
      email: payload.email,
      fullName: payload.fullName,
      isSuperAdmin: payload.isSuperAdmin === true,
      readOnly: payload.readOnly === true,
      impersonatedByUserId: payload.impersonatedByUserId ?? null,
      impersonatedByEmail: payload.impersonatedByEmail ?? null
    };
    return blockReadOnlyMutations(req, _res, next);
  } catch {
    return next(unauthorized("Token akses tidak valid atau kedaluwarsa"));
  }
}
