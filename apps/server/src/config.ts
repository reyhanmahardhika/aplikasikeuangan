import dotenv from "dotenv";

dotenv.config();
process.env.TZ = "Asia/Jakarta";

const required = (key: string, fallback?: string) => {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const config = {
  timeZone: "Asia/Jakarta",
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  goldPriceSyncHours: Number(process.env.GOLD_PRICE_SYNC_HOURS ?? 6),
  pegadaianGoldPriceApiUrl: process.env.PEGADAIAN_GOLD_PRICE_API_URL,
  pegadaianGoldPriceApiKey: process.env.PEGADAIAN_GOLD_PRICE_API_KEY,
  pegadaianGoldPriceApiAuthHeader: process.env.PEGADAIAN_GOLD_PRICE_API_AUTH_HEADER ?? "x-api-key",
  databaseUrl: required("DATABASE_URL", "postgres://finance:finance@localhost:5432/finance_ai"),
  jwtAccessSecret: required("JWT_ACCESS_SECRET", "dev-access-secret-change-me"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET", "dev-refresh-secret-change-me"),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
  jwtRefreshDays: Number(process.env.JWT_REFRESH_DAYS ?? 3),
  uploadDir: process.env.UPLOAD_DIR ?? "uploads",
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 50),
  attachmentImageMaxDimension: Number(process.env.ATTACHMENT_IMAGE_MAX_DIMENSION ?? 1800),
  attachmentImageQuality: Number(process.env.ATTACHMENT_IMAGE_QUALITY ?? 78),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "receipts",
  ocrProvider: process.env.OCR_PROVIDER ?? "tesseract",
  aiProvider: process.env.AI_PROVIDER ?? "heuristic",
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  appleClientId: process.env.APPLE_CLIENT_ID,
  smtpHost: process.env.SMTP_HOST,
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpSecure: (process.env.SMTP_SECURE ?? "false").toLowerCase() === "true",
  smtpUser: process.env.SMTP_USER,
  smtpPassword: process.env.SMTP_PASSWORD,
  emailFrom: process.env.EMAIL_FROM ?? process.env.SMTP_USER ?? "no-reply@example.com",
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
  vapidSubject: process.env.VAPID_SUBJECT ?? "mailto:admin@example.com"
};
