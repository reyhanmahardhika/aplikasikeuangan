import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { pool, withDbTransaction, type DbClient } from "../db/pool.js";
import { config } from "../config.js";
import { signAccessToken } from "../middleware/auth.js";
import { badRequest, conflict, unauthorized } from "../utils/errors.js";
import { insertDefaultCategories } from "./categoryService.js";
import { writeAuditLog } from "./auditService.js";
import { sendEmailOtp, sendPasswordResetOtp } from "./emailService.js";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function refreshExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + config.jwtRefreshDays);
  return expiresAt;
}

function otpExpiry() {
  return new Date(Date.now() + 10 * 60 * 1000);
}

function hashOtp(otp: string) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

function generateOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function resetOtpExpiry() {
  return new Date(Date.now() + 10 * 60 * 1000);
}

const googleClient = new OAuth2Client();
const appleJwks = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

function publicUser(row: any) {
  return {
    id: row.id ?? row.user_id,
    fullName: row.fullName ?? row.full_name,
    email: row.email,
    username: row.username ?? null,
    phone: row.phone ?? null,
    currency: row.currency,
    nickname: row.nickname ?? null,
    title: row.title ?? row.profile_title ?? null,
    avatarUrl: row.avatarUrl ?? row.avatar_url ?? null
  };
}

async function createSession(row: any) {
  const user = publicUser(row);
  return {
    user,
    accessToken: signAccessToken(user),
    refreshToken: await createRefreshToken(user.id)
  };
}

async function createRefreshToken(userId: string, db: DbClient = pool) {
  const token = crypto.randomBytes(48).toString("base64url");
  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, hashToken(token), refreshExpiry()]
  );
  return token;
}

export async function register(input: { fullName: string; email: string; password: string; currency?: string }) {
  const existing = await pool.query("SELECT id FROM users WHERE lower(email) = lower($1)", [input.email]);
  if (existing.rowCount) {
    throw conflict("Email sudah terdaftar");
  }

  const normalizedEmail = input.email.toLowerCase();
  const otp = generateOtp();
  const passwordHash = await bcrypt.hash(input.password, 12);

  await pool.query(
    `INSERT INTO email_registration_otps (full_name, email, password_hash, currency, otp_hash, expires_at, attempts, verified_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, 0, NULL, now())
     ON CONFLICT (email) DO UPDATE
       SET full_name = EXCLUDED.full_name,
           password_hash = EXCLUDED.password_hash,
           currency = EXCLUDED.currency,
           otp_hash = EXCLUDED.otp_hash,
           expires_at = EXCLUDED.expires_at,
           verified_at = NULL,
           attempts = 0,
           updated_at = now()`,
    [input.fullName, normalizedEmail, passwordHash, input.currency ?? "IDR", hashOtp(otp), otpExpiry()]
  );

  await sendEmailOtp({ to: normalizedEmail, otp, name: input.fullName });
  return { requiresOtp: true, email: normalizedEmail };
}

export async function verifyRegisterOtp(input: { email: string; otp: string }) {
  const normalizedEmail = input.email.toLowerCase();
  return withDbTransaction(async (client) => {
    const pending = await client.query(
      `SELECT id, full_name, email, password_hash, currency, otp_hash, expires_at, verified_at, attempts
       FROM email_registration_otps
       WHERE lower(email) = lower($1)
       FOR UPDATE`,
      [normalizedEmail]
    );
    const row = pending.rows[0];
    if (!row) throw badRequest("Kode OTP tidak ditemukan. Silakan daftar ulang.");
    if (row.verified_at) throw badRequest("Kode OTP sudah digunakan.");
    if (row.expires_at <= new Date()) throw badRequest("Kode OTP sudah kedaluwarsa. Silakan kirim ulang.");
    if (row.attempts >= 5) throw badRequest("Terlalu banyak percobaan OTP. Silakan kirim ulang.");
    if (hashOtp(input.otp) !== row.otp_hash) {
      await client.query("UPDATE email_registration_otps SET attempts = attempts + 1, updated_at = now() WHERE id = $1", [row.id]);
      throw badRequest("Kode OTP salah");
    }

    const duplicate = await client.query("SELECT id FROM users WHERE lower(email) = lower($1)", [normalizedEmail]);
    if (duplicate.rowCount) throw conflict("Email sudah terdaftar");

    const created = await client.query(
      `INSERT INTO users (full_name, email, password_hash, currency)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name AS "fullName", email, username, phone, currency, nickname,
                 profile_title AS title, avatar_url AS "avatarUrl"`,
      [row.full_name, row.email, row.password_hash, row.currency]
    );
    const user = created.rows[0];
    await insertDefaultCategories(client, user.id);
    await client.query("INSERT INTO user_privacy_settings (user_id) VALUES ($1)", [user.id]);
    await client.query(
      `INSERT INTO accounts (user_id, name, account_type, initial_balance, current_balance, currency)
       VALUES ($1, 'Tunai', 'cash', 0, 0, $2)`,
      [user.id, user.currency]
    );
    await client.query("UPDATE email_registration_otps SET verified_at = now(), updated_at = now() WHERE id = $1", [row.id]);
    await writeAuditLog(client, { userId: user.id, action: "REGISTER", entityName: "User", entityId: user.id });
    return createSession(user);
  });
}

