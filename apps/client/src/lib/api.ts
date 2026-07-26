const configuredApiUrl = String(import.meta.env.VITE_API_URL ?? "http://localhost:4000/api").trim().replace(/\/+$/, "");
const API_URL = configuredApiUrl.endsWith("/api") ? configuredApiUrl : `${configuredApiUrl}/api`;

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export type Session = {
  user: {
    id: string;
    fullName: string;
    email: string;
    username?: string | null;
    phone?: string | null;
    currency?: string;
    nickname?: string | null;
    title?: string | null;
    avatarUrl?: string | null;
  };
  accessToken: string;
  refreshToken: string;
};

export async function apiFetch<T>(path: string, token?: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });
  const responseText = await response.text();

  if (!response.ok) {
    let error: { message?: string; details?: unknown } = {};
    if (responseText) {
      try {
        error = JSON.parse(responseText);
      } catch {
        error = {};
      }
    }
    if (!error.message) {
      error.message = response.status >= 500
        ? "Server sedang bermasalah. Silakan coba lagi."
        : "Permintaan tidak dapat diproses.";
    }
    throw new ApiError(response.status, error.message ?? "Request gagal", error.details);
  }

  if (response.status === 204 || !responseText) return undefined as T;
  try {
    return JSON.parse(responseText) as T;
  } catch {
    throw new ApiError(502, "Data dari server belum lengkap. Silakan coba lagi.");
  }
}

export function downloadUrl(path: string) {
  return `${API_URL}${path}`;
}
