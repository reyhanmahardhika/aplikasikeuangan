import type { Session } from "./api";

export type StoredSession = Session & {
  lastActivityAt: number;
};

export type StoredSessionStatus = "missing" | "valid" | "expired" | "invalid";

export type StoredSessionResult = {
  session: StoredSession | null;
  status: StoredSessionStatus;
  migrated: boolean;
};

const SESSION_STORAGE_KEY = "finance-session";
// Session hanya expired jika tidak ada aktivitas selama 30 hari (bukan 3 hari)
// Ini memberikan waktu yang cukup untuk user yang tidak membuka app dalam beberapa minggu
export const SESSION_INACTIVITY_LIMIT_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_ACTIVITY_THROTTLE_MS = 30 * 1000;

function isSessionPayload(value: unknown): value is Session {
  if (!value || typeof value !== "object") return false;

  const session = value as Partial<Session>;
  const user = session.user;

  return Boolean(
    user
    && typeof user === "object"
    && typeof user.id === "string"
    && typeof user.fullName === "string"
    && typeof user.email === "string"
    && typeof session.accessToken === "string"
    && typeof session.refreshToken === "string"
  );
}

export function isValidSession(value: unknown): value is StoredSession {
  return isSessionPayload(value)
    && typeof (value as Partial<StoredSession>).lastActivityAt === "number";
}

export function inspectStoredSession(
  saved: string | null,
  now = Date.now()
): StoredSessionResult {
  if (!saved) {
    return { session: null, status: "missing", migrated: false };
  }

  try {
    const parsed: unknown = JSON.parse(saved);

    if (!isSessionPayload(parsed)) {
      return { session: null, status: "invalid", migrated: false };
    }

    if (typeof (parsed as Partial<StoredSession>).lastActivityAt !== "number") {
      return {
        session: {
          ...parsed,
          lastActivityAt: now
        },
        status: "valid",
        migrated: true
      };
    }

    const storedSession = parsed as StoredSession;
    const inactiveDuration = Math.max(0, now - storedSession.lastActivityAt);

    if (inactiveDuration >= SESSION_INACTIVITY_LIMIT_MS) {
      return { session: null, status: "expired", migrated: false };
    }

    return { session: storedSession, status: "valid", migrated: false };
  } catch {
    return { session: null, status: "invalid", migrated: false };
  }
}

export function parseStoredSession(saved: string | null): StoredSession | null {
  return inspectStoredSession(saved).session;
}

export function loadSavedSessionResult(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">
): StoredSessionResult {
  const saved = storage.getItem(SESSION_STORAGE_KEY);
  const result = inspectStoredSession(saved);

  if (saved && !result.session) {
    storage.removeItem(SESSION_STORAGE_KEY);
  } else if (result.session && result.migrated) {
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(result.session));
  }

  return result;
}

export function loadSavedSession(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">
): StoredSession | null {
  return loadSavedSessionResult(storage).session;
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
  storage: Pick<Storage, "getItem" | "setItem">,
  now = Date.now()
): StoredSession | null {
  const saved = storage.getItem(SESSION_STORAGE_KEY);

  if (!saved) return null;

  try {
    const parsed = JSON.parse(saved) as StoredSession;

    if (!isValidSession(parsed)) return null;

    if (now - parsed.lastActivityAt < SESSION_ACTIVITY_THROTTLE_MS) {
      return parsed;
    }

    const updatedSession = {
      ...parsed,
      lastActivityAt: now
    };

    storage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify(updatedSession)
    );

    return updatedSession;
  } catch {
    return null;
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
): { exp?: number; sub?: string } | null {
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

    return JSON.parse(atob(padded)) as { exp?: number; sub?: string };
  } catch {
    return null;
  }
}

export function getAccessTokenSubject(
  accessToken: string
): string | null {
  const payload = decodeAccessTokenPayload(accessToken);

  return typeof payload?.sub === "string"
    ? payload.sub
    : null;
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