export async function login(input: { email: string; password: string }) {
  const result = await pool.query(
    `SELECT id, full_name AS "fullName", email, username, phone, password_hash, currency, nickname,
            profile_title AS title, avatar_url AS "avatarUrl"
     FROM users WHERE lower(email) = lower($1)`,
    [input.email]
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(input.password, user.password_hash))) {
    throw unauthorized("Email atau password salah");
  }

  await writeAuditLog(pool, { userId: user.id, action: "LOGIN", entityName: "User", entityId: user.id });
  return createSession(user);
}

export async function socialLogin(input: { provider: "google" | "apple"; idToken: string; fullName?: string | null }) {
  let identity: { email: string; fullName: string; avatarUrl?: string | null };
  if (input.provider === "google") {
    if (!config.googleClientId) throw badRequest("Login Google belum dikonfigurasi");
    const ticket = await googleClient.verifyIdToken({ idToken: input.idToken, audience: config.googleClientId });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) throw unauthorized("Akun Google tidak valid");
    identity = {
      email: payload.email,
      fullName: payload.name || input.fullName || payload.email.split("@")[0],
      avatarUrl: payload.picture ?? null
    };
  } else {
    if (!config.appleClientId) throw badRequest("Login Apple belum dikonfigurasi");
    const verified = await jwtVerify(input.idToken, appleJwks, {
      issuer: "https://appleid.apple.com",
      audience: config.appleClientId
    });
    const email = typeof verified.payload.email === "string" ? verified.payload.email : null;
    if (!email) throw unauthorized("Email akun Apple tidak tersedia");
    identity = {
      email,
      fullName: input.fullName || email.split("@")[0],
      avatarUrl: null
    };
  }

  let result = await pool.query(
    `SELECT id, full_name AS "fullName", email, username, phone, currency, nickname,
            profile_title AS title, avatar_url AS "avatarUrl"
     FROM users WHERE lower(email) = lower($1)`,
    [identity.email]
  );
  if (!result.rowCount) {
    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);
    const created = await withDbTransaction(async (client) => {
      const inserted = await client.query(
        `INSERT INTO users (full_name, email, password_hash, currency, avatar_url)
         VALUES ($1, lower($2), $3, 'IDR', $4)
         RETURNING id, full_name AS "fullName", email, username, phone, currency, nickname,
                   profile_title AS title, avatar_url AS "avatarUrl"`,
        [identity.fullName, identity.email, passwordHash, identity.avatarUrl ?? null]
      );
      await insertDefaultCategories(client, inserted.rows[0].id);
      await client.query("INSERT INTO user_privacy_settings (user_id) VALUES ($1)", [inserted.rows[0].id]);
      await client.query(
        `INSERT INTO accounts (user_id, name, account_type, initial_balance, current_balance, currency)
         VALUES ($1, 'Tunai', 'cash', 0, 0, 'IDR')`,
        [inserted.rows[0].id]
      );
      return inserted.rows[0];
    });
    result = { ...result, rows: [created], rowCount: 1 } as typeof result;
  }
  await writeAuditLog(pool, { userId: result.rows[0].id, action: "SOCIAL_LOGIN", entityName: "User", entityId: result.rows[0].id });
  return createSession(result.rows[0]);
}

export async function refreshAccessToken(refreshToken: string) {
  if (!refreshToken) throw badRequest("Refresh token diperlukan");
  const tokenHash = hashToken(refreshToken);
  return withDbTransaction(async (client) => {
    const result = await client.query(
      `SELECT rt.id, u.id AS user_id, u.full_name, u.email, u.username, u.phone, u.currency, u.nickname,
              u.profile_title, u.avatar_url
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL AND rt.expires_at > now()
       FOR UPDATE OF rt`,
      [tokenHash]
    );
    const row = result.rows[0];
    if (!row) throw unauthorized("Sesi tidak aktif atau sudah berakhir");
    await client.query("UPDATE refresh_tokens SET expires_at = $1 WHERE id = $2", [refreshExpiry(), row.id]);
    const user = publicUser(row);
    return {
      user,
      accessToken: signAccessToken(user),
      refreshToken
    };
  });
}

export async function revokeRefreshToken(refreshToken: string) {
  if (!refreshToken) return;
  await pool.query("UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1", [hashToken(refreshToken)]);
}

