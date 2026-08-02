import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authRateLimiter } from "../middleware/rateLimit.js";
import { requireAuth } from "../middleware/auth.js";
import { config } from "../config.js";
import { changePasswordSchema, forgotPasswordRequestSchema, forgotPasswordVerifySchema, loginSchema, profileUpdateSchema, registerOtpVerifySchema, registerSchema, socialLoginSchema } from "../validators/schemas.js";
import { changePassword, getProfile, impersonateUser, listSuperAdminUsers, login, refreshAccessToken, register, requestPasswordReset, revokeRefreshToken, socialLogin, stopImpersonation, updateProfile, verifyPasswordResetOtp, verifyRegisterOtp } from "../services/authService.js";

export const authRoutes = Router();

authRoutes.get(
  "/providers",
  asyncHandler(async (_req, res) => {
    res.json({
      googleClientId: config.googleClientId ?? null
    });
  })
);

authRoutes.post(
  "/register",
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const payload = registerSchema.parse(req.body);
    const result = await register(payload);
    res.status(202).json(result);
  })
);

authRoutes.post(
  "/register/verify",
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const payload = registerOtpVerifySchema.parse(req.body);
    res.json(await verifyRegisterOtp(payload));
  })
);

authRoutes.post(
  "/login",
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const payload = loginSchema.parse(req.body);
    res.json(await login(payload));
  })
);

authRoutes.post(
  "/social",
  authRateLimiter,
  asyncHandler(async (req, res) => {
    res.json(await socialLogin(socialLoginSchema.parse(req.body)));
  })
);

authRoutes.post(
  "/refresh-token",
  asyncHandler(async (req, res) => {
    res.json(await refreshAccessToken(req.body.refreshToken));
  })
);

authRoutes.post(
  "/logout",
  asyncHandler(async (req, res) => {
    await revokeRefreshToken(req.body.refreshToken);
    res.json({ loggedOut: true });
  })
);

authRoutes.post(
  "/forgot-password",
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const payload = forgotPasswordRequestSchema.parse(req.body);
    res.json(await requestPasswordReset(payload));
  })
);

authRoutes.post(
  "/forgot-password/verify",
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const payload = forgotPasswordVerifySchema.parse(req.body);
    res.json(await verifyPasswordResetOtp(payload));
  })
);

authRoutes.get(
  "/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await getProfile(req.user!.id));
  })
);

authRoutes.put(
  "/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await updateProfile(req.user!.id, profileUpdateSchema.parse(req.body)));
  })
);

authRoutes.post(
  "/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = changePasswordSchema.parse(req.body);
    res.json(await changePassword(req.user!.id, payload.currentPassword, payload.newPassword));
  })
);

authRoutes.get(
  "/superadmin/users",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = z.object({ q: z.string().max(160).optional().default("") }).parse(req.query);
    res.json(await listSuperAdminUsers(req.user!, input.q));
  })
);

authRoutes.post(
  "/superadmin/impersonate",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = z.object({ userId: z.string().uuid() }).parse(req.body);
    res.json(await impersonateUser(req.user!, input.userId));
  })
);

authRoutes.post(
  "/superadmin/stop-impersonation",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await stopImpersonation(req.user!));
  })
);
