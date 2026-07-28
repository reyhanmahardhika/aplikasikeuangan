import type { Session } from "./api";

export type StoredSession = Session & {
  lastActivityAt: number;
};

const SESSION_STORAGE_KEY = "finance-session";
const SESSION_INACTIVITY_LIMIT_MS = 3 * 24 * 60 * 60 * 1000;

export function isValidSession(value: unknown): value is StoredSession {
  if (!value || typeof value !== "object") return false;

  const session = value as Partial<StoredSession>;
  const user = session.user;

  return Boolean(
    user
    && typeof user === "object"
    && typeof user.id === "string"
    && typeof user.fullName === "string"
    && typeof user.email === "string"
    && typeof session.accessToken === "string"
    && typeof session.refreshToken === "string"
    && typeof session.lastActivityAt === "number"
  );
}

export function parseStoredSession(saved: string | null): StoredSession | null {
  if (!saved) return null;

  try {
    const parsed: unknown = JSON.parse(saved);

    if (!isValidSession(parsed)) return null;

    const inactiveDuration = Date.now() - parsed.lastActivityAt;

    if (inactiveDuration >= SESSION_INACTIVITY_LIMIT_MS) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function loadSavedSession(
  storage: Pick<Storage, "getItem" | "removeItem">
): StoredSession | null {
  const saved = storage.getItem(SESSION_STORAGE_KEY);
  const session = parseStoredSession(saved);

  if (saved && !session) {
    storage.removeItem(SESSION_STORAGE_KEY);
  }

  return session;
}

export function saveSession(
  storage: Pick<Storage, "setItem">,
  session: Session
): StoredSession {
  const storedSession: StoredSession = {
    ...session,
    lastActivityAt: Date.now()
  };

  storage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify(storedSession)
  );

  return storedSession;
}

export function updateSessionActivity(
  storage: Pick<Storage, "getItem" | "setItem">
): void {
  const saved = storage.getItem(SESSION_STORAGE_KEY);

  if (!saved) return;

  try {
    const parsed = JSON.parse(saved) as StoredSession;

    if (!isValidSession(parsed)) return;

    parsed.lastActivityAt = Date.now();

    storage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify(parsed)
    );
  } catch {
    // Biarkan loadSavedSession membersihkan session yang rusak
  }
}

export function clearStoredSession(
  storage: Pick<Storage, "removeItem">
): void {
  storage.removeItem(SESSION_STORAGE_KEY);
}

export const ACCESS_TOKEN_REFRESH_BUFFER_MS = 60_000;
export const ACCESS_TOKEN_KEEPALIVE_INTERVAL_MS = 10 * 60 * 1000;
export const SESSION_ACTIVITY_WINDOW_MS = 15 * 60 * 1000;

function decodeAccessTokenPayload(
  accessToken: string
): { exp?: number } | null {
  try {
    const segment = accessToken.split(".")[1];

    if (!segment) return null;

    const normalized = segment
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const padded = normalized.padEnd(
      Math.ceil(normalized.length / 4) * 4,
      "="
    );

    return JSON.parse(atob(padded)) as { exp?: number };
  } catch {
    return null;
  }
}

export function getAccessTokenExpiry(
  accessToken: string
): number | null {
  const payload = decodeAccessTokenPayload(accessToken);

  return typeof payload?.exp === "number"
    ? payload.exp * 1000
    : null;
}

export function isAccessTokenExpired(
  accessToken: string,
  bufferMs = ACCESS_TOKEN_REFRESH_BUFFER_MS
): boolean {
  const expiry = getAccessTokenExpiry(accessToken);

  if (!expiry) return true;

  return Date.now() >= expiry - bufferMs;
}