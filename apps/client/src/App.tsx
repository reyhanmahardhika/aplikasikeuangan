﻿import { useEffect, useRef, useState } from "react";
import { ArrowDownLeft, ArrowLeft, ArrowUp, Bell, Loader2, LogOut, Wallet } from "lucide-react";
import { ApiError, apiFetch, downloadUrl, type Session } from "./lib/api";
import { jakartaDateParts, localDate, rupiah } from "./lib/format";
import {
  ACCESS_TOKEN_KEEPALIVE_INTERVAL_MS,
  clearStoredSession,
  getAccessTokenSubject,
  isAccessTokenExpired,
  isValidSession,
  loadSavedSessionResult,
  saveSession,
  updateSessionActivity,
  SESSION_ACTIVITY_WINDOW_MS,
  type StoredSession
} from "./lib/session";
import { installUiTranslation } from "./lib/uiTranslation";
import type { Account, AppLanguage, AssistantContext, Category, ChildFrameState, DashboardSummary, HeaderNotification, InstallPromptEvent, NoticePayload, Schedule, TransactionDetail, View } from "./types/app";
import { mobileNavigation, navigation } from "./config/navigation";
import { successMessageFor } from "./lib/appHelpers";
import { MobileTopBar, NotificationBadge } from "./components/layout/MobileTopBar";
import { NotificationCenter } from "./components/notifications/NotificationCenter";
import { AccountsView, AddActionSheet, appNavigationLabel, AssistantView, AuthView, BudgetsView, CategoriesView, DashboardView, DataErrorState, HistoryView, LoadingState, ManageView, ManualTransactionView, MobileBottomNav, ProfileView, queueDebugLog, ReportsView, storedStringSet, TransactionDetailView, urlBase64ToUint8Array } from "./components/app/AppSections";


declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

