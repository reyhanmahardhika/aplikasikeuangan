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

// Session storage keys - use both localStorage and sessionStorage as fallback
const SESSION_STORAGE_KEY = "finance-session";
const SESSION_STORAGE_KEY_BACKUP = "finance-session-backup";

// iOS PWA: Extended inactivity limit to 7 days (was 30 days)
// This handles the case where iOS clears localStorage when PWA is backgrounded
export const SESSION_INACTIVITY_LIMIT_MS = 7 * 24 * 60 * 60 * 1000;
// Throttle activity updates to once per minute (was 30 seconds)
export const SESSION_ACTIVITY_THROTTLE_MS = 60 * 1000;

// iOS PWA: Session activity window extended to 24 hours (was 15 minutes)
// This prevents premature session expiry when app is backgrounded
export const SESSION_ACTIVITY_WINDOW_MS = 24 * 60 * 60 * 1000;

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

/**
 * Try to load session from multiple storage sources (localStorage -> sessionStorage -> IndexedDB)
 * This provides resilience against iOS PWA localStorage clearing
 */
async function loadSessionFromStorage(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
  now = Date.now()
): Promise<StoredSessionResult> {
  // Try primary localStorage first
  const saved = storage.getItem(SESSION_STORAGE_KEY);
  if (saved) {
    const result = inspectStoredSession(saved, now);
    if (result.session) return result;
  }

  // Try backup in sessionStorage (survives some iOS PWA backgrounding)
  const backupSaved = storage.getItem(SESSION_STORAGE_KEY_BACKUP);
  if (backupSaved) {
    const result = inspectStoredSession(backupSaved, now);
    if (result.session) {
      // Restore to primary storage
      storage.setItem(SESSION_STORAGE_KEY, backupSaved);
      return result;
    }
  }

  // Try IndexedDB as last resort (most persistent on iOS PWA)
  if (typeof window !== "undefined" && "indexedDB" in window) {
    try {
      const idbSession = await getSessionFromIndexedDB();
      if (idbSession) {
        const result = inspectStoredSession(JSON.stringify(idbSession), now);
        if (result.session) {
          // Restore to both storages
          storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(idbSession));
          storage.setItem(SESSION_STORAGE_KEY_BACKUP, JSON.stringify(idbSession));
          return result;
        }
      }
    } catch {
      // Ignore IndexedDB errors
    }
  }

  return { session: null, status: "missing", migrated: false };
}

function inspectStoredSession(
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

export async function loadSavedSessionResult(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">
): Promise<StoredSessionResult> {
  return loadSessionFromStorage(storage);
}

export async function loadSavedSession(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">
): Promise<StoredSession | null> {
  const result = await loadSavedSessionResult(storage);
  return result.session;
}

export function saveSession(
  storage: Pick<Storage, "setItem">,
  session: Session
): StoredSession {
  const storedSession: StoredSession = {
    ...session,
    lastActivityAt: Date.now()
  };

  const json = JSON.stringify(storedSession);
  
  // Save to primary
  storage.setItem(SESSION_STORAGE_KEY, json);
  
  // Also save to backup
  try {
    storage.setItem(SESSION_STORAGE_KEY_BACKUP, json);
  } catch {
    // Ignore quota errors
  }

  // Also persist to IndexedDB for maximum resilience
  if (typeof window !== "undefined") {
    saveSessionToIndexedDB(storedSession).catch(() => {});
  }

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

    const json = JSON.stringify(updatedSession);
    storage.setItem(SESSION_STORAGE_KEY, json);
    
    // Update backup
    try {
      storage.setItem(SESSION_STORAGE_KEY_BACKUP, json);
    } catch {}

    // Update IndexedDB
    if (typeof window !== "undefined") {
      saveSessionToIndexedDB(updatedSession).catch(() => {});
    }

    return updatedSession;
  } catch {
    return null;
  }
}

export function clearStoredSession(
  storage: Pick<Storage, "removeItem">
): void {
  storage.removeItem(SESSION_STORAGE_KEY);
  storage.removeItem(SESSION_STORAGE_KEY_BACKUP);
  
  // Clear IndexedDB
  if (typeof window !== "undefined") {
    clearSessionFromIndexedDB().catch(() => {});
  }
}

// IndexedDB helpers for iOS PWA resilience
const IDB_DB_NAME = "finance-ai-session";
const IDB_STORE_NAME = "sessions";
const IDB_KEY = "current-session";

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_DB_NAME, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME);
      }
    };
  });
}

async function saveSessionToIndexedDB(session: StoredSession): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, "readwrite");
    const store = tx.objectStore(IDB_STORE_NAME);
    const request = store.put(session, IDB_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getSessionFromIndexedDB(): Promise<StoredSession | null> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, "readonly");
    const store = tx.objectStore(IDB_STORE_NAME);
    const request = store.get(IDB_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function clearSessionFromIndexedDB(): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, "readwrite");
    const store = tx.objectStore(IDB_STORE_NAME);
    const request = store.delete(IDB_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export const ACCESS_TOKEN_REFRESH_BUFFER_MS = 60_000;
export const ACCESS_TOKEN_KEEPALIVE_INTERVAL_MS = 10 * 60 * 1000;

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
