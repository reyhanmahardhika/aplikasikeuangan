import type { Session } from "./api";

export function isValidSession(value: unknown): value is Session {
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

export function parseStoredSession(saved: string | null): Session | null {
  if (!saved) return null;
  try {
    const parsed: unknown = JSON.parse(saved);
    return isValidSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function loadSavedSession(storage: Pick<Storage, "getItem" | "removeItem">): Session | null {
  const saved = storage.getItem("finance-session");
  const session = parseStoredSession(saved);
  if (saved && !session) storage.removeItem("finance-session");
  return session;
}