function App() {
  const initialSearchParams = new URLSearchParams(window.location.search);
  const publicPocketShareToken = initialSearchParams.get("pocketShare");
  const initialAccountId = initialSearchParams.get("accountId") ?? "";
  const [session, setSession] = useState<StoredSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [language, setLanguage] = useState<AppLanguage>(() => localStorage.getItem("finance-language") === "id" ? "id" : "en");
  const [view, setView] = useState<View>(() => {
    const requested = initialSearchParams.get("view") as View | null;
    return requested && ["dashboard", "manual", "history", "reports", "assistant", "manage", "profile", "notifications", "accounts"].includes(requested)
      ? requested
      : "dashboard";
  });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [coreLoading, setCoreLoading] = useState(false);
  const [coreLoaded, setCoreLoaded] = useState(false);
  const [coreLoadError, setCoreLoadError] = useState<string | null>(null);
  const [serverNotifications, setServerNotifications] = useState<HeaderNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [pushStatus, setPushStatus] = useState<"unsupported" | "unavailable" | "default" | "granted" | "denied">(
    () => !("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)
      ? "unsupported"
      : Notification.permission
  );
  const [editing, setEditing] = useState<TransactionDetail | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDetail | null>(null);
  const [historyFocusTransactionId, setHistoryFocusTransactionId] = useState<string | null>(null);
  const [historyAccountId, setHistoryAccountId] = useState("");
  const [historyFromDate, setHistoryFromDate] = useState("");
  const [historyParentView, setHistoryParentView] = useState<View | null>(null);
  const [manualInitialType, setManualInitialType] = useState<"income" | "expense">("expense");
  const [manualInitialAccountId, setManualInitialAccountId] = useState(initialAccountId);
  const [manualResetKey, setManualResetKey] = useState(0);
  const [accountsInitialView, setAccountsInitialView] = useState<"list" | "account-form" | "transfer-form" | "pocket-detail">(() => view === "accounts" && initialAccountId ? "pocket-detail" : "list");
  const [accountsInitialTab, setAccountsInitialTab] = useState<"mine" | "shared">("mine");
  const [accountsResetKey, setAccountsResetKey] = useState(0);
  const [addActionOpen, setAddActionOpen] = useState(false);
  const [assistantContext, setAssistantContext] = useState<AssistantContext | null>(null);
  const [notice, setNotice] = useState<NoticePayload | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [backSwipeOffset, setBackSwipeOffset] = useState(0);
  const [backSwipeSettling, setBackSwipeSettling] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installedAsApp, setInstalledAsApp] = useState(() => window.matchMedia("(display-mode: standalone)").matches);
  const notifiedScheduleIds = useRef(new Set<string>());
  const refreshPromiseRef = useRef<Promise<string> | null>(null);
  const coreLoadedRef = useRef(false);
  const sessionExpiredAlertShown = useRef(false);
  const sessionRef = useRef(session);
  const sessionRecoveryAttempted = useRef(false);
  const sessionInitializedRef = useRef<string | null>(null);
  const profileReturnViewRef = useRef<View>("dashboard");
  const childFrameActiveRef = useRef(false);
  const childFrameBackRef = useRef<(() => void) | null>(null);
  const childFrameRefreshRef = useRef<(() => Promise<void> | void) | null>(null);
  const pullDistanceRef = useRef(0);
  const pullRefreshingRef = useRef(false);
  const backSwipeOffsetRef = useRef(0);
  const gestureStateRef = useRef({
    mode: null as null | "back" | "pull" | "ignore",
    startX: 0,
    startY: 0,
    startTime: 0,
    deltaX: 0,
    deltaY: 0
  });

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  useEffect(() => {
    pullDistanceRef.current = pullDistance;
  }, [pullDistance]);
  useEffect(() => {
    pullRefreshingRef.current = pullRefreshing;
  }, [pullRefreshing]);
  useEffect(() => {
    backSwipeOffsetRef.current = backSwipeOffset;
  }, [backSwipeOffset]);
  useEffect(() => {
    let locked = false;
    let lockedScrollY = 0;
    const body = document.body;
    const syncScrollLock = () => {
      const shouldLock = Boolean(document.querySelector("[data-scroll-lock='true']"));
      if (shouldLock === locked) return;
      locked = shouldLock;
      if (shouldLock) {
        lockedScrollY = window.scrollY;
        body.style.position = "fixed";
        body.style.top = `-${lockedScrollY}px`;
        body.style.left = "0";
        body.style.right = "0";
        body.style.width = "100%";
        body.style.overflow = "hidden";
        return;
      }
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      body.style.overflow = "";
      window.scrollTo(0, lockedScrollY);
    };
    const observer = new MutationObserver(syncScrollLock);
    observer.observe(document.body, { childList: true, subtree: true });
    syncScrollLock();
    return () => {
      observer.disconnect();
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      body.style.overflow = "";
    };
  }, []);
  const [dismissedScheduleIds, setDismissedScheduleIds] = useState<Set<string>>(
    () => storedStringSet("dismissed-schedule-notifications")
  );
  const token = session?.accessToken;

  //#region debug-point login-error-report
  const reportDebug = (event: string, data: unknown) => {
    queueDebugLog(event, data);
  };
  //#endregion

  const clearSession = (message?: string) => {
    clearStoredSession(localStorage);
    sessionRef.current = null;
    sessionInitializedRef.current = null;
    setSession(null);
    setCoreLoading(false);
    coreLoadedRef.current = false;
    setCoreLoaded(false);
    setCoreLoadError(null);
    setAccounts([]);
    setCategories([]);
    setSchedules([]);
    setDashboard(null);
    if (message) setNotice(message);
  };

  const applyChildFrameState = ({ active, onBack, onRefresh }: ChildFrameState) => {
    childFrameActiveRef.current = active;
    childFrameBackRef.current = active ? onBack ?? null : null;
    childFrameRefreshRef.current = onRefresh ?? null;
  };

  const applyUserToSession = (user: Session["user"]) => {
    const currentSession = sessionRef.current;
    if (!currentSession) return;
    const nextSession: StoredSession = {
      ...currentSession,
      user
    };
    sessionRef.current = nextSession;
    setSession(nextSession);
    localStorage.setItem("finance-session", JSON.stringify(nextSession));
  };

  //#region debug-point login-error-accept-session
  const acceptSession = (nextSession: Session) => {
    const storedSession = saveSession(localStorage, nextSession);
    reportDebug("accept_session_called", {
      keys: nextSession && typeof nextSession === "object" ? Object.keys(nextSession as Record<string, unknown>) : null,
      hasLastActivityAt: Boolean((storedSession as any)?.lastActivityAt),
      userKeys: nextSession && typeof nextSession === "object" && (nextSession as any).user && typeof (nextSession as any).user === "object"
        ? Object.keys((nextSession as any).user)
        : null,
      valid: isValidSession(storedSession)
    });
    if (!isValidSession(storedSession)) {
      reportDebug("accept_session_invalid", storedSession);
      clearSession("Data sesi tidak valid. Silakan login kembali.");
      return;
    }
    setView("dashboard");
    setEditing(null);
    setSelectedTransaction(null);
    setHistoryAccountId("");
    setHistoryFromDate("");
    setManualInitialType("expense");
    setAccountsInitialView("list");
    setAddActionOpen(false);
    setHistoryFocusTransactionId(null);
    coreLoadedRef.current = false;
    setCoreLoaded(false);
    setCoreLoadError(null);
    setCoreLoading(true);
    window.history.replaceState({}, "", window.location.pathname);
    window.scrollTo({ top: 0, behavior: "auto" });
    sessionExpiredAlertShown.current = false;
    sessionRef.current = storedSession;
    setSession(storedSession);
    reportDebug("accept_session_applied", { view: "dashboard" });
  };
  //#endregion

  const refreshAccessToken = async () => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;
    const activeSession = sessionRef.current;
    if (!activeSession?.refreshToken) throw new Error("Refresh token tidak tersedia");

    refreshPromiseRef.current = (async () => {
      console.debug('[Auth] Refreshing access token...', {
        hasRefreshToken: !!activeSession.refreshToken,
        lastActivityAt: activeSession.lastActivityAt,
        userId: activeSession.user.id
      });
      
      let retries = 2;
      let lastError: Error | null = null;
      
      while (retries >= 0) {
        try {
          const refreshed = await apiFetch<Session>("/auth/refresh-token", undefined, {
            method: "POST",
            body: JSON.stringify({ refreshToken: activeSession.refreshToken })
          });
          
          console.debug('[Auth] Token refreshed successfully');
          const currentSession = sessionRef.current;
          if (!currentSession || currentSession.refreshToken !== activeSession.refreshToken) {
            throw new Error("Sesi sudah berubah");
          }
          const nextSession: StoredSession = {
            user: refreshed.user,
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken ?? activeSession.refreshToken, // Fallback jika server tidak kirim refresh token baru
            lastActivityAt: currentSession.lastActivityAt
          };
          if (!isValidSession(nextSession)) throw new Error("Sesi tidak lengkap");
          sessionRef.current = nextSession;
          setSession(nextSession);
          localStorage.setItem(
            "finance-session",
            JSON.stringify(nextSession)
          );
          return nextSession.accessToken;
        } catch (error) {
          lastError = error as Error;
          if (error instanceof ApiError && error.status === 401) {
            // Refresh token expired, tidak bisa retry
            throw error;
          }
          // Network error atau server error, bisa retry
          retries--;
          if (retries >= 0) {
            console.warn(`[Auth] Refresh failed, retrying... (${retries} attempts left)`, lastError);
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      }
      
      throw lastError ?? new Error("Refresh token gagal");
    })();
    try {
      return await refreshPromiseRef.current;
    } finally {
      refreshPromiseRef.current = null;
    }
  };

  const ensureFreshAccessToken = async () => {
    const activeSession = sessionRef.current;
    if (!activeSession?.refreshToken) return;
    const tokenSubject = getAccessTokenSubject(activeSession.accessToken);
    const tokenBelongsToSessionUser = tokenSubject === activeSession.user.id;
    if (tokenBelongsToSessionUser && !isAccessTokenExpired(activeSession.accessToken)) return;
    let retries = 1;
    while (true) {
      try {
        await refreshAccessToken();
        return;
      } catch (err) {
        if (retries > 0 && err instanceof ApiError && err.status === 401) {
          console.warn('[Auth] Refresh failed, retrying...', { retries });
          retries--;
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
        throw err;
      }
    }
  };

  const expireSession = (message = "Sesi Anda sudah berakhir. Silakan login kembali.") => {
    if (sessionExpiredAlertShown.current) return;
    sessionExpiredAlertShown.current = true;
    sessionRecoveryAttempted.current = false;
    clearSession();
    setView("dashboard");
    window.history.replaceState({}, "", window.location.pathname);
    window.scrollTo({ top: 0, behavior: "auto" });
    // Gunakan setTimeout agar tidak blocking UI
    setTimeout(() => {
      window.alert(message);
    }, 100);
  };

  useEffect(() => {
    let cancelled = false;

    const initializeStoredSession = async () => {
      try {
        const result = await loadSavedSessionResult(localStorage);

        if (cancelled) return;

        if (result.status === "expired" || result.status === "invalid") {
          clearStoredSession(localStorage);
          sessionRef.current = null;
          setSession(null);
          setCoreLoading(false);
          return;
        }

        sessionRef.current = result.session;
        setSession(result.session);
        setCoreLoading(Boolean(result.session));
      } catch (error) {
        if (cancelled) return;

        console.error("Gagal membaca session:", error);
        sessionRef.current = null;
        setSession(null);
        setCoreLoading(false);
      } finally {
        if (!cancelled) {
          setSessionLoading(false);
        }
      }
    };

    void initializeStoredSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const request = async <T,>(path: string, options: RequestInit = {}) => {
    const method = String(options.method ?? "GET").toUpperCase();
    try {
      const result = await apiFetch<T>(path, sessionRef.current?.accessToken, options);
      const message = successMessageFor(path, method);
      if (message) setNotice({ message, type: "success" });
      return result;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && path !== "/auth/refresh-token") {
        if (sessionRef.current?.refreshToken) {
          try {
            const refreshedToken = await refreshAccessToken();
            const result = await apiFetch<T>(path, refreshedToken, options);
            const message = successMessageFor(path, method);
            if (message) setNotice({ message, type: "success" });
            return result;
          } catch {
            expireSession();
            throw new ApiError(401, "Sesi sudah selesai");
          }
        }
        expireSession();
        throw new ApiError(401, "Sesi sudah selesai");
      }
      setNotice({ message: error instanceof Error ? error.message : "Terjadi kesalahan pada server", type: "error" });
      throw error;
    }
  };

  const optionalRequest = async <T,>(path: string, fallback: T, options: RequestInit = {}) => {
    try {
      return await request<T>(path, options);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        throw error;
      }
      return fallback;
    }
  };

  const logout = async () => {
    const refreshToken = session?.refreshToken;
    try {
      if (refreshToken) {
        await apiFetch("/auth/logout", undefined, {
          method: "POST",
          body: JSON.stringify({ refreshToken })
        });
      }
    } finally {
      clearSession();
      setView("dashboard");
      window.history.replaceState({}, "", window.location.pathname);
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  };

  const openAssistant = () => {
    setAssistantContext(null);
    navigate("assistant");
  };

  const syncPushSubscription = async (requestPermission: boolean) => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushStatus("unsupported");
      return;
    }
    const pushConfig = await request<{ enabled: boolean; publicKey: string | null }>("/notifications/push/config");
    if (!pushConfig.enabled || !pushConfig.publicKey) {
      setPushStatus("unavailable");
      return;
    }

    const permission = requestPermission ? await Notification.requestPermission() : Notification.permission;
    setPushStatus(permission);
    if (permission !== "granted") return;

    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription = existing ?? await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(pushConfig.publicKey)
    });
    await request("/notifications/push/subscribe", {
      method: "POST",
      body: JSON.stringify(subscription.toJSON())
    });
    setPushStatus("granted");
  };

  const refreshCore = async () => {
    const accessToken = sessionRef.current?.accessToken;

    if (!accessToken) {
      coreLoadedRef.current = false;
      setCoreLoaded(false);
      setCoreLoading(false);
      setCoreLoadError(null);
      return;
    }

    const hadLoadedCore = coreLoadedRef.current;
    setCoreLoading(true);
    setCoreLoadError(null);

    try {
      const [
        nextAccounts,
        nextCategories,
        nextDashboard,
        nextNotifications
      ] = await Promise.all([
        request<Account[]>("/accounts"),
        request<Category[]>("/categories"),
        request<DashboardSummary>("/dashboard/summary"),
        optionalRequest<HeaderNotification[]>("/notifications", [])
      ]);

      const nextSchedules = await optionalRequest<Schedule[]>("/schedules", []);

      setAccounts(nextAccounts);
      setCategories(nextCategories);
      setDashboard(nextDashboard);
      setServerNotifications(nextNotifications.map((item) => ({ ...item, kind: "server" })));
      setSchedules(nextSchedules);
      coreLoadedRef.current = true;
      setCoreLoaded(true);
    } catch (error) {
      console.error("Data inti gagal dimuat:", error);

      if (!hadLoadedCore) {
        setDashboard(null);
        setAccounts([]);
        setCategories([]);
        setServerNotifications([]);
        setSchedules([]);
        coreLoadedRef.current = false;
        setCoreLoaded(false);
      }

      const message = error instanceof Error ? error.message : "Gagal memuat data";
      if (hadLoadedCore) {
        setNotice(message);
        setCoreLoadError(null);
      } else {
        setCoreLoadError(message);
      }
    } finally {
      setCoreLoading(false);
    }
  };


  useEffect(() => {
    if (isValidSession(session)) {
      localStorage.setItem("finance-session", JSON.stringify(session));
    } else {
      localStorage.removeItem("finance-session");
    }
  }, [session]);

  useEffect(() => {
  if (!isValidSession(session)) {
    coreLoadedRef.current = false;
    setCoreLoaded(false);
    setCoreLoading(false);
    setCoreLoadError(null);
    return;
  }

  const controller = new AbortController();

  const initializeSession = async () => {
    try {
      // Session recovery: coba refresh token jika access token sudah expired
      const activeSession = sessionRef.current;
      if (activeSession?.refreshToken && isAccessTokenExpired(activeSession.accessToken)) {
        console.debug('[Auth] Session recovery: access token expired, refreshing...');
        try {
          await refreshAccessToken();
        } catch (refreshError) {
          // Jika refresh gagal, session akan di-expire
          if (refreshError instanceof ApiError && refreshError.status === 401) {
            console.warn('[Auth] Session recovery failed: refresh token expired');
            expireSession("Sesi Anda sudah berakhir. Silakan login kembali.");
            return;
          }
          throw refreshError;
        }
      }

      if (controller.signal.aborted) {
        return;
      }

      await refreshCore();
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      if (error instanceof ApiError && error.status === 401) {
        expireSession("Sesi Anda sudah berakhir. Silakan login kembali.");
        return;
      }

      setNotice(
        error instanceof Error
          ? error.message
          : "Gagal memuat data"
      );
      coreLoadedRef.current = false;
      setCoreLoaded(false);
      setCoreLoading(false);
    }
  };

  void initializeSession();

  return () => {
    controller.abort();
  };
}, [session?.user?.id]);

  // Auto-refresh token saat app dibuka kembali (visibility change)
  useEffect(() => {
    if (!session?.refreshToken) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState !== "visible") return;
      
      const activeSession = sessionRef.current;
      if (!activeSession?.refreshToken) return;

      // Cek apakah access token sudah expired atau akan segera expired
      if (isAccessTokenExpired(activeSession.accessToken)) {
        try {
          await refreshAccessToken();
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) {
            expireSession();
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    // Juga refresh saat app mendapat focus
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [session?.refreshToken]);

  // Session activity tracking dan keep-alive
  useEffect(() => {
    if (!session?.refreshToken) return;

    const markActivity = () => {
      const updatedSession = updateSessionActivity(localStorage);
      if (updatedSession) {
        sessionRef.current = updatedSession;
        setSession(updatedSession);
      }
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "touchstart",
      "scroll"
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, markActivity, { passive: true });
    });

    const keepSessionAlive = () => {
      const activeSession = sessionRef.current;

      if (!activeSession) return;

      const inactiveDuration =
        Date.now() - activeSession.lastActivityAt;

      if (inactiveDuration > SESSION_ACTIVITY_WINDOW_MS) {
        return;
      }

      refreshAccessToken().catch((error) => {
        if (error instanceof ApiError && error.status === 401) {
          expireSession();
        }
      });
    };

    const intervalId = window.setInterval(keepSessionAlive, ACCESS_TOKEN_KEEPALIVE_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, markActivity);
      });
    };
  }, [session?.refreshToken]);

  useEffect(() => {
    if (!session || pushStatus !== "granted") return;
    syncPushSubscription(false).catch(() => setPushStatus("unavailable"));
  }, [session?.accessToken]);

  useEffect(() => {
    localStorage.setItem("finance-language", language);
    document.documentElement.lang = language;
    return installUiTranslation(language);
  }, [language]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== "finance-session") return;

      if (!event.newValue) {
        sessionRef.current = null;
        setSession(null);
        return;
      }

      try {
        const parsed = JSON.parse(event.newValue);
        if (!parsed || !parsed.refreshToken || !parsed.accessToken) return;

        const currentSession = sessionRef.current;
        if (currentSession && currentSession.refreshToken !== parsed.refreshToken) {
          sessionRef.current = parsed;
          setSession(parsed);
        }
      } catch {}
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);


  useEffect(() => {
    if (!session?.accessToken) return;
    request("/notifications/language", {
      method: "PUT",
      body: JSON.stringify({ language })
    }).catch(() => undefined);
  }, [language, session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken) return;
    const syncPocketInvites = () => Promise.all([
      request<Account[]>("/accounts").then(setAccounts),
      request<HeaderNotification[]>("/notifications").then((items) => setServerNotifications(items.map((item) => ({ ...item, kind: "server" }))))
    ]).catch(() => undefined);
    const intervalId = window.setInterval(syncPocketInvites, 60_000);
    const handleVisible = () => {
      if (document.visibilityState === "visible") syncPocketInvites();
    };
    document.addEventListener("visibilitychange", handleVisible);
    window.addEventListener("focus", syncPocketInvites);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisible);
      window.removeEventListener("focus", syncPocketInvites);
    };
  }, [session?.accessToken]);

  useEffect(() => {
    let scrollEndTimer = 0;
    const updateScrollButton = () => {
      setShowScrollTop(window.scrollY > 1);
      setIsScrolling(true);
      window.clearTimeout(scrollEndTimer);
      scrollEndTimer = window.setTimeout(() => setIsScrolling(false), 180);
    };
    updateScrollButton();
    setIsScrolling(false);
    window.addEventListener("scroll", updateScrollButton, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateScrollButton);
      window.clearTimeout(scrollEndTimer);
    };
  }, []);

  useEffect(() => {
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const markInstalled = () => {
      setInstalledAsApp(true);
      setInstallPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    window.addEventListener("appinstalled", markInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, []);

  const installApp = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setInstallPrompt(null);
      return;
    }
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      window.alert("Di Safari, ketuk tombol Bagikan lalu pilih Tambahkan ke Layar Utama.");
      return;
    }
    window.alert("Buka menu browser lalu pilih Instal aplikasi atau Tambahkan ke layar utama.");
  };

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const dueSchedules = schedules.filter((schedule) => schedule.reminderStatus !== "upcoming" && !notifiedScheduleIds.current.has(schedule.id));
    if (!dueSchedules.length) return;
    dueSchedules.forEach((schedule) => notifiedScheduleIds.current.add(schedule.id));
    setNotice(`${dueSchedules.length} jadwal perlu diperhatikan`);
    if ("Notification" in window && Notification.permission === "granted" && "serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => Promise.all(dueSchedules.map((schedule) =>
        registration.showNotification(schedule.title, {
          body: `${localDate(schedule.nextDueDate)}${schedule.amount ? ` - ${rupiah(schedule.amount)}` : ""}`,
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          tag: `schedule-${schedule.id}-${schedule.nextDueDate.slice(0, 10)}`,
          data: { url: "/?view=manage" }
        })
      ))).catch(() => undefined);
    }
  }, [schedules]);

  const scheduleNotifications: HeaderNotification[] = schedules
    .filter((schedule) => schedule.reminderStatus !== "upcoming" && !dismissedScheduleIds.has(schedule.id))
    .map((schedule) => ({
      id: schedule.id,
      eventType: "schedule_due",
      title: schedule.title,
      body: `${localDate(schedule.nextDueDate)}${schedule.amount ? ` - ${rupiah(schedule.amount)}` : ""}`,
      isRead: false,
      createdAt: schedule.nextDueDate,
      kind: "schedule"
    }));
  const pendingPocketInvites = accounts.filter((account) => account.collaborationStatus === "pending" && account.ownerUserId !== session?.user.id);
  const pocketInviteNotifications: HeaderNotification[] = pendingPocketInvites.map((account) => ({
    id: `pocket-invite-${account.id}`,
    eventType: "pocket_invite",
    title: language === "en" ? "Pocket invitation" : "Undangan Pocket",
    body: language === "en" ? `${account.ownerName ?? "A user"} invited you to ${account.name}.` : `${account.ownerName ?? "Seseorang"} mengundang Anda ke ${account.name}.`,
    entityType: "account",
    entityId: account.id,
    isRead: false,
    createdAt: new Date().toISOString(),
    kind: "pocket_invite"
  }));
  const notificationItems = [...serverNotifications, ...scheduleNotifications, ...pocketInviteNotifications]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const unreadNotificationCount = notificationItems.filter((item) => !item.isRead).length;

  const markAllNotificationsRead = async () => {
    const nextDismissed = new Set(dismissedScheduleIds);
    scheduleNotifications.forEach((item) => nextDismissed.add(item.id));
    setDismissedScheduleIds(nextDismissed);
    localStorage.setItem("dismissed-schedule-notifications", JSON.stringify([...nextDismissed]));
    if (serverNotifications.some((item) => !item.isRead)) {
      setServerNotifications((items) => items.map((item) => ({ ...item, isRead: true })));
      await request("/notifications/read", { method: "PUT" }).catch(() => undefined);
    }
  };

  const openNotification = async (item: HeaderNotification) => {
    if (item.kind === "server") {
      if (!item.isRead) {
        setServerNotifications((items) => items.map((notification) => notification.id === item.id ? { ...notification, isRead: true } : notification));
        await request(`/notifications/${item.id}/read`, { method: "PUT" }).catch(() => undefined);
      }
      setNotificationsOpen(false);
      if (item.entityType === "account" && item.entityId) {
        setManualInitialAccountId(item.entityId);
        setAccountsInitialView("pocket-detail");
        setAccountsResetKey((current) => current + 1);
        navigate("accounts");
      }
      return;
    }
    if (item.kind === "pocket_invite") {
      setNotificationsOpen(false);
      setAccountsInitialView("list");
      setAccountsInitialTab("shared");
      setAccountsResetKey((current) => current + 1);
      navigate("accounts");
      return;
    }
    if (item.kind === "schedule") {
      const nextDismissed = new Set(dismissedScheduleIds);
      nextDismissed.add(item.id);
      setDismissedScheduleIds(nextDismissed);
      localStorage.setItem("dismissed-schedule-notifications", JSON.stringify([...nextDismissed]));
      setNotificationsOpen(false);
      setView("manage");
      return;
    }
    setNotificationsOpen(false);
  };

  const canHandleChildBack = () => {
    if (childFrameActiveRef.current && childFrameBackRef.current) return true;
    if (view === "transactionDetail") return true;
    if (view === "manual" && Boolean(editing && selectedTransaction)) return true;
    if (view === "manual" && Boolean(manualInitialAccountId)) return true;
    if (view === "profile") return true;
    if (view === "accounts" || view === "categories" || view === "budgets") return true;
    return false;
  };

  const navigate = (nextView: View, preserveHistoryAccount = false) => {
    if (nextView === "history" && !preserveHistoryAccount) {
      setHistoryAccountId("");
      setHistoryFromDate("");
      setHistoryParentView(null);
    }
    if (nextView !== "history" && nextView !== "transactionDetail") {
      setHistoryParentView(null);
    }
    if ((view === "manual" && nextView !== "transactionDetail") || (nextView !== "manual" && nextView !== "transactionDetail")) {
      setEditing(null);
    }
    if (nextView !== "transactionDetail") {
      setSelectedTransaction(null);
    }
    setView(nextView);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openChildView = (nextView: View, returnView = view) => {
    if (nextView === "profile") {
      profileReturnViewRef.current = returnView;
    }
    navigate(nextView);
  };

  const openAddActionSheet = () => {
    setAddActionOpen(true);
  };

  const startAddTransaction = (type: "income" | "expense") => {
    setAddActionOpen(false);
    setEditing(null);
    setManualInitialType(type);
    setManualInitialAccountId("");
    setAccountsInitialView("list");
    setAccountsResetKey((current) => current + 1);
    navigate("accounts");
  };

  const startPocketTransaction = (accountId: string) => {
    setEditing(null);
    setManualInitialType("expense");
    setManualInitialAccountId(accountId);
    setManualResetKey((current) => current + 1);
    navigate("manual");
  };

  const returnToPocketDetail = (accountId = manualInitialAccountId) => {
    setAccountsInitialView(accountId ? "pocket-detail" : "list");
    setAccountsResetKey((current) => current + 1);
    navigate("accounts");
  };

  const openPocketTransactions = (accountId = "", fromDate?: string) => {
    setHistoryParentView("accounts");
    setHistoryAccountId(accountId);
    setHistoryFromDate(fromDate ?? "");
    navigate("history", true);
  };

  const openPocketTransactionDetail = async (accountId: string, transactionId: string) => {
    setHistoryParentView("accounts");
    setHistoryAccountId(accountId);
    setHistoryFromDate("");
    await openTransactionDetail(transactionId);
  };

  const backFromHistory = () => {
    if (historyParentView === "accounts") {
      returnToPocketDetail(historyAccountId);
      return;
    }
    navigate(historyParentView ?? "dashboard");
  };

  const startAccountTransfer = () => {
    setAddActionOpen(false);
    setEditing(null);
    setAccountsInitialView("transfer-form");
    setAccountsResetKey((current) => current + 1);
    navigate("accounts");
  };

  const openTransactionDetail = async (id: string) => {
    const detail = await request<TransactionDetail>(`/transactions/${id}`);
    setSelectedTransaction(detail);
    setEditing(null);
    setView("transactionDetail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startEditingTransaction = () => {
    if (!selectedTransaction) return;
    setEditing(selectedTransaction);
    openChildView("manual", "transactionDetail");
  };

  const removeTransaction = async (id: string) => {
    if (!window.confirm("Hapus transaksi ini?")) return;
    await request(`/transactions/${id}`, { method: "DELETE" });
    setSelectedTransaction(null);
    await refreshCore();
    setView("history");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pageTitle =
    appNavigationLabel(view, navigation.find((item) => item.id === view)?.label, language) ??
    appNavigationLabel(view, mobileNavigation.find((item) => item.id === view)?.label, language) ??
    "Detail transaksi";
  const activeNavigationView = view === "manual" && Boolean(manualInitialAccountId)
    ? "accounts"
    : view === "profile"
      ? "manage"
    : (view === "history" || view === "transactionDetail") && historyParentView === "accounts"
      ? "accounts"
      : view;
  const backSwipeProgress = Math.min(1, backSwipeOffset / Math.max(window.innerWidth, 320));

  const goBackFromChildFrame = () => {
    if (notificationsOpen) return false;
    if (childFrameActiveRef.current && childFrameBackRef.current) {
      childFrameBackRef.current();
      return true;
    }
    if (view === "transactionDetail" && selectedTransaction) {
      if (historyParentView === "accounts") {
        returnToPocketDetail(historyAccountId || selectedTransaction.accountId);
      } else {
        setHistoryFocusTransactionId(selectedTransaction.id);
        navigate("history", true);
      }
      return true;
    }
    if (view === "manual" && editing && selectedTransaction) {
      setEditing(null);
      navigate("transactionDetail");
      return true;
    }
    if (view === "manual" && manualInitialAccountId) {
      returnToPocketDetail(manualInitialAccountId);
      return true;
    }
    if (view === "profile") {
      navigate("manage");
      return true;
    }
    if (view === "accounts" || view === "categories" || view === "budgets") {
      navigate("manage");
      return true;
    }
    return false;
  };

  const refreshCurrentView = async () => {
    if (pullRefreshingRef.current || notificationsOpen || view === "assistant") return;
    pullRefreshingRef.current = true;
    setPullRefreshing(true);
    try {
      await ensureFreshAccessToken().catch(() => undefined);
      await refreshCore().catch(() => undefined);
      if (childFrameRefreshRef.current) {
        await childFrameRefreshRef.current();
      }
    } finally {
      pullRefreshingRef.current = false;
      setPullRefreshing(false);
      setPullDistance(0);
      pullDistanceRef.current = 0;
    }
  };

  const settleBackSwipe = (shouldGoBack: boolean) => {
    setBackSwipeSettling(true);
    if (shouldGoBack) {
      const width = Math.max(window.innerWidth, 320);
      backSwipeOffsetRef.current = width;
      setBackSwipeOffset(width);
      window.setTimeout(() => {
        goBackFromChildFrame();
        backSwipeOffsetRef.current = 0;
        setBackSwipeOffset(0);
        setBackSwipeSettling(false);
      }, 170);
      return;
    }

    backSwipeOffsetRef.current = 0;
    setBackSwipeOffset(0);
    window.setTimeout(() => setBackSwipeSettling(false), 220);
  };

  useEffect(() => {
    if (view !== "manage" && view !== "history" && view !== "accounts") {
      applyChildFrameState({ active: false, onBack: null, onRefresh: null });
    }
  }, [view]);

  useEffect(() => {
    const resetGesture = () => {
      gestureStateRef.current.mode = null;
      gestureStateRef.current.deltaX = 0;
      gestureStateRef.current.deltaY = 0;
      gestureStateRef.current.startTime = 0;
      if (pullDistanceRef.current > 0 && !pullRefreshingRef.current) {
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1 || notificationsOpen || pullRefreshingRef.current || backSwipeSettling || view === "assistant" || window.innerWidth >= 1024) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true'], [data-gesture-ignore='true']")) {
        gestureStateRef.current.mode = "ignore";
        return;
      }
      const touch = event.touches[0];
      gestureStateRef.current = {
        mode: null,
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: performance.now(),
        deltaX: 0,
        deltaY: 0
      };
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const gesture = gestureStateRef.current;
      if (gesture.mode === "ignore") return;

      const touch = event.touches[0];
      gesture.deltaX = touch.clientX - gesture.startX;
      gesture.deltaY = touch.clientY - gesture.startY;

      if (gesture.mode === null) {
        const horizontalLead = Math.abs(gesture.deltaX) > Math.abs(gesture.deltaY) * 1.25;
        const verticalLead = Math.abs(gesture.deltaY) > Math.abs(gesture.deltaX) * 1.2;

        if (gesture.startX <= 28 && gesture.deltaX > 14 && horizontalLead && canHandleChildBack()) {
          gesture.mode = "back";
          setBackSwipeSettling(false);
        } else if (window.scrollY <= 0 && gesture.deltaY > 12 && verticalLead) {
          gesture.mode = "pull";
        } else if (Math.abs(gesture.deltaX) > 16 || Math.abs(gesture.deltaY) > 16) {
          gesture.mode = "ignore";
        }
      }

      if (gesture.mode === "back" && gesture.deltaX > 0) {
        event.preventDefault();
        const width = Math.max(window.innerWidth, 320);
        const resistedOffset = Math.min(width * 0.92, Math.pow(gesture.deltaX, 0.92) * 1.18);
        if (Math.abs(resistedOffset - backSwipeOffsetRef.current) >= 1) {
          backSwipeOffsetRef.current = resistedOffset;
          setBackSwipeOffset(resistedOffset);
        }
      }

      if (gesture.mode === "pull" && gesture.deltaY > 0 && window.scrollY <= 0) {
        event.preventDefault();
        const nextDistance = Math.min(92, gesture.deltaY * 0.45);
        if (Math.abs(nextDistance - pullDistanceRef.current) >= 1) {
          pullDistanceRef.current = nextDistance;
          setPullDistance(nextDistance);
        }
      }
    };

    const handleTouchEnd = () => {
      const gesture = gestureStateRef.current;
      if (gesture.mode === "back") {
        const width = Math.max(window.innerWidth, 320);
        const elapsed = Math.max(1, performance.now() - gesture.startTime);
        const velocity = gesture.deltaX / elapsed;
        const shouldGoBack = gesture.deltaX >= Math.min(150, width * 0.34) || (gesture.deltaX >= 62 && velocity > 0.62);
        settleBackSwipe(shouldGoBack);
      } else if (gesture.mode === "pull") {
        if (pullDistanceRef.current >= 68) {
          void refreshCurrentView();
        } else if (!pullRefreshingRef.current) {
          setPullDistance(0);
          pullDistanceRef.current = 0;
        }
      } else if (!pullRefreshingRef.current && pullDistanceRef.current > 0) {
        setPullDistance(0);
        pullDistanceRef.current = 0;
      } else if (!backSwipeSettling && backSwipeOffsetRef.current > 0) {
        settleBackSwipe(false);
      }
      resetGesture();
    };

    const handleTouchCancel = () => {
      if (gestureStateRef.current.mode === "back" || backSwipeOffsetRef.current > 0) {
        settleBackSwipe(false);
      }
      resetGesture();
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchCancel, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [backSwipeSettling, editing, manualInitialAccountId, notificationsOpen, selectedTransaction, view]);

  if (publicPocketShareToken) {
    return <PublicPocketHistory token={publicPocketShareToken} />;
  }
  if (sessionLoading) {
    return <LoadingState />;
  }

  const activeSession = isValidSession(session) ? session : null;
  if (!activeSession) {
    return <AuthView onSignedIn={acceptSession} onInstall={installApp} showInstall={!installedAsApp} />;
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar fixed inset-y-0 left-0 z-20 hidden w-72 border-r lg:flex lg:flex-col">
        <div className="app-sidebar-brand flex h-[76px] items-center gap-3 border-b px-5">
          <div className="brand-mark h-11 w-11">
            <Wallet size={21} strokeWidth={2.4} />
          </div>
          <div>
            <p className="text-[15px] font-extrabold tracking-[-0.03em] text-white">Keuangan AI</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">Money operating system</p>
          </div>
        </div>
        <div className="px-5 pb-2 pt-5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/30">Workspace</div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = activeNavigationView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === "assistant") {
                    openAssistant();
                    return;
                  }
                  if (item.id === "history") setHistoryParentView(null);
                  if (item.id === "accounts") setAccountsInitialView("list");
                  navigate(item.id);
                }}
                className={`app-sidebar-nav-item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold ${
                  active ? "app-sidebar-nav-item-active" : ""
                }`}
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${active ? "bg-black/5" : "bg-white/[0.04]"}`}>
                  <Icon size={17} strokeWidth={active ? 2.4 : 2} />
                </span>
                {appNavigationLabel(item.id, item.label, language)}
              </button>
            );
          })}
        </nav>
        <div className="m-4 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
          <div className="flex items-center gap-2 text-[11px] font-bold text-white/85">
            <span className="h-2 w-2 rounded-full bg-[#DFFF74]" /> Data tersinkron
          </div>
          <p className="mt-2 text-[10px] leading-4 text-white/38">Semua pocket dan transaksi dirangkum dalam satu ledger.</p>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="app-topbar sticky top-0 z-10 hidden border-b lg:block">
          <div className="app-main flex min-h-[76px] items-center justify-between px-8 py-3">
            <div>
              <p className="eyebrow">Personal finance workspace</p>
              <h1 className="mt-1 text-xl font-extrabold tracking-[-0.035em]">{pageTitle}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="mobile-icon-btn"
                aria-label={language === "en" ? "Notifications" : "Notifikasi"}
                onClick={() => navigate("notifications")}
              >
                <Bell size={18} />
                {unreadNotificationCount > 0 && <NotificationBadge count={unreadNotificationCount} />}
              </button>
              <button
                className="btn-secondary"
                onClick={logout}
              >
                <LogOut size={16} /> {language === "en" ? "Sign out" : "Keluar"}
              </button>
              <button type="button" className="flex items-center gap-2 rounded-xl border border-[#DFE5DE] bg-white px-2.5 py-1.5 text-left" onClick={() => navigate("profile")}>
                <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-emerald-50 text-xs font-extrabold text-emerald-800">
                  {activeSession.user.avatarUrl ? <img src={activeSession.user.avatarUrl} alt="" className="h-full w-full object-cover" /> : (activeSession.user.nickname || activeSession.user.fullName || "U").slice(0, 1).toUpperCase()}
                </span>
                <span className="max-w-36">
                  <span className="block truncate text-xs font-bold text-[#101713]">{activeSession.user.nickname || activeSession.user.fullName}</span>
                  <span className="block truncate text-[10px] text-slate-500">{activeSession.user.email}</span>
                </span>
              </button>
            </div>
          </div>
        </header>

        {view === "dashboard" && (
          <MobileTopBar
            user={activeSession.user}
            language={language}
            unreadCount={unreadNotificationCount}
            onLanguageChange={setLanguage}
            onNotifications={() => navigate("notifications")}
            onProfile={() => navigate("manage")}
          />
        )}

        {notice && (
          (() => {
            const message = typeof notice === "string" ? notice : notice.message;
            const inferredError = /gagal|error|tidak|sesi|pilih|failed|cannot|unauthor|kadaluarsa|bermasalah/i.test(message);
            const type = typeof notice === "string" ? (inferredError ? "error" : "success") : notice.type;
            return (
              <div className={`fixed left-4 right-4 top-4 z-50 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-[0_18px_44px_rgba(15,23,42,0.16)] lg:left-auto lg:right-6 lg:w-96 lg:rounded-lg ${
                type === "error"
                  ? "border-rose-100 bg-rose-50 text-rose-700"
                  : "border-emerald-100 bg-white text-[#15803D]"
              }`}>
                {message}
              </div>
            );
          })()
        )}

        {(pullDistance > 0 || pullRefreshing) && (
          <div className="pointer-events-none fixed inset-x-0 top-[4.4rem] z-30 flex justify-center lg:hidden">
            <div
              className="flex min-w-[156px] items-center justify-center gap-2 rounded-full border border-emerald-100 bg-white/95 px-4 py-2 text-xs font-semibold text-[#16A34A] shadow-[0_14px_34px_rgba(15,23,42,0.12)] backdrop-blur"
              style={{
                transform: `translateY(${Math.min(42, pullDistance)}px)`,
                opacity: pullRefreshing ? 1 : Math.min(1, pullDistance / 48)
              }}
            >
              {pullRefreshing ? <Loader2 size={15} className="animate-spin" /> : <ArrowDownLeft size={15} />}
              <span>{pullRefreshing ? (language === "en" ? "Refreshing..." : "Memuat ulang...") : (language === "en" ? "Pull to reload" : "Tarik untuk muat ulang")}</span>
            </div>
          </div>
        )}

        {(backSwipeOffset > 0 || backSwipeSettling) && (
          <div
            className="pointer-events-none fixed inset-0 z-[9] bg-[#F4F6F2] lg:hidden"
            style={{ opacity: Math.min(0.92, 0.28 + backSwipeProgress * 0.64) }}
          >
            <div
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#16A34A] shadow-[0_10px_26px_rgba(15,23,42,0.14)]"
              style={{
                opacity: Math.min(1, backSwipeProgress * 2.4),
                transform: `translateY(-50%) scale(${0.86 + Math.min(0.14, backSwipeProgress * 0.14)})`
              }}
            >
              <ArrowLeft size={18} />
            </div>
          </div>
        )}

        <main
          className={
            view === "assistant"
              ? "fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] top-0 overflow-hidden p-0 lg:static lg:inset-auto lg:overflow-visible lg:px-8 lg:py-6"
              : "app-main px-4 pb-28 pt-3 lg:px-8 lg:py-7"
          }
          style={backSwipeOffset > 0 || backSwipeSettling ? {
            transform: `translate3d(${backSwipeOffset}px, 0, 0)`,
            transition: backSwipeSettling ? "transform 190ms cubic-bezier(0.32, 0.72, 0, 1)" : "none",
            boxShadow: "-18px 0 42px rgba(15, 23, 42, 0.14)",
            borderTopLeftRadius: 22,
            borderBottomLeftRadius: 22,
            background: "#F4F6F2",
            willChange: "transform"
          } : undefined}
        >
          {!coreLoaded ? (
            <div className="pt-6">
              {coreLoadError ? (
                <DataErrorState
                  message={coreLoadError}
                  onRetry={() => {
                    refreshCore().catch((error) => {
                      setNotice(error instanceof Error ? error.message : "Gagal memuat data");
                    });
                  }}
                />
              ) : (
                <LoadingState />
              )}
            </div>
          ) : (
            <>
          {view === "dashboard" && (
            <DashboardView
              dashboard={dashboard}
              loading={coreLoading || !coreLoaded}
              error={coreLoadError}
              language={language}
              onAdd={openAddActionSheet}
              onAssistant={openAssistant}
              onRetry={() => {
                refreshCore().catch((error) => {
                  setNotice(error instanceof Error ? error.message : "Gagal memuat data");
                });
              }}
            />
          )}
          {view === "manual" && (
            <ManualTransactionView
              accounts={accounts}
              categories={categories}
              editing={editing}
              initialType={manualInitialType}
              initialAccountId={manualInitialAccountId}
              resetKey={manualResetKey}
              language={language}
              request={request}
              onCancel={() => {
                if (editing && selectedTransaction) {
                  setEditing(null);
                  navigate("transactionDetail");
                } else {
                  returnToPocketDetail(manualInitialAccountId);
                }
              }}
              onDone={async () => {
                const editedId = editing?.id;
                setEditing(null);
                if (editedId) {
                  setView("transactionDetail");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  Promise.all([
                    refreshCore(),
                    request<TransactionDetail>(`/transactions/${editedId}`)
                  ]).then(([, updated]) => {
                    setSelectedTransaction(updated);
                  }).catch((error) => {
                    setNotice(error instanceof Error ? error.message : "Transaction data could not be refreshed");
                  });
                } else {
                  returnToPocketDetail(manualInitialAccountId);
                  refreshCore().catch((error) => {
                    setNotice(error instanceof Error ? error.message : "Transaction data could not be refreshed");
                  });
                }
              }}
            />
          )}
          {view === "history" && (
            <HistoryView
              accounts={accounts}
              language={language}
              request={request}
              onOpen={openTransactionDetail}
              onChanged={refreshCore}
              token={token!}
              initialAccountId={historyAccountId}
              initialFromDate={historyFromDate}
              onBack={backFromHistory}
              focusTransactionId={historyFocusTransactionId}
              onFocused={() => setHistoryFocusTransactionId(null)}
              onRegisterRefresh={(callback) => applyChildFrameState({ active: true, onBack: backFromHistory, onRefresh: callback })}
            />
          )}
          {view === "transactionDetail" && selectedTransaction && (
            <TransactionDetailView
              transaction={selectedTransaction}
              token={token!}
              request={request}
              onBack={() => {
                if (historyParentView === "accounts") {
                  returnToPocketDetail(historyAccountId || selectedTransaction.accountId);
                } else {
                  setHistoryFocusTransactionId(selectedTransaction.id);
                  navigate("history", true);
                }
              }}
              onEdit={startEditingTransaction}
              onDelete={() => removeTransaction(selectedTransaction.id)}
            />
          )}
          {view === "accounts" && (
            <AccountsView
              accounts={accounts}
              categories={categories}
              currentUserId={session!.user.id}
              request={request}
              onChanged={refreshCore}
              initialView={accountsInitialView}
              initialTab={accountsInitialTab}
              initialSelectedPocketId={manualInitialAccountId}
              resetKey={accountsResetKey}
              language={language}
              onAddTransaction={startPocketTransaction}
              onOpenTransactions={(accountId, fromDate) => {
                openPocketTransactions(accountId, fromDate);
              }}
              onOpenTransaction={(accountId, transactionId) => {
                openPocketTransactionDetail(accountId, transactionId).catch((error) => {
                  setNotice(error instanceof Error ? error.message : "Gagal membuka detail transaksi");
                });
              }}
              onChildFrameStateChange={applyChildFrameState}
            />
          )}
          {view === "categories" && <CategoriesView categories={categories} request={request} onChanged={refreshCore} />}
          {view === "budgets" && <BudgetsView categories={categories} request={request} onChanged={refreshCore} />}
          {view === "manage" && (
            <ManageView
              accounts={accounts}
              categories={categories}
              language={language}
              request={request}
              onNavigate={navigate}
              onChanged={refreshCore}
              onChildFrameStateChange={applyChildFrameState}
              onOpenAccountTransactions={(accountId, fromDate) => {
                setHistoryAccountId(accountId);
                setHistoryFromDate(fromDate ?? "");
                navigate("history", true);
              }}
            />
          )}
          {view === "reports" && <ReportsView request={request} />}
          {view === "assistant" && <AssistantView request={request} language={language} onNavigate={navigate} context={assistantContext} />}
          {view === "notifications" && (
            <NotificationCenter
              language={language}
              items={notificationItems}
              pushStatus={pushStatus}
              onEnablePush={() => syncPushSubscription(true).catch((error) => setNotice(error instanceof Error ? error.message : "Push notification gagal diaktifkan"))}
              onMarkAllRead={() => markAllNotificationsRead().catch((error) => setNotice(error instanceof Error ? error.message : "Notifikasi gagal diperbarui"))}
              onOpen={(item) => openNotification(item).catch((error) => setNotice(error instanceof Error ? error.message : "Notifikasi gagal dibuka"))}
            />
          )}
          {view === "profile" && (
            <ProfileView
              session={activeSession}
              request={request}
              onProfileUpdated={applyUserToSession}
              onInstall={installApp}
              showInstall={!installedAsApp}
              onLogout={logout}
              onBack={() => navigate("manage")}
            />
          )}
            </>
          )}
        </main>

        <MobileBottomNav
          view={view}
          activeView={activeNavigationView}
          language={language}
          isScrolling={isScrolling}
          unreadNotificationCount={unreadNotificationCount}
          pocketActionCount={pendingPocketInvites.length}
          onNavigate={(nextView) => {
            if (nextView === "assistant") {
              openAssistant();
              return;
            }
            if (nextView === "history") setHistoryParentView(null);
            if (nextView === "accounts") setAccountsInitialView("list");
            navigate(nextView);
          }}
        />
        {addActionOpen && (
          <AddActionSheet
            language={language}
            onClose={() => setAddActionOpen(false)}
            onTransaction={() => startAddTransaction("expense")}
            onTransfer={startAccountTransfer}
          />
        )}
        {showScrollTop && view !== "assistant" && (
          <button
            type="button"
            className="fixed bottom-24 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-[#16A34A] text-white shadow-[0_12px_24px_rgba(22,163,74,0.26)] transition hover:bg-[#15803D] active:scale-95 lg:bottom-6 lg:right-6"
            aria-label="Kembali ke atas"
            title="Kembali ke atas"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <ArrowUp size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

type PublicPocketHistoryData = {
  expired: boolean;
  language?: "id" | "en";
  expiresAt: string;
  pocket?: { name: string; accountType: string; providerName: string | null };
  sharedBy?: string;
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string | null;
  categoryName?: string | null;
  totals?: { income: number; expense: number; net: number; count: number };
  transactions?: Array<{ id: string; transactionType: "income" | "expense"; transactionDate: string; amount: string; merchantName: string | null; paymentMethod: string | null; categoryName: string | null; notes: string | null; hasAttachment: boolean; items: Array<{ itemName: string; quantity: string; unitPrice: string; totalPrice: string }> }>;
};

function PublicPocketHistory({ token }: { token: string }) {
  const [data, setData] = useState<PublicPocketHistoryData | null>(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    apiFetch<PublicPocketHistoryData>(`/public/pocket-history/${token}`).then(setData).catch((reason) => setError(reason instanceof Error ? reason.message : "Link tidak dapat dibuka"));
  }, [token]);
  if (!data && !error) return <div className="flex min-h-dvh items-center justify-center bg-[#F4F6F2]"><Loader2 className="animate-spin text-[#16845B]" size={28}/></div>;
  const english = data?.language === "en";
  if (error || data?.expired) return (<main className="flex min-h-dvh items-center justify-center bg-[#F4F6F2] p-5"><section className="w-full max-w-md rounded-[32px] border border-white bg-white/90 p-7 text-center shadow-[0_30px_90px_rgba(76,29,149,0.15)]"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-amber-100 text-3xl">⌛</span><h1 className="mt-5 text-2xl font-black text-slate-950">{english ? "This link has expired" : "Link sudah kedaluwarsa"}</h1><p className="mt-2 text-sm leading-6 text-slate-500">{english ? "Ask the Pocket owner to create a new history link for the latest recap." : "Minta pemilik Pocket membuat link riwayat baru agar kamu dapat melihat recap terbaru."}</p><a href="/" className="mt-6 inline-flex rounded-2xl bg-[#16845B] px-5 py-3 text-sm font-bold text-white">{english ? "Try this finance app" : "Coba aplikasi keuangan ini"}</a></section></main>);
  const rows = data?.transactions ?? [];
  const groups = rows.reduce<Record<string, typeof rows>>((result, row) => { const key = jakartaDateParts(row.transactionDate).value; (result[key] ??= []).push(row); return result; }, {});
  const selected = rows.find((row) => row.id === selectedId) ?? null;
  return (<main className="min-h-dvh bg-[#F4F6F2] pb-12 text-slate-950">
    <header className="relative overflow-hidden px-5 pb-12 pt-8"><div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-200/60 blur-3xl"/><div className="absolute -left-16 top-28 h-52 w-52 rounded-full bg-violet-200/60 blur-3xl"/><div className="relative mx-auto max-w-2xl rounded-[34px] border border-white/80 bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur"><div className="inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#16845B]">Money snapshot · view only</div><h1 className="mt-5 text-4xl font-black tracking-[-0.05em] text-slate-950">{data?.pocket?.name}</h1><p className="mt-2 text-sm font-semibold text-slate-500">{english ? `Shared by ${data?.sharedBy}` : `Dibagikan oleh ${data?.sharedBy}`}</p><div className="mt-7 grid grid-cols-2 gap-3"><div className="rounded-[28px] border border-emerald-100 bg-emerald-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">{english ? "Money in" : "Uang masuk"}</p><p className="mt-2 text-xl font-black text-[#16845B]">{rupiah(data?.totals?.income)}</p></div><div className="rounded-[28px] border border-rose-100 bg-rose-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">{english ? "Money out" : "Uang keluar"}</p><p className="mt-2 text-xl font-black text-rose-600">{rupiah(data?.totals?.expense)}</p></div></div></div></header>
    <div className="mx-auto max-w-2xl space-y-5 px-4"><section className="grid grid-cols-[1fr_auto] gap-3 rounded-[28px] border border-white bg-white p-4 shadow-[0_16px_48px_rgba(15,23,42,0.08)]"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{english ? "Selected period" : "Periode pilihan"}</p><p className="mt-1 text-sm font-bold text-slate-950">{localDate(data?.dateFrom)} – {localDate(data?.dateTo)}</p><p className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">{data?.categoryName ?? (english ? "All categories" : "Semua kategori")}</p></div><div className="rounded-2xl bg-slate-50 px-3 py-2 text-right"><p className="text-[9px] text-slate-400">NET</p><p className={`text-sm font-black ${(data?.totals?.net ?? 0) >= 0 ? "text-[#16845B]" : "text-rose-600"}`}>{rupiah(data?.totals?.net)}</p></div></section>
      {Object.entries(groups).map(([date, transactions]) => (<section key={date}><div className="mb-2 flex items-end justify-between px-1"><div><p className="text-sm font-black text-slate-950">{localDate(date)}</p><p className="text-[10px] font-semibold text-slate-400">{transactions.length} {english ? "transactions" : "transaksi"}</p></div></div><div className="space-y-2">{transactions.map((row) => { const income = row.transactionType === "income"; return <button type="button" key={row.id} onClick={() => setSelectedId(row.id)} className="flex w-full items-center gap-3 rounded-[24px] border border-white bg-white p-3 text-left shadow-[0_12px_32px_rgba(15,23,42,0.06)] transition active:scale-[0.98]"><span className={`flex h-11 w-11 items-center justify-center rounded-[18px] ${income ? "bg-emerald-50 text-[#16845B]" : "bg-rose-50 text-rose-600"}`}>{income ? <ArrowDownLeft size={19}/> : <ArrowUp size={19}/>}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-950">{row.merchantName || row.categoryName || (english ? "Transaction" : "Transaksi")}</p><p className="mt-1 truncate text-[10px] font-medium text-slate-400">{[row.categoryName, row.paymentMethod, row.items.length ? `${row.items.length} item` : null, row.hasAttachment ? "attachment" : null].filter(Boolean).join(" · ")}</p></div><div className="text-right"><p className={`text-sm font-black ${income ? "text-[#16845B]" : "text-slate-950"}`}>{income ? "+" : "-"}{rupiah(row.amount)}</p><p className="mt-1 text-[9px] font-bold text-violet-600">{english ? "TAP DETAILS" : "LIHAT DETAIL"}</p></div></button>; })}</div></section>))}
      {rows.length === 0 && <section className="rounded-[28px] border border-white bg-white p-8 text-center text-sm font-semibold text-slate-400 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">{english ? "No transactions match this filter." : "Tidak ada transaksi pada filter ini."}</section>}
      <section className="rounded-[30px] bg-gradient-to-br from-[#16845B] to-[#0F5138] p-5 text-white shadow-[0_20px_50px_rgba(22,132,91,0.22)]"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Your money, clearly</p><h2 className="mt-2 text-2xl font-black tracking-tight">{english ? "Know where your money goes." : "Uang lebih jelas, keputusan lebih tenang."}</h2><p className="mt-2 text-xs leading-5 text-white/65">{english ? "Track transactions and build better money habits in one app." : "Catat transaksi dan bangun kebiasaan finansial yang lebih sehat dalam satu aplikasi."}</p><a href="/" className="mt-4 inline-flex rounded-2xl bg-white px-4 py-2.5 text-xs font-black text-[#0F5138]">{english ? "Start for free →" : "Mulai gratis →"}</a></section><p className="text-center text-[10px] font-semibold text-slate-400">{english ? "Link valid until" : "Link berlaku sampai"} {localDate(data?.expiresAt)}</p>
    </div>
    {selected && (<><button type="button" className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-sm" onClick={() => setSelectedId(null)} aria-label="Close detail"/><section className="fixed inset-x-3 bottom-4 z-50 mx-auto max-h-[88dvh] max-w-md overflow-y-auto rounded-[30px] bg-white p-5 text-slate-950 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#16845B]">{english ? "Transaction detail" : "Detail transaksi"}</p><h2 className="mt-2 text-xl font-black">{selected.merchantName || selected.categoryName || (english ? "Transaction" : "Transaksi")}</h2><p className="mt-1 text-xs font-semibold text-slate-400">{localDate(selected.transactionDate)}</p></div><button type="button" className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500" onClick={() => setSelectedId(null)}>×</button></div><div className="mt-5 rounded-[24px] bg-slate-50 p-4"><p className="text-[10px] uppercase text-slate-400">{selected.transactionType === "income" ? (english ? "Income" : "Pemasukan") : (english ? "Expense" : "Pengeluaran")}</p><p className={`mt-1 text-3xl font-black ${selected.transactionType === "income" ? "text-[#16845B]" : "text-rose-600"}`}>{rupiah(selected.amount)}</p><p className="mt-2 text-xs font-semibold text-slate-400">{[selected.categoryName, selected.paymentMethod].filter(Boolean).join(" · ")}</p></div>{selected.items.length > 0 && <div className="mt-5"><p className="mb-2 text-xs font-black">{english ? "Items" : "Item transaksi"}</p><div className="space-y-2">{selected.items.map((item, index) => <div key={`${item.itemName}-${index}`} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2.5"><div><p className="text-xs font-bold">{item.itemName}</p><p className="text-[10px] font-medium text-slate-400">{item.quantity} × {rupiah(item.unitPrice)}</p></div><p className="text-xs font-black">{rupiah(item.totalPrice)}</p></div>)}</div></div>}{selected.notes && <div className="mt-5"><p className="text-xs font-black">{english ? "Notes" : "Catatan"}</p><p className="mt-2 rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">{selected.notes}</p></div>}{selected.hasAttachment && <div className="mt-5"><p className="mb-2 text-xs font-black">Attachment</p><PublicShareAttachment token={token} transactionId={selected.id}/></div>}</section></>)}
  </main>);
}

function PublicShareAttachment({ token, transactionId }: { token: string; transactionId: string }) {
  const [url, setUrl] = useState("");
  const [type, setType] = useState("");
  useEffect(() => { let active = true; let objectUrl = ""; fetch(downloadUrl(`/public/pocket-history/${token}/transactions/${transactionId}/attachment`)).then(async (response) => { if (!response.ok) throw new Error(); const blob = await response.blob(); if (!active) return; objectUrl = URL.createObjectURL(blob); setType(response.headers.get("content-type") || blob.type); setUrl(objectUrl); }).catch(() => setType("error")); return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); }; }, [token, transactionId]);
  if (!url && type !== "error") return <div className="flex h-32 items-center justify-center rounded-2xl bg-slate-50"><Loader2 className="animate-spin text-[#16845B]" size={20}/></div>;
  if (type === "error") return <p className="rounded-2xl bg-rose-400/10 p-3 text-xs text-rose-300">Attachment tidak dapat dimuat.</p>;
  if (type.startsWith("video/")) return <video src={url} controls className="max-h-72 w-full rounded-2xl bg-slate-950"/>;
  if (type === "application/pdf") return <a href={url} target="_blank" rel="noreferrer" className="block rounded-2xl bg-[#16845B] px-4 py-3 text-center text-xs font-black">Open PDF</a>;
  return <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="Transaction attachment" className="max-h-80 w-full rounded-2xl object-contain bg-slate-50"/></a>;
}


export default App;
