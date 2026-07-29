/**
 * AI context chunk: Main App state, session, navigation, layout
 * Generated from: App.tsx
 * Read-only snapshot. Do not import this file into the application.
 */
function App() {
  const [initialSession] = useState(() => loadSavedSessionResult(localStorage));
  const [session, setSession] = useState<StoredSession | null>(
    initialSession.session
  );
  const [language, setLanguage] = useState<AppLanguage>(() => localStorage.getItem("finance-language") === "id" ? "id" : "en");
  const [view, setView] = useState<View>(() => {
    const requested = new URLSearchParams(window.location.search).get("view") as View | null;
    return requested && ["dashboard", "manual", "history", "reports", "assistant", "social", "manage", "profile"].includes(requested)
      ? requested
      : "dashboard";
  });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [coreLoading, setCoreLoading] = useState(() => Boolean(initialSession.session));
  const [coreLoaded, setCoreLoaded] = useState(false);
  const [coreLoadError, setCoreLoadError] = useState<string | null>(null);
  const [socialSummaryData, setSocialSummaryData] = useState<SocialSummary | null>(null);
  const [headerNotifications, setHeaderNotifications] = useState<HeaderNotification[]>([]);
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
  const [manualInitialType, setManualInitialType] = useState<"income" | "expense">("expense");
  const [manualInitialAccountId, setManualInitialAccountId] = useState("");
  const [manualResetKey, setManualResetKey] = useState(0);
  const [accountsInitialView, setAccountsInitialView] = useState<"list" | "account-form" | "transfer-form">("list");
  const [accountsResetKey, setAccountsResetKey] = useState(0);
  const [addActionOpen, setAddActionOpen] = useState(false);
  const [assistantContext, setAssistantContext] = useState<AssistantContext | null>(null);
  const [assistantSelectorOpen, setAssistantSelectorOpen] = useState(false);
  const [assistantRelationshipOptions, setAssistantRelationshipOptions] = useState<RelationshipFinanceListItem[]>([]);
  const [assistantRelationshipLoading, setAssistantRelationshipLoading] = useState(false);
  const [assistantRelationshipId, setAssistantRelationshipId] = useState("");
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
    setSocialSummaryData(null);
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
    if (initialSession.status !== "expired" && initialSession.status !== "invalid") {
      return;
    }

    expireSession();
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

  const openAssistantSelector = async () => {
    setAssistantSelectorOpen(true);
    setAssistantRelationshipLoading(true);
    try {
      const rows = await request<RelationshipFinanceListItem[]>("/relationship-finances");
      const activeRows = rows.filter((item) => item.status === "active");
      setAssistantRelationshipOptions(activeRows);
      setAssistantRelationshipId(activeRows[0]?.id ?? "");
    } catch (error) {
      setAssistantRelationshipOptions([]);
      setAssistantRelationshipId("");
      setNotice(error instanceof Error ? error.message : "Relationship Finance gagal dimuat");
    } finally {
      setAssistantRelationshipLoading(false);
    }
  };

  const openPersonalAssistant = () => {
    setAssistantContext(null);
    setAssistantSelectorOpen(false);
    navigate("assistant");
  };

  const openRelationshipAssistant = () => {
    if (!assistantRelationshipId) {
      setNotice(language === "en" ? "Select an active Relationship Finance first." : "Pilih Relationship Finance aktif terlebih dahulu.");
      return;
    }
    const selected = assistantRelationshipOptions.find((item) => item.id === assistantRelationshipId);
    setAssistantContext({
      contextType: "relationship_finance",
      relationshipFinanceId: assistantRelationshipId,
      sourcePage: "assistant_selector",
      label: selected?.workspaceName,
      partnerName: selected?.partnerName ?? null
    });
    setAssistantSelectorOpen(false);
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
        nextDashboard
      ] = await Promise.all([
        request<Account[]>("/accounts"),
        request<Category[]>("/categories"),
        request<DashboardSummary>("/dashboard/summary")
      ]);

      const [
        nextSchedules,
        nextSocialSummary,
        nextNotifications
      ] = await Promise.all([
        optionalRequest<Schedule[]>("/schedules", []),
        optionalRequest<SocialSummary | null>("/social/summary", null),
        optionalRequest<HeaderNotification[]>("/social/activity", [])
      ]);

      setAccounts(nextAccounts);
      setCategories(nextCategories);
      setDashboard(nextDashboard);
      setSchedules(nextSchedules);
      setSocialSummaryData(nextSocialSummary);
      setHeaderNotifications(nextNotifications);
      coreLoadedRef.current = true;
      setCoreLoaded(true);
    } catch (error) {
      console.error("Data inti gagal dimuat:", error);

      if (!hadLoadedCore) {
        setDashboard(null);
        setAccounts([]);
        setCategories([]);
        setSchedules([]);
        setSocialSummaryData(null);
        setHeaderNotifications([]);
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
    let scrollEndTimer = 0;
    const updateScrollButton = () => {
      setShowScrollTop(window.scrollY > 360);
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
  const notificationItems = [...scheduleNotifications, ...headerNotifications]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const unreadNotificationCount = notificationItems.filter((item) => !item.isRead).length;

  const markAllNotificationsRead = async () => {
    await request("/social/activity/read", { method: "PUT", body: "{}" });
    setHeaderNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    const nextDismissed = new Set(dismissedScheduleIds);
    scheduleNotifications.forEach((item) => nextDismissed.add(item.id));
    setDismissedScheduleIds(nextDismissed);
    localStorage.setItem("dismissed-schedule-notifications", JSON.stringify([...nextDismissed]));
    setSocialSummaryData((current) => current ? { ...current, unreadNotifications: 0 } : current);
  };

  const openNotification = async (item: HeaderNotification) => {
    if (item.kind === "schedule") {
      const nextDismissed = new Set(dismissedScheduleIds);
      nextDismissed.add(item.id);
      setDismissedScheduleIds(nextDismissed);
      localStorage.setItem("dismissed-schedule-notifications", JSON.stringify([...nextDismissed]));
      setNotificationsOpen(false);
      setView("manage");
      return;
    }
    if (!item.isRead) {
      await request("/social/activity/read", {
        method: "PUT",
        body: JSON.stringify({ eventId: item.id })
      });
      setHeaderNotifications((current) => current.map((row) => row.id === item.id ? { ...row, isRead: true } : row));
    }
    setNotificationsOpen(false);
    setView("social");
  };

  const canHandleChildBack = () => {
    if (childFrameActiveRef.current && childFrameBackRef.current) return true;
    if (view === "transactionDetail") return true;
    if (view === "manual" && Boolean(editing && selectedTransaction)) return true;
    if (view === "profile") return true;
    if (view === "accounts" || view === "categories" || view === "budgets") return true;
    return false;
  };

  const navigate = (nextView: View, preserveHistoryAccount = false) => {
    if (nextView === "history" && !preserveHistoryAccount) {
      setHistoryAccountId("");
    }
    if (nextView === "manual" || view === "manual" || nextView !== "transactionDetail") {
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
    setManualResetKey((current) => current + 1);
    navigate("manual");
  };

  const startPocketTransaction = (accountId: string) => {
    setEditing(null);
    setManualInitialType("expense");
    setManualInitialAccountId(accountId);
    setManualResetKey((current) => current + 1);
    navigate("manual");
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
  const backSwipeProgress = Math.min(1, backSwipeOffset / Math.max(window.innerWidth, 320));

  const goBackFromChildFrame = () => {
    if (notificationsOpen) return false;
    if (childFrameActiveRef.current && childFrameBackRef.current) {
      childFrameBackRef.current();
      return true;
    }
    if (view === "transactionDetail" && selectedTransaction) {
      setHistoryFocusTransactionId(selectedTransaction.id);
      navigate("history", true);
      return true;
    }
    if (view === "manual" && editing && selectedTransaction) {
      navigate("transactionDetail");
      return true;
    }
    if (view === "profile") {
      navigate(profileReturnViewRef.current ?? "dashboard");
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
    if (view !== "social" && view !== "manage" && view !== "history") {
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
  }, [backSwipeSettling, editing, notificationsOpen, selectedTransaction, view]);

  const activeSession = isValidSession(session) ? session : null;
  if (!activeSession) {
    return <AuthView onSignedIn={acceptSession} onInstall={installApp} showInstall={!installedAsApp} />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-950 lg:bg-[#F8FAFC] lg:text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#16A34A] text-white">
            <Wallet size={22} />
          </div>
          <div>
            <p className="text-sm font-bold">Keuangan AI</p>
            <p className="text-xs text-slate-500">Ledger pribadi</p>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === "assistant") {
                    openAssistantSelector().catch((error) => setNotice(error instanceof Error ? error.message : "Kopilot gagal dibuka"));
                    return;
                  }
                  if (item.id === "accounts") setAccountsInitialView("list");
                  navigate(item.id);
                }}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition ${
                  active ? "bg-emerald-50 text-emerald-800" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon size={18} />
                {appNavigationLabel(item.id, item.label, language)}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 hidden border-b border-slate-200 bg-white/95 backdrop-blur lg:block">
          <div className="flex min-h-16 items-center justify-between px-8 py-3">
            <div>
              <h1 className="text-xl font-bold">{pageTitle}</h1>
              <p className="text-sm text-slate-500">{activeSession.user.fullName} · {activeSession.user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="mobile-icon-btn"
                aria-label={language === "en" ? "Notifications" : "Notifikasi"}
                onClick={() => setNotificationsOpen((open) => !open)}
              >
                <Bell size={18} />
                {unreadNotificationCount > 0 && <NotificationBadge count={unreadNotificationCount} />}
              </button>
              <button
                className="btn-secondary"
                onClick={logout}
              >
                <LogOut size={16} /> Logout
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
            onNotifications={() => setNotificationsOpen((open) => !open)}
            onProfile={() => openChildView("profile")}
          />
        )}

        {notificationsOpen && (
          <NotificationCenter
            language={language}
            items={notificationItems}
            pushStatus={pushStatus}
            onClose={() => setNotificationsOpen(false)}
            onEnablePush={() => syncPushSubscription(true).catch((error) => setNotice(error instanceof Error ? error.message : "Push notification gagal diaktifkan"))}
            onMarkAllRead={() => markAllNotificationsRead().catch((error) => setNotice(error instanceof Error ? error.message : "Notifikasi gagal diperbarui"))}
            onOpen={(item) => openNotification(item).catch((error) => setNotice(error instanceof Error ? error.message : "Notifikasi gagal dibuka"))}
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
            className="pointer-events-none fixed inset-0 z-[9] bg-[#F8FAFC] lg:hidden"
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
              ? "fixed inset-x-0 bottom-24 top-[4.25rem] overflow-hidden px-4 py-2 lg:static lg:inset-auto lg:overflow-visible lg:px-8 lg:py-6"
              : "px-4 pb-28 pt-3 lg:px-8 lg:py-6"
          }
          style={backSwipeOffset > 0 || backSwipeSettling ? {
            transform: `translate3d(${backSwipeOffset}px, 0, 0)`,
            transition: backSwipeSettling ? "transform 190ms cubic-bezier(0.32, 0.72, 0, 1)" : "none",
            boxShadow: "-18px 0 42px rgba(15, 23, 42, 0.14)",
            borderTopLeftRadius: 22,
            borderBottomLeftRadius: 22,
            background: "#F8FAFC",
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
              onAssistant={openAssistantSelector}
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
                  navigate("transactionDetail");
                } else {
                  navigate("history");
                }
              }}
              onDone={async () => {
                const editedId = editing?.id;
                setEditing(null);
                await refreshCore();
                if (editedId) {
                  const updated = await request<TransactionDetail>(`/transactions/${editedId}`);
                  setSelectedTransaction(updated);
                  setView("transactionDetail");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                } else {
                  navigate("history");
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
              focusTransactionId={historyFocusTransactionId}
              onFocused={() => setHistoryFocusTransactionId(null)}
              onRegisterRefresh={(callback) => applyChildFrameState({ active: false, onBack: null, onRefresh: callback })}
            />
          )}
          {view === "transactionDetail" && selectedTransaction && (
            <TransactionDetailView
              transaction={selectedTransaction}
              token={token!}
              request={request}
              onBack={() => {
                setHistoryFocusTransactionId(selectedTransaction.id);
                navigate("history", true);
              }}
              onEdit={startEditingTransaction}
              onDelete={() => removeTransaction(selectedTransaction.id)}
            />
          )}
          {view === "accounts" && (
            <AccountsView
              accounts={accounts}
              request={request}
              onChanged={refreshCore}
              initialView={accountsInitialView}
              resetKey={accountsResetKey}
              language={language}
              onAddTransaction={startPocketTransaction}
              onOpenTransactions={(accountId, fromDate) => {
                setHistoryAccountId(accountId);
                setHistoryFromDate(fromDate ?? "");
                navigate("history", true);
              }}
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
          {view === "social" && (
            <SocialHubView
              request={request}
              accounts={accounts}
              token={activeSession.accessToken}
              currentUser={activeSession.user}
              summary={socialSummaryData}
              language={language}
              onChanged={refreshCore}
              onChildFrameStateChange={applyChildFrameState}
              onOpenAssistantContext={(context) => {
                setAssistantContext(context);
                navigate("assistant");
              }}
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
            />
          )}
            </>
          )}
        </main>

        <MobileBottomNav
          view={view}
          language={language}
          isScrolling={isScrolling}
          onAdd={openAddActionSheet}
          onNavigate={(nextView) => {
            if (nextView === "assistant") {
              openAssistantSelector().catch((error) => setNotice(error instanceof Error ? error.message : "Kopilot gagal dibuka"));
              return;
            }
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
        {assistantSelectorOpen && (
          <AssistantContextSheet
            language={language}
            relationships={assistantRelationshipOptions}
            selectedRelationshipId={assistantRelationshipId}
            loading={assistantRelationshipLoading}
            onSelectRelationship={setAssistantRelationshipId}
            onClose={() => setAssistantSelectorOpen(false)}
            onPersonal={openPersonalAssistant}
            onRelationship={openRelationshipAssistant}
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
