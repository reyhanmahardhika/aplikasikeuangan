import nodemailer from "nodemailer";
import { config } from "../config.js";

let transport: nodemailer.Transporter | null = null;

function getTransport() {
  if (!config.smtpHost || !config.smtpUser || !config.smtpPassword) return null;
  if (transport) return transport;
  transport = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPassword
    }
  });
  return transport;
}

export async function sendEmailOtp(input: { to: string; otp: string; name?: string }) {
  return sendOtpEmail({
    to: input.to,
    otp: input.otp,
    subject: "Kode OTP registrasi Keuangan AI",
    lines: [
      `Halo ${input.name || "pengguna"},`,
      "",
      `Kode OTP registrasi kamu adalah: ${input.otp}`,
      "",
      "Kode ini berlaku selama 10 menit.",
      "Jika kamu tidak meminta kode ini, abaikan email ini."
    ]
  });
}

export async function sendPasswordResetOtp(input: { to: string; otp: string; name?: string }) {
  return sendOtpEmail({
    to: input.to,
    otp: input.otp,
    subject: "Kode OTP reset password Keuangan AI",
    lines: [
      `Halo ${input.name || "pengguna"},`,
      "",
      `Kode OTP reset password kamu adalah: ${input.otp}`,
      "",
      "Kode ini berlaku selama 10 menit.",
      "Jika kamu tidak meminta reset password, abaikan email ini."
    ]
  });
}

async function sendOtpEmail(input: { to: string; otp: string; subject: string; lines: string[] }) {
  const sender = getTransport();
  const text = input.lines.join("\n");

  if (!sender) {
    if (config.nodeEnv === "development") {
      console.info(`[OTP EMAIL DEV] subject=${input.subject} to=${input.to} otp=${input.otp}`);
      return { sent: true, fallback: "development-log" as const };
    }
    throw new Error("Email OTP belum dikonfigurasi. Isi SMTP_HOST, SMTP_USER, dan SMTP_PASSWORD.");
  }

  await sender.sendMail({
    from: config.emailFrom,
    to: input.to,
    subject: input.subject,
    text
  });
  return { sent: true, fallback: "smtp" as const };
}