export async function getProfile(userId: string) {
  const result = await pool.query(
    `SELECT id, full_name AS "fullName", email, username, phone, currency, nickname,
            profile_title AS title, avatar_url AS "avatarUrl",
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM users WHERE id = $1`,
    [userId]
  );
  return result.rows[0];
}

export async function updateProfile(userId: string, input: {
  fullName: string;
  username: string;
  phone?: string | null;
  nickname?: string | null;
  title?: string | null;
  avatarUrl?: string | null;
}) {
  const duplicate = await pool.query(
    `SELECT id FROM users WHERE id <> $1
       AND (lower(username) = lower($2) OR ($3::text IS NOT NULL AND phone = $3))`,
    [userId, input.username, input.phone || null]
  );
  if (duplicate.rowCount) throw conflict("Username atau nomor telepon sudah digunakan");
  const result = await pool.query(
    `UPDATE users
     SET full_name = $1, username = lower($2), phone = $3, nickname = $4,
         profile_title = $5, avatar_url = $6, updated_at = now()
     WHERE id = $7
     RETURNING id, full_name AS "fullName", email, username, phone, currency, nickname,
               profile_title AS title, avatar_url AS "avatarUrl"`,
    [input.fullName, input.username, input.phone || null, input.nickname || null, input.title || null, input.avatarUrl || null, userId]
  );
  await writeAuditLog(pool, { userId, action: "UPDATE", entityName: "User", entityId: userId, newValue: publicUser(result.rows[0]) });
  return publicUser(result.rows[0]);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const result = await pool.query("SELECT password_hash FROM users WHERE id = $1", [userId]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
    throw unauthorized("Password saat ini salah");
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await pool.query("UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2", [passwordHash, userId]);
  await writeAuditLog(pool, { userId, action: "CHANGE_PASSWORD", entityName: "User", entityId: userId });
  return { changed: true };
}

export async function requestPasswordReset(input: { email: string }) {
  const email = input.email.toLowerCase();
  const userResult = await pool.query("SELECT id, full_name FROM users WHERE lower(email) = lower($1)", [email]);
  if (!userResult.rowCount) {
    return { message: "Jika email terdaftar, kode reset akan dikirim." };
  }

  const otp = generateOtp();
  const tempPassword = crypto.randomBytes(24).toString("base64url");
  await pool.query(
    `INSERT INTO password_reset_otps (email, otp_hash, new_password_hash, expires_at, attempts, verified_at, updated_at)
     VALUES ($1, $2, $3, $4, 0, NULL, now())
     ON CONFLICT (email) DO UPDATE
       SET otp_hash = EXCLUDED.otp_hash,
           new_password_hash = EXCLUDED.new_password_hash,
           expires_at = EXCLUDED.expires_at,
           verified_at = NULL,
           attempts = 0,
           updated_at = now()`,
    [email, hashOtp(otp), await bcrypt.hash(tempPassword, 12), resetOtpExpiry()]
  );

  await sendPasswordResetOtp({ to: email, otp, name: userResult.rows[0].full_name });
  return { message: "Jika email terdaftar, kode reset akan dikirim." };
}

export async function verifyPasswordResetOtp(input: { email: string; otp: string; newPassword: string }) {
  const email = input.email.toLowerCase();
  return withDbTransaction(async (client) => {
    const pending = await client.query(
      `SELECT id, email, otp_hash, new_password_hash, expires_at, verified_at, attempts
       FROM password_reset_otps
       WHERE lower(email) = lower($1)
       FOR UPDATE`,
      [email]
    );
    const row = pending.rows[0];
    if (!row) throw badRequest("Kode reset tidak ditemukan. Silakan kirim ulang.");
    if (row.verified_at) throw badRequest("Kode reset sudah digunakan.");
    if (row.expires_at <= new Date()) throw badRequest("Kode reset sudah kedaluwarsa. Silakan kirim ulang.");
    if (row.attempts >= 5) throw badRequest("Terlalu banyak percobaan OTP. Silakan kirim ulang.");
    if (hashOtp(input.otp) !== row.otp_hash) {
      await client.query("UPDATE password_reset_otps SET attempts = attempts + 1, updated_at = now() WHERE id = $1", [row.id]);
      throw badRequest("Kode OTP salah");
    }

    const user = await client.query("SELECT id FROM users WHERE lower(email) = lower($1)", [email]);
    if (!user.rowCount) throw badRequest("Akun tidak ditemukan");
    const passwordHash = await bcrypt.hash(input.newPassword, 12);
    await client.query("UPDATE users SET password_hash = $1, updated_at = now() WHERE lower(email) = lower($2)", [passwordHash, email]);
    await client.query("UPDATE password_reset_otps SET verified_at = now(), updated_at = now() WHERE id = $1", [row.id]);
    await writeAuditLog(client, { userId: user.rows[0].id, action: "RESET_PASSWORD", entityName: "User", entityId: user.rows[0].id });
    return { reset: true };
  });
}
