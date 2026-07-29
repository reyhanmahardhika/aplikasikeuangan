﻿import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  ArrowUp,
  Banknote,
  Bell,
  Bot,
  Briefcase,
  Bus,
  CalendarDays,
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CircleDollarSign,
  CircleMinus,
  CirclePlus,
  CreditCard,
  Download,
  Eye,
  FileSpreadsheet,
  Film,
  GraduationCap,
  HeartPulse,
  Home,
  LayoutDashboard,
  Landmark,
  Lightbulb,
  LineChart,
  Loader2,
  LogOut,
  MessageCircle,
  Plus,
  QrCode,
  ReceiptText,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Sparkles,
  ShoppingBag,
  Smartphone,
  Store,
  Tags,
  TriangleAlert,
  Trash2,
  TrendingUp,
  Upload,
  Utensils,
  UserRound,
  UserPlus,
  Users,
  Wallet,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import heic2any from "heic2any";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { ApiError, apiFetch, downloadUrl, type Session } from "./lib/api";
import { resolveAsyncContentState } from "./lib/asyncContentState";
import { APP_TIME_ZONE, formatRupiahInput, isoDateInput, jakartaDateParts, localDate, rupiah } from "./lib/format";
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
import { WalletAccountEditModal } from "./components/SharedWalletEditModals";


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

type View =
  | "dashboard"
  | "manual"
  | "history"
  | "transactionDetail"
  | "accounts"
  | "categories"
  | "budgets"
  | "manage"
  | "reports"
  | "assistant"
  | "social"
  | "profile";

type AppLanguage = "en" | "id";

type ChildFrameState = {
  active: boolean;
  onBack?: (() => void) | null;
  onRefresh?: (() => Promise<void> | void) | null;
};

type NoticePayload = string | { message: string; type: "success" | "error" };

let debugLogTimer: number | null = null;
let debugLogPayload: { event: string; data: unknown } | null = null;

function queueDebugLog(event: string, data: unknown) {
  if (!import.meta.env.DEV || event.toLowerCase().includes("scroll")) return;
  debugLogPayload = { event, data };
  if (debugLogTimer) window.clearTimeout(debugLogTimer);
  debugLogTimer = window.setTimeout(() => {
    const payload = debugLogPayload;
    debugLogPayload = null;
    debugLogTimer = null;
    if (!payload) return;
    void fetch(downloadUrl("/__debug/log"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: "login-error", event: payload.event, data: payload.data })
    }).catch(() => undefined);
  }, 350);
}

type Account = {
  id: string;
  name: string;
  accountType: string;
  currentBalance: string;
  initialBalance: string;
  currency: string;
  providerName?: string | null;
  accountNumber?: string | null;
  isSharedWalletAccount?: boolean;
  isRelationshipGoalAccount?: boolean;
  relationshipGoalId?: string | null;
  relationshipGoalName?: string | null;
  relationshipGoalCreatedAt?: string | null;
  ownerUserId?: string | null;
  ownerName?: string | null;
  canEdit?: boolean;
  allowNegative: boolean;
  isActive: boolean;
  targetBalance?: string | null;
  autoBudgetingEnabled?: boolean;
  logo?: string | null;
  background?: string | null;
};

type Category = {
  id: string;
  name: string;
  categoryType: "income" | "expense";
  icon: string;
  isDefault: boolean;
};

type Transaction = {
  id: string;
  transactionType: "income" | "expense";
  transactionDate: string;
  amount: string;
  categoryName?: string;
  accountName?: string;
  merchantName?: string;
  paymentMethod?: string;
  notes?: string;
  sourceType?: string;
  canManage?: boolean;
};

type Schedule = {
  id: string;
  title: string;
  scheduleType: "transaction" | "transfer" | "topup";
  dueDay: number;
  nextDueDate: string;
  amount?: string | null;
  accountId?: string | null;
  destinationAccountId?: string | null;
  categoryId?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
  accountName?: string | null;
  destinationAccountName?: string | null;
  categoryName?: string | null;
  daysUntilDue: number;
  reminderStatus: "overdue" | "soon" | "upcoming";
};

type TransactionDetail = Transaction & {
  accountId: string;
  categoryId?: string;
  receiptId?: string | null;
  canManage?: boolean;
  visibility?: "private" | "selected_friends" | "group_members" | "everyone_involved";
  viewerIds?: string[];
  items?: Array<{ itemName: string; quantity: string; unitPrice: string; totalPrice: string }>;
};

type DashboardSummary = {
  balance: string;
  incomeThisMonth: string;
  expenseThisMonth: string;
  daily: Array<{ date: string; income: string; expense: string }>;
  expenseByCategory: Array<{ category: string; total: string }>;
  lastTransactions: Transaction[];
  budgetAlerts: Array<{ id: string; category: string; usagePercent: string }>;
  insight?: {
    currentWeekExpense: string;
    previousWeekExpense: string;
    weekChangePercent: number | null;
    scheduledUntilMonthEnd: string;
    availableUntilMonthEnd: string;
  };
};

type SocialSummary = {
  totalPayable: string;
  totalReceivable: string;
  activeGroups: number;
  pendingConfirmations: number;
  unreadNotifications: number;
};

type AssistantContext = {
  contextType: "personal" | "shared_wallet" | "relationship_finance" | "goal" | "budget" | "investment";
  relationshipFinanceId?: string;
  entityType?: string;
  entityId?: string;
  sourcePage?: string;
  label?: string;
  partnerName?: string | null;
};

type HeaderNotification = {
  id: string;
  eventType: string;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  isRead: boolean;
  createdAt: string;
  kind?: "social" | "schedule";
};

type ManualDraft = {
  accountId: string;
  transactionDate: string;
  amount: string;
  categoryId: string;
  merchantName: string;
  paymentMethod: string;
  notes: string;
};

type ParsedManualTransaction = {
  transactionType: "income" | "expense";
  transactionDate: string;
  amount: string;
  categoryId: string | null;
  categoryName: string | null;
  accountId: string | null;
  accountName: string | null;
  merchantName: string | null;
  paymentMethod: string | null;
  notes: string;
  confidenceScore: number;
  reviewFields: string[];
  interpretedText: string;
};

type AiTrackedField = "transactionType" | "transactionDate" | "amount" | "accountId" | "categoryId" | "merchantName" | "paymentMethod" | "notes";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function successMessageFor(path: string, method: string) {
  if (path.includes("/assistant/") || path.includes("/receipts/upload") || path.includes("/process")) return null;
  if (path === "/transactions" && method === "POST") return "Berhasil menambah transaksi";
  if (path.startsWith("/transactions/") && method === "PUT") return "Berhasil mengubah transaksi";
  if (path.startsWith("/transactions/") && method === "DELETE") return "Berhasil menghapus transaksi";
  if (path === "/transfers" && method === "POST") return "Berhasil transfer antar akun";
  if (path.includes("/receipts/") && path.endsWith("/confirm") && method === "POST") return "Berhasil menambah transaksi dari struk";
  if (path === "/accounts" && method === "POST") return "Berhasil menambah akun";
  if (path.endsWith("/reset") && path.startsWith("/accounts/") && method === "POST") return "Akun berhasil direset";
  if (path.startsWith("/accounts/") && method === "PUT") return "Berhasil mengubah akun";
  if (path === "/categories" && method === "POST") return "Berhasil menambah kategori";
  if (path.startsWith("/categories/") && method === "PUT") return "Berhasil mengubah kategori";
  if (path.startsWith("/categories/") && method === "DELETE") return "Berhasil menghapus kategori";
  if (path === "/budgets" && method === "POST") return "Berhasil menyimpan budget";
  if (path.startsWith("/budgets/") && method === "PUT") return "Berhasil mengubah budget";
  if (path === "/schedules" && method === "POST") return "Berhasil menambah jadwal";
  if (path.startsWith("/schedules/") && method === "PUT") return "Berhasil mengubah jadwal";
  if (path.startsWith("/schedules/") && method === "DELETE") return "Berhasil menghapus jadwal";
  return null;
}

function moneyInputValue(value: string | number | null | undefined) {
  return formatRupiahInput(String(value ?? "").replace(/\.00$/, ""));
}

function dateFilterIso(value: string, boundary: "start" | "end") {
  return new Date(`${value}T${boundary === "start" ? "00:00:00.000" : "23:59:59.999"}+07:00`).toISOString();
}

function currentMonthDateBounds() {
  const now = jakartaDateParts();
  const endDay = new Date(Date.UTC(now.year, now.month, 0)).getUTCDate();
  return {
    from: `${now.year}-${String(now.month).padStart(2, "0")}-01`,
    to: `${now.year}-${String(now.month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`
  };
}

const navigation: Array<{ id: View; label: string; icon: LucideIcon }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "manual", label: "Tambah", icon: Plus },
  { id: "history", label: "Riwayat", icon: ReceiptText },
  { id: "accounts", label: "Akun", icon: Wallet },
  { id: "categories", label: "Kategori", icon: Tags },
  { id: "budgets", label: "Anggaran", icon: CircleDollarSign },
  { id: "reports", label: "Laporan", icon: LineChart },
  { id: "assistant", label: "Kopilot Keuangan", icon: Bot },
  { id: "social", label: "Sosial", icon: Users },
  { id: "profile", label: "Profil", icon: Settings }
];

const mobileNavigation: Array<{ id: View; label: string; icon: LucideIcon }> = [
  { id: "dashboard", label: "Home", icon: Home },
  { id: "accounts", label: "Pocket", icon: Wallet },
  { id: "assistant", label: "Copilot", icon: Bot },
  { id: "manage", label: "Settings", icon: Settings }
];

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

function MobileTopBar({
  user,
  language,
  unreadCount,
  onLanguageChange,
  onNotifications,
  onProfile
}: {
  user: Session["user"];
  language: AppLanguage;
  unreadCount: number;
  onLanguageChange: (language: AppLanguage) => void;
  onNotifications: () => void;
  onProfile: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 bg-[#F8FAFC]/95 px-4 pb-2 pt-4 backdrop-blur lg:hidden">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 via-violet-500 to-emerald-400 text-sm font-semibold text-white shadow-sm">
            F
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-500">{greetingLabel(language)}</p>
            <p className="truncate text-sm font-semibold leading-tight">{user.nickname || user.fullName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-9 items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm" role="group" aria-label="Language">
            {(["en", "id"] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={`flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 text-[9px] font-semibold uppercase transition ${
                  language === item ? "bg-[#16A34A] text-white" : "text-slate-400 hover:bg-slate-50"
                }`}
                aria-pressed={language === item}
                onClick={() => onLanguageChange(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <button
            className="mobile-icon-btn"
            aria-label={language === "en" ? "Notifications" : "Notifikasi"}
            title={language === "en" ? "Notifications" : "Notifikasi"}
            aria-expanded={undefined}
            onClick={onNotifications}
          >
            <Bell size={18} />
            {unreadCount > 0 && <NotificationBadge count={unreadCount} />}
          </button>
          <button className="mobile-avatar-btn" aria-label="Profil" title="Profil" onClick={onProfile}>
            {user.avatarUrl ? (
              <img className="h-full w-full rounded-full object-cover" src={user.avatarUrl} alt="" />
            ) : (
              <UserRound size={18} />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

function NotificationBadge({ count }: { count: number }) {
  return (
    <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-semibold leading-none text-white ring-2 ring-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}

function AssistantContextSheet({
  language,
  relationships,
  selectedRelationshipId,
  loading,
  onSelectRelationship,
  onClose,
  onPersonal,
  onRelationship
}: {
  language: AppLanguage;
  relationships: RelationshipFinanceListItem[];
  selectedRelationshipId: string;
  loading: boolean;
  onSelectRelationship: (id: string) => void;
  onClose: () => void;
  onPersonal: () => void;
  onRelationship: () => void;
}) {
  const isEnglish = language === "en";
  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 cursor-default bg-slate-950/20 backdrop-blur-[1px]"
        aria-label={isEnglish ? "Close Copilot options" : "Tutup pilihan Kopilot"}
        onClick={onClose}
      />
      <section className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-md rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.22)] lg:bottom-auto lg:left-auto lg:right-8 lg:top-24 lg:mx-0 lg:w-96 lg:rounded-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase text-[#16A34A]">Finance Copilot</p>
            <h2 className="mt-1 text-base font-semibold text-slate-950">
              {isEnglish ? "Choose Copilot context" : "Pilih konteks Kopilot"}
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {isEnglish
                ? "Use personal Copilot or analyze a shared relationship workspace."
                : "Gunakan Kopilot pribadi atau analisis workspace Relationship Finance."}
            </p>
          </div>
          <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50" onClick={onClose}>
            <X size={17} />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 text-left transition active:scale-[0.99]"
            onClick={onPersonal}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#16A34A]">
              <Bot size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-950">{isEnglish ? "Personal Copilot" : "Kopilot pribadi"}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{isEnglish ? "Balances, budgets, bills, and personal transactions." : "Saldo, budget, tagihan, dan transaksi pribadi."}</span>
            </span>
            <ChevronRight size={18} className="text-slate-300" />
          </button>

          {loading ? (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-[#F8FAFC] p-3 text-left">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#16A34A]">
                <Loader2 size={18} className="animate-spin" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-950">{isEnglish ? "Relationship Copilot" : "Kopilot Relationship"}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{isEnglish ? "Loading workspaces..." : "Memuat workspace..."}</span>
              </span>
            </div>
          ) : relationships.length === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-[#F8FAFC] p-3 text-left opacity-60">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                <HeartPulse size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-950">{isEnglish ? "Relationship Copilot" : "Kopilot Relationship"}</span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                  {isEnglish ? "No active Relationship Finance workspace yet." : "Belum ada workspace Relationship Finance yang aktif."}
                </span>
              </span>
            </div>
          ) : (
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-left transition hover:bg-emerald-50/50 active:scale-[0.99]"
              onClick={onRelationship}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                <HeartPulse size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-950">{isEnglish ? "Relationship Copilot" : "Kopilot Relationship"}</span>
                <select
                  className="mt-1 w-full rounded-xl border border-slate-100 bg-[#F8FAFC] px-2 py-1.5 text-xs font-semibold text-slate-600 outline-none"
                  value={selectedRelationshipId}
                  onChange={(event) => onSelectRelationship(event.target.value)}
                  onClick={(event) => event.stopPropagation()}
                >
                  {relationships.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.workspaceName}{item.partnerName ? ` - ${item.partnerName}` : ""}
                    </option>
                  ))}
                </select>
              </span>
              <ChevronRight size={18} className="text-slate-300" />
            </button>
          )}
        </div>
      </section>
    </>
  );
}

function NotificationCenter({
  language,
  items,
  pushStatus,
  onClose,
  onEnablePush,
  onMarkAllRead,
  onOpen
}: {
  language: AppLanguage;
  items: HeaderNotification[];
  pushStatus: "unsupported" | "unavailable" | "default" | "granted" | "denied";
  onClose: () => void;
  onEnablePush: () => void;
  onMarkAllRead: () => void;
  onOpen: (item: HeaderNotification) => void;
}) {
  const isEnglish = language === "en";
  const pushCopy = {
    granted: isEnglish ? "Push notifications active" : "Push notification aktif",
    denied: isEnglish ? "Notifications blocked in device settings" : "Notifikasi diblokir di pengaturan perangkat",
    unsupported: isEnglish ? "Push is not supported on this device" : "Push belum didukung perangkat ini",
    unavailable: isEnglish ? "Push server is not configured" : "Server push belum dikonfigurasi",
    default: isEnglish ? "Get reminders even when the app is closed" : "Dapatkan pengingat saat aplikasi ditutup"
  }[pushStatus];

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 cursor-default bg-slate-950/10 backdrop-blur-[1px]"
        aria-label={isEnglish ? "Close notifications" : "Tutup notifikasi"}
        onClick={onClose}
      />
      <aside className="fixed inset-x-3 top-[4.5rem] z-50 mx-auto max-h-[calc(100dvh-6rem)] max-w-md overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-[0_22px_60px_rgba(15,23,42,0.18)] lg:left-auto lg:right-6 lg:top-20 lg:mx-0 lg:w-96">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-950">{isEnglish ? "Notifications" : "Notifikasi"}</p>
            <p className="text-[11px] text-slate-500">
              {items.some((item) => !item.isRead)
                ? `${items.filter((item) => !item.isRead).length} ${isEnglish ? "need attention" : "perlu diperhatikan"}`
                : isEnglish ? "You're all caught up" : "Semua sudah dibaca"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {items.some((item) => !item.isRead) && (
              <button type="button" className="rounded-lg px-2.5 py-2 text-[11px] font-semibold text-[#16A34A] hover:bg-emerald-50" onClick={onMarkAllRead}>
                {isEnglish ? "Mark all read" : "Tandai dibaca"}
              </button>
            )}
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100" onClick={onClose} aria-label={isEnglish ? "Close" : "Tutup"}>
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="border-b border-slate-100 bg-[#F8FAFC] p-3">
          <div className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              pushStatus === "granted" ? "bg-emerald-50 text-[#16A34A]" : "bg-slate-100 text-slate-500"
            }`}>
              <Bell size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800">{pushCopy}</p>
              {pushStatus === "default" && <p className="mt-0.5 text-[10px] text-slate-500">{isEnglish ? "Schedules, requests, and shared payments." : "Jadwal, permintaan, dan pembayaran bersama."}</p>}
            </div>
            {pushStatus === "default" && (
              <button type="button" className="shrink-0 rounded-lg bg-[#16A34A] px-3 py-2 text-[11px] font-semibold text-white" onClick={onEnablePush}>
                {isEnglish ? "Enable" : "Aktifkan"}
              </button>
            )}
          </div>
        </div>

        <div className="max-h-[min(58dvh,32rem)] overflow-y-auto p-2">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-[#16A34A]"><CheckCircle2 size={20} /></span>
              <p className="mt-3 text-sm font-semibold text-slate-800">{isEnglish ? "No new notifications" : "Belum ada notifikasi baru"}</p>
              <p className="mt-1 text-xs text-slate-500">{isEnglish ? "Important activity will appear here." : "Aktivitas penting akan muncul di sini."}</p>
            </div>
          ) : items.map((item) => (
            <button
              type="button"
              key={`${item.kind ?? "social"}-${item.id}`}
              className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-slate-50 ${
                item.isRead ? "" : "bg-emerald-50/70"
              }`}
              onClick={() => onOpen(item)}
            >
              <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                item.kind === "schedule" ? "bg-amber-50 text-amber-700" : "bg-white text-[#16A34A]"
              }`}>
                <Bell size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900">{item.title}</span>
                  {!item.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#16A34A]" />}
                </span>
                {item.body && <span className="mt-0.5 block line-clamp-2 text-[11px] leading-4 text-slate-500">{item.body}</span>}
                <span className="mt-1 block text-[10px] text-slate-400">{localDate(item.createdAt)}</span>
              </span>
            </button>
          ))}
        </div>
      </aside>
    </>
  );
}

function greetingLabel(language: AppLanguage) {
  const hour = Number(new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    hourCycle: "h23"
  }).format(new Date()));
  if (language === "en") {
    if (hour < 11) return "Good morning";
    if (hour < 15) return "Good afternoon";
    return "Good evening";
  }
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

function MobileBottomNav({
  view,
  language,
  isScrolling,
  onAdd,
  onNavigate
}: {
  view: View;
  language: AppLanguage;
  isScrolling: boolean;
  onAdd: () => void;
  onNavigate: (view: View) => void;
}) {
  const plusActive = view === "manual";
  const isActive = (item: { id: View }) =>
    item.id === "accounts"
      ? view === "accounts"
      : item.id === "manage"
      ? view === "manage" || view === "categories" || view === "budgets"
      : view === item.id;

  return (
    <nav
      className={`mobile-bottom-nav ${isScrolling ? "mobile-bottom-nav-scrolling" : ""} lg:hidden`}
      aria-label={language === "en" ? "Main navigation" : "Navigasi utama"}
    >
      <div className="mobile-bottom-nav-shell">
        <div className="mobile-bottom-nav-surface" aria-hidden="true" />
        <div className="mobile-bottom-nav-menus">
          <div className="mobile-bottom-nav-side grid grid-cols-2">
            {mobileNavigation.slice(0, 2).map((item) => (
              <MobileNavButton key={item.id} item={item} language={language} active={isActive(item)} onNavigate={onNavigate} />
            ))}
          </div>
          <div className="mobile-bottom-nav-side grid grid-cols-2">
            {mobileNavigation.slice(2).map((item) => (
              <MobileNavButton key={item.id} item={item} language={language} active={isActive(item)} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
        <button
          className={`mobile-fab ${plusActive ? "mobile-fab-active" : ""}`}
          aria-label={language === "en" ? "Add transaction" : "Tambah transaksi"}
          title={language === "en" ? "Add transaction" : "Tambah transaksi"}
          aria-current={plusActive ? "page" : undefined}
          onClick={onAdd}
        >
          <Plus size={31} strokeWidth={3} />
        </button>
      </div>
    </nav>
  );
}

function AddActionSheet({
  language,
  onClose,
  onTransaction,
  onTransfer
}: {
  language: AppLanguage;
  onClose: () => void;
  onTransaction: () => void;
  onTransfer: () => void;
}) {
  const copy = language === "en" ? {
    title: "Add financial activity",
    subtitle: "Choose what you want to record.",
    transaction: "Income / expense transaction",
    transactionCaption: "Record salary, sales, shopping, food, bills, or daily spending.",
    transfer: "Transfer between accounts",
    transferCaption: "Move balance between cash, bank, or e-wallet accounts."
  } : {
    title: "Tambah aktivitas keuangan",
    subtitle: "Pilih dulu yang ingin dicatat.",
    transaction: "Transaksi pemasukan/pengeluaran",
    transactionCaption: "Catat gaji, penjualan, belanja, makan, tagihan, atau pengeluaran harian.",
    transfer: "Transfer antar akun",
    transferCaption: "Pindahkan saldo antar tunai, bank, atau e-wallet."
  };
  const actions = [
    { label: copy.transaction, caption: copy.transactionCaption, icon: ReceiptText, tone: "bg-emerald-50 text-[#16A34A]", onClick: onTransaction },
    { label: copy.transfer, caption: copy.transferCaption, icon: ArrowLeftRight, tone: "bg-sky-50 text-sky-600", onClick: onTransfer }
  ];

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 cursor-default bg-slate-950/20 backdrop-blur-[1px]"
        aria-label={language === "en" ? "Close add menu" : "Tutup menu tambah"}
        onClick={onClose}
      />
      <section className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-md rounded-[26px] border border-slate-100 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.22)] lg:bottom-auto lg:left-auto lg:right-8 lg:top-24 lg:mx-0 lg:w-96 lg:rounded-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950">{copy.title}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">{copy.subtitle}</p>
          </div>
          <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50" onClick={onClose}>
            <X size={17} />
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                className="ripple-card flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-left shadow-sm transition active:scale-[0.99]"
                onClick={action.onClick}
              >
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${action.tone}`}>
                  <Icon size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-950">{action.label}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-500">{action.caption}</span>
                </span>
                <ChevronRight size={18} className="text-slate-300" />
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}

function MobileNavButton({
  item,
  language,
  active,
  onNavigate
}: {
  item: { id: View; label: string; icon: LucideIcon };
  language: AppLanguage;
  active: boolean;
  onNavigate: (view: View) => void;
}) {
  const Icon = item.icon;
  return (
    <button
      className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-[10px] font-semibold transition ${
        active ? "text-[#16A34A]" : "text-slate-400"
      }`}
      onClick={() => onNavigate(item.id)}
      aria-current={active ? "page" : undefined}
    >
      <span className={`flex h-7 w-8 items-center justify-center rounded-xl transition ${
        active ? "bg-emerald-50" : "bg-transparent"
      }`}>
        <Icon size={18} strokeWidth={active ? 2.5 : 1.9} />
      </span>
      <span className="max-w-full truncate">{mobileNavLabel(item.id, item.label, language)}</span>
    </button>
  );
}

function mobileNavLabel(view: View, fallback: string, language: AppLanguage) {
  if (language === "id") return fallback;
  const labels: Partial<Record<View, string>> = {
    dashboard: "Home",
    accounts: "Pocket",
    history: "Transactions",
    assistant: "Copilot",
    reports: "Insights",
    social: "Social",
    manage: "Settings"
  };
  return labels[view] ?? fallback;
}

function appNavigationLabel(view: View, fallback: string | undefined, language: AppLanguage) {
  if (view === "assistant") return language === "en" ? "Finance Copilot" : "Kopilot Keuangan";
  return fallback;
}

function loadAuthScript(id: string, src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === "true") resolve();
      else existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    });
    script.addEventListener("error", () => reject(new Error("Provider login gagal dimuat")));
    document.head.appendChild(script);
  });
}

function AuthView({
  onSignedIn,
  onInstall,
  showInstall
}: {
  onSignedIn: (session: Session) => void;
  onInstall: () => Promise<void>;
  showInstall: boolean;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [otpStep, setOtpStep] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [resetStep, setResetStep] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [googleClientId, setGoogleClientId] = useState<string | null>(
    (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || null
  );
  const [googleButtonReady, setGoogleButtonReady] = useState(false);

  const completeSocialLogin = async (provider: "google", idToken: string, fullName?: string) => {
    setSocialLoading(provider);
    setError(null);
    try {
      const session = await apiFetch<Session>("/auth/social", undefined, {
        method: "POST",
        body: JSON.stringify({ provider, idToken, fullName: fullName || null })
      });
      queueDebugLog("auth_social_response", {
        provider,
        keys: session && typeof session === "object" ? Object.keys(session as Record<string, unknown>) : null,
        hasLastActivityAt: Boolean((session as any)?.lastActivityAt),
        userKeys: session && typeof session === "object" && (session as any).user && typeof (session as any).user === "object"
          ? Object.keys((session as any).user)
          : null
      });
      onSignedIn(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Login ${provider} gagal`);
    } finally {
      setSocialLoading(null);
    }
  };

  useEffect(() => {
    if (googleClientId) return;
    let active = true;
    apiFetch<{ googleClientId: string | null }>("/auth/providers")
      .then((result) => {
        if (!active) return;
        setGoogleClientId(result.googleClientId?.trim() || null);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [googleClientId]);

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return;
    let active = true;
    setGoogleButtonReady(false);
    loadAuthScript("google-identity-script", "https://accounts.google.com/gsi/client")
      .then(() => {
        if (!active || !window.google || !googleButtonRef.current) return;
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => completeSocialLogin("google", response.credential)
        });
        googleButtonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: mode === "login" ? "signin_with" : "signup_with",
          shape: "rectangular",
          width: 260
        });
        setGoogleButtonReady(true);
      })
      .catch((err) => active && setError(err.message));
    return () => { active = false; };
  }, [googleClientId, mode]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      if (mode === "login" && resetStep) {
        const payload = {
          email: String(form.get("email")),
          otp: String(form.get("resetOtp")),
          newPassword: String(form.get("newPassword"))
        };
        const result = await apiFetch<{ reset: boolean }>("/auth/forgot-password/verify", undefined, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        if (result.reset) {
          setResetStep(false);
          setMode("login");
          setError("Password berhasil diubah. Silakan login kembali.");
        }
        return;
      }

      if (mode === "register" && !otpStep) {
        const payload = {
          fullName: String(form.get("fullName")),
          email: String(form.get("email")),
          password: String(form.get("password")),
          currency: "IDR"
        };
        const result = await apiFetch<{ requiresOtp?: boolean; email?: string; message?: string }>("/auth/register", undefined, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        if (result.requiresOtp) {
          setOtpEmail(result.email ?? payload.email);
          setOtpStep(true);
          setError(result.message ?? "Kode OTP telah dikirim ke email Anda.");
          return;
        }
        if ((result as Session)?.accessToken && (result as Session)?.user) {
          onSignedIn(result as Session);
          return;
        }
        throw new Error("Registrasi gagal");
      }

      if (mode === "register" && otpStep) {
        const payload = {
          email: String(form.get("email")) || otpEmail,
          otp: String(form.get("otp"))
        };
        const session = await apiFetch<Session>("/auth/register/verify", undefined, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        onSignedIn(session);
        return;
      }

      const payload = { email: String(form.get("email")), password: String(form.get("password")) };
      const session = await apiFetch<Session>("/auth/login", undefined, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      queueDebugLog("auth_email_response", {
        mode,
        keys: session && typeof session === "object" ? Object.keys(session as Record<string, unknown>) : null,
        hasLastActivityAt: Boolean((session as any)?.lastActivityAt),
        userKeys: session && typeof session === "object" && (session as any).user && typeof (session as any).user === "object"
          ? Object.keys((session as any).user)
          : null
      });
      onSignedIn(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-8">
      <main className="w-full max-w-md overflow-hidden rounded-[26px] border border-white bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)] lg:rounded-lg">
        <header className="border-b border-emerald-100 bg-emerald-50/70 px-6 py-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#16A34A] text-white shadow-[0_12px_26px_rgba(22,163,74,0.24)] lg:rounded-md">
            <Wallet size={23} />
          </span>
          <h1 className="mt-3 text-xl font-semibold text-slate-950">Keuangan AI</h1>
          <p className="mt-1 text-sm text-slate-500">{mode === "login" ? "Masuk untuk melanjutkan pencatatanmu." : "Buat akun dan mulai kelola keuanganmu."}</p>
          {showInstall && (
            <button type="button" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#16A34A]" onClick={onInstall}>
              <Download size={14} /> Pasang aplikasi
            </button>
          )}
        </header>

        <section className="p-5 sm:p-6">
          <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            <button type="button" className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode === "login" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`} onClick={() => { setMode("login"); setOtpStep(false); setResetStep(false); setError(null); }}>Masuk</button>
            <button type="button" className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode === "register" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`} onClick={() => { setMode("register"); setOtpStep(false); setResetStep(false); setError(null); }}>Daftar</button>
          </div>

          <div className="space-y-2">
            {googleClientId ? (
              <div className="relative mx-auto h-10 w-[260px] max-w-full overflow-hidden">
                {!googleButtonReady && (
                  <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">
                    <GoogleLogo className="h-4 w-4" />
                    {mode === "login" ? "Login dengan Google" : "Daftar dengan Google"}
                  </div>
                )}
                <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${googleButtonReady ? "opacity-100" : "opacity-0"}`} ref={googleButtonRef} />
              </div>
            ) : (
              <button
                type="button"
                className="mx-auto flex h-10 w-[260px] max-w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                onClick={() => setError("Login Google belum tersedia. Pastikan GOOGLE_CLIENT_ID di server atau VITE_GOOGLE_CLIENT_ID di client sudah terpasang lalu deploy ulang.")}
              >
                <GoogleLogo className="h-4 w-4" />
                {mode === "login" ? "Login dengan Google" : "Daftar dengan Google"}
              </button>
            )}
          </div>

          <div className="my-5 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" /><span>atau gunakan email</span><span className="h-px flex-1 bg-slate-200" /></div>

          <form className="space-y-3" onSubmit={submit}>
            {mode === "register" && !otpStep && <Field label="Nama lengkap"><input className="input" name="fullName" autoComplete="name" required minLength={2} /></Field>}
            <Field label="Email"><input className="input" name="email" type="email" autoComplete="email" required /></Field>
            {mode === "login" && !resetStep && <Field label="Password"><input className="input" name="password" type="password" autoComplete="current-password" required minLength={8} /></Field>}
            {mode === "register" && !otpStep && <Field label="Password"><input className="input" name="password" type="password" autoComplete="new-password" required minLength={8} /></Field>}
            {mode === "login" && !resetStep && (
              <button
                type="button"
                className="text-left text-sm font-semibold text-[#16A34A]"
                onClick={() => {
                  setResetStep(true);
                  setResetEmail(String((document.querySelector('input[name="email"]') as HTMLInputElement | null)?.value ?? ""));
                  setError(null);
                }}
              >
                Lupa password?
              </button>
            )}
            {mode === "login" && resetStep && (
              <>
                <Field label="Kode OTP">
                  <input className="input tracking-[0.4em]" name="resetOtp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} minLength={6} required placeholder="000000" />
                </Field>
                <Field label="Password baru">
                  <input className="input" name="newPassword" type="password" autoComplete="new-password" required minLength={8} />
                </Field>
                <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  Kode reset dikirim ke {resetEmail || "email Anda"}.
                </p>
                <button
                  type="button"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  onClick={() => { setResetStep(false); setError(null); }}
                >
                  Kembali ke login
                </button>
              </>
            )}
            {mode === "register" && otpStep && (
              <>
                <Field label="Kode OTP">
                  <input
                    className="input tracking-[0.4em]"
                    name="otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    minLength={6}
                    required
                    placeholder="000000"
                  />
                </Field>
                <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  Kode OTP dikirim ke {otpEmail || "email Anda"}.
                </p>
                <button
                  type="button"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  onClick={() => { setOtpStep(false); setError(null); }}
                >
                  Ubah data registrasi
                </button>
              </>
            )}
            {error && <p className={`rounded-xl px-3 py-2 text-sm ${(otpStep && mode === "register") || resetStep ? "border border-emerald-100 bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{error}</p>}
            <button className="btn-primary w-full" disabled={loading || Boolean(socialLoading)}>
              {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
              {mode === "login" ? (resetStep ? "Verifikasi Reset" : "Masuk") : otpStep ? "Verifikasi OTP" : "Kirim OTP"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

function GoogleLogo(props: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" className={props.className}>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.1 0-11.3-5-11.3-11s5.2-11 11.3-11c2.8 0 5.3 1 7.3 2.8l5.7-5.6C33.6 8.2 29 6 24 6 13.5 6 5 14.2 5 25s8.5 19 19 19 19-8.1 19-19c0-1.3-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.8 16 19 13 24 13c2.8 0 5.3 1 7.3 2.8l5.7-5.6C33.6 8.2 29 6 24 6c-7.2 0-13.4 4.1-17.7 10.7z"/>
      <path fill="#4CAF50" d="M24 44c5 0 9.5-1.8 13-4.9l-6.1-5.1C29 35.2 26.7 36 24 36c-5.1 0-9.5-3.3-11.1-8.1l-6.5 5C10.6 39.8 16.9 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.2 3.5-3.6 6.3-6.4 7.9l.1-.1 6.1 5.1C35.7 39.7 43 35 43 25c0-1.4-.1-2.3-.4-3.5z"/>
    </svg>
  );
}

const categoryPalette = ["#16c784", "#f6a90b", "#60a5fa", "#2dd4bf", "#8b5cf6", "#ec4899"];

function handleMoneyInput(event: FormEvent<HTMLInputElement>) {
  event.currentTarget.value = formatRupiahInput(event.currentTarget.value);
}

function ExpenseDonut({ dashboard }: { dashboard: DashboardSummary }) {
  const rows = dashboard.expenseByCategory.slice(0, 5);
  const total = Math.max(Number(dashboard.expenseThisMonth), 1);
  let cursor = 0;
  const segments = rows.map((row, index) => {
    const size = (Number(row.total) / total) * 100;
    const segment = `${categoryPalette[index % categoryPalette.length]} ${cursor}% ${Math.min(cursor + size, 100)}%`;
    cursor += size;
    return segment;
  });
  const donutBackground = segments.length ? `conic-gradient(${segments.join(", ")}, #eef2f7 ${cursor}% 100%)` : "#eef2f7";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-bold">Ringkasan Pengeluaran</h3>
          <p className="text-xs text-slate-500">Bulan ini</p>
        </div>
        <span className="text-xs font-semibold text-[#16A34A]">Top 5</span>
      </div>
      {rows.length === 0 ? (
        <EmptyState text="Kategori akan muncul setelah ada pengeluaran." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
          <div className="relative mx-auto h-40 w-40 rounded-full" style={{ background: donutBackground }}>
            <div className="absolute inset-9 flex flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
              <span className="text-[11px] font-semibold text-slate-500">Total</span>
              <span className="text-sm font-semibold">{rupiah(dashboard.expenseThisMonth)}</span>
            </div>
          </div>
          <div className="space-y-2.5">
            {rows.map((item, index) => {
              const percent = Math.round((Number(item.total) / total) * 100);
              return (
                <div key={item.category ?? index} className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: categoryPalette[index % categoryPalette.length] }} />
                    <span className="truncate text-slate-700">{item.category ?? "Tanpa kategori"}</span>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-slate-900">{percent}%</p>
                    <p className="text-xs text-slate-400">{rupiah(item.total)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function DashboardView({
  dashboard,
  loading,
  error,
  language,
  onAdd,
  onAssistant,
  onRetry
}: {
  dashboard: DashboardSummary | null;
  loading: boolean;
  error: string | null;
  language: AppLanguage;
  onAdd: () => void;
  onAssistant: () => void;
  onRetry: () => void;
}) {
  const state = resolveAsyncContentState({ loading, error, data: dashboard });
  if (state === "loading") return <LoadingState />;
  if (state === "error") return <DataErrorState message={error ?? "Data dashboard gagal dimuat"} onRetry={onRetry} />;
  if (state === "empty" || !dashboard) return <EmptyState text="Ringkasan dashboard belum tersedia." />;
  const income = Number(dashboard.incomeThisMonth);
  const expense = Number(dashboard.expenseThisMonth);
  const balance = Number(dashboard.balance);
  const net = income - expense;
  const expenseRatio = Math.round((expense / Math.max(income, 1)) * 100);
  const ratioLabel = expenseRatio > 999 ? ">999%" : `${expenseRatio}%`;
  const topCategory = dashboard.expenseByCategory[0];
  const alertCount = dashboard.budgetAlerts.length;
  const jakartaToday = jakartaDateParts();
  const monthLabel = new Intl.DateTimeFormat("id-ID", { timeZone: APP_TIME_ZONE, month: "long", year: "numeric" }).format(new Date());
  const averageExpense = expense / Math.max(jakartaToday.day, 1);
  const runwayDays = averageExpense > 0 ? Math.max(Math.floor(balance / averageExpense), 0) : null;
  const healthLabel = expenseRatio <= 50 ? "Sehat" : expenseRatio <= 80 ? "Aman" : expenseRatio <= 100 ? "Waspada" : "Ketat";
  const healthClass =
    expenseRatio <= 80
      ? "bg-emerald-50 text-[#16A34A]"
      : expenseRatio <= 100
        ? "bg-amber-50 text-amber-700"
        : "bg-rose-50 text-rose-700";
  const insight = dashboard.insight ?? {
    currentWeekExpense: "0",
    previousWeekExpense: "0",
    weekChangePercent: null,
    scheduledUntilMonthEnd: "0",
    availableUntilMonthEnd: dashboard.balance
  };
  const weekChange = insight.weekChangePercent;
  const currentWeekExpense = Number(insight.currentWeekExpense);
  const availableUntilMonthEnd = Number(insight.availableUntilMonthEnd);
  const weeklyInsightText = language === "en"
    ? weekChange !== null
      ? `Your spending this week is ${weekChange >= 0 ? "up" : "down"} ${Math.abs(weekChange)}%.`
      : currentWeekExpense > 0
        ? `You have spent ${rupiah(currentWeekExpense)} this week.`
        : "No expenses have been recorded this week."
    : weekChange !== null
      ? `Pengeluaranmu minggu ini ${weekChange >= 0 ? "naik" : "turun"} ${Math.abs(weekChange)}%.`
      : currentWeekExpense > 0
        ? `Pengeluaranmu minggu ini ${rupiah(currentWeekExpense)}.`
        : "Belum ada pengeluaran yang tercatat minggu ini.";
  const availabilityInsightText = language === "en"
    ? availableUntilMonthEnd >= 0
      ? `${rupiah(availableUntilMonthEnd)} remains after scheduled payments through month-end.`
      : `Scheduled payments exceed your current balance by ${rupiah(Math.abs(availableUntilMonthEnd))}.`
    : availableUntilMonthEnd >= 0
      ? `Masih tersedia ${rupiah(availableUntilMonthEnd)} setelah jadwal pembayaran hingga akhir bulan.`
      : `Jadwal pembayaran melebihi saldo saat ini sebesar ${rupiah(Math.abs(availableUntilMonthEnd))}.`;

  return (
    <div className="space-y-3 lg:space-y-5">
      <section className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="relative overflow-hidden rounded-[26px] bg-[#16A34A] p-4 text-white shadow-[0_18px_42px_rgba(22,163,74,0.24)] lg:rounded-lg lg:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase text-white/65">Saldo aktif</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-normal sm:text-3xl">{rupiah(balance)}</h2>
              <p className="mt-1 text-xs font-semibold text-white/70">Update dari semua akun aktif</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${healthClass}`}>
              {healthLabel}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white/12 px-3 py-2 lg:rounded-md">
              <p className="text-[11px] font-semibold text-white/65">Net bulan ini</p>
              <p className={`mt-0.5 text-sm font-semibold ${net >= 0 ? "text-emerald-100" : "text-rose-100"}`}>
                {net >= 0 ? "+" : "-"}{rupiah(Math.abs(net))}
              </p>
            </div>
            <div className="rounded-2xl bg-white/12 px-3 py-2 lg:rounded-md">
              <p className="text-[11px] font-semibold text-white/65">Rata-rata keluar</p>
              <p className="mt-0.5 text-sm font-semibold">{rupiah(averageExpense)}/hari</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-xs font-semibold text-[#15803D] shadow-sm transition hover:bg-emerald-50 lg:rounded-md" onClick={onAdd}>
              <Plus size={15} /> Tambah transaksi
            </button>
          </div>
        </div>

        <button
          type="button"
          className="group flex min-h-[160px] w-full flex-col justify-between rounded-[26px] border border-emerald-100 bg-white p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-emerald-200 lg:rounded-lg"
          onClick={onAssistant}
        >
          <span>
            <span className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#16A34A]">
                <Lightbulb size={17} />
              </span>
              <span className="text-[11px] font-semibold uppercase text-[#16A34A]">
                {language === "en" ? "Today's insight" : "Insight hari ini"}
              </span>
            </span>
            <span className="mt-3 block text-sm font-semibold leading-5 text-slate-950">{weeklyInsightText}</span>
            <span className={`mt-1 block text-xs leading-5 ${availableUntilMonthEnd < 0 ? "text-rose-600" : "text-slate-500"}`}>
              {availabilityInsightText}
            </span>
          </span>
          <span className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-xs font-medium text-slate-600">
              {language === "en" ? "What would you like to do?" : "Apa yang ingin kamu lakukan?"}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#16A34A]">
              {language === "en" ? "Open Copilot" : "Buka Kopilot"}
              <ChevronRight size={15} className="transition group-hover:translate-x-0.5" />
            </span>
          </span>
        </button>
      </section>

      <section className="grid gap-3 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="overflow-hidden rounded-[26px] border border-white/80 bg-white shadow-soft lg:rounded-lg lg:border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-[10px] font-semibold uppercase text-slate-400">{monthLabel}</p>
              <h3 className="text-sm font-semibold text-slate-950">Ringkasan bulan ini</h3>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${healthClass}`}>{ratioLabel}</span>
          </div>
          <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-4">
            <DashboardMetric label="Masuk" value={rupiah(income)} helper="Pemasukan" tone="income" icon={<ArrowDownLeft size={16} />} />
            <DashboardMetric label="Keluar" value={rupiah(expense)} helper="Pengeluaran" tone="expense" icon={<ArrowUpRight size={16} />} />
            <DashboardMetric label="Net" value={`${net >= 0 ? "+" : "-"}${rupiah(Math.abs(net))}`} helper="Masuk - keluar" tone={net >= 0 ? "income" : "expense"} icon={<LineChart size={16} />} />
            <DashboardMetric label="Daya tahan" value={runwayDays !== null ? `${runwayDays} hari` : "Aman"} helper="Estimasi saldo" tone="neutral" icon={<Wallet size={16} />} />
          </div>
          <div className="px-4 py-3">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500">Rasio pengeluaran</span>
              <span className="font-semibold text-slate-900">{ratioLabel}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${expenseRatio <= 80 ? "bg-[#16A34A]" : expenseRatio <= 100 ? "bg-amber-400" : "bg-rose-500"}`}
                style={{ width: `${Math.min(expenseRatio, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
          <div className="rounded-[22px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200">
            <p className="text-[11px] font-bold text-slate-400">Kategori teratas</p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-950">{topCategory?.category ?? "Belum ada"}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{topCategory ? rupiah(topCategory.total) : "Belum ada pengeluaran"}</p>
          </div>
          <div className="rounded-[22px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200">
            <p className="text-[11px] font-bold text-slate-400">Anggaran</p>
            <p className={`mt-1 text-sm font-semibold ${alertCount > 0 ? "text-amber-700" : "text-[#16A34A]"}`}>
              {alertCount > 0 ? `${alertCount} perlu dicek` : "Terkendali"}
            </p>
            <p className="mt-1 truncate text-xs font-semibold text-slate-500">
              {alertCount > 0 ? `${dashboard.budgetAlerts[0].category} ${dashboard.budgetAlerts[0].usagePercent}%` : "Tidak ada peringatan"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 lg:gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200 lg:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-950">Arus kas harian</h3>
              <p className="text-xs font-semibold text-slate-500">Aktivitas bulan berjalan</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
              <span className="h-2 w-2 rounded-full bg-[#16A34A]" /> Masuk
              <span className="ml-1 h-2 w-2 rounded-full bg-rose-400" /> Keluar
            </span>
          </div>
          <MiniCashFlowChart daily={dashboard.daily} />
        </div>
        <div className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200 lg:p-5">
          <ExpenseDonut dashboard={dashboard} />
        </div>
      </section>

      <section className="grid gap-3 lg:gap-5 xl:grid-cols-2">
        <div className="card p-4 lg:p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-950">Aktivitas terbaru</h3>
          <TransactionList rows={dashboard.lastTransactions} />
        </div>
        <div className="card p-4 lg:p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-950">Notifikasi anggaran</h3>
          {dashboard.budgetAlerts.length === 0 ? <EmptyState text="Tidak ada peringatan anggaran." /> : (
            <div className="space-y-3">
              {dashboard.budgetAlerts.map((alert) => (
                <div key={alert.id} className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  {alert.category} mencapai {alert.usagePercent}% penggunaan.
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function DashboardMetric({
  label,
  value,
  helper,
  tone,
  icon
}: {
  label: string;
  value: string;
  helper: string;
  tone: "income" | "expense" | "neutral";
  icon: JSX.Element;
}) {
  const tones = {
    income: "bg-emerald-50 text-[#16A34A]",
    expense: "bg-rose-50 text-rose-600",
    neutral: "bg-sky-50 text-sky-700"
  };

  return (
    <div className="bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-slate-400">{label}</p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-950">{value}</p>
        </div>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl lg:rounded-md ${tones[tone]}`}>
          {icon}
        </span>
      </div>
      <p className="mt-1 truncate text-[11px] font-semibold text-slate-500">{helper}</p>
    </div>
  );
}

function MiniCashFlowChart({ daily }: { daily: DashboardSummary["daily"] }) {
  const rows = daily.slice(-10);
  const maxDaily = Math.max(...rows.map((item) => Number(item.income) + Number(item.expense)), 1);

  if (rows.length === 0) {
    return <EmptyState text="Belum ada transaksi bulan ini." />;
  }

  return (
    <div className="flex h-40 items-end gap-2">
      {rows.map((item) => {
        const incomeHeight = Math.max((Number(item.income) / maxDaily) * 100, Number(item.income) > 0 ? 5 : 0);
        const expenseHeight = Math.max((Number(item.expense) / maxDaily) * 100, Number(item.expense) > 0 ? 5 : 0);
        return (
          <div key={item.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex h-28 w-full items-end justify-center gap-1 rounded-xl bg-slate-50 px-1.5 pb-1.5">
              <div className="w-2 rounded-full bg-[#16A34A]" style={{ height: `${incomeHeight}%` }} />
              <div className="w-2 rounded-full bg-rose-400" style={{ height: `${expenseHeight}%` }} />
            </div>
            <span className="text-[10px] font-bold text-slate-400">{jakartaDateParts(item.date).day || "-"}</span>
          </div>
        );
      })}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  icon,
  className = ""
}: {
  label: string;
  value: string;
  tone: "income" | "expense" | "neutral";
  icon: JSX.Element;
  className?: string;
}) {
  const tones = {
    income: "bg-emerald-50 text-[#15803D]",
    expense: "bg-rose-50 text-rose-700",
    neutral: "bg-emerald-50 text-[#15803D]"
  };
  return (
    <div className={`card p-4 lg:p-5 ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 sm:text-sm">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl lg:h-10 lg:w-10 lg:rounded-md ${tones[tone]}`}>{icon}</span>
      </div>
      <p className="mt-3 text-xl font-semibold tracking-normal sm:text-2xl lg:mt-4">{value}</p>
    </div>
  );
}

function quickAmount(value: string, language: AppLanguage) {
  const amount = Math.round(Number(value));
  if (!Number.isFinite(amount) || amount <= 0) return "";
  if (amount >= 1_000_000 && amount % 1_000_000 === 0) {
    return `${amount / 1_000_000}${language === "en" ? "m" : "jt"}`;
  }
  if (amount >= 1_000 && amount % 1_000 === 0) {
    return `${amount / 1_000}${language === "en" ? "k" : "rb"}`;
  }
  return new Intl.NumberFormat(language === "en" ? "en-US" : "id-ID").format(amount);
}

function transactionQuickExamples(transactions: Transaction[], language: AppLanguage) {
  const fallback = language === "en"
    ? ["buy coffee 20k cash", "buy electricity token 100k", "ride Grab 25k", "ride Gojek 20k", "ride MRT 14k", "ride KRL 5k"]
    : ["beli kopi 20rb cash", "isi token listrik 100rb", "naik Grab 25rb", "naik Gojek 20rb", "naik MRT 14rb", "naik KRL 5rb"];
  const patterns = new Map<string, { count: number; index: number; text: string }>();

  transactions.forEach((transaction, index) => {
    if (
      transaction.transactionType !== "expense"
      || /transfer/i.test(transaction.sourceType ?? "")
    ) return;
    const merchant = transaction.merchantName?.trim() ?? "";
    const category = transaction.categoryName?.trim() ?? "";
    const context = `${merchant} ${category} ${transaction.notes ?? ""}`.toLowerCase();
    if (/top[ -]?up|transfer ke/.test(context)) return;
    const amount = quickAmount(transaction.amount, language);
    const payment = transaction.paymentMethod?.trim().toLowerCase() ?? "";
    const account = transaction.accountName?.trim() ?? "";
    let subject = merchant || category;
    let action = language === "en" ? "pay" : "bayar";

    if (/token|listrik|electric/.test(context)) {
      subject = language === "en" ? "electricity token" : "token listrik";
      action = language === "en" ? "buy" : "isi";
    } else if (/\bgrab\b/.test(context)) {
      subject = "Grab";
      action = language === "en" ? "ride" : "naik";
    } else if (/\bgojek\b|\bgoride\b/.test(context)) {
      subject = "Gojek";
      action = language === "en" ? "ride" : "naik";
    } else if (/\bmrt\b/.test(context)) {
      subject = "MRT";
      action = language === "en" ? "ride" : "naik";
    } else if (/\bkrl\b|commuter/.test(context)) {
      subject = "KRL";
      action = language === "en" ? "ride" : "naik";
    } else if (/kopi|coffee|cafe|caf�/.test(context)) {
      subject = merchant && !/kopi|coffee/i.test(merchant)
        ? `${language === "en" ? "coffee at" : "kopi di"} ${merchant}`
        : merchant || (language === "en" ? "coffee" : "kopi");
      action = language === "en" ? "buy" : "beli";
    } else if (!subject) {
      return;
    }

    const text = [action, subject, amount, payment].filter(Boolean).join(" ");
    const key = [
      transaction.transactionType,
      account,
      category,
      merchant,
      payment
    ].map((value) => value.trim().toLowerCase()).join("|");
    const current = patterns.get(key);
    patterns.set(key, current
      ? { ...current, count: current.count + 1 }
      : { count: 1, index, text });
  });

  const personalized = [...patterns.values()]
    .filter((item) => item.count > 1)
    .sort((a, b) => b.count - a.count || a.index - b.index)
    .map((item) => item.text);
  return [...new Set([...personalized, ...fallback])].slice(0, 5);
}

function ManualTransactionView({
  accounts,
  categories,
  editing,
  initialType,
  initialAccountId,
  resetKey,
  language,
  request,
  onCancel,
  onDone
}: {
  accounts: Account[];
  categories: Category[];
  editing: TransactionDetail | null;
  initialType: "income" | "expense";
  initialAccountId?: string;
  resetKey?: number;
  language: AppLanguage;
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onCancel: () => void;
  onDone: () => Promise<void>;
}) {
  const transactionAccounts = accounts.filter(
    (account) => (!account.isSharedWalletAccount && account.canEdit !== false) || account.id === editing?.accountId
  );
  const [transactionType, setTransactionType] = useState<"income" | "expense">(editing?.transactionType ?? initialType);
  const initialDraft = useMemo<ManualDraft>(
    () => ({
      accountId: ((editing?.accountId ?? initialAccountId) || transactionAccounts[0]?.id) ?? "",
      transactionDate: editing ? editing.transactionDate.slice(0, 10) : isoDateInput(),
      amount: moneyInputValue(editing?.amount),
      categoryId: editing?.categoryId ?? "",
      merchantName: editing?.merchantName ?? "",
      paymentMethod: editing?.paymentMethod ?? "",
      notes: editing?.notes ?? ""
    }),
    [transactionAccounts[0]?.id, editing?.id, initialAccountId]
  );
  const [draft, setDraft] = useState<ManualDraft>(initialDraft);
  const [formVersion, setFormVersion] = useState(0);
  const [freeText, setFreeText] = useState("");
  const [parseResult, setParseResult] = useState<ParsedManualTransaction | null>(null);
  const [parseLoading, setParseLoading] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [changedFields, setChangedFields] = useState<Set<AiTrackedField>>(new Set());
  const [loading, setLoading] = useState(false);
  const [attachmentLoading, setAttachmentLoading] = useState(false);
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentReceiptId, setAttachmentReceiptId] = useState<string | null>(editing?.receiptId ?? null);
  const [attachmentMessage, setAttachmentMessage] = useState<string | null>(null);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [visibility, setVisibility] = useState<TransactionDetail["visibility"]>(editing?.visibility ?? "private");
  const [viewerIds, setViewerIds] = useState<string[]>(editing?.viewerIds ?? []);
  const [socialFriends, setSocialFriends] = useState<SocialFriend[]>([]);
  const [suggestionTransactions, setSuggestionTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [errorContext, setErrorContext] = useState<"parse" | "submit" | null>(null);
  const formCardRef = useRef<HTMLDivElement>(null);
  const copy = language === "en" ? {
    title: "Add Transaction",
    description: "Type your transaction in everyday language and AI will fill in the details automatically.",
    write: "Write a transaction",
    placeholder: "Example: buy coffee 15k cash",
    analyze: "Analyze Transaction",
    analyzing: "Analyzing transaction...",
    steps: ["Reading amount", "Choosing category", "Choosing account", "Choosing payment method"],
    addAccountFirst: "Add an account before saving a transaction.",
    confirmation: "Confirmation",
    confirmTitle: "Confirm AI Result",
    confirmSubtitle: "Review the AI result before saving the transaction.",
    confident: "confident",
    income: "Income",
    expense: "Expense",
    date: "Date",
    amount: "Amount",
    account: "Account",
    currentBalance: "Current balance",
    category: "Category",
    uncategorized: "Uncategorized",
    merchant: "Source or merchant",
    payment: "Payment method",
    notes: "Notes",
    analyzeAgain: "Analyze Again",
    save: "Save Transaction"
  } : {
    title: "Tambah Transaksi",
    description: "Ketik transaksi dengan bahasa sehari-hari, AI akan mengisi detail transaksi secara otomatis.",
    write: "Tulis transaksi",
    placeholder: "Contoh: beli kopi 15rb cash",
    analyze: "Analisis Transaksi",
    analyzing: "Menganalisis transaksi...",
    steps: ["Membaca nominal", "Menentukan kategori", "Menentukan akun", "Menentukan metode pembayaran"],
    addAccountFirst: "Tambahkan akun dulu sebelum menyimpan transaksi.",
    confirmation: "Konfirmasi",
    confirmTitle: "Konfirmasi Hasil AI",
    confirmSubtitle: "Periksa kembali hasil AI sebelum menyimpan transaksi.",
    confident: "yakin",
    income: "Pemasukan",
    expense: "Pengeluaran",
    date: "Tanggal",
    amount: "Nominal",
    account: "Akun",
    currentBalance: "Saldo saat ini",
    category: "Kategori",
    uncategorized: "Tanpa kategori",
    merchant: "Sumber atau merchant",
    payment: "Metode pembayaran",
    notes: "Catatan",
    analyzeAgain: "Analisis Ulang",
    save: "Simpan Transaksi"
  };
  const examples = useMemo(
    () => transactionQuickExamples(suggestionTransactions, language),
    [suggestionTransactions, language]
  );

  useEffect(() => {
    setTransactionType(editing?.transactionType ?? initialType);
    setDraft(initialDraft);
    setFormVersion((current) => current + 1);
    setFreeText("");
    setParseResult(null);
    setAnalysisStep(0);
    setChangedFields(new Set());
    setAttachmentName("");
    setAttachmentReceiptId(editing?.receiptId ?? null);
    setAttachmentMessage(null);
    setVisibility(editing?.visibility ?? "private");
    setViewerIds(editing?.viewerIds ?? []);
    setError(null);
    setErrorContext(null);
  }, [editing?.id, initialDraft, initialType, resetKey]);

  useEffect(() => {
    request<BudgetRow[]>("/budgets")
      .then(setBudgets)
      .catch(() => setBudgets([]));
    request<SocialFriend[]>("/social/friends")
      .then((rows) => setSocialFriends(rows.filter((row) => row.status === "accepted")))
      .catch(() => setSocialFriends([]));
    request<{ data: Transaction[] }>("/transactions?limit=100&page=1&sort=transaction_date&direction=desc")
      .then((result) => setSuggestionTransactions(result.data))
      .catch(() => setSuggestionTransactions([]));
  }, []);

  const uploadAttachment = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAttachmentLoading(true);
    setAttachmentName(file.name);
    setAttachmentMessage("Mengunggah attachment...");
    setError(null);
    setErrorContext(null);

    try {
      const uploadForm = new FormData();
      uploadForm.set("receipt", file);
      try {
        const uploaded = await request<{ id: string }>("/receipts/upload", { method: "POST", body: uploadForm });
        setAttachmentReceiptId(uploaded.id);
      } catch (err) {
        const duplicateId = err instanceof ApiError && err.status === 409 && err.details && typeof err.details === "object"
          ? String((err.details as { receiptId?: unknown }).receiptId ?? "")
          : "";
        if (!duplicateId) throw err;
        setAttachmentReceiptId(duplicateId);
      }
      setAttachmentMessage("Attachment berhasil diunggah.");
    } catch {
      setAttachmentMessage("Attachment gagal diunggah. Pastikan file berupa gambar atau video.");
    } finally {
      setAttachmentLoading(false);
      event.target.value = "";
    }
  };

  const parseFreeText = async () => {
    if (!freeText.trim()) {
      setError("Tulis transaksi dulu, misalnya: beli kopi fore 15.000 cash");
      setErrorContext("parse");
      return;
    }

    setParseLoading(true);
    setAnalysisStep(0);
    setError(null);
    setErrorContext(null);
    try {
      const [parsed] = await Promise.all([
        request<ParsedManualTransaction>("/assistant/parse-transaction", {
          method: "POST",
          body: JSON.stringify({
            text: freeText,
            defaultAccountId: draft.accountId || transactionAccounts[0]?.id || null
          })
        }),
        (async () => {
          for (let step = 1; step <= 4; step += 1) {
            await new Promise((resolve) => window.setTimeout(resolve, 230));
            setAnalysisStep(step);
          }
        })()
      ]);
      setParseResult(parsed);
      setChangedFields(new Set());
      setTransactionType(parsed.transactionType);
      setDraft({
        accountId: parsed.accountId ?? draft.accountId ?? transactionAccounts[0]?.id ?? "",
        transactionDate: parsed.transactionDate.slice(0, 10),
        amount: moneyInputValue(parsed.amount),
        categoryId: parsed.categoryId ?? "",
        merchantName: parsed.merchantName ?? "",
        paymentMethod: parsed.paymentMethod ?? "",
        notes: parsed.notes
      });
      setFormVersion((current) => current + 1);
      window.setTimeout(() => {
        formCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    } catch {
      setError(null);
      setErrorContext("parse");
    } finally {
      setParseLoading(false);
    }
  };

  const markFieldChanged = (field: AiTrackedField) => {
    if (!parseResult) return;
    setChangedFields((current) => {
      const next = new Set(current);
      next.add(field);
      return next;
    });
  };

  const aiFieldStatus = (field: AiTrackedField): "ai" | "changed" | "review" | null => {
    if (!parseResult) return null;
    if (changedFields.has(field)) return "changed";
    const aliases: Record<AiTrackedField, string[]> = {
      transactionType: ["transactiontype", "type", "tipe"],
      transactionDate: ["transactiondate", "date", "tanggal"],
      amount: ["amount", "nominal", "jumlah"],
      accountId: ["account", "accountid", "akun"],
      categoryId: ["category", "categoryid", "kategori"],
      merchantName: ["merchant", "merchantname", "source", "sumber"],
      paymentMethod: ["paymentmethod", "payment", "metode pembayaran"],
      notes: ["notes", "note", "catatan"]
    };
    const reviewFields = parseResult.reviewFields.map((value) => value.toLowerCase().replace(/[\s_-]/g, ""));
    const needsReview = aliases[field].some((alias) => reviewFields.includes(alias.replace(/[\s_-]/g, "")));
    if (needsReview || (parseResult.confidenceScore < 0.65 && ["amount", "categoryId", "accountId"].includes(field))) return "review";
    return "ai";
  };

  const updateAmount = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const cursor = input.selectionStart ?? input.value.length;
    const digitsBeforeCursor = input.value.slice(0, cursor).replace(/\D/g, "").length;
    const formatted = formatRupiahInput(input.value);

    markFieldChanged("amount");
    setDraft((current) => ({ ...current, amount: formatted }));
    window.requestAnimationFrame(() => {
      if (document.activeElement !== input) return;
      if (!digitsBeforeCursor) {
        input.setSelectionRange(0, 0);
        return;
      }

      let seenDigits = 0;
      let nextCursor = formatted.length;
      for (let index = 0; index < formatted.length; index += 1) {
        if (/\d/.test(formatted[index])) seenDigits += 1;
        if (seenDigits === digitsBeforeCursor) {
          nextCursor = index + 1;
          break;
        }
      }
      input.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setErrorContext(null);
    const form = new FormData(event.currentTarget);
    const payload = {
      accountId: String(form.get("accountId")),
      transactionType,
      transactionDate: dateFilterIso(String(form.get("transactionDate")), "start"),
      amount: String(form.get("amount")),
      categoryId: String(form.get("categoryId") || "") || null,
      merchantName: String(form.get("merchantName") || "") || null,
      paymentMethod: String(form.get("paymentMethod") || "") || null,
      notes: String(form.get("notes") || "") || null,
      sourceType: "manual",
      receiptId: attachmentReceiptId,
      visibility,
      viewerIds: visibility === "selected_friends" ? viewerIds : [],
      items: []
    };
    try {
      await request(editing ? `/transactions/${editing.id}` : "/transactions", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });
      await onDone();
    } catch {
      setError(null);
      setErrorContext("submit");
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter((category) => category.categoryType === transactionType);
  const selectedAccount = accounts.find((account) => account.id === draft.accountId);
  const selectedBudget = budgets.find((budget) => budget.categoryId === draft.categoryId);
  const nextExpenseAmount = transactionType === "expense" ? Number(String(draft.amount).replace(/[^\d]/g, "")) : 0;
  const budgetAfterUse = selectedBudget ? moneyValue(selectedBudget.used) + nextExpenseAmount : 0;
  const budgetAfterPercent = selectedBudget && moneyValue(selectedBudget.budgetAmount) > 0 ? Math.round((budgetAfterUse / moneyValue(selectedBudget.budgetAmount)) * 100) : 0;

  return (
    <section className="mx-auto max-w-4xl space-y-3 lg:space-y-5">
      {!editing && (
        <div className="overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-soft lg:rounded-lg lg:border-slate-200">
          <div className="border-b border-slate-100 bg-emerald-50/60 px-4 py-4 lg:px-5">
            <div className="flex items-start gap-3">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase text-[#16A34A] shadow-sm">
                  <Sparkles size={12} /> AI Quick Add
                </span>
                <h2 className="mt-2 text-xl font-semibold tracking-normal text-slate-950">{copy.title}</h2>
                <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">
                  {copy.description}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-4 lg:p-5">
            <label className="block text-xs font-semibold text-slate-600">
              {copy.write}
              <textarea
                className="mt-1 min-h-28 w-full resize-none rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:cursor-wait disabled:opacity-70 lg:rounded-md"
                value={freeText}
                onChange={(event) => setFreeText(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                    event.preventDefault();
                    parseFreeText();
                  }
                }}
                placeholder={copy.placeholder}
                disabled={parseLoading}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {examples.map((example) => (
                <button
                  type="button"
                  key={example}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-[#16A34A] disabled:opacity-50"
                  onClick={() => setFreeText(example)}
                  disabled={parseLoading}
                >
                  {example}
                </button>
              ))}
            </div>

            {parseLoading && (
              <div className="grid grid-cols-2 gap-2 rounded-[18px] border border-emerald-100 bg-emerald-50/60 p-3 sm:grid-cols-4 lg:rounded-md">
                {copy.steps.map((label, index) => {
                  const done = analysisStep >= index + 1;
                  const active = analysisStep === index;
                  return (
                    <div key={label} className="flex min-w-0 items-center gap-2">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        done ? "bg-[#16A34A] text-white" : "bg-white text-slate-400"
                      }`}>
                        {done ? <CheckCircle2 size={13} /> : active ? <Loader2 className="animate-spin" size={12} /> : <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />}
                      </span>
                      <span className={`text-[10px] leading-4 ${done ? "font-semibold text-[#15803D]" : "text-slate-500"}`}>{label}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(22,163,74,0.18)] transition hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-60 lg:rounded-md"
              onClick={parseFreeText}
              disabled={parseLoading}
            >
              {parseLoading ? <Loader2 className="animate-spin" size={17} /> : <Sparkles size={17} />}
              {parseLoading ? copy.analyzing : copy.analyze}
            </button>
            {transactionAccounts.length === 0 && (
              <p className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-center text-[11px] text-amber-700">
                <TriangleAlert size={13} />
                {copy.addAccountFirst}
              </p>
            )}

            {error && errorContext === "parse" && (
              <p className="rounded-2xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 lg:rounded-md">{error}</p>
            )}
          </div>
        </div>
      )}

      <div
        ref={formCardRef}
        className={`scroll-mt-24 overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-soft lg:rounded-lg lg:border-slate-200 ${
          parseResult ? "ai-form-enter" : ""
        }`}
      >
        <div className="border-b border-slate-100 bg-white px-4 py-4 lg:px-5">
          {editing && (
            <button
              type="button"
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={onCancel}
            >
              <ArrowLeft size={15} /> Kembali
            </button>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl lg:rounded-md ${
                transactionType === "income" ? "bg-emerald-50 text-[#16A34A]" : "bg-rose-50 text-rose-600"
              }`}>
                {transactionType === "income" ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase text-[#16A34A]">{editing ? "Edit" : copy.confirmation}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="mt-0.5 text-base font-semibold tracking-normal text-slate-950">
                    {editing ? "Edit transaksi" : copy.confirmTitle}
                  </h2>
                  {parseResult && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-[#15803D]">
                      {Math.round(parseResult.confidenceScore * 100)}% {copy.confident}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {editing ? "Ubah data yang diperlukan lalu simpan." : copy.confirmSubtitle}
                </p>
              </div>
            </div>
            <div className="w-full sm:w-fit">
              <div className="mb-1 flex justify-end">
                <AiFieldBadge status={aiFieldStatus("transactionType")} language={language} />
              </div>
              <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1 lg:rounded-md">
              <button
                type="button"
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition lg:rounded-md ${
                  transactionType === "income" ? "bg-white text-[#15803D] shadow-sm" : "text-slate-500"
                }`}
                onClick={() => {
                  markFieldChanged("transactionType");
                  setTransactionType("income");
                }}
              >
                {copy.income}
              </button>
              <button
                type="button"
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition lg:rounded-md ${
                  transactionType === "expense" ? "bg-white text-rose-700 shadow-sm" : "text-slate-500"
                }`}
                onClick={() => {
                  markFieldChanged("transactionType");
                  setTransactionType("expense");
                }}
              >
                {copy.expense}
              </button>
              </div>
            </div>
          </div>
        </div>
        <form key={formVersion} className="grid gap-3 p-4 md:grid-cols-2 lg:p-5" onSubmit={submit}>
          <Field label={copy.date} hint={<AiFieldBadge status={aiFieldStatus("transactionDate")} language={language} />}>
            <div>
              <input type="hidden" name="transactionDate" value={draft.transactionDate} />
              <DateFilterPicker
                label={copy.date}
                value={draft.transactionDate}
                onChange={(value) => {
                  markFieldChanged("transactionDate");
                  setDraft((current) => ({ ...current, transactionDate: value }));
                }}
                language={language}
                showLabel={false}
                allowClear={false}
              />
            </div>
          </Field>
          <Field label={copy.amount} hint={<AiFieldBadge status={aiFieldStatus("amount")} language={language} />}>
            <input
              className="input"
              name="amount"
              inputMode="numeric"
              min="1"
              value={draft.amount}
              onChange={updateAmount}
              required
            />
          </Field>
          <Field label={copy.account} hint={<AiFieldBadge status={aiFieldStatus("accountId")} language={language} />}>
            <div>
              <select
                className="input"
                name="accountId"
                value={draft.accountId}
                onChange={(event) => {
                  markFieldChanged("accountId");
                  setDraft((current) => ({ ...current, accountId: event.target.value }));
                }}
                required
              >
                {accounts.map((account) => {
                  const disabled = Boolean(account.isSharedWalletAccount || account.canEdit === false);
                  return (
                  <option key={account.id} value={account.id} disabled={disabled}>
                    {accountOptionLabel(account, { balance: true, language })}
                  </option>
                  );
                })}
              </select>
              {accounts.some((account) => account.isSharedWalletAccount || account.canEdit === false) && (
                <p className="mt-1.5 text-[10px] text-amber-700">
                  Akun bertanda �Dipakai dompet bersama� atau �Account bersama� tidak dapat digunakan untuk transaksi pribadi.
                </p>
              )}
              {selectedAccount && (
                <div className="mt-1.5 flex items-center justify-between gap-2 px-1 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    {copy.currentBalance}
                    {accountSharedLabel(selectedAccount, language) && (
                      <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-[#16A34A]">
                        {accountSharedLabel(selectedAccount, language)}
                      </span>
                    )}
                  </span>
                  <span className="font-semibold text-slate-900">{rupiah(selectedAccount.currentBalance)}</span>
                </div>
              )}
            </div>
          </Field>
          <Field label={copy.category} hint={<AiFieldBadge status={aiFieldStatus("categoryId")} language={language} />}>
            <select
              className="input"
              name="categoryId"
              value={draft.categoryId}
              onChange={(event) => {
                markFieldChanged("categoryId");
                setDraft((current) => ({ ...current, categoryId: event.target.value }));
              }}
            >
              <option value="">{copy.uncategorized}</option>
              {filteredCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </Field>
          {transactionType === "expense" && selectedBudget && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 text-xs md:col-span-2 lg:rounded-md">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-600">Budget {selectedBudget.category}</span>
                <span className={`font-semibold ${budgetAfterPercent > 100 ? "text-rose-600" : "text-[#16A34A]"}`}>{budgetAfterPercent}% setelah transaksi</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                <div className={`h-full rounded-full ${budgetAfterPercent > 100 ? "bg-rose-500" : "bg-[#16A34A]"}`} style={{ width: `${Math.min(budgetAfterPercent, 100)}%` }} />
              </div>
              <p className="mt-2 font-semibold text-slate-500">
                Terpakai {rupiah(selectedBudget.used)} + transaksi ini {rupiah(nextExpenseAmount)} dari {rupiah(selectedBudget.budgetAmount)}.
              </p>
            </div>
          )}
          <Field label={copy.merchant} hint={<AiFieldBadge status={aiFieldStatus("merchantName")} language={language} />}>
            <input
              className="input"
              name="merchantName"
              value={draft.merchantName}
              onChange={(event) => {
                markFieldChanged("merchantName");
                setDraft((current) => ({ ...current, merchantName: event.target.value }));
              }}
            />
          </Field>
          <Field label={copy.payment} hint={<AiFieldBadge status={aiFieldStatus("paymentMethod")} language={language} />}>
            <input
              className="input"
              name="paymentMethod"
              value={draft.paymentMethod}
              onChange={(event) => {
                markFieldChanged("paymentMethod");
                setDraft((current) => ({ ...current, paymentMethod: event.target.value }));
              }}
              placeholder="Tunai, QRIS, debit"
            />
          </Field>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 md:col-span-2 lg:rounded-md">
            <Field label={language === "en" ? "Who can view this transaction" : "Siapa yang dapat melihat transaksi ini"}>
              <select className="input" value={visibility} onChange={(event) => setVisibility(event.target.value as TransactionDetail["visibility"])}>
                <option value="private">{language === "en" ? "Private � only you" : "Privat � hanya Anda"}</option>
                <option value="selected_friends">{language === "en" ? "Selected friends" : "Teman pilihan"}</option>
                <option value="everyone_involved">{language === "en" ? "Everyone involved" : "Semua pihak terlibat"}</option>
              </select>
            </Field>
            {visibility === "selected_friends" && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {socialFriends.length === 0 && <p className="col-span-2 text-xs text-slate-500">Tambahkan teman dulu untuk membagikan transaksi.</p>}
                {socialFriends.map((friend) => (
                  <label key={friend.userId} className="flex items-center gap-2 rounded-xl bg-white p-2 text-xs">
                    <input
                      type="checkbox"
                      checked={viewerIds.includes(friend.userId)}
                      onChange={() => setViewerIds((current) => current.includes(friend.userId)
                        ? current.filter((id) => id !== friend.userId)
                        : [...current, friend.userId])}
                    />
                    <span className="truncate">{friend.fullName}</span>
                  </label>
                ))}
              </div>
            )}
            <p className="mt-2 text-[11px] text-slate-500">
              {language === "en"
                ? "Account balances, budgets, and other transactions remain private."
                : "Saldo akun, rekening, budget, dan transaksi lainnya tetap privat."}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 md:col-span-2 lg:rounded-md">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-700">Attachment transaksi</p>
                <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                  Tambahkan gambar atau video sebagai bukti pendukung transaksi.
                </p>
              </div>
              <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#16A34A] shadow-sm ring-1 ring-slate-200 transition hover:bg-emerald-50 lg:rounded-md">
                {attachmentLoading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                {attachmentReceiptId ? "Ganti" : "Pilih file"}
                <input className="sr-only" type="file" accept="image/*,video/*,.heic,.heif" onChange={uploadAttachment} disabled={attachmentLoading} />
              </label>
            </div>
            {(attachmentName || editing?.receiptId) && (
              <div className="mt-2 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs text-slate-600 lg:rounded-md">
                <ReceiptText className="shrink-0 text-[#16A34A]" size={14} />
                <span className="truncate">{attachmentName || "Attachment transaksi tersimpan"}</span>
              </div>
            )}
            {attachmentMessage && (
              <p className={`mt-2 text-[11px] leading-4 ${attachmentMessage.includes("berhasil") ? "text-[#15803D]" : "text-slate-500"}`}>
                {attachmentMessage}
              </p>
            )}
          </div>
          <label className="block text-xs font-semibold text-slate-600 md:col-span-2">
            <span className="flex items-center justify-between gap-2">
              <span>{copy.notes}</span>
              <AiFieldBadge status={aiFieldStatus("notes")} language={language} />
            </span>
            <div className="mt-1">
              <textarea
                className="input min-h-28 whitespace-pre-wrap"
                name="notes"
                value={draft.notes}
                onChange={(event) => {
                  markFieldChanged("notes");
                  setDraft((current) => ({ ...current, notes: event.target.value }));
                }}
              />
            </div>
          </label>
          {error && errorContext === "submit" && <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 md:col-span-2 lg:rounded-md">{error}</p>}
          <div className="mt-2 space-y-2 border-t border-slate-100 pt-4 md:col-span-2">
            <button
              className="btn-primary w-full py-3"
              disabled={loading || attachmentLoading || parseLoading || accounts.length === 0}
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
              {copy.save}
            </button>
            {!editing && Boolean(freeText.trim()) && (
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-[#16A34A] disabled:opacity-50"
                onClick={parseFreeText}
                disabled={parseLoading}
              >
                {parseLoading ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                {copy.analyzeAgain}
              </button>
            )}
            <p className="text-center text-[10px] leading-4 text-slate-400">
              {language === "en" ? "Nothing is saved until you confirm." : "Transaksi baru tersimpan setelah Anda mengonfirmasi."}
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}

function TransactionDetailView({
  transaction,
  token,
  request,
  onBack,
  onEdit,
  onDelete
}: {
  transaction: TransactionDetail;
  token: string;
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isIncome = transaction.transactionType === "income";
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(null);
  const [attachmentOriginalUrl, setAttachmentOriginalUrl] = useState<string | null>(null);
  const [attachmentPreviewLoading, setAttachmentPreviewLoading] = useState(Boolean(transaction.receiptId));
  const [attachmentContentType, setAttachmentContentType] = useState("");
  const [comments, setComments] = useState<Array<{ id: string; authorName: string; message: string; createdAt: string }>>([]);
  const [commentError, setCommentError] = useState<string | null>(null);

  const loadComments = () => request<typeof comments>(`/social/comments/transaction/${transaction.id}`)
    .then(setComments)
    .catch(() => setComments([]));

  useEffect(() => {
    if (transaction.canManage === false) {
      setComments([]);
      return;
    }
    loadComments();
  }, [transaction.id, transaction.canManage]);

  useEffect(() => {
    if (!transaction.receiptId) {
      setAttachmentPreviewUrl(null);
      setAttachmentOriginalUrl(null);
      setAttachmentPreviewLoading(false);
      return;
    }

    let active = true;
    const objectUrls: string[] = [];
    setAttachmentPreviewLoading(true);
    const loadAttachment = async () => {
      try {
        const response = await fetch(downloadUrl(`/receipts/${transaction.receiptId}/file`), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Attachment tidak dapat dimuat");
        const blob = await response.blob();
        const contentType = response.headers.get("content-type") ?? blob.type;
        const fileSignature = new TextDecoder("ascii").decode(await blob.slice(4, 16).arrayBuffer());
        const isHeic = /image\/hei[cf]/i.test(contentType) || /ftyp(?:heic|heix|hevc|hevx|mif1|msf1)/i.test(fileSignature);
        const originalUrl = URL.createObjectURL(blob);
        objectUrls.push(originalUrl);
        if (!active) return;
        setAttachmentOriginalUrl(originalUrl);

        if (isHeic) {
          try {
            const converted = await heic2any({ blob, toType: "image/jpeg", quality: 0.9 });
            const previewBlob = Array.isArray(converted) ? converted[0] : converted;
            const previewUrl = URL.createObjectURL(previewBlob);
            objectUrls.push(previewUrl);
            if (!active) return;
            setAttachmentContentType("image/jpeg");
            setAttachmentPreviewUrl(previewUrl);
          } catch {
            setAttachmentContentType(contentType);
            setAttachmentPreviewUrl(null);
          }
        } else {
          setAttachmentContentType(contentType);
          setAttachmentPreviewUrl(originalUrl);
        }
      } catch {
        if (active) {
          setAttachmentPreviewUrl(null);
          setAttachmentOriginalUrl(null);
        }
      } finally {
        if (active) setAttachmentPreviewLoading(false);
      }
    };
    loadAttachment();

    return () => {
      active = false;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [transaction.receiptId, token]);

  const detailRows = [
    ["Tanggal", localDate(transaction.transactionDate)],
    ["Akun", transaction.accountName ?? "-"],
    ["Metode", transaction.paymentMethod ?? "-"],
    ["Kategori", transaction.categoryName ?? "Tanpa kategori"],
    ["Sumber", transaction.sourceType ?? "Manual"],
    ["Visibilitas", transaction.visibility === "selected_friends" ? "Teman pilihan" : transaction.visibility === "everyone_involved" ? "Semua yang terlibat" : "Private"],
    ...(transaction.receiptId ? [["Attachment", "File tersimpan"]] : [])
  ];

  return (
    <section className="mx-auto max-w-3xl space-y-3">
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        onClick={onBack}
      >
        <ArrowLeft size={15} /> Kembali
      </button>

      <div className="overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-soft lg:rounded-lg lg:border-slate-200">
        <div className="border-b border-slate-100 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${transactionIconClass(transaction)}`}>
                {transactionCategoryIcon(transaction)}
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-slate-950">{transactionTitle(transaction)}</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">{transaction.accountName ?? "-"}{transaction.paymentMethod ? ` - ${transaction.paymentMethod}` : ""}</p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className={`text-lg font-semibold ${isIncome ? "text-[#16A34A]" : "text-slate-950"}`}>
                {isIncome ? "+" : "-"}{rupiah(transaction.amount)}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-400">{isIncome ? "Pemasukan" : "Pengeluaran"}</p>
            </div>
          </div>
        </div>

        <dl className="grid gap-3 p-5 sm:grid-cols-2">
          {detailRows.map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-slate-50 px-3 py-2.5 lg:rounded-md">
              <dt className="text-[11px] font-semibold uppercase text-slate-400">{label}</dt>
              <dd className="mt-1 text-sm font-bold text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>

        {transaction.notes && (
          <div className="border-t border-slate-100 px-5 py-4">
            <p className="text-[11px] font-semibold uppercase text-slate-400">Catatan</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{transaction.notes}</p>
          </div>
        )}

        {transaction.receiptId && (
          <div className="border-t border-slate-100 px-5 py-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase text-slate-400">Attachment</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">File attachment transaksi</p>
              </div>
              {attachmentOriginalUrl && (
                <button
                  type="button"
                  className="text-xs font-semibold text-[#16A34A]"
                  onClick={() => window.open(attachmentOriginalUrl, "_blank", "noopener,noreferrer")}
                >
                  Buka file
                </button>
              )}
            </div>
            {attachmentPreviewLoading ? (
              <div className="flex h-44 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 lg:rounded-md">
                <Loader2 className="animate-spin" size={22} />
              </div>
            ) : attachmentPreviewUrl && attachmentContentType.startsWith("video/") ? (
              <video className="max-h-[520px] w-full rounded-2xl bg-black lg:rounded-md" src={attachmentPreviewUrl} controls preload="metadata">
                Browser tidak mendukung preview video ini.
              </video>
            ) : attachmentPreviewUrl && attachmentContentType.startsWith("image/") ? (
              <button
                type="button"
                className="block w-full overflow-hidden rounded-2xl bg-slate-100 lg:rounded-md"
                onClick={() => window.open(attachmentPreviewUrl, "_blank", "noopener,noreferrer")}
                aria-label="Buka attachment ukuran penuh"
              >
                <img className="max-h-[520px] w-full object-contain" src={attachmentPreviewUrl} alt="Attachment transaksi" />
              </button>
            ) : attachmentOriginalUrl ? (
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-50 px-4 py-8 text-sm font-semibold text-[#16A34A] lg:rounded-md"
                onClick={() => window.open(attachmentOriginalUrl, "_blank", "noopener,noreferrer")}
              >
                <ReceiptText size={18} /> Buka attachment
              </button>
            ) : (
              <p className="rounded-2xl bg-rose-50 px-3 py-3 text-xs text-rose-700 lg:rounded-md">
                Attachment tidak dapat dimuat.
              </p>
            )}
          </div>
        )}

        {transaction.canManage !== false && (
        <div className="border-t border-slate-100 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase text-slate-400">Diskusi transaksi</p>
          <div className="mt-3 space-y-2">
            {comments.length === 0 && <p className="text-xs text-slate-500">Belum ada komentar.</p>}
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-900">{comment.authorName}</p>
                <p className="mt-1 text-sm text-slate-700">{comment.message}</p>
              </div>
            ))}
          </div>
          <form className="mt-3 flex gap-2" onSubmit={async (event) => {
            event.preventDefault();
            const formElement = event.currentTarget;
            const message = String(new FormData(formElement).get("message"));
            try {
              await request(`/social/comments/transaction/${transaction.id}`, {
                method: "POST",
                body: JSON.stringify({ message })
              });
              formElement.reset();
              setCommentError(null);
              await loadComments();
            } catch (error) {
              setCommentError(error instanceof Error ? error.message : "Komentar gagal dikirim");
            }
          }}>
            <input className="input min-w-0 flex-1" name="message" placeholder="Tulis komentar" required />
            <button className="btn-secondary shrink-0" aria-label="Kirim komentar"><MessageCircle size={15} /></button>
          </form>
          {commentError && <p className="mt-2 text-xs text-rose-600">{commentError}</p>}
        </div>
        )}

        {transaction.canManage !== false && (
          <div className="grid grid-cols-[1fr_auto] gap-2 border-t border-slate-100 p-5">
            <button type="button" className="btn-primary" onClick={onEdit}>
              <Settings size={15} /> Edit transaksi
            </button>
            <button type="button" className="btn-danger px-3" onClick={onDelete} aria-label="Hapus transaksi">
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function ReceiptView({
  accounts,
  categories,
  request,
  onDone
}: {
  accounts: Account[];
  categories: Category[];
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onDone: () => Promise<void>;
}) {
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<any>(null);
  const [rawText, setRawText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const expenseCategories = categories.filter((category) => category.categoryType === "expense");

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setMessage("Ukuran file terlalu besar.");
      event.target.value = "";
      return;
    }
    setSelectedFile(file);
    setReceiptId(null);
    setParsed(null);
    setRawText("");
    setMessage(null);
    setPreview((currentPreview) => {
      if (currentPreview) URL.revokeObjectURL(currentPreview);
      return file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    });
    event.target.value = "";
  };

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const processSelectedFile = async () => {
    if (!selectedFile) {
      setMessage("Pilih atau foto struk dulu.");
      return;
    }
    const form = new FormData();
    form.set("receipt", selectedFile);
    setLoading(true);
    setMessage(null);
    try {
      const uploaded = await request<{ id: string }>("/receipts/upload", { method: "POST", body: form });
      setReceiptId(uploaded.id);
      const processed = await request<{ parsed: any; rawOcrText: string; message?: string }>(`/receipts/${uploaded.id}/process`, { method: "POST" });
      setParsed(processed.parsed);
      setRawText(processed.rawOcrText);
      setMessage(processed.message ?? null);
    } catch {
      setMessage(null);
    } finally {
      setLoading(false);
    }
  };

  const confirm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!receiptId) return;
    const form = new FormData(event.currentTarget);
    const payload = {
      accountId: String(form.get("accountId")),
      categoryId: String(form.get("categoryId") || "") || null,
      merchantName: String(form.get("merchantName")),
      transactionDate: dateFilterIso(String(form.get("transactionDate")), "start"),
      amount: String(form.get("amount")),
      paymentMethod: String(form.get("paymentMethod") || "") || null,
      notes: String(form.get("notes") || "") || null,
      items: (parsed?.items ?? []).map((item: any) => ({
        itemName: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice
      }))
    };
    setLoading(true);
    try {
      await request(`/receipts/${receiptId}/confirm`, { method: "POST", body: JSON.stringify(payload) });
      await onDone();
    } catch {
      setMessage(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200 lg:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase text-[#16A34A]">Scan struk</p>
            <h2 className="mt-0.5 text-lg font-semibold text-slate-950">Upload atau foto struk</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">Pilih sumber, cek preview, lalu proses OCR.</p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#16A34A] lg:rounded-md">
            <Camera size={18} />
          </span>
        </div>

        <input ref={cameraInputRef} className="sr-only" type="file" accept="image/*" capture="environment" onChange={selectFile} />
        <input ref={galleryInputRef} className="sr-only" type="file" accept="image/jpeg,image/png" onChange={selectFile} />
        <input ref={fileInputRef} className="sr-only" type="file" accept="image/jpeg,image/png,application/pdf" onChange={selectFile} />

        <div className="grid grid-cols-3 gap-2">
          <button type="button" className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-3 text-xs font-semibold text-slate-700 transition hover:border-emerald-100 hover:bg-emerald-50 hover:text-[#16A34A] lg:rounded-md" onClick={() => cameraInputRef.current?.click()}>
            <Camera size={18} /> Kamera
          </button>
          <button type="button" className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-3 text-xs font-semibold text-slate-700 transition hover:border-emerald-100 hover:bg-emerald-50 hover:text-[#16A34A] lg:rounded-md" onClick={() => galleryInputRef.current?.click()}>
            <ReceiptText size={18} /> Galeri
          </button>
          <button type="button" className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-3 text-xs font-semibold text-slate-700 transition hover:border-emerald-100 hover:bg-emerald-50 hover:text-[#16A34A] lg:rounded-md" onClick={() => fileInputRef.current?.click()}>
            <Upload size={18} /> File
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-[22px] border border-dashed border-slate-200 bg-slate-50 lg:rounded-md">
          {preview ? (
            <img className="max-h-96 w-full object-contain" src={preview} alt="Preview struk" />
          ) : selectedFile ? (
            <div className="flex min-h-44 flex-col items-center justify-center px-4 py-8 text-center">
              <ReceiptText className="mb-3 text-[#16A34A]" size={28} />
              <p className="text-sm font-semibold text-slate-950">{selectedFile.name}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">PDF siap diproses.</p>
            </div>
          ) : (
            <div className="flex min-h-44 flex-col items-center justify-center px-4 py-8 text-center">
              <Upload className="mb-3 text-slate-400" size={28} />
              <p className="text-sm font-semibold text-slate-700">Belum ada struk</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">JPG, PNG, atau PDF maksimal 8 MB.</p>
            </div>
          )}
        </div>

        <button type="button" className="btn-primary mt-4 w-full" disabled={loading || !selectedFile} onClick={processSelectedFile}>
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
          {loading ? "Memproses struk..." : "Proses struk"}
        </button>
        {message && <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{message}</p>}
        {rawText && (
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer font-semibold">Teks OCR</summary>
            <pre className="mt-2 max-h-52 overflow-auto rounded-md bg-slate-900 p-3 text-xs text-white">{rawText}</pre>
          </details>
        )}
      </section>

      <section className="card p-5">
        <h2 className="mb-4 text-lg font-bold">Konfirmasi hasil scan</h2>
        {!parsed ? (
          <EmptyState text="Hasil OCR akan tampil di sini." />
        ) : (
          <form className="grid gap-4 md:grid-cols-2" onSubmit={confirm}>
            <Field label="Merchant">
              <input className="input" name="merchantName" defaultValue={parsed.merchantName ?? ""} required />
            </Field>
            <Field label="Tanggal">
              <input className="input" type="date" name="transactionDate" defaultValue={parsed.transactionDate ?? isoDateInput()} required />
            </Field>
            <Field label="Total pembayaran">
              <input className="input" name="amount" defaultValue={parsed.total ?? ""} required />
            </Field>
            <Field label="Confidence">
              <input className="input" value={`${Math.round((parsed.confidenceScore ?? 0) * 100)}%`} readOnly />
            </Field>
            <Field label="Akun pembayaran">
              <select className="input" name="accountId" required>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>{accountOptionLabel(account)}</option>
                ))}
              </select>
            </Field>
            <Field label="Kategori">
              <select className="input" name="categoryId" defaultValue={expenseCategories.find((category) => category.name === parsed.suggestedCategory)?.id ?? ""}>
                <option value="">Tanpa kategori</option>
                {expenseCategories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Metode pembayaran">
              <input className="input" name="paymentMethod" defaultValue={parsed.paymentMethod ?? ""} />
            </Field>
            <Field label="Nomor struk">
              <input className="input" value={parsed.receiptNumber ?? ""} readOnly />
            </Field>
            <label className="block text-sm font-medium md:col-span-2">
              Catatan
              <textarea className="input mt-1 min-h-20" name="notes" defaultValue={parsed.reviewFields?.length ? "Perlu cek ulang: " + parsed.reviewFields.join(", ") : ""} />
            </label>
            <div className="md:col-span-2">
              <h3 className="mb-2 text-sm font-semibold">Item struk</h3>
              <div className="max-h-56 overflow-auto rounded-md border border-slate-200">
                {(parsed.items ?? []).length === 0 ? (
                  <p className="p-3 text-sm text-slate-500">Item belum terdeteksi.</p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr><th className="px-3 py-2">Nama</th><th className="px-3 py-2">Qty</th><th className="px-3 py-2">Total</th></tr>
                    </thead>
                    <tbody>
                      {parsed.items.map((item: any, index: number) => (
                        <tr key={`${item.name}-${index}`} className="border-t">
                          <td className="px-3 py-2">{item.name}</td>
                          <td className="px-3 py-2">{item.quantity}</td>
                          <td className="px-3 py-2">{rupiah(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            <div className="md:col-span-2">
              <button className="btn-primary" disabled={loading || accounts.length === 0}>
                {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                Simpan transaksi dari struk
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

function DateFilterPicker({
  label,
  value,
  onChange,
  language,
  align = "left",
  showLabel = true,
  allowClear = true
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  language: AppLanguage;
  align?: "left" | "right";
  showLabel?: boolean;
  allowClear?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const todayParts = jakartaDateParts();
  const jakartaTodayDate = new Date(Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day, 12));
  const selectedDate = value ? new Date(`${value}T12:00:00Z`) : null;
  const [visibleMonth, setVisibleMonth] = useState(
    () => selectedDate ?? jakartaTodayDate
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const locale = language === "en" ? "en-US" : "id-ID";

  useEffect(() => {
    if (open) setVisibleMonth(selectedDate ?? jakartaTodayDate);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("touchstart", closeOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("touchstart", closeOutside);
    };
  }, [open]);

  const year = visibleMonth.getUTCFullYear();
  const month = visibleMonth.getUTCMonth();
  const firstOfMonth = new Date(Date.UTC(year, month, 1, 12));
  const firstGridDate = new Date(Date.UTC(year, month, 1 - firstOfMonth.getUTCDay(), 12));
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstGridDate);
    date.setUTCDate(firstGridDate.getUTCDate() + index);
    return date;
  });
  const weekdayLabels = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday: "narrow" }).format(new Date(Date.UTC(2026, 7, 2 + index, 12)))
  );
  const toValue = (date: Date) => [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");
  const displayValue = selectedDate
    ? new Intl.DateTimeFormat(locale, { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" }).format(selectedDate)
    : (locale === "en-US" ? "Select date" : "Pilih tanggal");
  const todayValue = todayParts.value;

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        className={`flex w-full items-center justify-between gap-2 rounded-2xl border bg-white px-3 py-2 text-left transition lg:rounded-md ${
          open ? "border-emerald-400 ring-2 ring-emerald-100" : "border-slate-200 hover:border-emerald-300"
        }`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span className="min-w-0">
          {showLabel && <span className="block text-[10px] font-semibold uppercase text-slate-400">{label}</span>}
          <span className={`${showLabel ? "mt-1" : ""} block truncate text-xs font-semibold text-slate-800`}>{displayValue}</span>
        </span>
        <CalendarDays size={15} className="shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className={`absolute top-[calc(100%+8px)] z-40 w-[min(18rem,calc(100vw-2.5rem))] rounded-[20px] border border-slate-100 bg-white p-3 shadow-[0_22px_55px_rgba(15,23,42,0.18)] ${
          align === "right" ? "right-0" : "left-0"
        }`}>
          <div className="flex items-center justify-between">
            <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50" onClick={() => setVisibleMonth(new Date(Date.UTC(year, month - 1, 1, 12)))} aria-label="Bulan sebelumnya">
              <ChevronLeft size={18} />
            </button>
            <p className="text-sm font-semibold text-slate-900">
              {new Intl.DateTimeFormat(locale, { timeZone: "UTC", month: "long", year: "numeric" }).format(visibleMonth)}
            </p>
            <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50" onClick={() => setVisibleMonth(new Date(Date.UTC(year, month + 1, 1, 12)))} aria-label="Bulan berikutnya">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="mt-2 grid grid-cols-7">
            {weekdayLabels.map((day, index) => (
              <span key={`${day}-${index}`} className="flex h-8 items-center justify-center text-[10px] font-semibold text-slate-400">{day}</span>
            ))}
            {days.map((date) => {
              const dateValue = toValue(date);
              const selected = dateValue === value;
              const today = dateValue === todayValue;
              const currentMonth = date.getUTCMonth() === month;
              return (
                <button
                  key={dateValue}
                  type="button"
                  className={`mx-auto flex h-9 w-9 items-center justify-center rounded-xl text-xs transition ${
                    selected
                      ? "bg-[#16A34A] font-semibold text-white shadow-sm"
                      : today
                        ? "bg-emerald-50 font-semibold text-[#16A34A]"
                        : currentMonth
                          ? "text-slate-700 hover:bg-slate-100"
                          : "text-slate-300 hover:bg-slate-50"
                  }`}
                  onClick={() => {
                    onChange(dateValue);
                    setOpen(false);
                  }}
                >
                  {date.getUTCDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
            {allowClear ? (
              <button type="button" className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50" onClick={() => onChange("")}>
                {language === "en" ? "Clear" : "Hapus"}
              </button>
            ) : <span />}
            <button type="button" className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-[#16A34A]" onClick={() => {
              onChange(todayValue);
              setOpen(false);
            }}>{language === "en" ? "Today" : "Hari ini"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryView({
  accounts,
  language,
  request,
  onOpen,
  onChanged,
  token,
  initialAccountId,
  initialFromDate,
  focusTransactionId,
  onFocused,
  onRegisterRefresh
}: {
  accounts: Account[];
  language: AppLanguage;
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onOpen: (id: string) => void;
  onChanged: () => Promise<void>;
  token: string;
  initialAccountId?: string;
  initialFromDate?: string;
  focusTransactionId?: string | null;
  onFocused?: () => void;
  onRegisterRefresh?: (callback: () => Promise<void>) => void;
}) {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [accountId, setAccountId] = useState(initialAccountId ?? "");
  const [fromDate, setFromDate] = useState(() => initialFromDate || currentMonthDateBounds().from);
  const [toDate, setToDate] = useState(() => currentMonthDateBounds().to);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [highlightedTransactionId, setHighlightedTransactionId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const transactionRefs = useRef(new Map<string, HTMLDivElement>());

  const load = async (nextSearch = search, nextType = type, nextFromDate = fromDate, nextToDate = toDate, nextAccountId = accountId) => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams();
      if (nextSearch.trim()) params.set("search", nextSearch.trim());
      if (nextType) params.set("type", nextType);
      if (nextAccountId) params.set("accountId", nextAccountId);
      if (nextFromDate) params.set("from", dateFilterIso(nextFromDate, "start"));
      if (nextToDate) params.set("to", dateFilterIso(nextToDate, "end"));
      const result = await request<{ data: Transaction[] }>(`/transactions?${params.toString()}`);
      setRows(result.data);
    } catch (error) {
      setRows([]);
      setLoadError(error instanceof Error ? error.message : "Riwayat transaksi gagal dimuat");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load(search, type, fromDate, toDate, accountId).catch(console.error);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, type, fromDate, toDate, accountId]);

  useEffect(() => {
    onRegisterRefresh?.(() => load(search, type, fromDate, toDate, accountId));
  }, [accountId, fromDate, onRegisterRefresh, search, toDate, type]);

  useEffect(() => {
    setAccountId(initialAccountId ?? "");
    setFromDate(initialFromDate || currentMonthDateBounds().from);
  }, [initialAccountId, initialFromDate]);

  useEffect(() => {
    if (loading || !focusTransactionId) return;
    const timer = window.setTimeout(() => {
      const target = transactionRefs.current.get(focusTransactionId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedTransactionId(focusTransactionId);
        window.setTimeout(() => setHighlightedTransactionId(null), 1600);
      }
      onFocused?.();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [loading, rows, focusTransactionId, onFocused]);

  const remove = async (id: string) => {
    if (!window.confirm("Hapus transaksi ini?")) return;
    await request(`/transactions/${id}`, { method: "DELETE" });
    await load(search, type, fromDate, toDate, accountId);
    await onChanged();
  };

  const exportFile = async (format: string) => {
    const params = new URLSearchParams({ format });
    if (search.trim()) params.set("search", search.trim());
    if (type) params.set("type", type);
    if (accountId) params.set("accountId", accountId);
    if (fromDate) params.set("from", dateFilterIso(fromDate, "start"));
    if (toDate) params.set("to", dateFilterIso(toDate, "end"));
    const response = await fetch(downloadUrl(`/transactions/export?${params.toString()}`), {
      headers: { Authorization: `Bearer ${token}` }
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `transaksi.${format === "excel" ? "xlsx" : format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const applyType = (nextType: string) => {
    setType(nextType);
  };

  const totalIncome = rows.reduce((sum, row) => sum + (row.transactionType === "income" ? Number(row.amount) : 0), 0);
  const totalExpense = rows.reduce((sum, row) => sum + (row.transactionType === "expense" ? Number(row.amount) : 0), 0);
  const netTotal = totalIncome - totalExpense;
  const visibleIds = useMemo(() => rows.filter((row) => row.canManage !== false).map((row) => row.id), [rows]);
  const selectedCount = selectedIds.size;
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const typeOptions = [
    { value: "", label: "Semua" },
    { value: "income", label: "Masuk" },
    { value: "expense", label: "Keluar" }
  ];
  const groupedRows = groupTransactionsByDate(rows);

  useEffect(() => {
    const visible = new Set(visibleIds);
    setSelectedIds((current) => {
      const next = new Set(Array.from(current).filter((id) => visible.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [visibleIds]);

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());
  const selectAllVisible = () => setSelectedIds(new Set(visibleIds));

  const deleteSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(`Hapus ${ids.length} transaksi terpilih?`)) return;
    await Promise.all(ids.map((id) => request(`/transactions/${id}`, { method: "DELETE" })));
    setSelectedIds(new Set());
    await load(search, type, fromDate, toDate, accountId);
    await onChanged();
  };

  return (
    <section className="mx-auto max-w-6xl space-y-3 lg:space-y-4">
      <div className="rounded-[22px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase text-[#16A34A]">Transaksi</p>
            <h2 className="mt-0.5 text-base font-semibold tracking-normal text-slate-950">Riwayat transaksi</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">{rows.length} transaksi tampil</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-[#16A34A]">
            {type === "income" ? "Masuk" : type === "expense" ? "Keluar" : "Semua"}
          </span>
        </div>
        <div className="mt-3 rounded-2xl bg-[#16A34A] px-4 py-3 text-white lg:rounded-lg">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold text-white/75">Net transaksi</p>
              <p className="mt-0.5 text-[11px] font-semibold text-white/65">Sesuai filter aktif</p>
            </div>
            <p className="shrink-0 text-base font-semibold">{netTotal >= 0 ? "+" : "-"}{rupiah(Math.abs(netTotal))}</p>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-emerald-50 px-3 py-2 lg:rounded-md">
            <p className="text-[11px] font-bold text-[#15803D]">Masuk</p>
            <p className="mt-0.5 text-[13px] font-semibold leading-tight text-[#15803D]">{rupiah(totalIncome)}</p>
          </div>
          <div className="rounded-2xl bg-rose-50 px-3 py-2 lg:rounded-md">
            <p className="text-[11px] font-bold text-rose-700">Keluar</p>
            <p className="mt-0.5 text-[13px] font-semibold leading-tight text-rose-700">{rupiah(totalExpense)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-[22px] border border-white/80 bg-white p-3 shadow-soft lg:rounded-lg lg:border-slate-200">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={15} />
          <input
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-9 py-2.5 text-[13px] font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 lg:rounded-md"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari transaksi"
          />
          {search && (
            <button
              type="button"
              className="absolute right-2 top-1.5 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Bersihkan pencarian"
              title="Bersihkan pencarian"
              onClick={() => setSearch("")}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 rounded-2xl bg-slate-100 p-1 lg:max-w-sm lg:rounded-md">
          {typeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition lg:rounded-md ${
                type === option.value ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
              }`}
              onClick={() => applyType(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className="mt-3 block">
          <span className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">Akun</span>
          <select
            className="input"
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            aria-label="Filter berdasarkan akun"
          >
            <option value="">Semua akun</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>{accountOptionLabel(account, { language })}</option>
            ))}
          </select>
        </label>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <DateFilterPicker label="Dari" value={fromDate} onChange={setFromDate} language={language} />
          <DateFilterPicker label="Sampai" value={toDate} onChange={setToDate} language={language} align="right" />
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
          <p className="text-[11px] font-bold text-slate-400">Export</p>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50" onClick={() => exportFile("csv")}><Download size={13} /> CSV</button>
            <button className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50" onClick={() => exportFile("excel")}><FileSpreadsheet size={13} /> Excel</button>
          </div>
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="sticky top-16 z-20 rounded-[22px] border border-emerald-100 bg-white/95 p-3 shadow-soft backdrop-blur lg:top-20 lg:rounded-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-950">{selectedCount} dipilih</p>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">Tap transaksi lain untuk tambah pilihan.</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                onClick={clearSelection}
              >
                Batal
              </button>
              <button
                type="button"
                className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-[#16A34A] transition hover:bg-emerald-100"
                onClick={allVisibleSelected ? clearSelection : selectAllVisible}
              >
                {allVisibleSelected ? "Batal semua" : "Pilih semua"}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-600"
                onClick={deleteSelected}
              >
                <Trash2 size={13} /> Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {!loading && rows.length > 0 && selectedCount === 0 && (
        <div className="overflow-x-auto rounded-[20px] border border-white/80 bg-white/85 px-3 py-2 shadow-soft backdrop-blur lg:rounded-lg">
          <div className="flex min-w-max items-center gap-2 text-[11px] font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[#16A34A]">
              <ChevronRight size={12} /> Tap detail
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
              <CheckCircle2 size={12} /> Tahan pilih
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-rose-500">
              <ArrowLeft size={12} /> Swipe hapus
            </span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading ? <LoadingState /> : loadError ? <DataErrorState message={loadError} onRetry={() => { load().catch(() => undefined); }} /> : rows.length === 0 ? <EmptyState text="Tidak ada transaksi." /> : (
          groupedRows.map((group) => (
            <section key={group.key} className="overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-soft lg:rounded-lg lg:border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-950">{group.label}</h3>
                  <p className="text-xs font-semibold text-slate-500">{group.rows.length} transaksi</p>
                </div>
                <p className={`text-sm font-semibold ${group.net >= 0 ? "text-[#16A34A]" : "text-slate-900"}`}>
                  {group.net >= 0 ? "+" : "-"}{rupiah(Math.abs(group.net))}
                </p>
              </div>
              <div className="divide-y divide-slate-100">
                {group.rows.map((row) => (
                  <div
                    key={row.id}
                    ref={(node) => {
                      if (node) {
                        transactionRefs.current.set(row.id, node);
                      } else {
                        transactionRefs.current.delete(row.id);
                      }
                    }}
                    className={`transition ${highlightedTransactionId === row.id ? "bg-emerald-50 ring-2 ring-emerald-200" : "bg-white"}`}
                  >
                    <TransactionHistoryItem
                      row={row}
                      onOpen={() => onOpen(row.id)}
                      onRemove={row.canManage === false ? undefined : () => remove(row.id)}
                      selected={selectedIds.has(row.id)}
                      selectionMode={selectedCount > 0}
                      onToggleSelect={row.canManage === false ? undefined : () => toggleSelected(row.id)}
                      onLongPress={row.canManage === false ? undefined : () => toggleSelected(row.id)}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </section>
  );
}

type ManageTab = "budgets" | "accounts" | "categories" | "schedules";
type BudgetRow = {
  id: string;
  categoryId: string;
  category: string;
  month: number;
  year: number;
  budgetAmount: string;
  used: string;
  remaining: string;
  usagePercent: string;
  status: string;
};

function moneyValue(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function accountTypeLabel(type: string) {
  const labels: Record<string, string> = {
    cash: "Tunai",
    bank: "Rekening",
    e_wallet: "E-wallet",
    credit_card: "Kartu kredit",
    other: "Lainnya"
  };
  return labels[type] ?? type;
}

function accountSharedLabel(account: Account, language: AppLanguage = "id") {
  if (account.isRelationshipGoalAccount) return language === "en" ? "shared account" : "account bersama";
  if (account.isSharedWalletAccount) return language === "en" ? "shared wallet" : "dompet bersama";
  return "";
}

function accountOptionLabel(account: Account, options: { balance?: boolean; language?: AppLanguage } = {}) {
  const balance = options.balance ? ` - ${rupiah(account.currentBalance)}` : "";
  const shared = accountSharedLabel(account, options.language);
  return `${account.name}${balance}${shared ? ` (${shared})` : ""}`;
}

function accountTypeIcon(type: string): LucideIcon {
  const icons: Record<string, LucideIcon> = {
    cash: Banknote,
    bank: Landmark,
    e_wallet: Smartphone,
    credit_card: CreditCard,
    other: Wallet
  };
  return icons[type] ?? Wallet;
}

const pocketBankOptions = [
  "BCA",
  "Mandiri",
  "BRI",
  "BNI",
  "CIMB Niaga",
  "Danamon",
  "PermataBank",
  "Maybank",
  "OCBC",
  "Panin Bank",
  "Bank Mega",
  "BTN",
  "Bank Syariah Indonesia",
  "Jago",
  "SeaBank",
  "blu by BCA Digital",
  "Bank Neo Commerce",
  "Allo Bank"
];

const pocketEWalletOptions = [
  "GoPay",
  "OVO",
  "DANA",
  "ShopeePay",
  "LinkAja",
  "Sakuku",
  "Jenius Pay",
  "i.saku",
  "AstraPay",
  "Doku Wallet"
];

const pocketEMoneyOptions = [
  "Flazz BCA",
  "Mandiri e-money",
  "BNI TapCash",
  "BRI BRIZZI",
  "JakCard",
  "MegaCash",
  "KMT KAI Commuter",
  "Nobu e-money"
];

const pocketCardColors = ["#16A34A", "#0F766E", "#111827", "#2563EB", "#7C3AED", "#E11D48"];
const pocketVisualStorageKey = "finance-ai-pocket-visuals";

type PocketVisual = {
  logo: string;
  background: string;
};

function loadPocketVisuals(): Record<string, PocketVisual> {
  try {
    return JSON.parse(window.localStorage.getItem(pocketVisualStorageKey) || "{}") as Record<string, PocketVisual>;
  } catch {
    return {};
  }
}

function savePocketVisuals(visuals: Record<string, PocketVisual>) {
  window.localStorage.setItem(pocketVisualStorageKey, JSON.stringify(visuals));
}

function splitAccountNumberHolder(value?: string | null) {
  const [number = "", holder = ""] = String(value ?? "").split(" � ");
  return { number, holder };
}

function getDefaultPocketLogo(accountType: string): string {
  switch (accountType) {
    case "cash": return "💵";
    case "bank": return "🏦";
    case "e_wallet": return "📱";
    case "other": return "💳";
    case "credit_card": return "💳";
    case "savings": return "🏦";
    case "investment": return "📈";
    default: return "💰";
  }
}

function budgetTone(status: string) {
  if (status === "Aman") return "bg-emerald-50 text-[#16A34A]";
  if (status === "Peringatan") return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
}

function SectionHeader({ title, caption, action }: { title: string; caption?: string; action?: JSX.Element }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        {caption && <p className="mt-0.5 text-xs font-semibold text-slate-500">{caption}</p>}
      </div>
      {action}
    </div>
  );
}

function ManageView({
  accounts,
  categories,
  language,
  request,
  onNavigate,
  onChanged,
  onOpenAccountTransactions,
  onChildFrameStateChange
}: {
  accounts: Account[];
  categories: Category[];
  language: AppLanguage;
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onNavigate: (view: View) => void;
  onChanged: () => Promise<void>;
  onOpenAccountTransactions: (accountId: string, fromDate?: string) => void;
  onChildFrameStateChange?: (state: ChildFrameState) => void;
}) {
  const [activeTab, setActiveTab] = useState<ManageTab | null>(null);
  const [quickCreate, setQuickCreate] = useState<ManageTab | null>(null);
  const [viewVersion, setViewVersion] = useState(0);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [budgetCount, setBudgetCount] = useState(0);
  const [scheduleCount, setScheduleCount] = useState(0);

  useEffect(() => {
    Promise.all([
      request<BudgetRow[]>("/budgets").catch(() => []),
      request<Schedule[]>("/schedules").catch(() => [])
    ]).then(([budgets, schedules]) => {
      setBudgetCount(budgets.length);
      setScheduleCount(schedules.length);
    });
  }, [accounts, categories]);

  const isEnglish = language === "en";
  const tabs: Array<{ id: ManageTab; label: string; icon: LucideIcon; count: string; meta: string; tone: string }> = [
    { id: "accounts", label: isEnglish ? "Accounts" : "Akun", icon: CreditCard, count: `${accounts.length} ${isEnglish ? "accounts" : "akun"}`, meta: isEnglish ? "Bank, cash, and e-wallet" : "Rekening, tunai, dan e-wallet", tone: "bg-sky-50 text-sky-700" },
    { id: "categories", label: isEnglish ? "Categories" : "Kategori", icon: Tags, count: `${categories.length} ${isEnglish ? "categories" : "kategori"}`, meta: isEnglish ? "Income and expense groups" : "Kelompok pemasukan dan pengeluaran", tone: "bg-violet-50 text-violet-700" },
    { id: "budgets", label: isEnglish ? "Budgets" : "Budget", icon: CircleDollarSign, count: `${budgetCount} ${isEnglish ? "active" : "aktif"}`, meta: isEnglish ? "Monthly spending limits" : "Batas pengeluaran bulanan", tone: "bg-emerald-50 text-[#16A34A]" },
    { id: "schedules", label: isEnglish ? "Schedules" : "Jadwal", icon: Bell, count: `${scheduleCount} ${isEnglish ? "reminders" : "pengingat"}`, meta: isEnglish ? "Recurring payments and transactions" : "Pembayaran dan transaksi rutin", tone: "bg-amber-50 text-amber-700" }
  ];

  const openSection = (id: ManageTab, create = false) => {
    setActiveTab(id);
    setQuickCreate(create ? id : null);
    setShowQuickActions(false);
    setViewVersion((current) => current + 1);
  };

  useEffect(() => {
    onChildFrameStateChange?.({
      active: activeTab !== null,
      onBack: activeTab
        ? () => {
            setActiveTab(null);
            setQuickCreate(null);
            setShowQuickActions(false);
          }
        : null,
      onRefresh: async () => {
        await onChanged();
        setViewVersion((current) => current + 1);
      }
    });
  }, [activeTab, onChanged, onChildFrameStateChange]);

  if (activeTab) {
    const activeItem = tabs.find((item) => item.id === activeTab)!;
    const ActiveIcon = activeItem.icon;
    return (
      <section className="mx-auto max-w-6xl space-y-3 lg:space-y-5">
        <div className="flex items-center justify-between rounded-[20px] border border-slate-100 bg-white p-3 shadow-soft lg:rounded-lg">
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-xl px-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 active:scale-95"
            onClick={() => {
              setActiveTab(null);
              setQuickCreate(null);
            }}
          >
            <ArrowLeft size={16} /> {isEnglish ? "Back to Settings" : "Kembali ke Atur"}
          </button>
          <div className="flex min-w-0 items-center gap-2">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${activeItem.tone}`}>
              <ActiveIcon size={17} />
            </span>
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-semibold text-slate-950">{activeItem.label}</p>
              <p className="text-[10px] text-slate-500">{activeItem.count}</p>
            </div>
          </div>
        </div>

        {activeTab === "budgets" && (
          <BudgetsView
            key={`budgets-${viewVersion}`}
            categories={categories}
            request={request}
            onChanged={onChanged}
            initialView={quickCreate === "budgets" ? "form" : "list"}
          />
        )}
        {activeTab === "accounts" && (
          <AccountsView
            key={`accounts-${viewVersion}`}
            accounts={accounts}
            request={request}
            onChanged={onChanged}
            onOpenTransactions={onOpenAccountTransactions}
            initialView={quickCreate === "accounts" ? "account-form" : "list"}
            language={language}
          />
        )}
        {activeTab === "categories" && (
          <CategoriesView
            key={`categories-${viewVersion}`}
            categories={categories}
            request={request}
            onChanged={onChanged}
            initialView={quickCreate === "categories" ? "form" : "list"}
          />
        )}
        {activeTab === "schedules" && (
          <SchedulesView
            key={`schedules-${viewVersion}`}
            accounts={accounts}
            categories={categories}
            request={request}
            onNavigate={onNavigate}
            onTransfer={() => openSection("accounts")}
            initialView={quickCreate === "schedules" ? "form" : "list"}
          />
        )}
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl space-y-3 lg:space-y-5">
      <div className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-soft lg:rounded-lg">
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase text-[#16A34A]">{isEnglish ? "Settings" : "Atur"}</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">{isEnglish ? "Finance & reminders" : "Keuangan & pengingat"}</h2>
            <p className="mt-1 text-xs text-slate-500">{isEnglish ? "All essential settings in one place." : "Semua pengaturan penting dalam satu tempat."}</p>
          </div>
          <button
            type="button"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[#16A34A] px-3.5 text-xs font-semibold text-white shadow-sm transition active:scale-95"
            onClick={() => setShowQuickActions((current) => !current)}
            aria-expanded={showQuickActions}
          >
            <Plus size={16} /> {isEnglish ? "Add" : "Tambah"}
          </button>
          {showQuickActions && (
            <div className="absolute right-0 top-12 z-20 w-52 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
              {tabs.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.id} type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]" onClick={() => openSection(item.id, true)}>
                    <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${item.tone}`}><Icon size={16} /></span>
                    {isEnglish ? "Add" : "Tambah"} {item.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`ripple-card flex min-h-[88px] items-center gap-3 rounded-[18px] border p-3 text-left transition lg:rounded-md ${
                  active ? "border-emerald-200 bg-emerald-50/70" : "border-slate-100 bg-white hover:border-emerald-100 hover:bg-slate-50"
                }`}
                onClick={() => openSection(tab.id)}
              >
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tab.tone}`}>
                  <Icon size={23} strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-semibold text-slate-950">{tab.label}</span>
                    <span className="max-w-[110px] shrink-0 truncate rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{tab.count}</span>
                  </span>
                  <span className="mt-1 block truncate text-[11px] text-slate-500">{tab.meta}</span>
                </span>
                <ChevronRight size={19} className="shrink-0 text-slate-300" />
              </button>
            );
          })}
        </div>
      </div>

    </section>
  );
}

function scheduleTone(status: Schedule["reminderStatus"]) {
  if (status === "overdue") return "bg-rose-50 text-rose-700";
  if (status === "soon") return "bg-amber-50 text-amber-700";
  return "bg-emerald-50 text-[#16A34A]";
}

function SchedulesView({
  accounts,
  categories,
  request,
  onNavigate,
  onTransfer,
  initialView = "list"
}: {
  accounts: Account[];
  categories: Category[];
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onNavigate: (view: View) => void;
  onTransfer: () => void;
  initialView?: "list" | "form";
}) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [scheduleView, setScheduleView] = useState<"list" | "form">(initialView);
  const expenseCategories = categories.filter((category) => category.categoryType === "expense");

  const load = async () => {
    setLoading(true);
    try {
      setSchedules(await request<Schedule[]>("/schedules"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load().catch(console.error); }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await request(editingSchedule ? `/schedules/${editingSchedule.id}` : "/schedules", {
        method: editingSchedule ? "PUT" : "POST",
        body: JSON.stringify({
          title: String(form.get("title")),
          scheduleType: String(form.get("scheduleType")),
          dueDay: Number(form.get("dueDay")),
          nextDueDate: String(form.get("nextDueDate")),
          amount: String(form.get("amount") || "") || null,
          accountId: String(form.get("accountId") || "") || null,
          destinationAccountId: String(form.get("destinationAccountId") || "") || null,
          categoryId: String(form.get("categoryId") || "") || null,
          paymentMethod: String(form.get("paymentMethod") || "") || null,
          notes: String(form.get("notes") || "") || null
        })
      });
      formElement.reset();
      setEditingSchedule(null);
      await load();
      setScheduleView("list");
    } catch {
      setError(null);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Hapus jadwal ini?")) return;
    await request(`/schedules/${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="space-y-3">
      {scheduleView === "list" && (
      <section className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200">
        <SectionHeader
          title="Jadwal & pemberitahuan"
          caption="Pengingat pembayaran, top up, atau transfer rutin."
          action={(
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#16A34A]"
              onClick={() => {
                setError(null);
                setEditingSchedule(null);
                setScheduleView("form");
              }}
            >
              <Plus size={14} /> Tambah
            </button>
          )}
        />
        {loading ? <LoadingState /> : schedules.length === 0 ? (
          <EmptyState text="Belum ada jadwal. Tambahkan pengingat rutin pertama Anda." />
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {schedules.map((schedule) => (
              <article key={schedule.id} className="rounded-2xl border border-slate-100 bg-white px-3 py-3 lg:rounded-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{schedule.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {localDate(schedule.nextDueDate)} {schedule.amount ? `- ${rupiah(schedule.amount)}` : ""}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${scheduleTone(schedule.reminderStatus)}`}>
                    {schedule.reminderStatus === "overdue" ? "Lewat" : schedule.reminderStatus === "soon" ? `${schedule.daysUntilDue} hari` : "Aktif"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {schedule.scheduleType === "transfer" || schedule.scheduleType === "topup"
                    ? `${schedule.accountName ?? "Akun"} ke ${schedule.destinationAccountName ?? "tujuan"}`
                    : `${schedule.categoryName ?? "Transaksi"} dari ${schedule.accountName ?? "akun"}`}
                </p>
                <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2">
                  <button
                    type="button"
                    className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-[#16A34A] transition hover:bg-emerald-100"
                    onClick={() => schedule.scheduleType === "transaction" ? onNavigate("manual") : onTransfer()}
                  >
                    Buat sekarang
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-[#16A34A]"
                    onClick={() => {
                      setError(null);
                      setEditingSchedule(schedule);
                      setScheduleView("form");
                    }}
                    aria-label={`Edit jadwal ${schedule.title}`}
                  >
                    <Settings size={13} />
                  </button>
                  <button type="button" className="rounded-full bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600" onClick={() => remove(schedule.id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      )}

      {scheduleView === "form" && (
      <form key={editingSchedule?.id ?? "new-schedule"} className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200" onSubmit={submit}>
        <SectionHeader
          title={editingSchedule ? "Edit jadwal" : "Tambah jadwal"}
          caption={editingSchedule ? "Sesuaikan pengingat dan detail transaksi terjadwal." : "Contoh: bayar SPP tiap tanggal 1 atau top up GoPay."}
          action={(
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
              onClick={() => {
                setEditingSchedule(null);
                setError(null);
                setScheduleView("list");
              }}
            >
              <ArrowLeft size={14} /> Kembali
            </button>
          )}
        />
        <div className="space-y-3">
          <Field label="Judul">
            <input className="input" name="title" placeholder="Bayar SPP sekolah" defaultValue={editingSchedule?.title ?? ""} required />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Tipe">
              <select className="input" name="scheduleType" defaultValue={editingSchedule?.scheduleType ?? "transaction"}>
                <option value="transaction">Transaksi</option>
                <option value="transfer">Transfer</option>
                <option value="topup">Top up</option>
              </select>
            </Field>
            <Field label="Tanggal rutin">
              <input className="input" name="dueDay" type="number" min={1} max={31} defaultValue={editingSchedule?.dueDay ?? 1} required />
            </Field>
          </div>
          <Field label="Jatuh tempo berikutnya">
            <input className="input" name="nextDueDate" type="date" defaultValue={editingSchedule?.nextDueDate ? isoDateInput(new Date(editingSchedule.nextDueDate)) : isoDateInput()} required />
          </Field>
          <Field label="Nominal">
            <input className="input" name="amount" inputMode="numeric" placeholder="Opsional" defaultValue={moneyInputValue(editingSchedule?.amount)} onInput={handleMoneyInput} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Akun sumber">
              <select className="input" name="accountId" defaultValue={editingSchedule?.accountId ?? ""}>
                <option value="">Pilih akun</option>
                {accounts.map((account) => <option key={account.id} value={account.id}>{accountOptionLabel(account)}</option>)}
              </select>
            </Field>
            <Field label="Akun tujuan">
              <select className="input" name="destinationAccountId" defaultValue={editingSchedule?.destinationAccountId ?? ""}>
                <option value="">Opsional</option>
                {accounts.map((account) => <option key={account.id} value={account.id}>{accountOptionLabel(account)}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Kategori">
            <select className="input" name="categoryId" defaultValue={editingSchedule?.categoryId ?? ""}>
              <option value="">Opsional</option>
              {expenseCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </Field>
          <input className="input" name="paymentMethod" placeholder="Metode pembayaran, misalnya BCA atau GoPay" defaultValue={editingSchedule?.paymentMethod ?? ""} />
          <input className="input" name="notes" placeholder="Catatan singkat" defaultValue={editingSchedule?.notes ?? ""} />
          <button className="btn-primary w-full"><Bell size={16} /> {editingSchedule ? "Simpan perubahan" : "Simpan jadwal"}</button>
          {error && <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 lg:rounded-md">{error}</p>}
        </div>
      </form>
      )}
    </div>
  );
}

function AccountsView({
  accounts,
  request,
  onChanged,
  onAddTransaction,
  onOpenTransactions,
  initialView = "list",
  resetKey = 0,
  language = "id"
}: {
  accounts: Account[];
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onChanged: () => Promise<void>;
  onAddTransaction?: (accountId: string) => void;
  onOpenTransactions: (accountId: string, fromDate?: string) => void;
  initialView?: "list" | "account-form" | "transfer-form";
  resetKey?: number;
  language?: AppLanguage;
}) {
  const [error, setError] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountView, setAccountView] = useState<"list" | "account-form" | "transfer-form" | "pocket-detail">(initialView);
  const [pocketTab, setPocketTab] = useState<"mine" | "shared">("mine");
  const [pocketSearch, setPocketSearch] = useState("");
  const [pocketOrder, setPocketOrder] = useState<string[]>([]);
  const draggedPocketIdRef = useRef<string | null>(null);
  const [selectedPocketId, setSelectedPocketId] = useState("");
  const [pocketTransactionSearch, setPocketTransactionSearch] = useState("");
  const [pocketTransactionType, setPocketTransactionType] = useState<"all" | "income" | "expense">("all");
  const [targetBalanceDraft, setTargetBalanceDraft] = useState("");
  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteSearchResults, setInviteSearchResults] = useState<Array<{id:string;fullName:string;username:string;email:string;avatarUrl:string|null;phone:string|null;relationshipStatus:string}>>([]);
  const [inviteSearchLoading, setInviteSearchLoading] = useState(false);
  const [inviteSelectedUser, setInviteSelectedUser] = useState<{id:string;fullName:string;username:string;email:string;avatarUrl:string|null} | null>(null);
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [scanQrOpen, setScanQrOpen] = useState(false);
  const [qrScannerError, setQrScannerError] = useState<string | null>(null);
  const [hasTargetBalance, setHasTargetBalance] = useState(false);
  const [hasAutoBudgeting, setHasAutoBudgeting] = useState(false);
  const [pocketNameDraft, setPocketNameDraft] = useState("");
  const [pocketTypeDraft, setPocketTypeDraft] = useState<"cash" | "bank" | "e_wallet" | "e_money">("bank");
  const [pocketInitialBalanceDraft, setPocketInitialBalanceDraft] = useState("");
  const [pocketProviderDraft, setPocketProviderDraft] = useState("");
  const [pocketNumberDraft, setPocketNumberDraft] = useState("");
  const [pocketHolderDraft, setPocketHolderDraft] = useState("");
  const [pocketLogoDraft, setPocketLogoDraft] = useState("??");
  const [pocketBackgroundDraft, setPocketBackgroundDraft] = useState("#16A34A");
  const pocketCameraInputRef = useRef<HTMLInputElement>(null);
  const pocketGalleryInputRef = useRef<HTMLInputElement>(null);
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [destinationAccountId, setDestinationAccountId] = useState("");
  const [transferAttachmentId, setTransferAttachmentId] = useState<string | null>(null);
  const [transferAttachmentName, setTransferAttachmentName] = useState("");
  const [transferAttachmentLoading, setTransferAttachmentLoading] = useState(false);
  const [transferAttachmentMessage, setTransferAttachmentMessage] = useState<string | null>(null);
  const [transferText, setTransferText] = useState("");
  const [transferParseLoading, setTransferParseLoading] = useState(false);
  const [transferAnalysisStep, setTransferAnalysisStep] = useState(-1);
  const [transferParsed, setTransferParsed] = useState(false);
  const [transferDraft, setTransferDraft] = useState({
    amount: "",
    feeAmount: "",
    transferDate: isoDateInput(),
    notes: ""
  });
  const transferFormFieldsRef = useRef<HTMLDivElement>(null);
  const [resettingAccount, setResettingAccount] = useState(false);
  const transferableAccounts = useMemo(
    () => accounts.filter((account) => !account.isSharedWalletAccount && account.canEdit !== false),
    [accounts]
  );
  const sourceAccount = accounts.find((account) => account.id === sourceAccountId);
  const destinationAccount = accounts.find((account) => account.id === destinationAccountId);
  const totalBalance = accounts.reduce(
    (sum, account) => sum + (account.accountType === "credit_card" ? -moneyValue(account.currentBalance) : moneyValue(account.currentBalance)),
    0
  );
  const myPockets = accounts.filter((account) => account.canEdit !== false && !account.isSharedWalletAccount);
  const sharedPockets = accounts.filter((account) => account.canEdit === false || account.isRelationshipGoalAccount || account.isSharedWalletAccount);
  const visiblePocketSource = pocketTab === "mine" ? myPockets : sharedPockets;
  const orderedPocketSource = [...visiblePocketSource].sort((a, b) => {
    const aIndex = pocketOrder.indexOf(a.id);
    const bIndex = pocketOrder.indexOf(b.id);
    return (aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex) - (bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex);
  });
  const visiblePockets = orderedPocketSource.filter((account) => {
    const query = pocketSearch.trim().toLowerCase();
    if (!query) return true;
    return [account.name, account.providerName, account.accountNumber, account.accountType].filter(Boolean).join(" ").toLowerCase().includes(query);
  });
  const myPocketTotal = myPockets.reduce((sum, account) => sum + moneyValue(account.currentBalance), 0);
  const sharedPocketTotal = sharedPockets.reduce((sum, account) => sum + moneyValue(account.currentBalance), 0);
  const selectedPocket = accounts.find((account) => account.id === selectedPocketId) ?? null;

  useEffect(() => {
    setAccountView(initialView);
  }, [initialView, resetKey]);

  useEffect(() => {
    setPocketOrder((current) => {
      const known = new Set(accounts.map((account) => account.id));
      const kept = current.filter((id) => known.has(id));
      const missing = accounts.map((account) => account.id).filter((id) => !kept.includes(id));
      return [...kept, ...missing];
    });
  }, [accounts]);

  useEffect(() => {
    if (accountView !== "transfer-form") return;
    setError(null);
    setTransferText("");
    setTransferParsed(false);
    setTransferAnalysisStep(-1);
    setTransferDraft({ amount: "", feeAmount: "", transferDate: isoDateInput(), notes: "" });
    setTransferAttachmentId(null);
    setTransferAttachmentName("");
    setTransferAttachmentMessage(null);
  }, [accountView, resetKey]);

  useEffect(() => {
    if (accountView !== "account-form") return;
    const accountNumberParts = splitAccountNumberHolder(editingAccount?.accountNumber);
    const savedType = editingAccount?.accountType;
    setPocketNameDraft(editingAccount?.name ?? "");
    setPocketTypeDraft(savedType === "cash" || savedType === "bank" || savedType === "e_wallet" ? savedType : "e_money");
    setPocketInitialBalanceDraft(editingAccount ? moneyInputValue(editingAccount.initialBalance) : "");
    setPocketProviderDraft(editingAccount?.providerName ?? "");
    setPocketNumberDraft(accountNumberParts.number);
    setPocketHolderDraft(accountNumberParts.holder);
    // Gunakan logo dan background dari server jika tersedia, jika tidak gunakan localStorage atau default
    const visuals = loadPocketVisuals();
    const accountVisual = editingAccount?.logo ? { logo: editingAccount.logo, background: editingAccount.background } : visuals[editingAccount?.id ?? ""];
    setPocketLogoDraft(accountVisual?.logo || getDefaultPocketLogo(savedType || "bank"));
    setPocketBackgroundDraft(accountVisual?.background || "#16A34A");
  }, [accountView, editingAccount?.id, editingAccount?.accountNumber, editingAccount?.accountType, editingAccount?.initialBalance, editingAccount?.name, editingAccount?.providerName, editingAccount?.logo, editingAccount?.background]);

  const movePocket = (fromId: string, toId: string) => {
    if (!fromId || fromId === toId) return;
    setPocketOrder((current) => {
      const base = current.length ? current : accounts.map((account) => account.id);
      const next = [...base];
      const fromIndex = next.indexOf(fromId);
      const toIndex = next.indexOf(toId);
      if (fromIndex === -1 || toIndex === -1) return current;
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  useEffect(() => {
    if (!transferableAccounts.length) {
      setSourceAccountId("");
      setDestinationAccountId("");
      return;
    }

    setSourceAccountId((current) => transferableAccounts.some((account) => account.id === current) ? current : transferableAccounts[0].id);
    setDestinationAccountId((current) => {
      if (transferableAccounts.some((account) => account.id === current && account.id !== sourceAccountId)) return current;
      return transferableAccounts.find((account) => account.id !== sourceAccountId)?.id ?? transferableAccounts[0].id;
    });
  }, [transferableAccounts, sourceAccountId]);

  const uploadTransferAttachment = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setTransferAttachmentLoading(true);
    setTransferAttachmentName(file.name);
    setTransferAttachmentMessage("Mengunggah attachment...");
    setError(null);

    try {
      const uploadForm = new FormData();
      uploadForm.set("receipt", file);
      try {
        const uploaded = await request<{ id: string }>("/receipts/upload", { method: "POST", body: uploadForm });
        setTransferAttachmentId(uploaded.id);
      } catch (err) {
        const duplicateId = err instanceof ApiError && err.status === 409 && err.details && typeof err.details === "object"
          ? String((err.details as { receiptId?: unknown }).receiptId ?? "")
          : "";
        if (!duplicateId) throw err;
        setTransferAttachmentId(duplicateId);
      }
      setTransferAttachmentMessage("Attachment berhasil diunggah.");
    } catch {
      setTransferAttachmentId(null);
      setTransferAttachmentMessage("Attachment gagal diunggah. Pastikan file berupa gambar atau video.");
    } finally {
      setTransferAttachmentLoading(false);
      event.target.value = "";
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const selectedPocketType = pocketTypeDraft;
    const accountNumber = pocketNumberDraft.trim();
    const accountHolderName = pocketHolderDraft.trim();
    const accountNumberPayload = accountHolderName && selectedPocketType !== "e_money" ? `${accountNumber} � ${accountHolderName}` : accountNumber;
    try {
      const payload = {
        name: pocketNameDraft.trim(),
        accountType: selectedPocketType === "e_money" ? "other" : selectedPocketType,
        initialBalance: String(form.get("initialBalance") || pocketInitialBalanceDraft),
        currency: "IDR",
        providerName: selectedPocketType === "cash" ? null : pocketProviderDraft.trim() || null,
        accountNumber: selectedPocketType === "cash" ? null : accountNumberPayload || null,
        allowNegative: false,
        logo: pocketLogoDraft || null,
        background: pocketBackgroundDraft || null
      };
      const saved = await request<{ id: string }>(editingAccount ? `/accounts/${editingAccount.id}` : "/accounts", {
        method: editingAccount ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });
      const pocketId = editingAccount?.id ?? saved.id;
      if (pocketId) {
        const visuals = loadPocketVisuals();
        visuals[pocketId] = { logo: pocketLogoDraft, background: pocketBackgroundDraft };
        savePocketVisuals(visuals);
      }
      formElement.reset();
      setEditingAccount(null);
      await onChanged();
      setAccountView("list");
    } catch {
      setError(null);
    }
  };

  const handlePocketImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPocketLogoDraft(reader.result);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const resetAccount = async (form: HTMLFormElement) => {
    if (!editingAccount) return;
    const formData = new FormData(form);
    const initialBalance = String(formData.get("initialBalance") || "0");
    const confirmed = window.confirm(
      `Reset akun ${editingAccount.name}?\n\nSemua transaksi dan transfer terkait akun ini akan dihapus permanen. Saldo akun akan dimulai lagi dari saldo awal yang tertera.`
    );
    if (!confirmed) return;

    setResettingAccount(true);
    setError(null);
    try {
      await request(`/accounts/${editingAccount.id}/reset`, {
        method: "POST",
        body: JSON.stringify({ initialBalance })
      });
      setEditingAccount(null);
      await onChanged();
      setAccountView("list");
    } catch {
      setError(null);
    } finally {
      setResettingAccount(false);
    }
  };

  const transfer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await request("/transfers", {
        method: "POST",
        body: JSON.stringify({
          sourceAccountId: String(form.get("sourceAccountId")),
          destinationAccountId: String(form.get("destinationAccountId")),
          amount: String(form.get("amount")),
          feeAmount: String(form.get("feeAmount") || "0"),
          transferDate: dateFilterIso(String(form.get("transferDate")), "start"),
          notes: String(form.get("notes") || "") || null,
          receiptId: transferAttachmentId
        })
      });
      formElement.reset();
      setTransferAttachmentId(null);
      setTransferAttachmentName("");
      setTransferAttachmentMessage(null);
      setTransferText("");
      setTransferDraft({ amount: "", feeAmount: "", transferDate: isoDateInput(), notes: "" });
      await onChanged();
      setAccountView("list");
    } catch {
      setError(null);
    }
  };

  const parseTransferQuickAdd = async () => {
    const text = transferText.trim();
    if (!text) {
      setError("Tulis transfer dulu, misalnya: transfer BCA ke GoPay 300rb fee 2.500");
      return;
    }
    setTransferParseLoading(true);
    setTransferAnalysisStep(0);
    setError(null);
    try {
      const progressTimer = window.setInterval(() => {
        setTransferAnalysisStep((current) => Math.min(current + 1, 3));
      }, 260);
      await new Promise((resolve) => window.setTimeout(resolve, 1050));
      window.clearInterval(progressTimer);
      setTransferAnalysisStep(3);
      const lower = text.toLowerCase();
      const amounts = Array.from(text.matchAll(/(?:rp\s*)?(\d+(?:[.,]\d+)?)(?:\s*(rb|ribu|k|jt|juta|mio|m))?/gi))
        .map((match) => {
          const raw = match[0];
          const value = Number(match[1].replace(",", "."));
          const suffix = (match[2] ?? "").toLowerCase();
          const multiplier = ["jt", "juta", "mio", "m"].includes(suffix) ? 1_000_000 : ["rb", "ribu", "k"].includes(suffix) ? 1_000 : 1;
          return { raw, value: Math.round(value * multiplier) };
        })
        .filter((item) => Number.isFinite(item.value) && item.value > 0);
      const feeMatch = lower.match(/(?:fee|admin|biaya admin)\s*(?:rp\s*)?(\d+(?:[.,]\d+)?)(?:\s*(rb|ribu|k))?/i);
      const feeAmount = feeMatch
        ? formatRupiahInput(Math.round(Number(feeMatch[1].replace(",", ".")) * (feeMatch[2] ? 1000 : 1)))
        : "";
      const mainAmount = amounts.find((item) => !feeMatch || !item.raw.toLowerCase().includes(feeMatch[1])) ?? amounts[0];
      const cleanAccountSegment = (segment: string) => segment
        .replace(/\b(?:transfer|kirim|pindah|tarik|dari|from|ke|to|rp|fee|admin|biaya|biaya admin)\b/gi, " ")
        .replace(/\d+(?:[.,]\d+)?\s*(?:rb|ribu|k|jt|juta|mio|m)?/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
      const accountTokens = (account: Account) => {
        const values = [account.name, account.providerName, account.accountNumber].filter(Boolean).map((value) => String(value).toLowerCase());
        return Array.from(new Set(values.flatMap((value) => {
          const parts = value.split(/\s+/).filter((part) => part.length >= 3 && !["bank", "rekening", "akun"].includes(part));
          return [value, ...parts];
        }))).sort((a, b) => b.length - a.length);
      };
      const findAccountInSegment = (segment: string, exceptId = "") => {
        const cleaned = cleanAccountSegment(segment).toLowerCase();
        if (!cleaned) return undefined;
        return transferableAccounts.find((account) => {
          if (account.id === exceptId) return false;
          return accountTokens(account).some((token) => cleaned.includes(token));
        });
      };
      const directionMatch = lower.match(/(?:transfer|kirim|pindah|tarik)?\s*(?:dari\s+)?(.+?)\s+(?:ke|to)\s+(.+?)(?=\s+(?:rp|\d|fee|admin|biaya)|$)/i);
      const fromToMatch = lower.match(/(?:dari|from)\s+(.+?)\s+(?:ke|to)\s+(.+?)(?=\s+(?:rp|\d|fee|admin|biaya)|$)/i);
      const sourceSegment = fromToMatch?.[1] ?? directionMatch?.[1] ?? "";
      const destinationSegment = fromToMatch?.[2] ?? directionMatch?.[2] ?? "";
      const source = sourceSegment
        ? findAccountInSegment(sourceSegment)
        : transferableAccounts.find((account) => accountTokens(account).some((token) => lower.includes(token)));
      const destination = destinationSegment
        ? findAccountInSegment(destinationSegment, source?.id)
        : transferableAccounts.find((account) => account.id !== source?.id && accountTokens(account).some((token) => lower.includes(token)));
      const nextSourceId = source?.id ?? sourceAccountId;
      const nextDestinationId = destination?.id && destination.id !== nextSourceId ? destination.id : destinationAccountId;
      if (nextSourceId) setSourceAccountId(nextSourceId);
      if (nextDestinationId && nextDestinationId !== nextSourceId) setDestinationAccountId(nextDestinationId);
      setTransferParsed(true);
      setTransferDraft({
        amount: mainAmount ? formatRupiahInput(mainAmount.value) : transferDraft.amount,
        feeAmount,
        transferDate: isoDateInput(),
        notes: text
      });
      window.setTimeout(() => {
        transferFormFieldsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    } finally {
      setTransferParseLoading(false);
      window.setTimeout(() => setTransferAnalysisStep(-1), 350);
    }
  };

  return (
    <div className="space-y-3">
      {accountView === "list" && (
        <section className="space-y-3">
          <div className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200">
            <SectionHeader
              title="Pocket"
              caption={pocketTab === "mine" ? `${myPockets.length} pocket pribadi` : `${sharedPockets.length} shared pocket`}
              action={pocketTab === "mine" ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full bg-[#16A34A] px-3 py-1.5 text-xs font-semibold text-white"
                  onClick={() => {
                    setError(null);
                    setEditingAccount(null);
                    setAccountView("account-form");
                  }}
                >
                  <Plus size={14} /> Add Pocket
                </button>
              ) : undefined}
            />
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#F8FAFC] p-1">
              {[
                { id: "mine" as const, label: "My Pockets", total: myPocketTotal },
                { id: "shared" as const, label: "Shared with me", total: sharedPocketTotal }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`rounded-xl px-3 py-2 text-left transition ${pocketTab === item.id ? "bg-white text-[#16A34A] shadow-sm" : "text-slate-500"}`}
                  onClick={() => setPocketTab(item.id)}
                >
                  <span className="block text-xs font-semibold">{item.label}</span>
                  <span className="mt-0.5 block text-[11px] font-semibold">{rupiah(item.total)}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
              <Search size={16} className="text-slate-400" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-slate-400"
                value={pocketSearch}
                onChange={(event) => setPocketSearch(event.target.value)}
                placeholder="Search pocket"
              />
              {pocketSearch && (
                <button type="button" className="text-slate-400" onClick={() => setPocketSearch("")}>
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {visiblePockets.length === 0 ? (
            <EmptyState text={pocketTab === "mine" ? "Belum ada pocket. Tambahkan pocket pertama Anda." : "Belum ada pocket yang dibagikan ke Anda."} />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {visiblePockets.map((account) => {
                const AccountIcon = accountTypeIcon(account.accountType);
                const sharedLabel = accountSharedLabel(account, language);
                // Ambil visual dari server, localStorage, atau gunakan warna default hijau
                const visuals = loadPocketVisuals();
                const accountVisual = account.logo ? { logo: account.logo, background: account.background } : visuals[account.id];
                const cardBackground = accountVisual?.background || "#16A34A";
                const cardLogo = accountVisual?.logo || getDefaultPocketLogo(account.accountType);
                return (
                  <button
                    key={account.id}
                    type="button"
                    draggable={pocketTab === "mine"}
                    onDragStart={() => { draggedPocketIdRef.current = account.id; }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      movePocket(draggedPocketIdRef.current ?? "", account.id);
                      draggedPocketIdRef.current = null;
                    }}
                    className="ripple-card min-h-[180px] overflow-hidden rounded-[24px] p-4 text-left text-white shadow-lg transition active:scale-[0.99] lg:rounded-lg"
                    style={{ background: `linear-gradient(135deg, ${cardBackground}, #064E3B)` }}
                    onClick={() => {
                      setSelectedPocketId(account.id);
                      setTargetBalanceDraft("");
                      setInviteQuery("");
                      setPocketTransactionSearch("");
                      setPocketTransactionType("all");
                      setAccountView("pocket-detail");
                    }}
                  >
                    <div className="absolute right-[-38px] top-[-38px] h-32 w-32 rounded-full bg-white/15" />
                    <div className="relative z-10">
                      <div className="flex items-start justify-between gap-2">
                        <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white/18 text-2xl ring-1 ring-white/25 backdrop-blur">
                          {cardLogo.startsWith("data:") ? (
                            <img src={cardLogo} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-2xl">{cardLogo}</span>
                          )}
                        </span>
                        <span className="text-[10px] font-semibold text-white/70">{pocketTab === "mine" ? "Drag" : "Shared"}</span>
                      </div>
                      <div className="mt-7">
                        <p className="truncate text-xl font-semibold">{account.name}</p>
                        <p className="mt-1 text-xs font-medium text-white/70">{accountTypeLabel(account.accountType)}{account.providerName ? ` · ${account.providerName}` : ""}</p>
                        <p className="mt-4 text-xs font-medium text-white/70">Saldo saat ini</p>
                        <p className="mt-1 text-2xl font-semibold">{rupiah(account.currentBalance)}</p>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-white/14 px-2.5 py-1 text-[10px] font-semibold backdrop-blur">{accountTypeLabel(account.accountType)}</span>
                        {sharedLabel && <span className="rounded-full bg-white/14 px-2.5 py-1 text-[9px] font-semibold backdrop-blur">{sharedLabel}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {accountView === "pocket-detail" && selectedPocket && (
        <section className="space-y-3">
          <div className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500"
                onClick={() => setAccountView("list")}
              >
                <ArrowLeft size={15} /> Back to Pocket
              </button>
              {selectedPocket.canEdit !== false && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600"
                  onClick={() => {
                    setEditingAccount(selectedPocket);
                    setAccountView("account-form");
                  }}
                >
                  <Settings size={13} /> Edit
                </button>
              )}
            </div>
            <div className="mt-4 flex items-start gap-3">
              {(() => {
                const visuals = loadPocketVisuals();
                const accountVisual = selectedPocket.logo ? { logo: selectedPocket.logo, background: selectedPocket.background } : visuals[selectedPocket.id];
                const cardBackground = accountVisual?.background || "#16A34A";
                const cardLogo = accountVisual?.logo || getDefaultPocketLogo(selectedPocket.accountType);
                return (
                  <>
                    <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${cardBackground}, #064E3B)` }}>
                      {cardLogo.startsWith("data:") ? (
                        <img src={cardLogo} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-2xl">{cardLogo}</span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-semibold text-slate-950">{selectedPocket.name}</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-950">{rupiah(selectedPocket.currentBalance)}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {[accountTypeLabel(selectedPocket.accountType), selectedPocket.providerName, selectedPocket.accountNumber].filter(Boolean).join(" � ")}
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              className="rounded-[20px] bg-white p-3 text-left shadow-soft transition active:scale-[0.99]"
              disabled={transferableAccounts.length < 2}
              onClick={() => {
                setSourceAccountId(selectedPocket.id);
                setDestinationAccountId(transferableAccounts.find((account) => account.id !== selectedPocket.id)?.id ?? "");
                setAccountView("transfer-form");
              }}
            >
              <ArrowUpRight className="text-rose-600" size={18} />
              <p className="mt-2 text-sm font-semibold">Transfer out</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Send to another pocket</p>
            </button>
            <button
              type="button"
              className="rounded-[20px] bg-white p-3 text-left shadow-soft transition active:scale-[0.99]"
              disabled={transferableAccounts.length < 2}
              onClick={() => {
                setDestinationAccountId(selectedPocket.id);
                setSourceAccountId(transferableAccounts.find((account) => account.id !== selectedPocket.id)?.id ?? "");
                setAccountView("transfer-form");
              }}
            >
              <ArrowDownLeft className="text-[#16A34A]" size={18} />
              <p className="mt-2 text-sm font-semibold">Transfer in</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Receive from another pocket</p>
            </button>
            <button
              type="button"
              className="rounded-[20px] bg-white p-3 text-left shadow-soft transition active:scale-[0.99]"
              onClick={() => onAddTransaction?.(selectedPocket.id)}
            >
              <ShoppingBag className="text-sky-700" size={18} />
              <p className="mt-2 text-sm font-semibold">New transaction</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Buy, pay, receive money</p>
            </button>
            {/* Tampilkan set target balance hanya jika pocket belum memiliki target balance */}
            {!selectedPocket.targetBalance && (
              <button
                type="button"
                className="rounded-[20px] bg-white p-3 text-left shadow-soft transition active:scale-[0.99]"
                onClick={() => setTargetBalanceDraft(targetBalanceDraft || moneyInputValue(selectedPocket.currentBalance))}
              >
                <TrendingUp className="text-violet-700" size={18} />
                <p className="mt-2 text-sm font-semibold">Set target balance</p>
                <p className="mt-0.5 text-[11px] text-slate-500">Plan pocket balance</p>
              </button>
            )}
            {/* Tampilkan set auto-budgeting hanya jika user belum mengatur auto budgeting pada pocket ini */}
            {!selectedPocket.autoBudgetingEnabled && (
              <button
                type="button"
                className="rounded-[20px] bg-white p-3 text-left shadow-soft transition active:scale-[0.99]"
                onClick={() => {
                  // TODO: Buka modal untuk mengatur auto-budgeting
                  console.log("Open auto-budgeting setup for pocket:", selectedPocket.id);
                }}
              >
                <Settings className="text-amber-600" size={18} />
                <p className="mt-2 text-sm font-semibold">Set auto-budgeting</p>
                <p className="mt-0.5 text-[11px] text-slate-500">Automate your budget</p>
              </button>
            )}
          </div>

          <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
            <SectionHeader title="Transaction history" caption="Search and filter transactions in this pocket." />
            <div className="grid gap-2">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                <Search size={16} className="text-slate-400" />
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-slate-400"
                  value={pocketTransactionSearch}
                  onChange={(event) => setPocketTransactionSearch(event.target.value)}
                  placeholder="Search transaction"
                />
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-2xl bg-[#F8FAFC] p-1">
                {[
                  { id: "all" as const, label: "All" },
                  { id: "income" as const, label: "Income" },
                  { id: "expense" as const, label: "Expense" }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${pocketTransactionType === item.id ? "bg-white text-[#16A34A] shadow-sm" : "text-slate-500"}`}
                    onClick={() => setPocketTransactionType(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn-secondary w-full"
                onClick={() => onOpenTransactions(selectedPocket.id, selectedPocket.relationshipGoalCreatedAt?.slice(0, 10))}
              >
                <ReceiptText size={16} /> View all transaction history
              </button>
            </div>
          </div>


          {targetBalanceDraft !== "" && (
            <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
              <SectionHeader title="Target balance" caption="Target tersimpan lokal sebagai rencana pocket." />
              <input
                className="input"
                inputMode="numeric"
                value={targetBalanceDraft}
                onChange={(event) => setTargetBalanceDraft(formatRupiahInput(event.target.value))}
                placeholder="Contoh: 5.000.000"
              />
              <button className="btn-primary mt-2 w-full" type="button">Save target</button>
            </div>
          )}

          <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
            <SectionHeader title="Invite user" caption="Share this pocket balance with selected users." />
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
              <UserPlus size={16} className="text-slate-400" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-slate-400"
                value={inviteQuery}
                onChange={(event) => setInviteQuery(event.target.value)}
                placeholder="Email, username, or phone"
              />
              <button type="button" className="rounded-xl bg-[#16A34A] px-3 py-2 text-xs font-semibold text-white">Invite</button>
            </div>
            <button type="button" className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-[#16A34A]">
              <QrCode size={15} /> Show barcode
            </button>
          </div>
        </section>
      )}

      {accountView === "account-form" && (
        <form key={editingAccount?.id ?? "new-pocket"} className="flex min-h-[calc(100vh-132px)] flex-col rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200" onSubmit={submit}>
          <SectionHeader
            title={editingAccount ? "Edit pocket" : "Add pocket"}
            caption="Atur identitas pocket, jenis penyimpanan, dan saldo awal."
            action={(
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
                onClick={() => {
                  setEditingAccount(null);
                  setError(null);
                  setAccountView("list");
                }}
              >
                <ArrowLeft size={14} /> Kembali
              </button>
            )}
          />

          <input ref={pocketCameraInputRef} className="hidden" type="file" accept="image/*" capture="environment" onChange={handlePocketImage} />
          <input ref={pocketGalleryInputRef} className="hidden" type="file" accept="image/*" onChange={handlePocketImage} />

          <div className="flex-1 space-y-4">
            <div
              className="relative overflow-hidden rounded-[24px] p-4 text-white shadow-lg"
              style={{ background: `linear-gradient(135deg, ${pocketBackgroundDraft}, #064E3B)` }}
            >
              <div className="absolute right-[-38px] top-[-38px] h-32 w-32 rounded-full bg-white/15" />
              <div className="relative z-10 flex items-start justify-between gap-3">
                <button
                  type="button"
                  className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white/18 text-2xl ring-1 ring-white/25 backdrop-blur"
                  onClick={() => {
                    const nextEmoji = window.prompt("Masukkan emoji untuk logo pocket", pocketLogoDraft.startsWith("data:") ? "??" : pocketLogoDraft);
                    if (nextEmoji) setPocketLogoDraft(nextEmoji.trim().slice(0, 4) || "??");
                  }}
                  aria-label="Ubah logo pocket"
                >
                  {pocketLogoDraft.startsWith("data:") ? <img src={pocketLogoDraft} alt="" className="h-full w-full object-cover" /> : pocketLogoDraft}
                </button>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {pocketCardColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`h-6 w-6 rounded-full border-2 ${pocketBackgroundDraft === color ? "border-white" : "border-white/40"}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setPocketBackgroundDraft(color)}
                      aria-label={`Pilih warna ${color}`}
                    />
                  ))}
                </div>
              </div>
              <div className="relative z-10 mt-7">
                <p className="text-xs font-medium text-white/70">Pocket preview</p>
                <p className="mt-1 truncate text-xl font-semibold">{pocketNameDraft || "Nama pocket"}</p>
                <p className="mt-4 text-xs font-medium text-white/70">Start balance</p>
                <p className="mt-1 text-2xl font-semibold">{rupiah(moneyValue(pocketInitialBalanceDraft.replace(/\./g, "")))}</p>
              </div>
              <div className="relative z-10 mt-4 grid grid-cols-3 gap-2">
                <button type="button" className="rounded-2xl bg-white/14 px-2 py-2 text-[11px] font-semibold backdrop-blur" onClick={() => {
                  const nextEmoji = window.prompt("Masukkan emoji untuk logo pocket", pocketLogoDraft.startsWith("data:") ? "??" : pocketLogoDraft);
                  if (nextEmoji) setPocketLogoDraft(nextEmoji.trim().slice(0, 4) || "??");
                }}>Emoji</button>
                <button type="button" className="rounded-2xl bg-white/14 px-2 py-2 text-[11px] font-semibold backdrop-blur" onClick={() => pocketCameraInputRef.current?.click()}>
                  <Camera className="mx-auto mb-0.5" size={14} /> Camera
                </button>
                <button type="button" className="rounded-2xl bg-white/14 px-2 py-2 text-[11px] font-semibold backdrop-blur" onClick={() => pocketGalleryInputRef.current?.click()}>
                  <Upload className="mx-auto mb-0.5" size={14} /> Gallery
                </button>
              </div>
              <p className="relative z-10 mt-3 text-[11px] font-medium text-white/70">Tap logo untuk mengganti ikon. Pilih warna untuk background kartu.</p>
            </div>

            <Field label="Nama pocket">
              <input className="input" name="name" placeholder="Contoh: BCA utama" value={pocketNameDraft} onChange={(event) => setPocketNameDraft(event.target.value)} required />
            </Field>

            <Field label="Jenis pocket">
              <select className="input" name="pocketType" value={pocketTypeDraft} onChange={(event) => {
                const nextType = event.target.value as "cash" | "bank" | "e_wallet" | "e_money";
                setPocketTypeDraft(nextType);
                setPocketProviderDraft("");
                setPocketNumberDraft("");
                setPocketHolderDraft("");
                setPocketLogoDraft(getDefaultPocketLogo(nextType === "e_money" ? "other" : nextType));
              }}>
                <option value="cash">Tunai</option>
                <option value="bank">Rekening Bank</option>
                <option value="e_wallet">E-wallet</option>
                <option value="e_money">E-money</option>
              </select>
            </Field>

            {pocketTypeDraft !== "cash" && (
              <div className="space-y-3 rounded-[22px] bg-[#F8FAFC] p-3">
                <Field label={pocketTypeDraft === "bank" ? "Pilih Bank" : pocketTypeDraft === "e_wallet" ? "Pilih e-wallet" : "Pilih e-money"}>
                  <input
                    className="input"
                    name="providerName"
                    list={pocketTypeDraft === "bank" ? "pocket-bank-options" : pocketTypeDraft === "e_wallet" ? "pocket-ewallet-options" : "pocket-emoney-options"}
                    placeholder={pocketTypeDraft === "bank" ? "Cari bank..." : pocketTypeDraft === "e_wallet" ? "Cari e-wallet..." : "Cari e-money..."}
                    value={pocketProviderDraft}
                    onChange={(event) => setPocketProviderDraft(event.target.value)}
                    required
                  />
                </Field>
                <datalist id="pocket-bank-options">{pocketBankOptions.map((option) => <option key={option} value={option} />)}</datalist>
                <datalist id="pocket-ewallet-options">{pocketEWalletOptions.map((option) => <option key={option} value={option} />)}</datalist>
                <datalist id="pocket-emoney-options">{pocketEMoneyOptions.map((option) => <option key={option} value={option} />)}</datalist>

                <Field label={pocketTypeDraft === "bank" ? "Nomor rekening" : pocketTypeDraft === "e_wallet" ? "Nomor e-wallet" : "Nomor e-money"}>
                  <input
                    className="input"
                    name="accountNumber"
                    inputMode="numeric"
                    placeholder="Nomor akun"
                    value={pocketNumberDraft}
                    onChange={(event) => setPocketNumberDraft(event.target.value)}
                    required
                  />
                </Field>

                {pocketTypeDraft !== "e_money" && (
                  <Field label="Atas nama">
                    <input
                      className="input"
                      name="accountHolderName"
                      placeholder="Nama pemilik rekening"
                      value={pocketHolderDraft}
                      onChange={(event) => setPocketHolderDraft(event.target.value)}
                      required
                    />
                  </Field>
                )}
              </div>
            )}

            <Field label="Saldo awal">
              <input
                className="input"
                name="initialBalance"
                inputMode="numeric"
                placeholder="Contoh: 500.000"
                value={pocketInitialBalanceDraft}
                onInput={handleMoneyInput}
                onChange={(event) => setPocketInitialBalanceDraft(event.target.value)}
                required
              />
            </Field>

            {editingAccount && (
              <p className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 lg:rounded-md">
                Saldo sekarang {rupiah(editingAccount.currentBalance)}. Saldo awal tidak bisa dibuat minus dari form ini.
              </p>
            )}

            {error && <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 lg:rounded-md">{error}</p>}
          </div>

          <div className="sticky bottom-24 mt-5 bg-white/90 pt-2 backdrop-blur">
            <button className="btn-primary w-full">{editingAccount ? <CheckCircle2 size={16} /> : <Plus size={16} />} {editingAccount ? "Simpan perubahan" : "Simpan pocket"}</button>
          </div>
        </form>
      )}

      {accountView === "transfer-form" && (
        <form className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200" onSubmit={transfer}>
          <SectionHeader
            title="Transfer antar akun"
            caption="Pindahkan uang antar akun tanpa membuat pengeluaran."
            action={(
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
                onClick={() => {
                  setError(null);
                  setAccountView("list");
                }}
              >
                <ArrowLeft size={14} /> Kembali
              </button>
            )}
          />
          <div className="mb-3 rounded-[20px] border border-emerald-100 bg-emerald-50/60 p-3 lg:rounded-md">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase text-[#16A34A] shadow-sm">
              <Sparkles size={12} /> AI Quick Add
            </span>
            <p className="mt-2 text-sm font-semibold text-slate-950">Ketik transfer dengan bahasa sehari-hari</p>
            <textarea
              className="mt-2 min-h-20 w-full resize-none rounded-2xl border border-emerald-100 bg-white px-3 py-2 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 lg:rounded-md"
              value={transferText}
              onChange={(event) => {
                setTransferText(event.target.value);
                setTransferParsed(false);
              }}
              placeholder="Contoh: transfer BCA ke GoPay 300rb fee 2.500"
              disabled={transferParseLoading}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {["transfer BCA ke GoPay 300rb", "tarik tunai BCA ke Tunai 500rb admin 6.500", "kirim Mandiri ke DANA 100rb"].map((example) => (
                <button
                  key={example}
                  type="button"
                  className="rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-emerald-50 hover:text-[#16A34A]"
                  onClick={() => setTransferText(example)}
                >
                  {example}
                </button>
              ))}
            </div>
            {transferParseLoading && (
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-emerald-100 bg-white/80 p-3 text-[11px] font-semibold text-slate-600 lg:rounded-md">
                {[
                  "Membaca nominal",
                  "Menentukan akun asal",
                  "Menentukan akun tujuan",
                  "Mengecek fee/admin"
                ].map((step, index) => {
                  const done = transferAnalysisStep >= index;
                  return (
                    <div key={step} className="flex items-center gap-2">
                      {done ? (
                        <CheckCircle2 className="text-[#16A34A]" size={14} />
                      ) : (
                        <Loader2 className="animate-spin text-slate-300" size={14} />
                      )}
                      <span className={done ? "text-[#15803D]" : "text-slate-400"}>{step}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <button
              type="button"
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(22,163,74,0.18)] transition hover:bg-[#15803D] disabled:opacity-60 lg:rounded-md"
              onClick={parseTransferQuickAdd}
              disabled={transferParseLoading || transferableAccounts.length < 2}
            >
              {transferParseLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
              {transferParseLoading ? "Menganalisis transfer..." : "Analisis Transfer"}
            </button>
          </div>
          <div ref={transferFormFieldsRef} className="space-y-3 scroll-mt-24">
            <Field label="Dari akun" hint={<AiFieldBadge status={transferParsed ? "ai" : null} language={language} />}>
              <div>
                <select
                  className="input"
                  name="sourceAccountId"
                  value={sourceAccountId}
                  onChange={(event) => {
                    const nextSourceId = event.target.value;
                    setSourceAccountId(nextSourceId);
                    if (destinationAccountId === nextSourceId) {
                      setDestinationAccountId(transferableAccounts.find((account) => account.id !== nextSourceId)?.id ?? "");
                    }
                  }}
                  required
                  disabled={transferableAccounts.length < 2}
                >
                  {transferableAccounts.map((account) => <option key={account.id} value={account.id}>{accountOptionLabel(account, { balance: true })}</option>)}
                </select>
                {sourceAccount && (
                  <div className="mt-1.5 flex items-center justify-between gap-2 px-1 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      Saldo tersedia
                      {accountSharedLabel(sourceAccount) && (
                        <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-[#16A34A]">
                          {accountSharedLabel(sourceAccount)}
                        </span>
                      )}
                    </span>
                    <span className="font-semibold text-slate-900">{rupiah(sourceAccount.currentBalance)}</span>
                  </div>
                )}
              </div>
            </Field>
            <Field label="Ke akun" hint={<AiFieldBadge status={transferParsed ? "ai" : null} language={language} />}>
              <div>
                <select
                  className="input"
                  name="destinationAccountId"
                  value={destinationAccountId}
                  onChange={(event) => setDestinationAccountId(event.target.value)}
                  required
                  disabled={transferableAccounts.length < 2}
                >
                  {transferableAccounts.filter((account) => account.id !== sourceAccountId).map((account) => (
                    <option key={account.id} value={account.id}>{accountOptionLabel(account, { balance: true })}</option>
                  ))}
                </select>
                {destinationAccount && (
                  <div className="mt-1.5 flex items-center justify-between gap-2 px-1 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      Saldo saat ini
                      {accountSharedLabel(destinationAccount) && (
                        <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-[#16A34A]">
                          {accountSharedLabel(destinationAccount)}
                        </span>
                      )}
                    </span>
                    <span className="font-semibold text-slate-900">{rupiah(destinationAccount.currentBalance)}</span>
                  </div>
                )}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Nominal" hint={<AiFieldBadge status={transferParsed ? "ai" : null} language={language} />}>
                <input
                  className="input"
                  name="amount"
                  inputMode="numeric"
                  placeholder="100000"
                  value={transferDraft.amount}
                  onChange={(event) => setTransferDraft((current) => ({ ...current, amount: formatRupiahInput(event.target.value) }))}
                  required
                />
              </Field>
              <Field label="Tanggal" hint={<AiFieldBadge status={transferParsed ? "ai" : null} language={language} />}>
                <input
                  className="input"
                  name="transferDate"
                  type="date"
                  value={transferDraft.transferDate}
                  onChange={(event) => setTransferDraft((current) => ({ ...current, transferDate: event.target.value }))}
                  required
                />
              </Field>
            </div>
            <Field label="Fee/admin" hint={<AiFieldBadge status={transferParsed && transferDraft.feeAmount ? "ai" : null} language={language} />}>
              <input
                className="input"
                name="feeAmount"
                inputMode="numeric"
                placeholder="Opsional, contoh: 2500"
                value={transferDraft.feeAmount}
                onChange={(event) => setTransferDraft((current) => ({ ...current, feeAmount: formatRupiahInput(event.target.value) }))}
              />
            </Field>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 lg:rounded-md">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700">Attachment transfer</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-slate-500">Tambahkan gambar atau video sebagai bukti transfer.</p>
                </div>
                <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#16A34A] shadow-sm ring-1 ring-slate-200 transition hover:bg-emerald-50 lg:rounded-md">
                  {transferAttachmentLoading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                  {transferAttachmentId ? "Ganti" : "Pilih file"}
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/*,video/*,.heic,.heif"
                    onChange={uploadTransferAttachment}
                    disabled={transferAttachmentLoading}
                  />
                </label>
              </div>
              {transferAttachmentName && (
                <div className="mt-2 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs text-slate-600 lg:rounded-md">
                  <ReceiptText className="shrink-0 text-[#16A34A]" size={14} />
                  <span className="truncate">{transferAttachmentName}</span>
                </div>
              )}
              {transferAttachmentMessage && (
                <p className={`mt-2 text-[11px] leading-4 ${transferAttachmentMessage.includes("berhasil") ? "text-[#15803D]" : "text-slate-500"}`}>
                  {transferAttachmentMessage}
                </p>
              )}
            </div>
            <input
              className="input"
              name="notes"
              placeholder="Catatan transfer (opsional)"
              value={transferDraft.notes}
              onChange={(event) => setTransferDraft((current) => ({ ...current, notes: event.target.value }))}
            />
            <button className="btn-primary w-full" disabled={transferableAccounts.length < 2 || transferAttachmentLoading || transferParseLoading}><ArrowLeftRight size={16} /> Transfer</button>
          </div>
        </form>
      )}
      {error && <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 lg:rounded-md">{error}</p>}
    </div>
  );
}

function CategoriesView({
  categories,
  request,
  onChanged,
  initialView = "list"
}: {
  categories: Category[];
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onChanged: () => Promise<void>;
  initialView?: "list" | "form";
}) {
  const [error, setError] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryView, setCategoryView] = useState<"list" | "form">(initialView);
  const [deleting, setDeleting] = useState(false);
  const expenseCategories = categories.filter((category) => category.categoryType === "expense");
  const incomeCategories = categories.filter((category) => category.categoryType === "income");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const nextCategoryType = String(form.get("categoryType"));
    if (
      editingCategory &&
      editingCategory.categoryType !== nextCategoryType &&
      !window.confirm("Ubah tipe kategori? Transaksi lama yang tidak sesuai akan menjadi Tanpa kategori.")
    ) return;
    try {
      await request(editingCategory ? `/categories/${editingCategory.id}` : "/categories", {
        method: editingCategory ? "PUT" : "POST",
        body: JSON.stringify({
          name: String(form.get("name")),
          categoryType: String(form.get("categoryType")),
          icon: editingCategory?.icon ?? "Circle"
        })
      });
      formElement.reset();
      setEditingCategory(null);
      await onChanged();
      setCategoryView("list");
    } catch {
      setError(null);
    }
  };

  const removeCategory = async () => {
    if (!editingCategory || editingCategory.isDefault) return;
    if (!window.confirm("Hapus kategori ini? Transaksi yang menggunakannya akan tetap tersimpan sebagai Tanpa kategori.")) return;
    setDeleting(true);
    setError(null);
    try {
      await request(`/categories/${editingCategory.id}`, { method: "DELETE" });
      setEditingCategory(null);
      await onChanged();
      setCategoryView("list");
    } catch {
      setError(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-3">
      {categoryView === "list" && (
      <section className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200">
        <SectionHeader
          title="Kategori transaksi"
          caption={`${expenseCategories.length} pengeluaran - ${incomeCategories.length} pemasukan`}
          action={(
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#16A34A]"
              onClick={() => {
                setError(null);
                setEditingCategory(null);
                setCategoryView("form");
              }}
            >
              <Plus size={14} /> Tambah
            </button>
          )}
        />
        <div className="space-y-4">
          <CategoryGroup title="Pengeluaran" rows={expenseCategories} tone="expense" onEdit={(category) => {
            if (category.isDefault) return;
            setError(null);
            setEditingCategory(category);
            setCategoryView("form");
          }} />
          <CategoryGroup title="Pemasukan" rows={incomeCategories} tone="income" onEdit={(category) => {
            if (category.isDefault) return;
            setError(null);
            setEditingCategory(category);
            setCategoryView("form");
          }} />
        </div>
      </section>
      )}

      {categoryView === "form" && (
      <form key={editingCategory?.id ?? "new-category"} className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200" onSubmit={submit}>
        <SectionHeader
          title={editingCategory ? "Edit kategori" : "Kategori baru"}
          caption={editingCategory ? "Ubah nama atau tipe kategori transaksi." : "Buat kategori yang mudah dipilih oleh AI dan form manual."}
          action={(
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
              onClick={() => {
                setEditingCategory(null);
                setError(null);
                setCategoryView("list");
              }}
            >
              <ArrowLeft size={14} /> Kembali
            </button>
          )}
        />
        <div className="space-y-3">
          <Field label="Nama kategori">
            <input className="input" name="name" placeholder="Contoh: Kopi & cafe" defaultValue={editingCategory?.name ?? ""} required />
          </Field>
          <Field label="Tipe">
            <select className="input" name="categoryType" defaultValue={editingCategory?.categoryType ?? "expense"}>
              <option value="expense">Pengeluaran</option>
              <option value="income">Pemasukan</option>
            </select>
          </Field>
          <button className="btn-primary w-full" disabled={deleting}>{editingCategory ? <CheckCircle2 size={16} /> : <Plus size={16} />} {editingCategory ? "Simpan perubahan" : "Tambah kategori"}</button>
          {editingCategory?.isDefault && (
            <p className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2.5 text-xs text-slate-500 lg:rounded-md">
              <ShieldCheck size={15} className="shrink-0 text-[#16A34A]" />
              Kategori bawaan sistem dilindungi dan tidak dapat dihapus.
            </p>
          )}
          {editingCategory && !editingCategory.isDefault && (
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 lg:rounded-md"
              onClick={removeCategory}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
              {deleting ? "Menghapus kategori..." : "Hapus kategori"}
            </button>
          )}
          {error && <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 lg:rounded-md">{error}</p>}
        </div>
      </form>
      )}
    </div>
  );
}

function CategoryGroup({ title, rows, tone, onEdit }: { title: string; rows: Category[]; tone: "income" | "expense"; onEdit?: (category: Category) => void }) {
  const toneClass = tone === "income" ? "bg-emerald-50 text-[#16A34A]" : "bg-rose-50 text-rose-600";
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500">{title}</p>
        <span className="text-[11px] font-bold text-slate-400">{rows.length} kategori</span>
      </div>
      {rows.length === 0 ? (
        <EmptyState text={`Belum ada kategori ${title.toLowerCase()}.`} />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {rows.map((category) => (
            <div key={category.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2.5 lg:rounded-md">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl lg:rounded-md ${toneClass}`}>
                  <Tags size={15} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{category.name}</p>
                  <p className="text-[11px] font-semibold text-slate-500">{category.isDefault ? "Default" : "Custom"}</p>
                </div>
              </div>
              {!category.isDefault && (
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-[#16A34A]"
                  onClick={() => onEdit?.(category)}
                >
                  <Settings size={12} /> Edit
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LegacyCategoriesView({ categories, request, onChanged }: { categories: Category[]; request: <T>(path: string, options?: RequestInit) => Promise<T>; onChanged: () => Promise<void> }) {
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await request("/categories", {
      method: "POST",
      body: JSON.stringify({
        name: String(form.get("name")),
        categoryType: String(form.get("categoryType")),
        icon: "Circle"
      })
    });
    event.currentTarget.reset();
    await onChanged();
  };
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => (
          <div key={category.id} className="card p-4">
            <p className="font-semibold">{category.name}</p>
            <p className="mt-1 text-sm text-slate-500">{category.categoryType === "income" ? "Pemasukan" : "Pengeluaran"} {category.isDefault ? "· Default" : ""}</p>
          </div>
        ))}
      </section>
      <form className="card space-y-3 p-5" onSubmit={submit}>
        <h2 className="font-bold">Kategori baru</h2>
        <input className="input" name="name" placeholder="Nama kategori" required />
        <select className="input" name="categoryType">
          <option value="expense">Pengeluaran</option>
          <option value="income">Pemasukan</option>
        </select>
        <button className="btn-primary w-full"><Plus size={16} /> Tambah kategori</button>
      </form>
    </div>
  );
}

function BudgetsView({
  categories,
  request,
  onChanged,
  initialView = "list"
}: {
  categories: Category[];
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onChanged?: () => Promise<void>;
  initialView?: "list" | "form";
}) {
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingBudget, setEditingBudget] = useState<BudgetRow | null>(null);
  const [budgetView, setBudgetView] = useState<"list" | "form">(initialView);
  const expenseCategories = categories.filter((category) => category.categoryType === "expense");
  const load = async () => {
    setLoading(true);
    try {
      setBudgets(await request<BudgetRow[]>("/budgets"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load().catch(console.error); }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await request(editingBudget ? `/budgets/${editingBudget.id}` : "/budgets", {
        method: editingBudget ? "PUT" : "POST",
        body: JSON.stringify({
          categoryId: String(form.get("categoryId")),
          month: Number(form.get("month")),
          year: Number(form.get("year")),
          budgetAmount: String(form.get("budgetAmount"))
        })
      });
      formElement.reset();
      setEditingBudget(null);
      await load();
      await onChanged?.();
      setBudgetView("list");
    } catch {
      setError(null);
    }
  };

  const now = jakartaDateParts();
  const totalBudget = budgets.reduce((sum, budget) => sum + moneyValue(budget.budgetAmount), 0);
  const totalUsed = budgets.reduce((sum, budget) => sum + moneyValue(budget.used), 0);
  const totalPercent = totalBudget > 0 ? Math.round((totalUsed / totalBudget) * 100) : 0;
  const sortedBudgets = [...budgets].sort((a, b) => moneyValue(b.usagePercent) - moneyValue(a.usagePercent));

  return (
    <div className="space-y-3">
      {budgetView === "list" && (
      <section className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200">
        <SectionHeader
          title="Budget bulan ini"
          caption={budgets.length > 0 ? `${budgets.length} kategori dipantau - ${totalPercent}% terpakai` : "Belum ada batas pengeluaran"}
          action={(
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#16A34A]"
              onClick={() => {
                setError(null);
                setEditingBudget(null);
                setBudgetView("form");
              }}
            >
              <Plus size={14} /> Tambah
            </button>
          )}
        />
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${totalPercent <= 80 ? "bg-[#16A34A]" : totalPercent <= 100 ? "bg-amber-400" : "bg-rose-500"}`}
            style={{ width: `${Math.min(totalPercent, 100)}%` }}
          />
        </div>
        {loading ? (
          <LoadingState />
        ) : sortedBudgets.length === 0 ? (
          <EmptyState text="Buat budget pertama agar pengeluaran lebih mudah dipantau." />
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {sortedBudgets.map((budget) => {
              const percent = Math.round(moneyValue(budget.usagePercent));
              return (
                <div key={budget.id} className="rounded-2xl border border-slate-100 bg-white px-3 py-3 lg:rounded-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">{budget.category}</p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-500">Sisa {rupiah(budget.remaining)}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${budgetTone(budget.status)}`}>
                      {budget.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p className="text-base font-semibold text-slate-950">{rupiah(budget.used)}</p>
                    <p className="text-xs font-bold text-slate-500">/ {rupiah(budget.budgetAmount)}</p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${percent <= 80 ? "bg-[#16A34A]" : percent <= 100 ? "bg-amber-400" : "bg-rose-500"}`}
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-[#16A34A]"
                      onClick={() => {
                        setError(null);
                        setEditingBudget(budget);
                        setBudgetView("form");
                      }}
                    >
                      <Settings size={12} /> Edit
                    </button>
                    <p className="text-[11px] font-semibold text-slate-400">{percent}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      )}

      {budgetView === "form" && (
      <form key={editingBudget?.id ?? "new-budget"} className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200" onSubmit={submit}>
        <SectionHeader
          title={editingBudget ? "Edit budget" : "Atur budget"}
          caption={editingBudget ? "Sesuaikan kategori, periode, atau batas nominal." : "Pilih kategori pengeluaran, periode, lalu isi batas nominal."}
          action={(
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
              onClick={() => {
                setEditingBudget(null);
                setError(null);
                setBudgetView("list");
              }}
            >
              <ArrowLeft size={14} /> Kembali
            </button>
          )}
        />
        <div className="space-y-3">
          <Field label="Kategori">
            <select className="input" name="categoryId" defaultValue={editingBudget?.categoryId ?? expenseCategories[0]?.id ?? ""} required disabled={expenseCategories.length === 0}>
              {expenseCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Bulan">
              <input className="input" name="month" type="number" min={1} max={12} defaultValue={editingBudget?.month ?? now.month} required />
            </Field>
            <Field label="Tahun">
              <input className="input" name="year" type="number" min={2000} max={2100} defaultValue={editingBudget?.year ?? now.year} required />
            </Field>
          </div>
          <Field label="Nilai budget">
            <input className="input" name="budgetAmount" inputMode="numeric" placeholder="Contoh: 1000000" defaultValue={moneyInputValue(editingBudget?.budgetAmount)} onInput={handleMoneyInput} required />
          </Field>
          <button className="btn-primary w-full" disabled={expenseCategories.length === 0}><CheckCircle2 size={16} /> {editingBudget ? "Simpan perubahan" : "Simpan budget"}</button>
          {expenseCategories.length === 0 && <p className="text-xs font-semibold text-slate-500">Buat kategori pengeluaran dulu sebelum menambahkan budget.</p>}
          {error && <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 lg:rounded-md">{error}</p>}
        </div>
      </form>
      )}
    </div>
  );
}

function LegacyBudgetsView({ categories, request }: { categories: Category[]; request: <T>(path: string, options?: RequestInit) => Promise<T> }) {
  const [budgets, setBudgets] = useState<any[]>([]);
  const expenseCategories = categories.filter((category) => category.categoryType === "expense");
  const load = async () => setBudgets(await request<any[]>("/budgets"));
  useEffect(() => { load().catch(console.error); }, []);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await request("/budgets", {
      method: "POST",
      body: JSON.stringify({
        categoryId: String(form.get("categoryId")),
        month: Number(form.get("month")),
        year: Number(form.get("year")),
        budgetAmount: String(form.get("budgetAmount"))
      })
    });
    event.currentTarget.reset();
    await load();
  };
  const now = jakartaDateParts();
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="grid gap-4 md:grid-cols-2">
        {budgets.length === 0 ? <EmptyState text="Belum ada anggaran." /> : budgets.map((budget) => (
          <div key={budget.id} className="card p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{budget.category}</h3>
              <span className={`rounded px-2 py-1 text-xs font-bold ${budget.status === "Aman" ? "bg-emerald-50 text-[#15803D]" : budget.status === "Peringatan" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>{budget.status}</span>
            </div>
            <p className="mt-3 text-2xl font-bold">{rupiah(budget.used)} / {rupiah(budget.budgetAmount)}</p>
            <div className="mt-4 h-3 rounded bg-slate-100">
              <div className="h-3 rounded bg-sky-600" style={{ width: `${Math.min(Number(budget.usagePercent), 100)}%` }} />
            </div>
            <p className="mt-2 text-sm text-slate-500">Sisa {rupiah(budget.remaining)}</p>
          </div>
        ))}
      </section>
      <form className="card space-y-3 p-5" onSubmit={submit}>
        <h2 className="font-bold">Anggaran bulanan</h2>
        <select className="input" name="categoryId" required>{expenseCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <div className="grid grid-cols-2 gap-3">
          <input className="input" name="month" type="number" min={1} max={12} defaultValue={now.month} required />
          <input className="input" name="year" type="number" min={2000} max={2100} defaultValue={now.year} required />
        </div>
        <input className="input" name="budgetAmount" placeholder="Nilai anggaran" required />
        <button className="btn-primary w-full"><CheckCircle2 size={16} /> Simpan anggaran</button>
      </form>
    </div>
  );
}

type CashFlowReportRow = { date: string; income: string; expense: string; net: string };
type CategoryReportRow = { category: string | null; transactionType: "income" | "expense"; total: string; count: number };
type MonthlyReportRow = { month: string; income: string; expense: string };

function monthYearLabel(value: string | Date) {
  return new Intl.DateTimeFormat("id-ID", { timeZone: APP_TIME_ZONE, month: "short", year: "numeric" }).format(new Date(value));
}

function ReportsView({ request }: { request: <T>(path: string, options?: RequestInit) => Promise<T> }) {
  const [cashFlow, setCashFlow] = useState<CashFlowReportRow[]>([]);
  const [categories, setCategories] = useState<CategoryReportRow[]>([]);
  const [months, setMonths] = useState<MonthlyReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      request<CashFlowReportRow[]>("/reports/cash-flow"),
      request<CategoryReportRow[]>("/reports/category-summary"),
      request<MonthlyReportRow[]>("/reports/monthly-comparison")
    ])
      .then(([nextCashFlow, nextCategories, nextMonths]) => {
        if (!active) return;
        setCashFlow(nextCashFlow);
        setCategories(nextCategories);
        setMonths(nextMonths);
      })
      .catch(console.error)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <LoadingState />;

  const totalIncome = cashFlow.reduce((sum, row) => sum + Number(row.income), 0);
  const totalExpense = cashFlow.reduce((sum, row) => sum + Number(row.expense), 0);
  const totalNet = totalIncome - totalExpense;
  const expenseCategories = categories
    .filter((row) => row.transactionType === "expense")
    .sort((a, b) => Number(b.total) - Number(a.total));
  const incomeCategories = categories
    .filter((row) => row.transactionType === "income")
    .sort((a, b) => Number(b.total) - Number(a.total));
  const topExpense = expenseCategories[0];
  const topIncome = incomeCategories[0];
  const latestMonth = months[months.length - 1];
  const previousMonth = months[months.length - 2];
  const latestNet = latestMonth ? Number(latestMonth.income) - Number(latestMonth.expense) : 0;
  const expenseTrend = latestMonth && previousMonth ? Number(latestMonth.expense) - Number(previousMonth.expense) : null;
  const latestMonthLabel = latestMonth ? monthYearLabel(latestMonth.month) : "Belum ada data";
  const trendLabel =
    expenseTrend === null
      ? "Belum ada pembanding"
      : expenseTrend > 0
        ? `Naik ${rupiah(expenseTrend)}`
        : expenseTrend < 0
          ? `Turun ${rupiah(Math.abs(expenseTrend))}`
          : "Tidak berubah";
  const trendHelper = previousMonth ? `Dibanding ${monthYearLabel(previousMonth.month)}` : "Butuh minimal 2 bulan data";

  return (
    <section className="mx-auto max-w-6xl space-y-3 lg:space-y-5">
      <div className="rounded-[26px] border border-slate-100 bg-white p-4 text-slate-950 shadow-soft lg:rounded-lg lg:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase text-[#16A34A]">Insight</p>
            <h2 className="mt-1 text-xl font-semibold tracking-normal">Laporan keuangan</h2>
            <p className="mt-1 text-xs font-medium text-slate-500">Ringkasan dari transaksi bulan berjalan dan perbandingan bulanan.</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            totalNet >= 0 ? "bg-emerald-50 text-[#16A34A]" : "bg-rose-50 text-rose-700"
          }`}>
            {totalNet >= 0 ? "Surplus" : "Defisit"}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-slate-50 px-3 py-2 lg:rounded-md">
            <p className="text-[10px] font-medium text-slate-500">Masuk</p>
            <p className="mt-1 truncate text-sm font-semibold text-[#16A34A]">{rupiah(totalIncome)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-3 py-2 lg:rounded-md">
            <p className="text-[10px] font-medium text-slate-500">Keluar</p>
            <p className="mt-1 truncate text-sm font-semibold text-rose-600">{rupiah(totalExpense)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-3 py-2 lg:rounded-md">
            <p className="text-[10px] font-medium text-slate-500">Net</p>
            <p className={`mt-1 truncate text-sm font-semibold ${totalNet >= 0 ? "text-[#16A34A]" : "text-rose-600"}`}>{totalNet >= 0 ? "+" : "-"}{rupiah(Math.abs(totalNet))}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ReportInsightCard
          label="Pengeluaran terbesar"
          value={topExpense?.category ?? "Belum ada"}
          helper={topExpense ? `Bulan ini - ${rupiah(topExpense.total)}` : "Belum ada pengeluaran"}
          tone="expense"
          icon={<ShoppingBag size={16} />}
        />
        <ReportInsightCard
          label="Pemasukan terbesar"
          value={topIncome?.category ?? "Belum ada"}
          helper={topIncome ? `Bulan ini - ${rupiah(topIncome.total)}` : "Belum ada pemasukan"}
          tone="income"
          icon={<Wallet size={16} />}
        />
        <ReportInsightCard
          label="Net bulan terakhir"
          value={`${latestNet >= 0 ? "+" : "-"}${rupiah(Math.abs(latestNet))}`}
          helper={latestMonthLabel}
          tone={latestNet >= 0 ? "income" : "expense"}
          icon={<LineChart size={16} />}
        />
        <ReportInsightCard
          label="Perubahan pengeluaran"
          value={trendLabel}
          helper={trendHelper}
          tone={expenseTrend === null ? "neutral" : expenseTrend > 0 ? "expense" : "income"}
          icon={expenseTrend === null ? <LineChart size={16} /> : expenseTrend > 0 ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-950">Arus kas</h3>
              <p className="text-xs font-semibold text-slate-500">{cashFlow.length} hari tercatat</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-[#16A34A]">Harian</span>
          </div>
          <CashFlowInsightList rows={cashFlow} />
        </section>

        <section className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-950">Kategori</h3>
              <p className="text-xs font-semibold text-slate-500">Pengeluaran terbesar</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">{expenseCategories.length} kategori</span>
          </div>
          <CategoryInsightList rows={expenseCategories} />
        </section>
      </div>

      <section className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-950">Antarbulan</h3>
            <p className="text-xs font-semibold text-slate-500">Masuk, keluar, dan net per bulan</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">{months.length} bulan</span>
        </div>
        <MonthlyInsightList rows={months} />
      </section>
    </section>
  );
}

function ReportInsightCard({
  label,
  value,
  helper,
  tone,
  icon
}: {
  label: string;
  value: string;
  helper: string;
  tone: "income" | "expense" | "neutral";
  icon: JSX.Element;
}) {
  const toneClass =
    tone === "income"
      ? "bg-emerald-50 text-[#16A34A]"
      : tone === "expense"
        ? "bg-rose-50 text-rose-600"
        : "bg-slate-100 text-slate-500";
  return (
    <div className="rounded-[22px] border border-white/80 bg-white p-3 shadow-soft lg:rounded-lg lg:border-slate-200">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold leading-tight text-slate-400">{label}</p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-950">{value}</p>
        </div>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl lg:rounded-md ${toneClass}`}>{icon}</span>
      </div>
      <p className="mt-1 truncate text-xs font-semibold text-slate-500">{helper}</p>
    </div>
  );
}

function CashFlowInsightList({ rows }: { rows: CashFlowReportRow[] }) {
  const visibleRows = rows.slice(-7).reverse();
  const maxValue = Math.max(...visibleRows.map((row) => Number(row.income) + Number(row.expense)), 1);

  if (visibleRows.length === 0) return <EmptyState text="Belum ada data arus kas." />;

  return (
    <div className="space-y-2">
      {visibleRows.map((row) => {
        const net = Number(row.net);
        const incomePercent = Math.max((Number(row.income) / maxValue) * 100, Number(row.income) > 0 ? 5 : 0);
        const expensePercent = Math.max((Number(row.expense) / maxValue) * 100, Number(row.expense) > 0 ? 5 : 0);
        return (
          <div key={row.date} className="rounded-2xl border border-slate-100 bg-white px-3 py-2.5 lg:rounded-md">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-950">{localDate(row.date)}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-500">Net {net >= 0 ? "+" : "-"}{rupiah(Math.abs(net))}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[11px] font-semibold text-[#16A34A]">{rupiah(row.income)}</p>
                <p className="text-[11px] font-semibold text-rose-500">{rupiah(row.expense)}</p>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-emerald-50">
                <div className="h-full rounded-full bg-[#16A34A]" style={{ width: `${incomePercent}%` }} />
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-rose-50">
                <div className="h-full rounded-full bg-rose-400" style={{ width: `${expensePercent}%` }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CategoryInsightList({ rows }: { rows: CategoryReportRow[] }) {
  const visibleRows = rows.slice(0, 6);
  const maxValue = Math.max(...visibleRows.map((row) => Number(row.total)), 1);

  if (visibleRows.length === 0) return <EmptyState text="Belum ada data kategori." />;

  return (
    <div className="space-y-2.5">
      {visibleRows.map((row, index) => {
        const percent = Math.round((Number(row.total) / maxValue) * 100);
        return (
          <div key={`${row.category}-${index}`} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: categoryPalette[index % categoryPalette.length] }} />
                <span className="truncate text-xs font-semibold text-slate-950">{row.category ?? "Tanpa kategori"}</span>
                <span className="shrink-0 text-[10px] font-bold text-slate-400">{row.count}x</span>
              </div>
              <span className="shrink-0 text-xs font-semibold text-slate-900">{rupiah(row.total)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full"
                style={{ width: `${percent}%`, backgroundColor: categoryPalette[index % categoryPalette.length] }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthlyInsightList({ rows }: { rows: MonthlyReportRow[] }) {
  const visibleRows = rows.slice(-6).reverse();

  if (visibleRows.length === 0) return <EmptyState text="Belum ada data antarbulan." />;

  return (
    <div className="grid gap-2 md:grid-cols-2">
      {visibleRows.map((row) => {
        const income = Number(row.income);
        const expense = Number(row.expense);
        const net = income - expense;
        const expenseRatio = Math.round((expense / Math.max(income, 1)) * 100);
        const ratioTone = expenseRatio <= 80 ? "bg-[#16A34A]" : expenseRatio <= 100 ? "bg-amber-400" : "bg-rose-500";
        return (
          <div key={row.month} className="rounded-2xl border border-slate-100 bg-white p-3 lg:rounded-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-950">{monthYearLabel(row.month)}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-500">Ringkasan bulanan</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                net >= 0 ? "bg-emerald-50 text-[#16A34A]" : "bg-rose-50 text-rose-600"
              }`}>
                {net >= 0 ? "Surplus" : "Defisit"}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-emerald-50 px-2.5 py-2 lg:rounded-md">
                <p className="text-[10px] font-semibold uppercase text-[#15803D]">Masuk</p>
                <p className="mt-1 truncate text-xs font-semibold text-[#16A34A]">{rupiah(income)}</p>
              </div>
              <div className="rounded-2xl bg-rose-50 px-2.5 py-2 lg:rounded-md">
                <p className="text-[10px] font-semibold uppercase text-rose-600">Keluar</p>
                <p className="mt-1 truncate text-xs font-semibold text-rose-600">{rupiah(expense)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-2.5 py-2 lg:rounded-md">
                <p className="text-[10px] font-semibold uppercase text-slate-500">Net</p>
                <p className={`mt-1 truncate text-xs font-semibold ${net >= 0 ? "text-[#16A34A]" : "text-rose-600"}`}>
                  {net >= 0 ? "+" : "-"}{rupiah(Math.abs(net))}
                </p>
              </div>
            </div>

            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-500">Rasio keluar dari pemasukan</span>
                <span className="text-slate-900">{income > 0 ? `${expenseRatio}%` : "Tidak ada pemasukan"}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${ratioTone}`} style={{ width: `${Math.min(expenseRatio, 100)}%` }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type AssistantMessage = {
  role: "user" | "assistant";
  text: string;
  disclaimer?: string | null;
  suggestions?: string[];
  tone?: "positive" | "warning" | "danger" | "neutral";
  highlights?: Array<{
    label: string;
    value: string;
    tone: "positive" | "warning" | "danger" | "neutral";
  }>;
  actions?: Array<{ label: string; view: string }>;
};

function AssistantView({
  request,
  language,
  onNavigate,
  context
}: {
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  language: AppLanguage;
  onNavigate: (view: View) => void;
  context?: AssistantContext | null;
}) {
  const relationshipMode = context?.contextType === "relationship_finance";
  const relationshipLabel = context?.label
    ?? (relationshipMode ? (language === "en" ? "Selected relationship" : "Relationship terpilih") : "");
  const relationshipMeta = context?.partnerName
    ? (language === "en" ? `With ${context.partnerName}` : `Dengan ${context.partnerName}`)
    : (relationshipMode ? (language === "en" ? "Relationship Finance context" : "Konteks Relationship Finance") : "");
  const copy = language === "en" ? {
    greeting: "Hi, I can help you make financial decisions using the data recorded in this app.",
    relationshipGreeting: "Hi, I can analyze your shared relationship workspace using only data both of you allowed.",
    header: relationshipMode ? "Relationship Copilot" : "Finance Copilot",
    subheader: relationshipMode ? "Ask about shared goals, cashflow, saving rate, or agreements" : "Ask about affordability, budgets, bills, balances, or shared debt",
    placeholder: "Example: Can I afford shoes for 1 million?",
    send: "Send",
    loading: "Checking your finances...",
    error: "The assistant is temporarily unavailable. Please try again.",
    suggestions: relationshipMode ? [
      "Is our shared finance healthy?",
      "Is our main goal on track?",
      "How much should we save each month?",
      "Which budget should we improve?"
    ] : [
      "Can I afford shoes for 1 million?",
      "Check my finances this month",
      "Any bills due soon?",
      "How do I use the app features?"
    ]
  } : {
    greeting: "Hai, aku bisa membantu mengambil keputusan keuangan berdasarkan data yang tercatat di aplikasi ini.",
    relationshipGreeting: "Hai, aku bisa menganalisis workspace keuangan bersama hanya dari data yang kalian izinkan.",
    header: relationshipMode ? "Kopilot Relationship" : "Kopilot Keuangan",
    subheader: relationshipMode ? "Tanya goal bersama, arus kas, saving rate, atau kesepakatan" : "Tanya kelayakan belanja, budget, tagihan, saldo, atau utang bersama",
    placeholder: "Contoh: Boleh beli sepatu 1 juta?",
    send: "Kirim",
    loading: "Memeriksa kondisi keuangan...",
    error: "Kopilot sedang tidak bisa menjawab. Coba lagi sebentar.",
    suggestions: relationshipMode ? [
      "Apakah keuangan bersama kami sehat?",
      "Apakah target utama masih sesuai jadwal?",
      "Berapa yang harus kami tabung tiap bulan?",
      "Budget mana yang perlu diperbaiki?"
    ] : [
      "Boleh beli sepatu 1 juta?",
      "Cek kondisi keuangan bulan ini",
      "Ada tagihan yang segera jatuh tempo?",
      "Bagaimana cara menggunakan fitur aplikasi?"
    ]
  };
  const initialSuggestions = copy.suggestions;
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      role: "assistant",
      text: relationshipMode ? copy.relationshipGreeting : copy.greeting,
      suggestions: initialSuggestions
    }
  ]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages([{
      role: "assistant",
      text: relationshipMode ? copy.relationshipGreeting : copy.greeting,
      suggestions: copy.suggestions
    }]);
  }, [language, relationshipMode, context?.relationshipFinanceId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const sendMessage = async (rawMessage: string) => {
    const message = rawMessage.trim();
    if (!message || loading) return;

    setMessages((current) => [...current, { role: "user", text: message }]);
    setLoading(true);
    try {
      const answer = await request<{
        answer: string;
        disclaimer?: string | null;
        suggestions?: string[];
        tone?: AssistantMessage["tone"];
        highlights?: AssistantMessage["highlights"];
        actions?: AssistantMessage["actions"];
      }>("/assistant/chat", {
        method: "POST",
        body: JSON.stringify({ message, language, context: context ?? undefined })
      });
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: answer.answer,
          disclaimer: answer.disclaimer,
          suggestions: answer.suggestions,
          tone: answer.tone,
          highlights: answer.highlights,
          actions: answer.actions
        }
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: copy.error,
          suggestions: initialSuggestions
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const message = String(data.get("message") ?? "");
    form.reset();
    await sendMessage(message);
  };

  return (
    <section className="mx-auto flex h-full min-h-0 max-w-3xl flex-col overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-soft lg:h-[calc(100vh-8rem)] lg:rounded-lg lg:border-slate-200">
      <div className="shrink-0 border-b border-slate-100 bg-white px-4 py-3 lg:px-5 lg:py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#16A34A] lg:rounded-lg">
            <Bot size={20} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-tight text-slate-950">{copy.header}</h2>
            <p className="mt-0.5 truncate text-xs text-slate-500">{copy.subheader}</p>
            {relationshipMode && (
              <div className="mt-2 flex min-w-0 items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-[#16A34A]">
                <HeartPulse size={13} />
                <span className="truncate">{relationshipLabel}</span>
                {relationshipMeta && <span className="hidden text-emerald-700/70 sm:inline">- {relationshipMeta}</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-3 py-4 lg:px-5">
        <div className="space-y-3">
          {messages.map((message, index) => {
            const isUser = message.role === "user";
            const responseTone = message.tone ?? "neutral";
            const responseStyles = {
              positive: "border-emerald-100 bg-emerald-50/50",
              warning: "border-amber-100 bg-amber-50/50",
              danger: "border-rose-100 bg-rose-50/50",
              neutral: "border-slate-100 bg-white"
            };
            const highlightStyles = {
              positive: "bg-emerald-50 text-[#15803D]",
              warning: "bg-amber-50 text-amber-800",
              danger: "bg-rose-50 text-rose-700",
              neutral: "bg-slate-50 text-slate-800"
            };
            return (
              <div key={index} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div className={`${isUser ? "max-w-[86%] items-end" : "w-full items-start"}`}>
                  <div
                    className={`rounded-[18px] px-3.5 py-2.5 text-sm leading-relaxed shadow-sm lg:rounded-lg ${
                      isUser
                        ? "rounded-br-md bg-[#15803D] text-white"
                        : `rounded-bl-md border text-slate-800 ${responseStyles[responseTone]}`
                    }`}
                  >
                    <p>{message.text}</p>
                    {!isUser && message.highlights && message.highlights.length > 0 && (
                      <div className={`mt-3 grid gap-2 ${message.highlights.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                        {message.highlights.map((highlight) => (
                          <div key={`${highlight.label}-${highlight.value}`} className={`min-w-0 rounded-xl px-2.5 py-2 ${highlightStyles[highlight.tone]}`}>
                            <p className="truncate text-[10px] opacity-70">{highlight.label}</p>
                            <p className="mt-0.5 break-words text-xs font-semibold leading-4">{highlight.value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {!isUser && message.actions && message.actions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.actions.map((action) => (
                          <button
                            key={`${action.view}-${action.label}`}
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#16A34A] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#15803D]"
                            onClick={() => {
                              const allowedViews: View[] = ["manual", "history", "manage", "social", "profile", "dashboard"];
                              if (allowedViews.includes(action.view as View)) onNavigate(action.view as View);
                            }}
                          >
                            {action.label}
                            <ChevronRight size={14} />
                          </button>
                        ))}
                      </div>
                    )}
                    {message.disclaimer && <p className="mt-2 text-[11px] font-semibold opacity-70">{message.disclaimer}</p>}
                  </div>
                  {!isUser && message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {message.suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          className="rounded-full border border-emerald-100 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#16A34A] shadow-sm transition hover:bg-emerald-50 disabled:opacity-50"
                          onClick={() => sendMessage(suggestion)}
                          disabled={loading}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {loading && (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-2 rounded-[18px] rounded-bl-md border border-emerald-100 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-500 shadow-sm lg:rounded-lg">
                <Loader2 className="animate-spin text-[#16A34A]" size={15} /> {copy.loading}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      <form className="shrink-0 border-t border-slate-100 bg-white p-3" onSubmit={submit}>
        <div className="flex items-center gap-2">
          <input
            className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[13px] font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 lg:rounded-md"
            name="message"
            placeholder={copy.placeholder}
            autoComplete="off"
            disabled={loading}
          />
          <button
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#16A34A] px-4 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(22,163,74,0.22)] transition hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-60 lg:rounded-md"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Bot size={16} />}
            {copy.send}
          </button>
        </div>
      </form>
    </section>
  );
}

type SocialFriend = {
  id: string;
  userId: string;
  fullName: string;
  username: string;
  avatarUrl?: string | null;
  status: string;
  incoming: boolean;
};

type SocialGroup = {
  id: string;
  name: string;
  description?: string | null;
  memberCount: number;
  myBalance: string;
  role: string;
  status: string;
};

type SocialWallet = {
  id: string;
  name: string;
  description?: string | null;
  balance: string;
  spendingLimit?: string | null;
  requireApproval?: boolean;
  pendingCount: number;
  role: string;
  status: string;
  storageType: "cash" | "bank" | "e_wallet" | "other" | "gold";
  storageAccountId?: string | null;
  storageAccountName?: string | null;
  storageProvider?: string | null;
  storageAccountNumber?: string | null;
  expenseSplitRule?: "equal" | "percentage" | "manual";
  activeUntil?: string | null;
  goldWeightGrams?: string | null;
  goldPricePerGram?: number | null;
  goldPriceFetchedAt?: string | null;
};

type RelationshipFinanceListItem = {
  id: string;
  workspaceName: string;
  relationshipType: "partner" | "married_couple" | "family";
  status: "pending" | "active" | "cancelled" | "archived";
  acceptedAt?: string | null;
  createdAt: string;
  role: "owner" | "partner";
  partnerUserId?: string | null;
  partnerName?: string | null;
  partnerUsername?: string | null;
  partnerAvatarUrl?: string | null;
  invitationId?: string | null;
  invitationStatus?: "pending" | "accepted" | "declined" | "cancelled" | "expired" | null;
  incomingInvitation?: boolean;
};

type RelationshipGoal = {
  id: string;
  name: string;
  goalType: string;
  icon: string;
  targetAmount: string;
  currentAmount: string;
  deadline?: string | null;
  priority: "low" | "medium" | "high" | "critical";
  status: "active" | "completed" | "paused" | "cancelled";
  progress: string;
  remainingAmount: string;
  monthlyRequired?: string | null;
  trackingMode: "contribution" | "linked_account";
  linkedAccountId?: string | null;
  linkedAccountName?: string | null;
  linkedAccountOwnerName?: string | null;
  totalContributions?: number;
  lastContributionDate?: string | null;
  predictionStatus: "on_track" | "needs_attention" | "at_risk" | "completed" | "insufficient_data";
};

type RelationshipGoalContribution = {
  id: string;
  relationshipGoalId: string;
  contributorUserId?: string | null;
  contributorName?: string | null;
  amount: string;
  contributionDate: string;
  sourceType: "manual" | "transaction" | "linked_account" | "shared_wallet" | "scheduled" | "income_allocation" | "adjustment";
  accountId?: string | null;
  accountName?: string | null;
  transactionId?: string | null;
  sharedWalletEntryId?: string | null;
  notes?: string | null;
  status: "pending" | "completed" | "cancelled";
  adjustmentReason?: string | null;
  createdAt: string;
};

type RelationshipOverview = {
  relationship: RelationshipFinanceListItem & {
    members?: Array<{
      userId: string;
      fullName: string;
      username?: string | null;
      avatarUrl?: string | null;
      role: "owner" | "partner";
      status: string;
    }>;
  };
  summary: {
    period: string;
    combinedIncome: string;
    combinedExpense: string;
    combinedSaving: string;
    savingRate: string;
    combinedNetWorth: string;
    emergencyFundCoverage: string | null;
    debtToIncomeRatio: string;
  };
  goals: RelationshipGoal[];
  insights: Array<{
    type: string;
    severity: "positive" | "info" | "warning" | "critical";
    titleKey: string;
    descriptionKey: string;
    parameters: Record<string, unknown>;
  }>;
  timeline: Array<{
    id: string;
    eventType: string;
    entityType?: string | null;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
    createdAt: string;
    actorUserId?: string | null;
    actorName?: string | null;
  }>;
};

type WalletReminder = {
  id: string;
  intervalType: "daily" | "weekly" | "monthly";
  reminderTime: string;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  entryType: "deposit" | "expense";
  message: string;
  timezone: string;
  isActive: boolean;
  targetUserId?: string | null;
};

type SocialActivity = {
  id: string;
  eventType: string;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  isRead: boolean;
  createdAt: string;
};

type GroupDetail = SocialGroup & {
  members: Array<{ id: string; fullName: string; username: string; role: string; status: string }>;
  expenses: Array<{
    id: string;
    description: string;
    amount: string;
    paidByName: string;
    paidBy: string;
    createdBy: string;
    expenseDate: string;
    participants: Array<{ userId: string; name: string; shareAmount: string; status: string }>;
  }>;
  simplifiedDebts: Array<{ fromUserId: string; fromName: string; toUserId: string; toName: string; amount: string }>;
  comments: Array<{ id: string; authorName: string; message: string; createdAt: string }>;
  auditHistory: Array<{ id: string; action: string; actorName?: string; createdAt: string }>;
};

type WalletDetail = SocialWallet & {
  totalDeposit: string;
  totalExpense: string;
  goldBalanceValue?: string | null;
  storageAccountId?: string | null;
  storageAccountName?: string | null;
  members: Array<{
    id: string;
    fullName: string;
    username: string;
    role: "owner" | "admin" | "member" | "viewer";
    status: "accepted" | "pending" | "rejected";
    displayName?: string | null;
    memberNote?: string | null;
  }>;
  memberSummary: Array<{
    userId: string;
    fullName: string;
    role: string;
    deposit: string;
    expense: string;
    goldDepositGrams?: string;
    goldExpenseGrams?: string;
    goldBalanceGrams?: string;
    goldBalanceValue?: string;
  }>;
  entries: Array<{
    id: string;
    entryType: "deposit" | "expense";
    amount: string;
    description: string;
    status: string;
    createdByName: string;
    createdAt: string;
    transactionDate: string;
    receiptId?: string | null;
    goldWeightGrams?: string | null;
    goldPricePerGram?: number | null;
    goldPriceFetchedAt?: string | null;
  }>;
  auditHistory: Array<{ id: string; action: string; createdAt: string }>;
  changeRequests: Array<{
    id: string;
    title: string;
    status: string;
    requestedBy: string;
    requiredApprovals: number;
    approvedCount: number;
    rejectedCount: number;
    payload: {
      name?: string;
      description?: string | null;
      spendingLimit?: string | number | null;
      requireApproval?: boolean;
      expenseSplitRule?: "equal" | "percentage" | "manual";
      activeUntil?: string | null;
    };
    createdAt: string;
    appliedAt?: string | null;
    hasReviewed?: boolean;
  }>;
};

function SocialMetric({
  label,
  value,
  tone,
  icon
}: {
  label: string;
  value: string;
  tone: "income" | "expense" | "neutral";
  icon: JSX.Element;
}) {
  const tones = {
    income: "bg-emerald-50 text-[#16A34A]",
    expense: "bg-rose-50 text-rose-600",
    neutral: "bg-sky-50 text-sky-700"
  };
  return (
    <div className="flex min-w-0 items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[11px] text-slate-400">{label}</p>
        <p className="mt-1 truncate text-sm font-semibold text-slate-950">{value}</p>
      </div>
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</span>
    </div>
  );
}

function SocialSkeleton() {
  return (
    <div className="space-y-3" aria-label="Memuat data sosial">
      {[104, 188, 112].map((height) => (
        <div key={height} className="animate-pulse rounded-[20px] border border-slate-100 bg-white p-4 shadow-soft" style={{ height }}>
          <div className="h-3 w-24 rounded bg-slate-100" />
          <div className="mt-3 h-10 rounded-xl bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function SocialFriendPicker({
  friends,
  selectedIds,
  onToggle,
  excludedIds = new Set<string>(),
  title = "Pilih anggota"
}: {
  friends: SocialFriend[];
  selectedIds: Set<string>;
  onToggle: (friendId: string) => void;
  excludedIds?: Set<string>;
  title?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const acceptedFriends = friends.filter(
    (friend) => friend.status === "accepted" && !excludedIds.has(friend.userId)
  );
  const selectedFriends = acceptedFriends.filter((friend) => selectedIds.has(friend.userId));
  const normalizedQuery = query.trim().toLowerCase();
  const suggestions = acceptedFriends
    .filter((friend) => !selectedIds.has(friend.userId))
    .filter((friend) => !normalizedQuery
      || friend.fullName.toLowerCase().includes(normalizedQuery)
      || friend.username.toLowerCase().includes(normalizedQuery))
    .slice(0, 8);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-700">{title}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">Hanya teman Anda yang dapat dipilih.</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-[#16A34A]">
          {selectedIds.size} dipilih
        </span>
      </div>
      {acceptedFriends.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-400"><UserPlus size={17} /></span>
          <div>
            <p className="text-xs font-medium text-slate-700">Belum ada teman yang dapat dipilih</p>
            <p className="mt-0.5 text-[10px] text-slate-500">Tambahkan teman dan tunggu hingga permintaan diterima.</p>
          </div>
        </div>
      ) : (
        <div className="relative">
          {selectedFriends.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {selectedFriends.map((friend) => (
                <button
                  key={friend.userId}
                  type="button"
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[11px] font-medium text-emerald-800 transition hover:bg-emerald-100"
                  onClick={() => onToggle(friend.userId)}
                  title="Hapus pilihan"
                >
                  <span className="max-w-32 truncate">{friend.fullName}</span>
                  <X size={12} />
                </button>
              ))}
            </div>
          )}
          <div className={`flex items-center gap-2 rounded-2xl border bg-white px-3 transition ${
            open ? "border-[#16A34A] ring-2 ring-emerald-100" : "border-slate-200"
          }`}>
            <Search size={15} className="shrink-0 text-slate-400" />
            <input
              className="h-11 min-w-0 flex-1 bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => window.setTimeout(() => setOpen(false), 140)}
              placeholder="Cari nama atau username..."
              autoComplete="off"
            />
            <ChevronDown size={15} className={`shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
          </div>
          {open && (
            <div className="absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_44px_rgba(15,23,42,0.16)]">
              {suggestions.length > 0 ? suggestions.map((friend) => (
                <button
                  key={friend.userId}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-slate-50"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onToggle(friend.userId);
                    setQuery("");
                  }}
                >
                  {friend.avatarUrl
                    ? <img src={friend.avatarUrl} className="h-9 w-9 shrink-0 rounded-xl object-cover" alt="" />
                    : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#16A34A]"><UserRound size={16} /></span>}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-slate-900">{friend.fullName}</span>
                    <span className="block truncate text-[10px] text-slate-500">@{friend.username}</span>
                  </span>
                  <Plus size={15} className="shrink-0 text-[#16A34A]" />
                </button>
              )) : (
                <p className="px-3 py-3 text-xs text-slate-500">
                  {selectedIds.size === acceptedFriends.length ? "Semua teman sudah dipilih." : "Teman tidak ditemukan."}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


function WalletMembersManageModal({
  walletId,
  walletName,
  members,
  friends,
  request,
  onClose,
  onSaved
}: {
  walletId: string;
  walletName: string;
  members: WalletDetail["members"];
  friends: SocialFriend[];
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onClose: () => void;
  onSaved: (message: string) => Promise<void> | void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const existingMemberIds = useMemo(
    () => new Set(members.map((member) => member.id)),
    [members]
  );

  const toggleMember = (userId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const addMembers = async () => {
    if (selectedIds.size === 0 || loading) return;

    try {
      setLoading(true);
      setError(null);

      await Promise.all(
        [...selectedIds].map((userId) =>
          request(`/social/wallets/${walletId}/members`, {
            method: "POST",
            body: JSON.stringify({ userId, role: "member" })
          })
        )
      );

      setSelectedIds(new Set());
      await onSaved(`${selectedIds.size} anggota berhasil ditambahkan`);
    } catch {
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (member: WalletDetail["members"][number]) => {
    if (member.role === "owner" || removingMemberId) return;
    if (!window.confirm(`Hapus ${member.fullName} dari dompet ${walletName}?`)) return;

    try {
      setRemovingMemberId(member.id);
      setError(null);

      await request(`/social/wallets/${walletId}/members/${member.id}`, {
        method: "DELETE"
      });

      await onSaved(`${member.fullName} berhasil dihapus dari dompet`);
    } catch {
      setError(null);
    } finally {
      setRemovingMemberId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Tutup" onClick={onClose} />

      <section className="relative max-h-[90dvh] w-full overflow-y-auto rounded-t-[26px] bg-white p-4 shadow-xl sm:max-w-lg sm:rounded-[26px]">
        <SectionHeader
          title="Kelola anggota"
          caption={`Tambah atau hapus anggota dari ${walletName}.`}
          action={(
            <button type="button" className="mobile-icon-btn" aria-label="Tutup" onClick={onClose}>
              <X size={18} />
            </button>
          )}
        />

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-100 p-3">
            <SocialFriendPicker
              friends={friends}
              selectedIds={selectedIds}
              excludedIds={existingMemberIds}
              title="Tambah anggota"
              onToggle={toggleMember}
            />

            <button
              type="button"
              className="btn-primary mt-3 w-full justify-center"
              disabled={selectedIds.size === 0 || loading}
              onClick={addMembers}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              {loading ? "Menambahkan..." : `Tambahkan ${selectedIds.size || ""} anggota`}
            </button>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-slate-700">Anggota saat ini</p>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                {members.length} anggota
              </span>
            </div>

            <div className="space-y-2">
              {members.map((member) => {
                const isOwner = member.role === "owner";
                const isRemoving = removingMemberId === member.id;

                return (
                  <div key={member.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 px-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{member.fullName}</p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        @{member.username} � {member.status === "pending" ? "Menunggu" : "Aktif"}
                      </p>
                    </div>

                    {isOwner ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">Pemilik</span>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 disabled:opacity-50"
                        disabled={Boolean(removingMemberId)}
                        onClick={() => removeMember(member)}
                      >
                        {isRemoving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        {isRemoving ? "Menghapus" : "Hapus"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>
          )}
        </div>
      </section>
    </div>
  );
}

function SocialFriendsPanel({
  currentUser,
  friends,
  groups,
  summary,
  qrDataUrl,
  searchResults,
  searchPerson,
  scanQrFile,
  shareQr,
  runAction,
  request,
  onNavigate,
  onOpenGroups,
  onOpenPrivacy,
  selectedFriend,
  setSelectedFriend,
  friendSearchRef
}: {
  currentUser: Session["user"];
  friends: SocialFriend[];
  groups: SocialGroup[];
  summary: SocialSummary | null;
  qrDataUrl: string;
  searchResults: any[];
  searchPerson: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  scanQrFile: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  shareQr: () => Promise<void>;
  runAction: (work: () => Promise<unknown>, success: string) => Promise<void>;
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onNavigate: (view: View) => void;
  onOpenGroups: (create?: boolean) => void;
  onOpenPrivacy: () => void;
  selectedFriend: any;
  setSelectedFriend: (friend: any) => void;
  friendSearchRef: { current: HTMLInputElement | null };
}) {
  const accepted = friends.filter((friend) => friend.status === "accepted");
  const incoming = friends.filter((friend) => friend.status === "pending" && friend.incoming);
  const outgoing = friends.filter((friend) => friend.status === "pending" && !friend.incoming);
  const focusSearch = () => {
    friendSearchRef.current?.focus();
    friendSearchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="space-y-3">
      <form className="social-enter rounded-[20px] border border-[#E5E7EB] bg-white p-4 shadow-soft lg:rounded-lg" onSubmit={searchPerson}>
        <SectionHeader title="Tambah teman" caption="Cari menggunakan username, email, nomor, atau QR Code." />
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              ref={friendSearchRef}
              className="input h-11 w-full pl-9 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              name="query"
              placeholder="Cari username atau email..."
              required
            />
          </div>
          <button className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-[#16A34A] px-4 text-xs font-semibold text-white shadow-sm transition active:scale-[0.97]" aria-label="Cari pengguna">
            <Search size={17} /><span className="ml-1.5 hidden sm:inline">Cari</span>
          </button>
        </div>
        {searchResults.length > 0 && (
          <div className="mt-3 space-y-2 border-t border-[#E5E7EB] pt-3">
            {searchResults.map((person) => (
              <div key={person.id} className="flex items-center justify-between gap-2 rounded-2xl bg-[#F8FAFC] p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#111827]">{person.fullName}</p>
                  <p className="truncate text-xs text-[#6B7280]">@{person.username}</p>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-[#16A34A] disabled:text-slate-400"
                  disabled={person.relationshipStatus !== "none"}
                  onClick={() => runAction(
                    () => request("/social/friends/request", {
                      method: "POST",
                      body: JSON.stringify({ identifier: person.username })
                    }),
                    "Permintaan pertemanan dikirim"
                  )}
                >
                  {person.relationshipStatus === "none" ? "Tambah" : "Terhubung"}
                </button>
              </div>
            ))}
          </div>
        )}
      </form>

      <div className="social-enter rounded-[20px] border border-[#E5E7EB] bg-white p-4 shadow-soft lg:rounded-lg">
        <SectionHeader title="QR akun Anda" caption="Tunjukkan atau bagikan agar teman dapat menemukan Anda." />
        <div className="flex flex-col items-center">
          <div className="rounded-[20px] border border-slate-100 bg-white p-3 shadow-sm">
            {qrDataUrl
              ? <img src={qrDataUrl} className="h-40 w-40 rounded-xl" alt={`QR akun @${currentUser.username ?? ""}`} />
              : <span className="flex h-40 w-40 items-center justify-center rounded-xl bg-slate-50 text-[#16A34A]"><QrCode size={54} /></span>}
          </div>
          <p className="mt-3 text-sm font-semibold text-[#111827]">@{currentUser.username ?? "atur-username"}</p>
          <p className="mt-0.5 max-w-full truncate text-[11px] text-[#6B7280]">ID {currentUser.id}</p>
          <div className="mt-4 grid w-full grid-cols-2 gap-2">
            <button type="button" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white text-xs font-semibold text-[#374151] transition active:scale-[0.98]" onClick={shareQr}>
              <Share2 size={16} /> Bagikan
            </button>
            <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#16A34A] text-xs font-semibold text-white shadow-sm transition active:scale-[0.98]">
              <QrCode size={16} /> Scan QR
              <input className="sr-only" type="file" accept="image/*" capture="environment" onChange={scanQrFile} />
            </label>
          </div>
        </div>
      </div>

      <div className="social-enter rounded-[20px] border border-[#E5E7EB] bg-white p-4 shadow-soft lg:rounded-lg">
        <SectionHeader title={`Permintaan pertemanan${incoming.length ? ` (${incoming.length})` : ""}`} caption="Tinjau orang yang ingin terhubung dengan Anda." />
        {incoming.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl bg-[#F8FAFC] p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-400"><UserPlus size={16} /></span>
            <p className="text-xs text-[#6B7280]">Tidak ada permintaan baru.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {incoming.map((friend) => (
              <div key={friend.id} className="flex items-center gap-2 rounded-2xl bg-[#F8FAFC] p-3">
                {friend.avatarUrl
                  ? <img src={friend.avatarUrl} className="h-10 w-10 rounded-xl object-cover" alt="" />
                  : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#16A34A]"><UserRound size={17} /></span>}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#111827]">{friend.fullName}</p>
                  <p className="truncate text-xs text-[#6B7280]">@{friend.username}</p>
                </div>
                <button className="rounded-xl bg-[#16A34A] px-3 py-2 text-xs font-semibold text-white transition active:scale-95" onClick={() => runAction(
                  () => request(`/social/friends/${friend.id}/respond`, { method: "PUT", body: JSON.stringify({ status: "accepted" }) }),
                  "Pertemanan diterima"
                )}>Terima</button>
                <button className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-semibold text-[#6B7280] transition active:scale-95" onClick={() => runAction(
                  () => request(`/social/friends/${friend.id}/respond`, { method: "PUT", body: JSON.stringify({ status: "rejected" }) }),
                  "Permintaan ditolak"
                )}>Tolak</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="social-enter grid grid-cols-4 gap-2">
        {[
          { label: "Teman", value: String(accepted.length), tone: "text-[#16A34A]" },
          { label: "Grup", value: String(groups.filter((group) => group.status === "accepted").length), tone: "text-sky-700" },
          { label: "Piutang", value: rupiah(summary?.totalReceivable ?? 0), tone: "text-[#16A34A]" },
          { label: "Utang", value: rupiah(summary?.totalPayable ?? 0), tone: "text-rose-600" }
        ].map((metric) => (
          <div key={metric.label} className="min-w-0 rounded-[18px] border border-[#E5E7EB] bg-white px-2 py-3 text-center shadow-soft">
            <p className="text-[10px] text-[#6B7280]">{metric.label}</p>
            <p className={`mt-1 truncate text-xs font-semibold ${metric.tone}`} title={metric.value}>{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="social-enter overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2">
          {[
            { label: "Split Bill", icon: Users, action: () => onOpenGroups() },
            { label: "Request Money", icon: CircleDollarSign, action: focusSearch },
            { label: "Transfer", icon: ArrowLeftRight, action: () => onNavigate("accounts") },
            { label: "Buat Grup", icon: UserPlus, action: () => onOpenGroups(true) }
          ].map((action) => {
            const Icon = action.icon;
            return (
              <button key={action.label} type="button" className="flex w-[108px] flex-col items-center gap-2 rounded-[18px] border border-[#E5E7EB] bg-white px-3 py-3 text-[11px] font-medium text-[#374151] shadow-soft transition active:scale-[0.97]" onClick={action.action}>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#16A34A]"><Icon size={17} strokeWidth={1.9} /></span>
                {action.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="social-enter rounded-[20px] border border-[#E5E7EB] bg-white p-4 shadow-soft lg:rounded-lg">
        <SectionHeader title="Teman" caption={`${accepted.length} teman${outgoing.length ? ` � ${outgoing.length} menunggu` : ""}`} />
        {accepted.length === 0 ? (
          <div className="rounded-[18px] bg-[#F8FAFC] px-4 py-6 text-center">
            <div className="relative mx-auto h-20 w-28" aria-hidden="true">
              <span className="absolute left-3 top-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-[#16A34A]"><UserRound size={22} /></span>
              <span className="absolute right-3 top-2 flex h-12 w-12 items-center justify-center rounded-2xl border-4 border-[#F8FAFC] bg-white text-sky-600 shadow-sm"><UserPlus size={21} /></span>
            </div>
            <p className="mt-1 text-sm font-semibold text-[#111827]">Belum ada teman.</p>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-[#6B7280]">Mulai tambahkan teman untuk berbagi pengeluaran, split bill, dan utang piutang.</p>
            <button type="button" className="mt-4 rounded-xl bg-[#16A34A] px-4 py-2.5 text-xs font-semibold text-white" onClick={focusSearch}>Tambah teman</button>
          </div>
        ) : (
          <div className="space-y-2">
            {accepted.map((friend) => (
              <div key={friend.id} className="rounded-[18px] border border-[#E5E7EB] p-3">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 text-left"
                  onClick={async () => setSelectedFriend({
                    ...await request<Record<string, unknown>>(`/social/friends/profile/${friend.userId}`),
                    friendshipId: friend.id,
                    userId: friend.userId
                  })}
                >
                  {friend.avatarUrl
                    ? <img src={friend.avatarUrl} className="h-11 w-11 rounded-2xl object-cover" alt="" />
                    : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#16A34A]"><UserRound size={18} /></span>}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#111827]">{friend.fullName}</p>
                    <p className="truncate text-xs text-[#6B7280]">@{friend.username}</p>
                    <p className="mt-1 text-[11px] text-slate-400">Lihat transaksi bersama</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </button>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#E5E7EB] pt-3">
                  <button type="button" className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-[#16A34A]" onClick={() => onOpenGroups()}>Split Bill</button>
                  <button type="button" className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-[#374151]" onClick={focusSearch}>Request</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {selectedFriend && (
          <div className="mt-3 rounded-[18px] bg-[#F8FAFC] p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-[#111827]">{selectedFriend.fullName}</p>
                <p className="text-xs text-[#6B7280]">@{selectedFriend.username} � {selectedFriend.commonGroups} grup bersama</p>
              </div>
              <button className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500" onClick={() => setSelectedFriend(null)}><X size={15} /></button>
            </div>
            <p className="mt-3 text-xs text-[#6B7280]">Posisi dengan Anda</p>
            <p className={`mt-0.5 text-lg font-semibold ${Number(selectedFriend.balance) >= 0 ? "text-[#16A34A]" : "text-rose-600"}`}>
              {Number(selectedFriend.balance) === 0 ? "Selesai" : rupiah(Math.abs(Number(selectedFriend.balance)))}
            </p>
            <div className="mt-3 space-y-2">
              {selectedFriend.sharedTransactions?.map((row: any) => (
                <div key={row.id} className="flex justify-between gap-3 border-t border-[#E5E7EB] pt-2 text-xs">
                  <span>{row.description} � {row.groupName}</span><span className="font-semibold">{rupiah(row.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="social-enter min-h-[108px] rounded-[20px] bg-[#16A34A] p-4 text-white shadow-[0_14px_34px_rgba(22,163,74,0.16)] lg:rounded-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="rounded-full bg-white/10 px-2 py-1 text-[9px] font-semibold uppercase text-emerald-100">Keuangan sosial</span>
            <h3 className="mt-2 text-base font-semibold">Bayar bareng tanpa buka data pribadi</h3>
            <p className="mt-1 text-[11px] leading-4 text-emerald-50/80">Hanya transaksi yang melibatkan teman yang akan terlihat.</p>
          </div>
          <button type="button" className="shrink-0 rounded-xl bg-white px-3 py-2 text-[11px] font-semibold text-[#16A34A]" onClick={onOpenPrivacy}>Pelajari</button>
        </div>
      </div>
    </div>
  );
}

function SocialHubView({
  request,
  accounts,
  token,
  currentUser,
  summary,
  language,
  onChanged,
  onChildFrameStateChange,
  onOpenAssistantContext
}: {
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  accounts: Account[];
  token: string;
  currentUser: Session["user"];
  summary: SocialSummary | null;
  language: AppLanguage;
  onChanged: () => Promise<void>;
  onChildFrameStateChange?: (state: ChildFrameState) => void;
  onOpenAssistantContext: (context: AssistantContext) => void;
}) {
  const [tab, setTab] = useState<"friends" | "groups" | "wallets" | "relationships" | "activity" | "privacy" | null>(null);
  const [friends, setFriends] = useState<SocialFriend[]>([]);
  const [groups, setGroups] = useState<SocialGroup[]>([]);
  const [wallets, setWallets] = useState<SocialWallet[]>([]);
  const [relationships, setRelationships] = useState<RelationshipFinanceListItem[]>([]);
  const [selectedRelationship, setSelectedRelationship] = useState<RelationshipFinanceListItem | null>(null);
  const [relationshipOverviewData, setRelationshipOverviewData] = useState<RelationshipOverview | null>(null);
  const [relationshipPartnerId, setRelationshipPartnerId] = useState("");
  const [relationshipDetailTab, setRelationshipDetailTab] = useState<"goals" | "timeline">("goals");
  const [relationshipGoalFilterId, setRelationshipGoalFilterId] = useState("");
  const [showCreateRelationship, setShowCreateRelationship] = useState(false);
  const [goalFormMode, setGoalFormMode] = useState<null | "add" | "edit">(null);
  const [editingGoal, setEditingGoal] = useState<RelationshipGoal | null>(null);
  const [goalAction, setGoalAction] = useState<null | { goal: RelationshipGoal; type: "contribution" | "adjustment" | "history" }>(null);
  const [goalContributions, setGoalContributions] = useState<RelationshipGoalContribution[]>([]);
  const [goalContributionLoading, setGoalContributionLoading] = useState(false);
  const [activity, setActivity] = useState<SocialActivity[]>([]);
  const [activityLoadingMore, setActivityLoadingMore] = useState(false);
  const [activityHasMore, setActivityHasMore] = useState(true);
  const [privacy, setPrivacy] = useState({
    allowWalletInvites: true,
    allowGroupInvites: true,
    searchableBy: "username",
    hidePhone: true
  });
  const [selectedGroup, setSelectedGroup] = useState<GroupDetail | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<WalletDetail | null>(null);
  const [walletReminders, setWalletReminders] = useState<WalletReminder[]>([]);
  const [showWalletReminderForm, setShowWalletReminderForm] = useState(false);
  const [showWalletEntryForm, setShowWalletEntryForm] = useState(false);
  const [showWalletEditModal, setShowWalletEditModal] = useState(false);
  const [showWalletMembersModal, setShowWalletMembersModal] = useState(false);
  const [walletEntryReceiptId, setWalletEntryReceiptId] = useState<string | null>(null);
  const [walletEntryAttachmentName, setWalletEntryAttachmentName] = useState("");
  const [walletEntryAttachmentMessage, setWalletEntryAttachmentMessage] = useState<string | null>(null);
  const [walletEntryDate, setWalletEntryDate] = useState(isoDateInput());
  const [walletEntryAttachmentLoading, setWalletEntryAttachmentLoading] = useState(false);
  const [walletStorageMode, setWalletStorageMode] = useState<"account" | "manual">("account");
  const [walletStorageAccountId, setWalletStorageAccountId] = useState("");
  const [walletAdminIds, setWalletAdminIds] = useState<Set<string>>(new Set());
  const [walletReminderInterval, setWalletReminderInterval] = useState<"daily" | "weekly" | "monthly">("daily");
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [friendSearchQuery, setFriendSearchQuery] = useState("");
  const [friendSearchLoading, setFriendSearchLoading] = useState(false);
  const [friendSearchAttempted, setFriendSearchAttempted] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateWallet, setShowCreateWallet] = useState(false);
  const [groupMemberIds, setGroupMemberIds] = useState<Set<string>>(new Set());
  const [walletMemberIds, setWalletMemberIds] = useState<Set<string>>(new Set());
  const [walletInviteActionId, setWalletInviteActionId] = useState<string | null>(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingGroupExpense, setEditingGroupExpense] = useState<GroupDetail["expenses"][number] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const friendSearchRef = useRef<HTMLInputElement>(null);
  const activitySentinelRef = useRef<HTMLDivElement>(null);
  const walletEntryFormRef = useRef<HTMLFormElement>(null);
  const walletDeepLinkHandled = useRef(false);
  const toggleSelectedFriend = (
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    friendId: string
  ) => {
    setter((current) => {
      const next = new Set(current);
      if (next.has(friendId)) next.delete(friendId);
      else next.add(friendId);
      return next;
    });
  };
  const socialEnumLabel = (value: string) => {
    const labels: Record<string, { en: string; id: string }> = {
      accepted: { en: "Accepted", id: "Diterima" },
      pending: { en: "Pending", id: "Menunggu" },
      rejected: { en: "Rejected", id: "Ditolak" },
      blocked: { en: "Blocked", id: "Diblokir" },
      approved: { en: "Approved", id: "Disetujui" },
      cancelled: { en: "Cancelled", id: "Dibatalkan" },
      owner: { en: "Owner", id: "Pemilik" },
      admin: { en: "Admin", id: "Admin" },
      member: { en: "Member", id: "Anggota" },
      viewer: { en: "Viewer", id: "Pengamat" }
    };
    return labels[value]?.[language] ?? value;
  };

  const pendingWallets = wallets.filter((wallet) => wallet.status === "pending");
  const activeWallets = wallets.filter((wallet) => wallet.status === "accepted");
  const activeWalletBalance = activeWallets.reduce((total, wallet) => total + Number(wallet.balance || 0), 0);
  const pendingWalletApprovals = activeWallets.reduce((total, wallet) => total + Number(wallet.pendingCount || 0), 0);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 3600);
    return () => window.clearTimeout(timer);
  }, [message]);

  const refresh = async () => {
    setLoading(true);
    try {
      const [nextFriends, nextGroups, nextWallets, nextActivity, nextPrivacy] = await Promise.all([
        request<SocialFriend[]>("/social/friends"),
        request<SocialGroup[]>("/social/groups"),
        request<SocialWallet[]>("/social/wallets"),
        request<SocialActivity[]>("/social/activity?limit=20&offset=0"),
        request<typeof privacy>("/social/privacy")
      ]);
      const nextRelationships = await request<RelationshipFinanceListItem[]>("/relationship-finances").catch(() => []);
      setFriends(nextFriends);
      setGroups(nextGroups);
      setWallets(nextWallets);
      setRelationships(nextRelationships);
      setActivity(nextActivity);
      setActivityHasMore(nextActivity.length === 20);
      setPrivacy(nextPrivacy);
    } catch {
      setMessage(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const resetSocialState = () => {
      setSelectedGroup(null);
      setSelectedWallet(null);
      setSelectedRelationship(null);
      setRelationshipOverviewData(null);
      setRelationshipDetailTab("goals");
      setRelationshipGoalFilterId("");
      setGoalFormMode(null);
      setEditingGoal(null);
      setSelectedFriend(null);
      setShowCreateGroup(false);
      setShowCreateWallet(false);
      setShowCreateRelationship(false);
      setGroupMemberIds(new Set());
      setWalletMemberIds(new Set());
      setShowWalletReminderForm(false);
      setShowWalletEntryForm(false);
    };

    onChildFrameStateChange?.({
      active: tab !== null && !showWalletEditModal && !showWalletMembersModal,
      onBack: tab === null
        ? null
        : () => {
            if (selectedGroup) {
              setSelectedGroup(null);
              return;
            }
            if (selectedWallet) {
              setSelectedWallet(null);
              setShowWalletReminderForm(false);
              setShowWalletEntryForm(false);
              return;
            }
            if (goalFormMode || goalAction) {
              setGoalFormMode(null);
              setEditingGoal(null);
              setGoalAction(null);
              return;
            }
            if (selectedRelationship) {
              setSelectedRelationship(null);
              setRelationshipOverviewData(null);
              setRelationshipDetailTab("goals");
              setRelationshipGoalFilterId("");
              setGoalFormMode(null);
              setEditingGoal(null);
              return;
            }
            if (showCreateGroup) {
              setShowCreateGroup(false);
              setGroupMemberIds(new Set());
              return;
            }
            if (showCreateWallet) {
              setShowCreateWallet(false);
              setWalletMemberIds(new Set());
              return;
            }
            if (showCreateRelationship) {
              setShowCreateRelationship(false);
              setRelationshipPartnerId("");
              return;
            }
            if (selectedFriend) {
              setSelectedFriend(null);
              return;
            }
            setTab(null);
            resetSocialState();
          },
      onRefresh: refresh
    });
  }, [
    onChildFrameStateChange,
    selectedFriend,
    selectedGroup,
    selectedRelationship,
    selectedWallet,
    showCreateGroup,
    showCreateRelationship,
    showCreateWallet,
    showWalletEditModal,
    showWalletMembersModal,
    tab
  ]);

  useEffect(() => {
    const query = friendSearchQuery.trim();
    if (tab !== "friends" || query.length < 2) {
      setSearchResults([]);
      setFriendSearchAttempted(false);
      setFriendSearchLoading(false);
      if (tab === "friends") setMessage(null);
      return;
    }

    let active = true;
    setMessage(null);
    const timer = window.setTimeout(async () => {
      setFriendSearchLoading(true);
      try {
        const results = await request<any[]>(`/social/people/search?q=${encodeURIComponent(query)}`);
        if (!active) return;
        setSearchResults(results);
        setFriendSearchAttempted(true);
        if (results.length > 0) setMessage(null);
      } catch {
        if (!active) return;
        setSearchResults([]);
        setFriendSearchAttempted(true);
      } finally {
        if (active) setFriendSearchLoading(false);
      }
    }, 320);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [friendSearchQuery, tab]);

  useEffect(() => {
    if (!currentUser.username) return;
    QRCode.toDataURL(`finance-ai:user:${currentUser.username}`, {
      width: 220,
      margin: 1,
      color: { dark: "#16A34A", light: "#ffffff" }
    }).then(setQrDataUrl).catch(() => setQrDataUrl(""));
  }, [currentUser.username]);

  const scanQrFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const Detector = (window as any).BarcodeDetector;
      const bitmap = await createImageBitmap(file);
      let value = "";
      if (Detector) {
        const detector = new Detector({ formats: ["qr_code"] });
        const codes = await detector.detect(bitmap);
        value = String(codes[0]?.rawValue ?? "");
      } else {
        const maxSide = 1400;
        const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const pixels = context?.getImageData(0, 0, canvas.width, canvas.height);
        value = pixels ? jsQR(pixels.data, pixels.width, pixels.height)?.data ?? "" : "";
      }
      bitmap.close();
      if (!value) throw new Error("QR code tidak terbaca");
      setSearchResults(await request<any[]>(`/social/people/search?q=${encodeURIComponent(value)}`));
      setMessage(null);
    } catch {
      setMessage(null);
    } finally {
      event.target.value = "";
    }
  };

  const runAction = async (work: () => Promise<unknown>, success: string) => {
    setMessage(null);
    try {
      await work();
      setMessage(success);
      await refresh();
      await onChanged();
    } catch {
      setMessage(null);
    }
  };

  const respondWalletInvitation = async (wallet: SocialWallet, status: "accepted" | "rejected") => {
    if (walletInviteActionId) return;

    setWalletInviteActionId(wallet.id);
    setMessage(null);
    try {
      await request(`/social/wallets/${wallet.id}/invite`, {
        method: "PUT",
        body: JSON.stringify({ status })
      });
      setMessage(status === "accepted" ? `Anda bergabung ke ${wallet.name}` : `Undangan ${wallet.name} ditolak`);
      await refresh();
      await onChanged();
    } catch {
      setMessage(null);
    } finally {
      setWalletInviteActionId(null);
    }
  };

  const searchPerson = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = friendSearchQuery.trim() || String(new FormData(event.currentTarget).get("query") || "").trim();
    if (query.length < 2) return;
    setFriendSearchLoading(true);
    try {
      const results = await request<any[]>(`/social/people/search?q=${encodeURIComponent(query)}`);
      setSearchResults(results);
      setFriendSearchAttempted(true);
      if (results.length > 0) setMessage(null);
    } catch {
      setMessage(null);
    } finally {
      setFriendSearchLoading(false);
    }
  };

  const shareAccountQr = async () => {
    const accountCode = `finance-ai:user:${currentUser.username ?? currentUser.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Tambah saya di Finly AI",
          text: `Temukan saya dengan username @${currentUser.username ?? currentUser.id}\n${accountCode}`
        });
      } else {
        await navigator.clipboard.writeText(accountCode);
        setMessage("Kode akun berhasil disalin");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("Kode akun belum dapat dibagikan");
    }
  };

  const uploadWalletEntryAttachment = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setWalletEntryAttachmentLoading(true);
    setWalletEntryAttachmentName(file.name);
    setWalletEntryAttachmentMessage("Mengunggah file...");
    try {
      const uploadForm = new FormData();
      uploadForm.set("receipt", file);
      try {
        const uploaded = await request<{ id: string }>("/receipts/upload", {
          method: "POST",
          body: uploadForm
        });
        setWalletEntryReceiptId(uploaded.id);
      } catch (error) {
        const duplicateId = error instanceof ApiError && error.status === 409 && error.details && typeof error.details === "object"
          ? String((error.details as { receiptId?: unknown }).receiptId ?? "")
          : "";
        if (!duplicateId) throw error;
        setWalletEntryReceiptId(duplicateId);
      }
      setMessage("Attachment berhasil diunggah");
      setWalletEntryAttachmentMessage("File siap disimpan bersama transaksi dompet.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Attachment gagal diunggah";
      setWalletEntryAttachmentMessage(errorMessage);
      setMessage(errorMessage);
    } finally {
      setWalletEntryAttachmentLoading(false);
      event.target.value = "";
    }
  };

  const openWalletAttachment = async (receiptId: string) => {
    try {
      const response = await fetch(downloadUrl(`/receipts/${receiptId}/file`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Attachment tidak dapat dimuat");
      const blob = await response.blob();
      const signature = new TextDecoder("ascii").decode(await blob.slice(4, 16).arrayBuffer());
      const isHeic = /image\/hei[cf]/i.test(blob.type) || /ftyp(?:heic|heix|hevc|hevx|mif1|msf1)/i.test(signature);
      const previewBlob = isHeic
        ? (await heic2any({ blob, toType: "image/jpeg", quality: 0.9 }))
        : blob;
      const resolvedBlob = Array.isArray(previewBlob) ? previewBlob[0] : previewBlob;
      const url = URL.createObjectURL(resolvedBlob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setMessage(null);
    }
  };

  const openGroup = async (id: string) => {
    setSelectedGroup(await request<GroupDetail>(`/social/groups/${id}`));
    setGroupMemberIds(new Set());
    setShowExpenseForm(false);
  };

  const openWallet = async (id: string) => {
    const [wallet, reminders] = await Promise.all([
      request<WalletDetail>(`/social/wallets/${id}`),
      request<WalletReminder[]>(`/social/wallets/${id}/reminders`).catch(() => [])
    ]);
    setSelectedWallet(wallet);
    setShowWalletEditModal(false);
    setShowWalletMembersModal(false);
    setWalletMemberIds(new Set());
    setWalletReminders(reminders);
    setShowWalletEntryForm(false);
    setWalletEntryReceiptId(null);
    setWalletEntryAttachmentName("");
    setWalletEntryAttachmentMessage(null);
    setWalletEntryDate(isoDateInput());
  };

  const openRelationship = async (item: RelationshipFinanceListItem) => {
    setSelectedRelationship(item);
    setShowCreateRelationship(false);
    setRelationshipPartnerId("");
    setRelationshipDetailTab("goals");
    setRelationshipGoalFilterId("");
    setGoalFormMode(null);
    setEditingGoal(null);
    setGoalAction(null);
    if (item.status === "active") {
      setRelationshipOverviewData(await request<RelationshipOverview>(`/relationship-finances/${item.id}/overview`));
    } else {
      setRelationshipOverviewData(null);
    }
  };

  const respondRelationship = async (item: RelationshipFinanceListItem, action: "accept" | "decline" | "cancel") => {
    if (!item.invitationId) return;
    await runAction(
      async () => {
        try {
          await request(`/relationship-finances/${item.id}/invitations/${item.invitationId}/${action}`, { method: "POST" });
        } catch (error) {
          if (error instanceof ApiError && error.status === 404) {
            await request(`/relationship-finances/invitations/${item.invitationId}/${action}`, { method: "POST" });
            return;
          }
          throw error;
        }
      },
      action === "accept"
        ? (language === "en" ? "Relationship Finance is active" : "Relationship Finance sudah aktif")
        : (language === "en" ? "Invitation updated" : "Undangan diperbarui")
    );
    setSelectedRelationship(null);
    setRelationshipOverviewData(null);
  };

  const createRelationship = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await runAction(
      () => request("/relationship-finances", {
        method: "POST",
        body: JSON.stringify({
          partnerUserId: relationshipPartnerId,
          workspaceName: String(data.get("workspaceName") ?? ""),
          relationshipType: String(data.get("relationshipType") ?? "partner"),
          privacy: {
            incomeVisibility: String(data.get("incomeVisibility") ?? "summary_only"),
            expenseVisibility: String(data.get("expenseVisibility") ?? "summary_only"),
            accountsVisibility: String(data.get("accountsVisibility") ?? "private"),
            transactionsVisibility: String(data.get("transactionsVisibility") ?? "private"),
            assetsVisibility: String(data.get("assetsVisibility") ?? "summary_only"),
            liabilitiesVisibility: String(data.get("liabilitiesVisibility") ?? "summary_only"),
            investmentsVisibility: "private",
            goalsVisibility: "shared"
          }
        })
      }),
      language === "en" ? "Invitation sent" : "Undangan dikirim"
    );
    setShowCreateRelationship(false);
    setRelationshipPartnerId("");
  };

  const submitRelationshipGoal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRelationship) return;
    const data = new FormData(event.currentTarget);
    const trackingMode = String(data.get("trackingMode") ?? "linked_account") as "contribution" | "linked_account";
    const isEdit = goalFormMode === "edit" && editingGoal;
    await runAction(
      () => request(isEdit
        ? `/relationship-finances/${selectedRelationship.id}/goals/${editingGoal.id}`
        : `/relationship-finances/${selectedRelationship.id}/goals`, {
        method: isEdit ? "PATCH" : "POST",
        body: JSON.stringify({
          name: String(data.get("name") ?? ""),
          goalType: String(data.get("goalType") ?? "custom"),
          targetAmount: String(data.get("targetAmount") ?? "0"),
          deadline: String(data.get("deadline") || "") || null,
          priority: String(data.get("priority") ?? "medium"),
          description: String(data.get("description") || "") || null,
          trackingMode,
          linkedAccountId: trackingMode === "linked_account" ? String(data.get("linkedAccountId") || "") || null : null
        })
      }),
      isEdit
        ? (language === "en" ? "Goal updated" : "Goal diperbarui")
        : (language === "en" ? "Goal added" : "Goal ditambahkan")
    );
    await openRelationship(selectedRelationship);
    setGoalFormMode(null);
    setEditingGoal(null);
    event.currentTarget.reset();
  };

  const openGoalHistory = async (goal: RelationshipGoal, type: "history" | "contribution" | "adjustment") => {
    setGoalAction({ goal, type });
    setGoalFormMode(null);
    setEditingGoal(null);
    setGoalContributionLoading(true);
    try {
      const rows = await request<RelationshipGoalContribution[]>(`/relationship-finances/${selectedRelationship?.id}/goals/${goal.id}/contributions`);
      setGoalContributions(rows);
    } catch {
      setMessage(null);
      setGoalContributions([]);
    } finally {
      setGoalContributionLoading(false);
    }
  };

  const submitGoalContribution = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRelationship || !goalAction) return;
    const data = new FormData(event.currentTarget);
    const isAdjustment = goalAction.type === "adjustment";
    await runAction(
      () => request(`/relationship-finances/${selectedRelationship.id}/goals/${goalAction.goal.id}/${isAdjustment ? "adjustments" : "contributions"}`, {
        method: "POST",
        body: JSON.stringify({
          amount: String(data.get("amount") ?? ""),
          contributionDate: String(data.get("contributionDate") || "") || null,
          contributorUserId: String(data.get("contributorUserId") || "") || currentUser.id,
          sourceType: isAdjustment ? "adjustment" : String(data.get("sourceType") || "manual"),
          notes: String(data.get("notes") || "") || null,
          adjustmentReason: isAdjustment ? String(data.get("adjustmentReason") || "") : null,
          status: "completed"
        })
      }),
      isAdjustment
        ? (language === "en" ? "Goal adjusted" : "Goal disesuaikan")
        : (language === "en" ? "Contribution added" : "Kontribusi ditambahkan")
    );
    await openRelationship(selectedRelationship);
    await openGoalHistory(goalAction.goal, "history");
  };

  useEffect(() => {
    if (loading || walletDeepLinkHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    const walletId = params.get("walletId");
    if (!walletId) return;
    walletDeepLinkHandled.current = true;
    setTab("wallets");
    openWallet(walletId)
      .then(() => {
        if (params.get("walletAction") === "record") {
          setShowWalletEntryForm(true);
          window.setTimeout(() => walletEntryFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 180);
        }
      })
      .catch(() => setMessage("Dompet bersama tidak dapat dibuka"));
  }, [loading]);

  const loadMoreActivity = async () => {
    if (activityLoadingMore || !activityHasMore) return;
    setActivityLoadingMore(true);
    try {
      const rows = await request<SocialActivity[]>(`/social/activity?limit=20&offset=${activity.length}`);
      setActivity((current) => {
        const existingIds = new Set(current.map((item) => item.id));
        return [...current, ...rows.filter((item) => !existingIds.has(item.id))];
      });
      setActivityHasMore(rows.length === 20);
    } catch {
      setActivityHasMore(false);
    } finally {
      setActivityLoadingMore(false);
    }
  };

  useEffect(() => {
    if (tab !== "activity" || !activitySentinelRef.current || !activityHasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMoreActivity();
      },
      { rootMargin: "180px 0px" }
    );
    observer.observe(activitySentinelRef.current);
    return () => observer.disconnect();
  }, [tab, activity.length, activityHasMore, activityLoadingMore]);

  const filteredRelationshipGoal = relationshipOverviewData?.goals.find((goal) => goal.id === relationshipGoalFilterId) ?? null;
  const filteredRelationshipTimeline = relationshipOverviewData
    ? relationshipGoalFilterId
      ? relationshipOverviewData.timeline.filter((event) => {
          const metadata = event.metadata ?? {};
          const metadataGoalId = String(metadata.goalId ?? metadata.relationshipGoalId ?? "");
          return event.entityId === relationshipGoalFilterId || metadataGoalId === relationshipGoalFilterId;
        })
      : relationshipOverviewData.timeline
    : [];
  const filteredRelationshipInsights = relationshipOverviewData
    ? relationshipGoalFilterId
      ? relationshipOverviewData.insights.filter((insight) => insight.type.includes("goal"))
      : relationshipOverviewData.insights
    : [];

  const tabs = [
    {
      id: "friends" as const,
      label: "Teman",
      icon: UserPlus,
      count: `${friends.filter((friend) => friend.status === "accepted").length} teman`,
      meta: friends.some((friend) => friend.incoming) ? `${friends.filter((friend) => friend.incoming).length} permintaan menunggu` : "Cari teman dan kelola transaksi bersama",
      tone: "bg-emerald-50 text-[#16A34A]"
    },
    {
      id: "groups" as const,
      label: "Grup",
      icon: Users,
      count: `${groups.length} grup`,
      meta: "Split bill dan pengeluaran bersama",
      tone: "bg-sky-50 text-sky-700"
    },
    {
      id: "wallets" as const,
      label: "Dompet bersama",
      icon: Wallet,
      count: `${wallets.length} dompet`,
      meta: "Kelola kas dan saldo bersama",
      tone: "bg-violet-50 text-violet-700"
    },
    {
      id: "relationships" as const,
      label: language === "en" ? "Relationship Finance" : "Relationship Finance",
      icon: HeartPulse,
      count: `${relationships.filter((item) => item.status === "active").length} aktif`,
      meta: language === "en" ? "Shared goals, budget, assets, and partner insights" : "Goal, budget, aset, dan insight bersama pasangan",
      tone: "bg-rose-50 text-rose-700"
    },
    {
      id: "activity" as const,
      label: "Aktivitas",
      icon: Bell,
      count: `${activity.filter((row) => !row.isRead).length} baru`,
      meta: "Permintaan dan perubahan yang melibatkan Anda",
      tone: "bg-amber-50 text-amber-700"
    },
    {
      id: "privacy" as const,
      label: "Privasi",
      icon: ShieldCheck,
      count: "Terlindungi",
      meta: "Atur pencarian dan izin undangan",
      tone: "bg-rose-50 text-rose-700"
    }
  ];
  const groupedActivity = activity.reduce<Array<{ key: string; label: string; items: SocialActivity[] }>>((groups, item) => {
    const date = new Date(item.createdAt);
    const key = jakartaDateParts(date).value;
    const existing = groups.find((group) => group.key === key);
    if (existing) {
      existing.items.push(item);
      return groups;
    }
    groups.push({
      key,
      label: new Intl.DateTimeFormat(language === "en" ? "en-US" : "id-ID", {
        timeZone: APP_TIME_ZONE,
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }).format(date),
      items: [item]
    });
    return groups;
  }, []);
  const selectedWalletStorageAccount = accounts.find((account) => account.id === walletStorageAccountId);

  return (
    <section className="mx-auto max-w-6xl space-y-3">
      {tab === null ? (
        <>
          <div className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-soft lg:rounded-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase text-[#16A34A]">Social</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">Keuangan bersama</h2>
                <p className="mt-1 text-xs text-slate-500">Teman, grup, dan tagihan dalam satu tempat.</p>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#16A34A]">
                <Users size={21} />
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              <SocialMetric label="Harus dibayar" value={rupiah(summary?.totalPayable ?? 0)} tone="expense" icon={<ArrowUpRight size={14} />} />
              <SocialMetric label="Harus diterima" value={rupiah(summary?.totalReceivable ?? 0)} tone="income" icon={<ArrowDownLeft size={14} />} />
              <SocialMetric label="Grup aktif" value={String(summary?.activeGroups ?? 0)} tone="neutral" icon={<Users size={14} />} />
              <SocialMetric label="Perlu konfirmasi" value={String(summary?.pendingConfirmations ?? 0)} tone="neutral" icon={<Bell size={14} />} />
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-100 bg-white p-3 shadow-soft lg:rounded-lg">
            <div className="grid grid-cols-1 gap-3">
              {tabs.filter((item) => item.id !== "activity").map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="ripple-card flex min-h-[88px] items-center gap-3 rounded-[18px] border border-slate-100 bg-white p-3 text-left transition hover:border-emerald-100 hover:bg-slate-50 active:scale-[0.99] lg:rounded-md"
                    onClick={() => {
                      setTab(item.id);
                      setSelectedGroup(null);
                      setSelectedWallet(null);
                      setSelectedRelationship(null);
                      setRelationshipOverviewData(null);
                      setSelectedFriend(null);
                      setShowCreateGroup(false);
                      setShowCreateWallet(false);
                      setShowCreateRelationship(false);
                      setGroupMemberIds(new Set());
                      setWalletMemberIds(new Set());
                      setRelationshipPartnerId("");
                    }}
                  >
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${item.tone}`}>
                      <Icon size={23} strokeWidth={2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-950">{item.label}</span>
                        <span className="max-w-[120px] shrink-0 truncate rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{item.count}</span>
                      </span>
                      <span className="mt-1 block truncate text-[11px] text-slate-500">{item.meta}</span>
                    </span>
                    <ChevronRight size={19} className="shrink-0 text-slate-300" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-soft lg:rounded-lg">
            <SectionHeader
              title="Aktivitas terbaru"
              caption="Pembaruan yang melibatkan Anda"
              action={activity.length > 0 ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#16A34A]"
                  onClick={() => setTab("activity")}
                >
                  Lihat selengkapnya <ChevronRight size={14} />
                </button>
              ) : undefined}
            />
            <div className="space-y-1">
              {loading && <SocialSkeleton />}
              {!loading && activity.length === 0 && <EmptyState text="Belum ada aktivitas sosial." />}
              {!loading && activity.slice(0, 5).map((event) => (
                <button
                  key={event.id}
                  type="button"
                  className="flex w-full items-start gap-3 rounded-2xl px-2 py-3 text-left transition hover:bg-slate-50"
                  onClick={() => setTab("activity")}
                >
                  <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${event.isRead ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-[#16A34A]"}`}>
                    <Bell size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-slate-900">{event.title}</span>
                      {!event.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-[#16A34A]" />}
                    </span>
                    {event.body && <span className="mt-0.5 block truncate text-xs text-slate-500">{event.body}</span>}
                    <span className="mt-1 block text-[10px] text-slate-400">{localDate(event.createdAt)}</span>
                  </span>
                  <ChevronRight size={16} className="mt-2 shrink-0 text-slate-300" />
                </button>
              ))}
            </div>
          </div>
        </>
      ) : !selectedGroup && !selectedWallet && !selectedRelationship && !showCreateGroup && !showCreateWallet && !showCreateRelationship ? (
        <div className="flex items-center justify-between rounded-[20px] border border-slate-100 bg-white p-3 shadow-soft lg:rounded-lg">
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-xl px-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 active:scale-95"
            onClick={() => {
              setTab(null);
              setSelectedGroup(null);
              setSelectedWallet(null);
              setSelectedRelationship(null);
              setRelationshipOverviewData(null);
              setSelectedFriend(null);
              setShowCreateGroup(false);
              setShowCreateWallet(false);
              setShowCreateRelationship(false);
              setGroupMemberIds(new Set());
              setWalletMemberIds(new Set());
              setRelationshipPartnerId("");
            }}
          >
            <ArrowLeft size={16} /> Kembali ke Social
          </button>
          {(() => {
            const activeItem = tabs.find((item) => item.id === tab)!;
            const Icon = activeItem.icon;
            return (
              <div className="flex min-w-0 items-center gap-2">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${activeItem.tone}`}>
                  <Icon size={17} />
                </span>
                <div className="min-w-0 text-right">
                  <p className="truncate text-sm font-semibold text-slate-950">{activeItem.label}</p>
                  <p className="text-[10px] text-slate-500">{activeItem.count}</p>
                </div>
              </div>
            );
          })()}
        </div>
      ) : null}

      {message && (
        <div className="fixed left-4 right-4 top-20 z-50 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_18px_44px_rgba(15,23,42,0.16)] lg:left-auto lg:right-6 lg:w-96 lg:rounded-lg">
          {message}
        </div>
      )}
      {loading && tab !== null && <LoadingState />}

      {!loading && tab === "relationships" && (
        <div className="space-y-3">
          {showCreateRelationship ? (
            <form className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg" onSubmit={createRelationship}>
              <div className="mb-4 flex items-start justify-between gap-3">
                <SectionHeader
                  title={language === "en" ? "Create Relationship Finance" : "Buat Relationship Finance"}
                  caption={language === "en" ? "Invite one accepted friend as your partner." : "Undang satu teman aktif sebagai partner."}
                />
                <button type="button" className="rounded-xl p-2 text-slate-500 hover:bg-slate-50" onClick={() => setShowCreateRelationship(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3">
                <Field label={language === "en" ? "Partner" : "Partner"}>
                  <select className="input" value={relationshipPartnerId} onChange={(event) => setRelationshipPartnerId(event.target.value)} required>
                    <option value="">{language === "en" ? "Select friend" : "Pilih teman"}</option>
                    {friends.filter((friend) => friend.status === "accepted").map((friend) => (
                      <option key={friend.userId} value={friend.userId}>{friend.fullName} @{friend.username}</option>
                    ))}
                  </select>
                </Field>
                <Field label={language === "en" ? "Workspace name" : "Nama workspace"}>
                  <input className="input" name="workspaceName" placeholder={language === "en" ? "Example: Shared Finance" : "Contoh: Keuangan Bersama"} required minLength={2} />
                </Field>
                <Field label={language === "en" ? "Relationship type" : "Jenis hubungan"}>
                  <select className="input" name="relationshipType" defaultValue="partner">
                    <option value="partner">Partner</option>
                    <option value="married_couple">{language === "en" ? "Married Couple" : "Pasangan menikah"}</option>
                  </select>
                </Field>
                <div className="rounded-2xl bg-[#F8FAFC] p-3">
                  <p className="text-xs font-semibold text-slate-900">{language === "en" ? "Data sharing" : "Data yang dibagikan"}</p>
                  <p className="mt-1 text-[11px] leading-4 text-slate-500">
                    {language === "en"
                      ? "Choose what your partner can use inside Relationship Finance. This does not change your private transaction visibility outside this workspace."
                      : "Pilih data apa yang boleh dipakai partner di Relationship Finance. Ini tidak mengubah visibilitas transaksi pribadi di luar workspace ini."}
                  </p>
                  <div className="mt-3 grid gap-2">
                    <div className="grid gap-2 sm:grid-cols-3">
                      {[
                        [
                          language === "en" ? "Private" : "Private",
                          language === "en" ? "Not used or shown in shared analysis." : "Tidak dipakai atau ditampilkan di analisis bersama."
                        ],
                        [
                          language === "en" ? "Summary only" : "Ringkasan saja",
                          language === "en" ? "Only aggregate totals, no names or details." : "Hanya total agregat, tanpa nama dan detail."
                        ],
                        [
                          language === "en" ? "Shared" : "Dibagikan",
                          language === "en" ? "Can show relevant detail to your partner." : "Detail relevan dapat dilihat partner."
                        ]
                      ].map(([title, description]) => (
                        <div key={title} className="rounded-2xl bg-white p-3">
                          <p className="text-[11px] font-semibold text-slate-900">{title}</p>
                          <p className="mt-1 text-[10px] leading-4 text-slate-500">{description}</p>
                        </div>
                      ))}
                    </div>
                    {[
                      {
                        name: "incomeVisibility",
                        label: language === "en" ? "Income" : "Pemasukan",
                        defaultValue: "summary_only",
                        description: language === "en"
                          ? "Private: hidden. Summary: total income only. Shared: income source/category can be used."
                          : "Private: disembunyikan. Ringkasan: total pemasukan saja. Dibagikan: sumber/kategori pemasukan bisa dipakai."
                      },
                      {
                        name: "expenseVisibility",
                        label: language === "en" ? "Expense" : "Pengeluaran",
                        defaultValue: "summary_only",
                        description: language === "en"
                          ? "Private: hidden. Summary: total expense and main category only. Shared: category and trend details can be used."
                          : "Private: disembunyikan. Ringkasan: total pengeluaran dan kategori utama saja. Dibagikan: detail kategori dan tren bisa dipakai."
                      },
                      {
                        name: "accountsVisibility",
                        label: language === "en" ? "Accounts" : "Akun",
                        defaultValue: "private",
                        description: language === "en"
                          ? "Private: account names/balances hidden. Summary: total balance only. Shared: account name/type can be shown."
                          : "Private: nama akun/saldo disembunyikan. Ringkasan: total saldo saja. Dibagikan: nama dan tipe akun bisa terlihat."
                      },
                      {
                        name: "transactionsVisibility",
                        label: language === "en" ? "Transactions" : "Transaksi",
                        defaultValue: "private",
                        description: language === "en"
                          ? "Private: no transaction detail. Summary: totals by period/category only. Shared: selected transaction details can be shown."
                          : "Private: tidak ada detail transaksi. Ringkasan: total per periode/kategori saja. Dibagikan: detail transaksi pilihan bisa terlihat."
                      },
                      {
                        name: "assetsVisibility",
                        label: language === "en" ? "Assets" : "Aset",
                        defaultValue: "summary_only",
                        description: language === "en"
                          ? "Private: hidden. Summary: total asset value only. Shared: asset name/type/value can be shown."
                          : "Private: disembunyikan. Ringkasan: total nilai aset saja. Dibagikan: nama, tipe, dan nilai aset bisa terlihat."
                      },
                      {
                        name: "liabilitiesVisibility",
                        label: language === "en" ? "Liabilities" : "Kewajiban",
                        defaultValue: "summary_only",
                        description: language === "en"
                          ? "Private: hidden. Summary: total debt and monthly payment only. Shared: liability name/type/due date can be shown."
                          : "Private: disembunyikan. Ringkasan: total utang dan cicilan bulanan saja. Dibagikan: nama, tipe, dan jatuh tempo bisa terlihat."
                      }
                    ].map((item) => (
                      <label key={item.name} className="rounded-2xl bg-white p-3">
                        <span className="text-[11px] font-semibold text-slate-900">{item.label}</span>
                        <span className="mt-1 block text-[10px] leading-4 text-slate-500">{item.description}</span>
                        <select className="input mt-2" name={item.name} defaultValue={item.defaultValue}>
                          <option value="private">{language === "en" ? "Private" : "Private"}</option>
                          <option value="summary_only">{language === "en" ? "Summary only" : "Ringkasan saja"}</option>
                          <option value="shared">{language === "en" ? "Shared" : "Dibagikan"}</option>
                        </select>
                      </label>
                    ))}
                  </div>
                </div>
                <button className="btn-primary w-full" disabled={!relationshipPartnerId}>
                  <UserPlus size={16} /> {language === "en" ? "Send invitation" : "Kirim undangan"}
                </button>
              </div>
            </form>
          ) : selectedRelationship ? (
            <div className="space-y-3">
              <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500"
                    onClick={() => {
                      setSelectedRelationship(null);
                      setRelationshipOverviewData(null);
                    }}
                  >
                    <ArrowLeft size={15} /> {language === "en" ? "Back" : "Kembali"}
                  </button>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-[#16A34A]">
                    {selectedRelationship.status === "active" ? (language === "en" ? "Active" : "Aktif") : (language === "en" ? "Pending" : "Menunggu")}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-white bg-emerald-100 text-sm font-semibold text-[#16A34A]">{currentUser.fullName.slice(0, 1).toUpperCase()}</span>
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-white bg-rose-100 text-sm font-semibold text-rose-700">{(selectedRelationship.partnerName ?? "?").slice(0, 1).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-slate-950">{currentUser.fullName} + {selectedRelationship.partnerName ?? "Partner"}</h2>
                    <p className="truncate text-xs text-slate-500">{selectedRelationship.workspaceName}</p>
                  </div>
                </div>
                {selectedRelationship.status !== "active" && (
                  <div className="mt-4 rounded-2xl bg-[#F8FAFC] p-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {selectedRelationship.incomingInvitation
                        ? (language === "en" ? "Invitation waiting for your response" : "Undangan menunggu respons Anda")
                        : (language === "en" ? "Waiting for partner response" : "Menunggu respons partner")}
                    </p>
                    <div className="mt-3 flex gap-2">
                      {selectedRelationship.incomingInvitation ? (
                        <>
                          <button className="btn-primary flex-1" onClick={() => respondRelationship(selectedRelationship, "accept")}>{language === "en" ? "Accept" : "Terima"}</button>
                          <button className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600" onClick={() => respondRelationship(selectedRelationship, "decline")}>{language === "en" ? "Decline" : "Tolak"}</button>
                        </>
                      ) : (
                        <button className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700" onClick={() => respondRelationship(selectedRelationship, "cancel")}>{language === "en" ? "Cancel invitation" : "Batalkan undangan"}</button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {selectedRelationship.status === "active" && relationshipOverviewData && (
                <>
                  <div className="rounded-[22px] bg-[#16A34A] p-4 text-white shadow-[0_18px_42px_rgba(22,163,74,0.22)] lg:rounded-lg">
                    <p className="text-[10px] font-semibold uppercase text-white/70">{language === "en" ? "Shared financial condition" : "Kondisi keuangan bersama"}</p>
                    <h3 className="mt-1 text-xl font-semibold">{language === "en" ? "This month summary" : "Ringkasan bulan ini"}</h3>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-2xl bg-white/12 p-3">
                        <p className="text-[11px] text-white/70">{language === "en" ? "Income" : "Pemasukan"}</p>
                        <p className="mt-1 text-sm font-semibold">{rupiah(relationshipOverviewData.summary.combinedIncome)}</p>
                      </div>
                      <div className="rounded-2xl bg-white/12 p-3">
                        <p className="text-[11px] text-white/70">{language === "en" ? "Expense" : "Pengeluaran"}</p>
                        <p className="mt-1 text-sm font-semibold">{rupiah(relationshipOverviewData.summary.combinedExpense)}</p>
                      </div>
                      <div className="rounded-2xl bg-white/12 p-3">
                        <p className="text-[11px] text-white/70">{language === "en" ? "Saving" : "Tabungan"}</p>
                        <p className="mt-1 text-sm font-semibold">{rupiah(relationshipOverviewData.summary.combinedSaving)}</p>
                      </div>
                      <div className="rounded-2xl bg-white/12 p-3">
                        <p className="text-[11px] text-white/70">{language === "en" ? "Saving rate" : "Saving rate"}</p>
                        <p className="mt-1 text-sm font-semibold">{Number(relationshipOverviewData.summary.savingRate).toFixed(0)}%</p>
                      </div>
                    </div>
                    <button
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#16A34A]"
                      onClick={() => onOpenAssistantContext({
                        contextType: "relationship_finance",
                        relationshipFinanceId: selectedRelationship.id,
                        sourcePage: "overview",
                        label: selectedRelationship.workspaceName,
                        partnerName: selectedRelationship.partnerName ?? null
                      })}
                    >
                      <Bot size={16} /> {language === "en" ? "Analyze with Finance Copilot" : "Analisis dengan Finance Copilot"}
                    </button>
                  </div>

                  {(goalFormMode || goalAction) ? (
                    <div className="space-y-3">
                      <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500"
                          onClick={() => {
                            setGoalFormMode(null);
                            setEditingGoal(null);
                            setGoalAction(null);
                          }}
                        >
                          <ArrowLeft size={15} /> {language === "en" ? "Back to Shared goals" : "Kembali ke Shared goals"}
                        </button>
                      </div>

                      {goalFormMode && (
                        <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
                          <SectionHeader
                            title={goalFormMode === "edit" ? (language === "en" ? "Edit goal" : "Edit goal") : (language === "en" ? "New goal" : "Goal baru")}
                            caption={language === "en" ? "Set the linked savings account and goal target." : "Atur akun tabungan tertaut dan target goal."}
                          />
                          <form key={editingGoal?.id ?? "new-goal"} className="grid gap-2 sm:grid-cols-2" onSubmit={submitRelationshipGoal}>
                            <input className="input sm:col-span-2" name="name" placeholder={language === "en" ? "Goal name, e.g. Home" : "Nama tujuan, contoh: Rumah"} defaultValue={editingGoal?.name ?? ""} required />
                            <select className="input" name="goalType" defaultValue={editingGoal?.goalType ?? "custom"}>
                              <option value="home">{language === "en" ? "Home" : "Rumah"}</option>
                              <option value="wedding">{language === "en" ? "Wedding" : "Pernikahan"}</option>
                              <option value="vacation">{language === "en" ? "Vacation" : "Liburan"}</option>
                              <option value="emergency_fund">{language === "en" ? "Emergency fund" : "Dana darurat"}</option>
                              <option value="custom">Custom</option>
                            </select>
                            <select className="input" name="priority" defaultValue={editingGoal?.priority ?? "medium"}>
                              <option value="medium">{language === "en" ? "Medium" : "Sedang"}</option>
                              <option value="high">{language === "en" ? "High" : "Tinggi"}</option>
                              <option value="critical">{language === "en" ? "Critical" : "Kritis"}</option>
                              <option value="low">{language === "en" ? "Low" : "Rendah"}</option>
                            </select>
                            <input className="input" name="targetAmount" inputMode="numeric" placeholder={language === "en" ? "Target amount" : "Nominal target"} defaultValue={editingGoal ? moneyInputValue(editingGoal.targetAmount) : ""} onInput={handleMoneyInput} required />
                            <input type="hidden" name="trackingMode" value="linked_account" />
                            <select className="input" name="linkedAccountId" defaultValue={editingGoal?.linkedAccountId ?? ""} required>
                              <option value="">{language === "en" ? "Select savings account" : "Pilih akun tabungan"}</option>
                              {accounts.filter((account) => account.isActive).map((account) => {
                                const alreadyLinked = Boolean(account.isRelationshipGoalAccount && account.id !== editingGoal?.linkedAccountId);
                                const owner = account.ownerName && account.canEdit === false ? ` � ${language === "en" ? "owned by" : "milik"} ${account.ownerName}` : "";
                                const linked = alreadyLinked ? ` � ${language === "en" ? "already linked" : "sudah tertaut"}` : "";
                                return (
                                  <option key={account.id} value={account.id} disabled={alreadyLinked}>
                                    {accountOptionLabel(account, { balance: true, language })}{owner}{linked}
                                  </option>
                                );
                              })}
                            </select>
                            <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-[11px] leading-4 text-[#15803D] sm:col-span-2">
                              {language === "en"
                                ? "Progress follows the selected savings account balance. One account can only be linked to one active goal."
                                : "Progress mengikuti saldo akun tabungan yang dipilih. Satu akun hanya bisa tertaut ke satu goal aktif."}
                            </p>
                            <input className="input" name="deadline" type="date" defaultValue={editingGoal?.deadline ? String(editingGoal.deadline).slice(0, 10) : ""} />
                            <button className="btn-primary">
                              {goalFormMode === "edit" ? (language === "en" ? "Save goal" : "Simpan goal") : (language === "en" ? "Add goal" : "Tambah goal")}
                            </button>
                          </form>
                        </div>
                      )}
                      {goalAction && (
                        <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
                          <div className="mb-4">
                            <p className="text-[10px] font-semibold uppercase text-[#16A34A]">
                              {goalAction.type === "contribution"
                                ? (language === "en" ? "Add contribution" : "Tambah kontribusi")
                                : goalAction.type === "adjustment"
                                  ? "Adjust Goal"
                                  : "Contribution History"}
                            </p>
                            <h3 className="mt-1 text-base font-semibold text-slate-950">{goalAction.goal.name}</h3>
                            <p className="mt-1 text-xs text-slate-500">
                              {language === "en" ? "Progress is calculated from completed contributions." : "Progress dihitung dari kontribusi yang selesai."}
                            </p>
                          </div>

                          {goalAction.type !== "history" && (
                            <form className="mb-4 grid gap-2 sm:grid-cols-2" onSubmit={submitGoalContribution}>
                              <input
                                className="input"
                                name="amount"
                                inputMode="numeric"
                                placeholder={goalAction.type === "adjustment" ? (language === "en" ? "Amount, e.g. -500000" : "Nominal, contoh -500000") : (language === "en" ? "Amount" : "Nominal")}
                                required
                              />
                              <input className="input" name="contributionDate" type="date" defaultValue={isoDateInput()} />
                              <select className="input" name="contributorUserId" defaultValue={currentUser.id}>
                                {(relationshipOverviewData.relationship.members ?? []).filter((member) => member.status === "accepted").map((member) => (
                                  <option key={member.userId} value={member.userId}>{member.fullName}</option>
                                ))}
                              </select>
                              {goalAction.type === "contribution" ? (
                                <select className="input" name="sourceType" defaultValue="manual">
                                  <option value="manual">Manual</option>
                                  <option value="income_allocation">{language === "en" ? "Income allocation" : "Alokasi pemasukan"}</option>
                                  <option value="scheduled">{language === "en" ? "Scheduled" : "Terjadwal"}</option>
                                  <option value="shared_wallet">{language === "en" ? "Shared wallet" : "Dompet bersama"}</option>
                                </select>
                              ) : (
                                <input className="input" name="adjustmentReason" placeholder={language === "en" ? "Reason is required" : "Alasan wajib diisi"} required />
                              )}
                              <input className="input sm:col-span-2" name="notes" placeholder={language === "en" ? "Notes" : "Catatan"} />
                              <button className="btn-primary sm:col-span-2">
                                <Plus size={16} />
                                {goalAction.type === "adjustment"
                                  ? (language === "en" ? "Save adjustment" : "Simpan adjustment")
                                  : (language === "en" ? "Save contribution" : "Simpan kontribusi")}
                              </button>
                            </form>
                          )}

                          <div className="space-y-2">
                            {goalContributionLoading && <SocialSkeleton />}
                            {!goalContributionLoading && goalContributions.length === 0 && (
                              <EmptyState text={language === "en" ? "No contribution history yet." : "Belum ada histori kontribusi."} />
                            )}
                            {!goalContributionLoading && goalContributions.map((row) => {
                              const amount = Number(row.amount);
                              return (
                                <div key={row.id} className="flex items-start gap-3 rounded-2xl border border-slate-100 p-3">
                                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${amount >= 0 ? "bg-emerald-50 text-[#16A34A]" : "bg-rose-50 text-rose-700"}`}>
                                    {amount >= 0 ? <Plus size={16} /> : <CircleMinus size={16} />}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                      <p className={`text-sm font-semibold ${amount >= 0 ? "text-[#16A34A]" : "text-rose-700"}`}>
                                        {amount >= 0 ? "+" : "-"}{rupiah(Math.abs(amount))}
                                      </p>
                                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">{row.status}</span>
                                    </div>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                      {localDate(row.contributionDate)} - {row.sourceType.replace(/_/g, " ")} - {row.contributorName ?? "-"}
                                    </p>
                                    {(row.notes || row.adjustmentReason) && (
                                      <p className="mt-1 text-[11px] leading-4 text-slate-500">{row.adjustmentReason ?? row.notes}</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                  <div className="rounded-[22px] bg-white p-2 shadow-soft lg:rounded-lg">
                    <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[#F8FAFC] p-1">
                      {[
                        { id: "goals" as const, label: language === "en" ? "Shared goals" : "Shared goals" },
                        { id: "timeline" as const, label: language === "en" ? "Insight & timeline" : "Insight & timeline" }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${relationshipDetailTab === item.id ? "bg-white text-[#16A34A] shadow-sm" : "text-slate-500"}`}
                          onClick={() => setRelationshipDetailTab(item.id)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {relationshipDetailTab === "goals" && (
                    <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
                      <SectionHeader
                        title={language === "en" ? "Shared goals" : "Tujuan bersama"}
                        caption={language === "en" ? "Track goals without exposing private details." : "Pantau target tanpa membuka detail private."}
                        action={(
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-full bg-[#16A34A] px-3 py-1.5 text-xs font-semibold text-white"
                            onClick={() => {
                              setGoalFormMode("add");
                              setEditingGoal(null);
                              setGoalAction(null);
                            }}
                          >
                            <Plus size={14} /> {language === "en" ? "Add goal" : "Tambah goal"}
                          </button>
                        )}
                      />
                      <div className="space-y-2">
                        {relationshipOverviewData.goals.length === 0 && <EmptyState text={language === "en" ? "No shared goal yet." : "Belum ada tujuan bersama."} />}
                        {relationshipOverviewData.goals.map((goal) => (
                          <div key={goal.id} className="rounded-2xl border border-slate-100 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-950">{goal.name}</p>
                                <p className="mt-1 text-xs text-slate-500">{rupiah(goal.currentAmount)} / {rupiah(goal.targetAmount)}</p>
                              </div>
                              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-[#16A34A]">{Number(goal.progress).toFixed(0)}%</span>
                            </div>
                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-[#16A34A]" style={{ width: `${Math.min(Number(goal.progress), 100)}%` }} />
                            </div>
                            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                              <span>{language === "en" ? "Remaining" : "Sisa"} {rupiah(goal.remainingAmount)}</span>
                              {goal.monthlyRequired && <span>{rupiah(goal.monthlyRequired)}/{language === "en" ? "month" : "bulan"}</span>}
                            </div>
                            <div className="mt-3 rounded-xl bg-[#F8FAFC] px-3 py-2 text-[11px] font-semibold text-slate-600">
                              {language === "en" ? "Linked" : "Tertaut"}: {goal.linkedAccountName ?? "-"}
                              {goal.linkedAccountOwnerName && goal.linkedAccountOwnerName !== currentUser.fullName ? ` ${language === "en" ? "owned by" : "milik"} ${goal.linkedAccountOwnerName}` : ""}
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
                              <button
                                type="button"
                                className="rounded-xl bg-emerald-50 px-2 py-2 text-[11px] font-semibold text-[#16A34A]"
                                onClick={() => {
                                  setGoalFormMode("edit");
                                  setEditingGoal(goal);
                                  setGoalAction(null);
                                }}
                              >
                                Edit
                              </button>
                              {goal.trackingMode !== "linked_account" && (
                                <button type="button" className="rounded-xl bg-amber-50 px-2 py-2 text-[11px] font-semibold text-amber-700" onClick={() => openGoalHistory(goal, "contribution")}>
                                  {language === "en" ? "Add" : "Tambah"}
                                </button>
                              )}
                              <button type="button" className={`${goal.trackingMode === "linked_account" ? "col-span-2" : ""} rounded-xl bg-slate-50 px-2 py-2 text-[11px] font-semibold text-slate-600`} onClick={() => openGoalHistory(goal, "history")}>
                                History
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {relationshipDetailTab === "timeline" && (
                    <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
                      <SectionHeader title={language === "en" ? "Insights & timeline" : "Insight & timeline"} caption={language === "en" ? "Private transactions are never shown here." : "Transaksi private tidak ditampilkan di sini."} />
                      <label className="mb-3 block">
                        <span className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">
                          {language === "en" ? "Goal filter" : "Filter goal"}
                        </span>
                        <select
                          className="input"
                          value={relationshipGoalFilterId}
                          onChange={(event) => setRelationshipGoalFilterId(event.target.value)}
                        >
                          <option value="">{language === "en" ? "All goals" : "Semua goal"}</option>
                          {relationshipOverviewData.goals.map((goal) => (
                            <option key={goal.id} value={goal.id}>{goal.name}</option>
                          ))}
                        </select>
                      </label>
                      <div className="space-y-2">
                        {filteredRelationshipGoal && (
                          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-950">{filteredRelationshipGoal.name}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {rupiah(filteredRelationshipGoal.currentAmount)} / {rupiah(filteredRelationshipGoal.targetAmount)}
                                </p>
                              </div>
                              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-[#16A34A]">
                                {Number(filteredRelationshipGoal.progress).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        )}
                        {filteredRelationshipInsights.length === 0 && filteredRelationshipTimeline.length === 0 && (
                          <EmptyState text={language === "en" ? "No insight or timeline for this filter yet." : "Belum ada insight atau timeline untuk filter ini."} />
                        )}
                        {filteredRelationshipInsights.map((insight) => (
                          <div key={insight.type} className="rounded-2xl bg-[#F8FAFC] p-3">
                            <p className="text-sm font-semibold text-slate-900">
                              {insight.type === "cashflow_risk"
                                ? (language === "en" ? "Cashflow needs attention" : "Arus kas perlu diperhatikan")
                                : insight.type === "goal_needs_attention"
                                  ? (language === "en" ? "Goal needs attention" : "Target perlu diperhatikan")
                                  : insight.type === "saving_rate"
                                    ? (language === "en" ? "Saving rate insight" : "Insight saving rate")
                                    : (language === "en" ? "More data needed" : "Data belum cukup")}
                              </p>
                          </div>
                        ))}
                        {filteredRelationshipTimeline.map((event) => (
                          <div key={event.id} className="flex items-start gap-3 rounded-2xl px-2 py-2">
                            <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-[#16A34A]"><Sparkles size={15} /></span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900">{event.eventType.replace(/_/g, " ")}</p>
                              <p className="text-[10px] text-slate-500">{localDate(event.createdAt)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                    </>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-[#16A34A]">Relationship Finance</p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-950">{language === "en" ? "Plan the future together" : "Rencanakan masa depan bersama"}</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {language === "en"
                        ? "Manage shared goals, budget, assets, liabilities, and Finance Copilot insights with your partner."
                        : "Kelola tujuan, budget, aset, kewajiban, dan insight Finance Copilot bersama partner."}
                    </p>
                  </div>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-700"><HeartPulse size={21} /></span>
                </div>
                <button className="btn-primary mt-4 w-full" onClick={() => setShowCreateRelationship(true)}>
                  <Plus size={16} /> {language === "en" ? "Create Relationship Finance" : "Buat Relationship Finance"}
                </button>
              </div>
              {relationships.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-slate-200 bg-white p-5 text-center shadow-soft lg:rounded-lg">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#16A34A]"><HeartPulse size={22} /></span>
                  <p className="mt-3 text-sm font-semibold text-slate-950">{language === "en" ? "No workspace yet" : "Belum ada workspace"}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {language === "en" ? "Start by inviting an accepted friend." : "Mulai dengan mengundang teman yang sudah diterima."}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {relationships.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="ripple-card flex w-full items-center gap-3 rounded-[20px] bg-white p-3 text-left shadow-soft transition active:scale-[0.99] lg:rounded-lg"
                      onClick={() => openRelationship(item).catch(() => setMessage(null))}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-700"><HeartPulse size={20} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-950">{item.workspaceName}</span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">{item.partnerName ?? "Partner"} - {item.status}</span>
                      </span>
                      <ChevronRight size={18} className="text-slate-300" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!loading && tab === "friends" && (
        <div className="grid gap-3 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-3">
            <form className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg" onSubmit={searchPerson}>
              <SectionHeader title="Tambah teman" caption="Cari lewat username, email, telepon, atau kode QR." />
              <div className="relative">
                <div className="flex gap-2">
                  <input
                    ref={friendSearchRef}
                    className="input min-w-0 flex-1"
                    name="query"
                    value={friendSearchQuery}
                    onChange={(event) => {
                      setFriendSearchQuery(event.target.value);
                      setMessage(null);
                    }}
                    placeholder="Cari username atau email..."
                    autoComplete="off"
                    required
                  />
                  <button className="btn-primary shrink-0" aria-label="Cari pengguna" disabled={friendSearchLoading}>
                    {friendSearchLoading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                  </button>
                </div>
                {friendSearchQuery.trim().length >= 2 && (
                  <div className="absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_44px_rgba(15,23,42,0.16)]">
                    {friendSearchLoading && searchResults.length === 0 ? (
                      <div className="flex items-center gap-2 px-3 py-3 text-xs text-slate-500">
                        <Loader2 className="animate-spin text-[#16A34A]" size={15} />
                        Mencari pengguna...
                      </div>
                    ) : searchResults.length > 0 ? searchResults.map((person) => {
                      const statusLabels: Record<string, string> = {
                        self: "Akun Anda",
                        pending: "Menunggu",
                        incoming: "Perlu respons",
                        accepted: "Teman",
                        rejected: "Tambah lagi",
                        none: "Tambah"
                      };
                      const canAdd = person.relationshipStatus === "none" || person.relationshipStatus === "rejected";
                      return (
                        <div key={person.id} className="flex items-center gap-2 rounded-xl px-2.5 py-2 transition hover:bg-slate-50">
                          {person.avatarUrl
                            ? <img src={person.avatarUrl} className="h-9 w-9 shrink-0 rounded-xl object-cover" alt="" />
                            : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#16A34A]"><UserRound size={16} /></span>}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-slate-900">{person.fullName}</p>
                            <p className="truncate text-[10px] text-slate-500">
                              @{person.username}{person.email ? ` - ${person.email}` : ""}
                            </p>
                          </div>
                          <button
                            type="button"
                            className={`shrink-0 rounded-xl px-3 py-2 text-[11px] font-semibold ${
                              canAdd ? "bg-emerald-50 text-[#16A34A]" : "bg-slate-100 text-slate-400"
                            }`}
                            disabled={!canAdd}
                            onClick={() => runAction(
                              async () => {
                                await request("/social/friends/request", {
                                method: "POST",
                                body: JSON.stringify({
                                  identifier: person.username,
                                  targetUserId: person.id
                                })
                                });
                                setFriendSearchQuery("");
                                setSearchResults([]);
                                setFriendSearchAttempted(false);
                              },
                              "Permintaan pertemanan dikirim"
                            )}
                          >
                            {statusLabels[person.relationshipStatus] ?? "Terhubung"}
                          </button>
                        </div>
                      );
                    }) : friendSearchAttempted ? (
                      <div className="px-3 py-3 text-xs text-slate-500">
                        Pengguna tidak ditemukan atau tidak mengizinkan pencarian dengan data tersebut.
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
              <div className="mt-4 rounded-2xl border border-slate-100 bg-[#F8FAFC] p-4 text-center">
                <div className="mx-auto w-fit rounded-2xl bg-white p-3 shadow-sm">
                  {qrDataUrl
                    ? <img src={qrDataUrl} className="h-44 w-44 rounded-xl" alt="QR akun" />
                    : <span className="flex h-44 w-44 items-center justify-center rounded-xl bg-slate-50 text-[#16A34A]"><QrCode size={52} /></span>}
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">@{currentUser.username ?? "atur-username"}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700" onClick={shareAccountQr}>
                    <Share2 size={15} /> Bagikan QR
                  </button>
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-3 py-2.5 text-xs font-semibold text-white">
                    <QrCode size={15} /> Scan QR
                    <input className="sr-only" type="file" accept="image/*" capture="environment" onChange={scanQrFile} />
                  </label>
                </div>
              </div>
            </form>
          </div>

          <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
            <SectionHeader title="Teman & permintaan" caption={`${friends.length} hubungan`} />
            <div className="space-y-2">
              {friends.length === 0 && (
                <div className="rounded-2xl bg-[#F8FAFC] p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-[#16A34A]"><UserPlus size={20} /></span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Belum ada teman</p>
                      <p className="mt-0.5 text-xs text-slate-500">Mulai terhubung untuk mencatat transaksi bersama.</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-xs text-slate-600">
                    <button type="button" className="flex w-full items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-left" onClick={() => friendSearchRef.current?.focus()}>
                      <Search size={15} className="text-[#16A34A]" /> Cari username
                    </button>
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-left">
                      <QrCode size={15} className="text-[#16A34A]" /> Scan QR
                      <input className="sr-only" type="file" accept="image/*" capture="environment" onChange={scanQrFile} />
                    </label>
                    <button type="button" className="flex w-full items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-left" onClick={shareAccountQr}>
                      <Share2 size={15} className="text-[#16A34A]" /> Undang teman
                    </button>
                  </div>
                  <button type="button" className="mt-3 w-full rounded-xl bg-[#16A34A] px-4 py-2.5 text-xs font-semibold text-white" onClick={() => {
                    friendSearchRef.current?.focus();
                    friendSearchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}>Tambah Teman</button>
                </div>
              )}
              {friends.map((friend) => (
                <div key={friend.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
                  {friend.avatarUrl
                    ? <img src={friend.avatarUrl} className="h-10 w-10 rounded-xl object-cover" alt="" />
                    : <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-[#16A34A]"><UserRound size={17} /></span>}
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    disabled={friend.status !== "accepted"}
                    onClick={async () => setSelectedFriend({
                      ...await request<Record<string, unknown>>(`/social/friends/profile/${friend.userId}`),
                      friendshipId: friend.id,
                      userId: friend.userId
                    })}
                  >
                    <p className="truncate text-sm font-semibold">{friend.fullName}</p>
                    <p className="text-xs text-slate-500">@{friend.username} � {friend.incoming ? "Menunggu jawaban Anda" : socialEnumLabel(friend.status)}</p>
                  </button>
                  {friend.incoming ? (
                    <div className="flex gap-1">
                      <button className="rounded-full bg-emerald-50 p-2 text-[#16A34A]" onClick={() => runAction(
                        () => request(`/social/friends/${friend.id}/respond`, { method: "PUT", body: JSON.stringify({ status: "accepted" }) }),
                        "Pertemanan diterima"
                      )}><CheckCircle2 size={15} /></button>
                      <button className="rounded-full bg-rose-50 p-2 text-rose-600" onClick={() => runAction(
                        () => request(`/social/friends/${friend.id}/respond`, { method: "PUT", body: JSON.stringify({ status: "rejected" }) }),
                        "Permintaan ditolak"
                      )}><X size={15} /></button>
                    </div>
                  ) : friend.status === "accepted" ? (
                    <ChevronRight size={16} className="text-slate-300" />
                  ) : null}
                </div>
              ))}
            </div>
            {selectedFriend && (
              <div className="mt-3 rounded-2xl bg-slate-50 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{selectedFriend.fullName}</p>
                    <p className="text-xs text-slate-500">@{selectedFriend.username} � {selectedFriend.commonGroups} grup bersama</p>
                  </div>
                  <button onClick={() => setSelectedFriend(null)}><X size={15} /></button>
                </div>
                <p className="mt-3 text-xs text-slate-500">Utang/piutang dengan Anda</p>
                <p className={`text-lg font-semibold ${Number(selectedFriend.balance) >= 0 ? "text-[#16A34A]" : "text-rose-600"}`}>
                  {rupiah(Math.abs(Number(selectedFriend.balance)))}
                </p>
                <div className="mt-3 space-y-2">
                  {selectedFriend.sharedTransactions?.map((row: any) => (
                    <div key={row.id} className="flex justify-between gap-3 border-t border-slate-200 pt-2 text-xs">
                      <span>{row.description} � {row.groupName}</span><span className="font-semibold">{rupiah(row.amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200 pt-3">
                  <button className="rounded-xl bg-white px-2 py-2 text-[11px] font-semibold text-slate-600" onClick={() => {
                    if (!window.confirm(`Hapus ${selectedFriend.fullName} dari daftar teman?`)) return;
                    runAction(
                      () => request(`/social/friends/${selectedFriend.friendshipId}`, { method: "DELETE" }),
                      "Teman berhasil dihapus"
                    ).then(() => setSelectedFriend(null));
                  }}>Hapus teman</button>
                  <button className="rounded-xl bg-rose-50 px-2 py-2 text-[11px] font-semibold text-rose-600" onClick={() => {
                    if (!window.confirm(`Blokir ${selectedFriend.fullName}?`)) return;
                    runAction(
                      () => request(`/social/friends/${selectedFriend.friendshipId}/block`, { method: "POST" }),
                      "Pengguna berhasil diblokir"
                    ).then(() => setSelectedFriend(null));
                  }}>Blokir</button>
                  <button className="rounded-xl bg-amber-50 px-2 py-2 text-[11px] font-semibold text-amber-700" onClick={() => {
                    const reason = window.prompt("Alasan melaporkan pengguna:");
                    if (!reason?.trim()) return;
                    runAction(
                      () => request(`/social/people/${selectedFriend.userId}/report`, {
                        method: "POST",
                        body: JSON.stringify({ reason: reason.trim() })
                      }),
                      "Laporan berhasil dikirim"
                    );
                  }}>Laporkan</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && tab === "groups" && !selectedGroup && (
        <div className="space-y-3">
          {!showCreateGroup && (
            <button className="btn-primary w-full" onClick={() => setShowCreateGroup(true)}><Plus size={16} /> Buat grup</button>
          )}
          {showCreateGroup && (
            <>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-xl px-2 text-xs font-semibold text-slate-600 transition hover:bg-white active:scale-95"
              onClick={() => {
                setShowCreateGroup(false);
                setGroupMemberIds(new Set());
              }}
            >
              <ArrowLeft size={16} /> Kembali ke grup
            </button>
            <form className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg" onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              runAction(
                () => request("/social/groups", {
                  method: "POST",
                  body: JSON.stringify({
                    name: String(form.get("name")),
                    description: String(form.get("description") || ""),
                    memberIds: [...groupMemberIds]
                  })
                }),
                "Grup berhasil dibuat"
              ).then(() => {
                setShowCreateGroup(false);
                setGroupMemberIds(new Set());
              });
            }}>
              <div className="mb-5 flex items-start gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700"><Users size={20} /></span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">Buat grup baru</h3>
                    <p className="mt-0.5 text-[11px] text-slate-500">Pilih teman yang akan berbagi pengeluaran.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <Field label="Nama grup">
                  <input className="input" name="name" placeholder="Contoh: Trip Bali" required />
                </Field>
                <Field label="Deskripsi (opsional)">
                  <textarea className="input min-h-24 resize-none" name="description" placeholder="Tujuan atau catatan singkat grup" />
                </Field>
                <SocialFriendPicker
                  friends={friends}
                  selectedIds={groupMemberIds}
                  onToggle={(friendId) => toggleSelectedFriend(setGroupMemberIds, friendId)}
                />
                <div className="rounded-2xl bg-slate-50 px-3 py-2.5 text-[11px] leading-4 text-slate-500">
                  Teman yang dipilih akan menerima undangan dan bergabung setelah menyetujuinya.
                </div>
                <button className="btn-primary w-full"><Users size={16} /> Buat grup</button>
              </div>
            </form>
            </>
          )}
          {!showCreateGroup && <div className="grid gap-2 md:grid-cols-2">
            {groups.length === 0 && <EmptyState text="Belum ada grup keuangan." />}
            {groups.map((group) => (
              <div key={group.id} className="rounded-[22px] bg-white p-4 text-left shadow-soft lg:rounded-lg">
                <button className="w-full text-left" disabled={group.status === "pending"} onClick={() => openGroup(group.id)}>
                  <div className="flex justify-between gap-3"><p className="font-semibold">{group.name}</p>{group.status !== "pending" && <ChevronRight size={16} className="text-slate-300" />}</div>
                  <p className="mt-1 text-xs text-slate-500">{group.status === "pending" ? "Undangan grup menunggu jawaban" : `${group.memberCount} anggota � ${socialEnumLabel(group.role)}`}</p>
                  {group.status !== "pending" && (
                    <p className={`mt-3 text-sm font-semibold ${Number(group.myBalance) >= 0 ? "text-[#16A34A]" : "text-rose-600"}`}>
                      Posisi Anda {Number(group.myBalance) >= 0 ? "+" : "-"}{rupiah(Math.abs(Number(group.myBalance)))}
                    </p>
                  )}
                </button>
                {group.status === "pending" && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button className="rounded-xl bg-[#16A34A] px-3 py-2 text-xs font-semibold text-white" onClick={() => runAction(
                      () => request(`/social/groups/${group.id}/invite`, { method: "PUT", body: JSON.stringify({ status: "accepted" }) }),
                      "Undangan grup diterima"
                    )}>Terima</button>
                    <button className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600" onClick={() => runAction(
                      () => request(`/social/groups/${group.id}/invite`, { method: "PUT", body: JSON.stringify({ status: "rejected" }) }),
                      "Undangan grup ditolak"
                    )}>Tolak</button>
                  </div>
                )}
              </div>
            ))}
          </div>}
        </div>
      )}

      {!loading && tab === "groups" && selectedGroup && (
        <div className="space-y-3">
          <button className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500" onClick={() => setSelectedGroup(null)}><ArrowLeft size={14} /> Kembali ke grup</button>
          <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
            <SectionHeader title={selectedGroup.name} caption={`${selectedGroup.members.filter((item) => item.status === "accepted").length} anggota`} />
            <div className="flex -space-x-2">
              {selectedGroup.members.filter((item) => item.status === "accepted").slice(0, 8).map((member) => (
                <span key={member.id} title={member.fullName} className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-emerald-50 text-[11px] font-semibold text-[#16A34A]">
                  {member.fullName.slice(0, 2).toUpperCase()}
                </span>
              ))}
            </div>
            <form className="mt-4" onSubmit={(event) => {
              event.preventDefault();
              runAction(
                () => Promise.all([...groupMemberIds].map((userId) =>
                  request(`/social/groups/${selectedGroup.id}/members`, {
                    method: "POST",
                    body: JSON.stringify({ userId })
                  })
                )),
                "Undangan anggota dikirim"
              ).then(() => {
                setGroupMemberIds(new Set());
                openGroup(selectedGroup.id);
              });
            }}>
              <SocialFriendPicker
                friends={friends}
                selectedIds={groupMemberIds}
                excludedIds={new Set(selectedGroup.members.map((member) => member.id))}
                title="Tambah teman ke grup"
                onToggle={(friendId) => toggleSelectedFriend(setGroupMemberIds, friendId)}
              />
              <button className="btn-secondary mt-2 w-full" disabled={groupMemberIds.size === 0}>
                <UserPlus size={15} /> Undang {groupMemberIds.size || ""} teman
              </button>
            </form>
            <button className="btn-primary mt-3 w-full" onClick={() => {
              setEditingGroupExpense(null);
              setShowExpenseForm((value) => !value);
            }}><Plus size={16} /> Catat pengeluaran grup</button>
          </div>

          {showExpenseForm && (
            <form key={editingGroupExpense?.id ?? "new-group-expense"} className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg" onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const participantIds = form.getAll("participantIds").map(String);
              runAction(
                () => request(editingGroupExpense ? `/social/expenses/${editingGroupExpense.id}` : `/social/groups/${selectedGroup.id}/expenses`, {
                  method: editingGroupExpense ? "PUT" : "POST",
                  body: JSON.stringify({
                    description: String(form.get("description")),
                    amount: String(form.get("amount")),
                    paidBy: String(form.get("paidBy")),
                    participantIds
                  })
                }),
                editingGroupExpense ? "Pengeluaran diubah dan meminta konfirmasi ulang" : "Pengeluaran grup berhasil ditambahkan"
              ).then(() => {
                setEditingGroupExpense(null);
                openGroup(selectedGroup.id);
              });
            }}>
              <SectionHeader
                title={editingGroupExpense ? "Edit split bill" : "Split bill"}
                caption={editingGroupExpense ? "Perubahan nominal meminta konfirmasi ulang semua pihak terdampak." : "Bagian dibagi rata dan sisa pembulatan dibagikan otomatis."}
                action={editingGroupExpense ? <button type="button" onClick={() => { setEditingGroupExpense(null); setShowExpenseForm(false); }}><X size={15} /></button> : undefined}
              />
              <div className="space-y-3">
                <input className="input" name="description" placeholder="Contoh: Makan malam" defaultValue={editingGroupExpense?.description ?? ""} required />
                <input className="input" name="amount" inputMode="numeric" placeholder="Total nominal" defaultValue={editingGroupExpense ? moneyInputValue(editingGroupExpense.amount) : ""} onInput={handleMoneyInput} required />
                <Field label="Dibayar oleh">
                  <select className="input" name="paidBy" defaultValue={editingGroupExpense?.paidBy ?? currentUser.id}>
                    {selectedGroup.members.filter((item) => item.status === "accepted").map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}
                  </select>
                </Field>
                <div>
                  <p className="mb-1 text-xs font-semibold text-slate-600">Yang ikut menikmati</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedGroup.members.filter((item) => item.status === "accepted").map((member) => (
                      <label key={member.id} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2 text-xs">
                        <input
                          type="checkbox"
                          name="participantIds"
                          value={member.id}
                          defaultChecked={!editingGroupExpense || editingGroupExpense.participants.some((participant) => participant.userId === member.id)}
                        /> {member.fullName}
                      </label>
                    ))}
                  </div>
                </div>
                <button className="btn-primary w-full">Simpan & split otomatis</button>
              </div>
            </form>
          )}

          <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
            <SectionHeader title="Penyelesaian minimum" caption="Simplify debt mengurangi jumlah transfer." />
            <div className="space-y-2">
              {selectedGroup.simplifiedDebts.length === 0 && <EmptyState text="Semua anggota sudah seimbang." />}
              {selectedGroup.simplifiedDebts.map((debt, index) => (
                <div key={`${debt.fromUserId}-${debt.toUserId}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 text-xs">
                  <span className="min-w-0"><strong>{debt.fromName}</strong> membayar <strong>{debt.toName}</strong></span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-semibold text-rose-600">{rupiah(debt.amount)}</span>
                    {debt.fromUserId === currentUser.id && (
                      <button className="rounded-full bg-white px-2 py-1 font-semibold text-[#16A34A]" onClick={() => runAction(
                        () => request(`/social/groups/${selectedGroup.id}/settlements`, {
                          method: "POST",
                          body: JSON.stringify({ toUserId: debt.toUserId, amount: debt.amount })
                        }),
                        "Pembayaran menunggu konfirmasi penerima"
                      )}>Bayar</button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
            <SectionHeader title="Riwayat grup" caption="Hanya transaksi anggota grup." />
            <div className="space-y-2">
              {selectedGroup.expenses.map((expense) => (
                <div key={expense.id} className="rounded-2xl border border-slate-100 p-3">
                  <div className="flex justify-between gap-3"><p className="text-sm font-semibold">{expense.description}</p><p className="text-sm font-semibold">{rupiah(expense.amount)}</p></div>
                  <p className="mt-1 text-xs text-slate-500">Dibayar {expense.paidByName} � {localDate(expense.expenseDate)}</p>
                  {(expense.createdBy === currentUser.id || ["owner", "admin"].includes(selectedGroup.role)) && (
                    <button className="mt-2 text-xs font-semibold text-[#16A34A]" onClick={() => {
                      setEditingGroupExpense(expense);
                      setShowExpenseForm(true);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}>Edit transaksi</button>
                  )}
                </div>
              ))}
            </div>
            <form className="mt-3 flex gap-2" onSubmit={(event) => {
              event.preventDefault();
              const formElement = event.currentTarget;
              const messageValue = String(new FormData(formElement).get("message"));
              runAction(
                () => request(`/social/comments/group/${selectedGroup.id}`, { method: "POST", body: JSON.stringify({ message: messageValue }) }),
                "Komentar ditambahkan"
              ).then(() => {
                formElement.reset();
                openGroup(selectedGroup.id);
              });
            }}>
              <input className="input min-w-0 flex-1" name="message" placeholder="Komentar grup" required />
              <button className="btn-secondary shrink-0"><MessageCircle size={15} /></button>
            </form>
          </div>
          <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
            <SectionHeader title="Audit history" caption="Perubahan transaksi tercatat dan dapat ditelusuri." />
            <div className="space-y-2">
              {selectedGroup.auditHistory.length === 0 && <EmptyState text="Belum ada perubahan tercatat." />}
              {selectedGroup.auditHistory.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 text-xs">
                  <span><strong>{entry.actorName ?? "Sistem"}</strong> � {entry.action === "CREATE" ? "membuat transaksi" : "mengubah transaksi dan meminta konfirmasi ulang"}</span>
                  <span className="shrink-0 text-slate-400">{localDate(entry.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && tab === "wallets" && !selectedWallet && (
        <div className="space-y-3">
          {showCreateWallet && (
            <>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-xl px-2 text-xs font-semibold text-slate-600 transition hover:bg-white active:scale-95"
              onClick={() => {
                setShowCreateWallet(false);
                setWalletMemberIds(new Set());
              }}
            >
              <ArrowLeft size={16} /> Kembali ke dompet bersama
            </button>
            <form className="rounded-[22px] bg-white p-4 shadow-soft" onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              runAction(
                () => request("/social/wallets", {
                  method: "POST",
                  body: JSON.stringify({
                    name: String(form.get("name")),
                    description: String(form.get("description") || ""),
                    spendingLimit: String(form.get("spendingLimit") || "") || undefined,
                    requireApproval: form.get("requireApproval") === "on",
                    memberIds: [...walletMemberIds],
                    adminIds: [...walletAdminIds],
                    storageAccountId: walletStorageMode === "account" ? String(form.get("storageAccountId") || "") || null : null,
                    storageType: walletStorageMode === "account" ? "bank" : String(form.get("storageType")),
                    storageProvider: String(form.get("storageProvider") || "") || undefined,
                    storageAccountNumber: String(form.get("storageAccountNumber") || "") || undefined
                  })
                }),
                "Dompet bersama dibuat"
              ).then(() => {
                setShowCreateWallet(false);
                setWalletMemberIds(new Set());
                setWalletAdminIds(new Set());
                setWalletStorageAccountId("");
              });
            }}>
              <div className="mb-5 flex items-start gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700"><Wallet size={20} /></span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">Buat dompet bersama</h3>
                    <p className="mt-0.5 text-[11px] text-slate-500">Saldo bersama tetap terpisah dari akun pribadi.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <Field label="Nama dompet">
                  <input className="input" name="name" placeholder="Contoh: Kas rumah" required />
                </Field>
                <Field label="Deskripsi (opsional)">
                  <textarea className="input min-h-20 resize-none" name="description" placeholder="Tujuan penggunaan dompet" />
                </Field>
                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-700">Tempat dana</p>
                  <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
                    <button type="button" className={`rounded-xl px-3 py-2 text-xs font-semibold ${walletStorageMode === "account" ? "bg-white text-[#16A34A] shadow-sm" : "text-slate-500"}`} onClick={() => setWalletStorageMode("account")}>Pilih akun</button>
                    <button type="button" className={`rounded-xl px-3 py-2 text-xs font-semibold ${walletStorageMode === "manual" ? "bg-white text-[#16A34A] shadow-sm" : "text-slate-500"}`} onClick={() => setWalletStorageMode("manual")}>Input manual</button>
                  </div>
                </div>
                {walletStorageMode === "account" ? (
                  <Field label="Akun penyimpanan">
                    <select
                      className="input"
                      name="storageAccountId"
                      required={walletStorageMode === "account"}
                      value={walletStorageAccountId}
                      onChange={(event) => setWalletStorageAccountId(event.target.value)}
                    >
                      <option value="" disabled>Pilih akun Anda</option>
                      {accounts.filter((account) => account.isActive && !account.isSharedWalletAccount).map((account) => (
                        <option key={account.id} value={account.id}>
                          {accountOptionLabel(account, { balance: true, language })}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : (
                  <>
                  <div className="grid grid-cols-2 gap-2">
                  <Field label="Jenis penyimpanan">
                    <select className="input" name="storageType" defaultValue="bank">
                      <option value="bank">Bank</option>
                      <option value="e_wallet">E-money / E-wallet</option>
                      <option value="cash">Tunai</option>
                      <option value="other">Lainnya</option>
                    </select>
                  </Field>
                  <Field label="Bank / penyedia">
                    <input className="input" name="storageProvider" placeholder="BCA, GoPay, DANA" />
                  </Field>
                  </div>
                <Field label="Nomor rekening / e-money">
                  <input className="input" name="storageAccountNumber" inputMode="numeric" placeholder="Nomor tujuan penyimpanan dana" />
                </Field>
                  </>
                )}
                {walletStorageMode === "account" && selectedWalletStorageAccount && (
                  <>
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-[11px] leading-4 text-amber-800">
                      Akun ini akan menjadi tempat dana dompet bersama dan tidak dapat digunakan untuk transaksi pribadi selama masih terhubung.
                    </div>
                    {selectedWalletStorageAccount.accountType !== "cash"
                      && (!selectedWalletStorageAccount.providerName || !selectedWalletStorageAccount.accountNumber) && (
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Bank / penyedia">
                          <input
                            className="input"
                            name="storageProvider"
                            placeholder="BCA, GoPay, DANA"
                            defaultValue={selectedWalletStorageAccount.providerName ?? ""}
                            required
                          />
                        </Field>
                        <Field label="Nomor rekening / e-money">
                          <input
                            className="input"
                            name="storageAccountNumber"
                            placeholder="Nomor akun"
                            defaultValue={selectedWalletStorageAccount.accountNumber ?? ""}
                            required
                          />
                        </Field>
                      </div>
                    )}
                  </>
                )}
                <Field label="Batas pengeluaran (opsional)">
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-semibold text-slate-400">Rp</span>
                    <input className="input pl-9" name="spendingLimit" inputMode="numeric" placeholder="0" onInput={handleMoneyInput} />
                  </div>
                </Field>
                <SocialFriendPicker
                  friends={friends}
                  selectedIds={walletMemberIds}
                  onToggle={(friendId) => toggleSelectedFriend(setWalletMemberIds, friendId)}
                />
                {walletMemberIds.size > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-slate-700">Pilih admin dompet</p>
                    <div className="flex flex-wrap gap-2">
                      {friends
                        .filter((friend) => walletMemberIds.has(friend.userId))
                        .map((friend) => {
                          const admin = walletAdminIds.has(friend.userId);
                          return (
                            <button
                              key={friend.userId}
                              type="button"
                              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                                admin ? "bg-[#16A34A] text-white" : "bg-slate-100 text-slate-600"
                              }`}
                              onClick={() => toggleSelectedFriend(setWalletAdminIds, friend.userId)}
                            >
                              {friend.fullName}{admin ? " � Admin" : ""}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <span>
                    <span className="block text-xs font-semibold text-slate-800">Persetujuan pengeluaran</span>
                    <span className="mt-0.5 block text-[10px] text-slate-500">Pengeluaran yang dicatat member perlu ditinjau owner atau admin sebelum mengurangi saldo.</span>
                  </span>
                  <input className="h-4 w-4 accent-[#16A34A]" type="checkbox" name="requireApproval" defaultChecked />
                </label>
                <button className="btn-primary w-full"><Wallet size={16} /> Buat dompet bersama</button>
              </div>
            </form>
            </>
          )}
          {!showCreateWallet && (
            <div className="space-y-4">
              <section className="overflow-hidden rounded-[26px] bg-gradient-to-br from-emerald-600 via-[#16A34A] to-teal-700 p-5 text-white shadow-[0_18px_44px_rgba(22,163,74,0.22)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100">Keuangan kolaboratif</p>
                    <h2 className="mt-2 text-xl font-semibold">Dompet bersama</h2>
                    <p className="mt-1 max-w-xs text-xs leading-5 text-emerald-50/85">Kelola kas, tabungan, atau tujuan finansial bersama tanpa mencampur saldo pribadi.</p>
                  </div>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15"><Wallet size={21} /></span>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/15 pt-4">
                  <div><p className="text-[10px] text-emerald-100">Aktif</p><p className="mt-1 text-sm font-semibold">{activeWallets.length}</p></div>
                  <div><p className="text-[10px] text-emerald-100">Saldo dikelola</p><p className="mt-1 truncate text-sm font-semibold">{rupiah(activeWalletBalance)}</p></div>
                  <div><p className="text-[10px] text-emerald-100">Perlu ditinjau</p><p className="mt-1 text-sm font-semibold">{pendingWalletApprovals}</p></div>
                </div>
                <button type="button" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-semibold text-[#15803D] shadow-sm transition active:scale-[0.98]" onClick={() => setShowCreateWallet(true)}><Plus size={16} /> Buat dompet bersama</button>
              </section>

              {pendingWallets.length > 0 && (
                <section>
                  <SectionHeader title="Menunggu respons" caption={`${pendingWallets.length} undangan perlu Anda jawab`} />
                  <div className="space-y-2">
                    {pendingWallets.map((wallet) => {
                      const responding = walletInviteActionId === wallet.id;
                      return (
                        <div key={wallet.id} className="rounded-[22px] border border-amber-200 bg-amber-50/70 p-4 shadow-sm">
                          <div className="flex gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><Wallet size={19} /></span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-900">{wallet.name}</p>
                              <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-slate-600">{wallet.description || "Anda diundang untuk ikut mengelola dompet ini."}</p>
                              <span className="mt-2 inline-flex rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-amber-700">Peran: {socialEnumLabel(wallet.role)}</span>
                            </div>
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button type="button" disabled={responding} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-3 text-xs font-semibold text-white disabled:opacity-60" onClick={() => respondWalletInvitation(wallet, "accepted")}>{responding ? <Loader2 className="animate-spin" size={15} /> : <CheckCircle2 size={15} />} Terima</button>
                            <button type="button" disabled={responding} className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 disabled:opacity-60" onClick={() => respondWalletInvitation(wallet, "rejected")}>Tolak</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              <section>
                <SectionHeader title="Dompet Anda" caption={activeWallets.length ? "Pilih dompet untuk melihat transaksi dan anggota." : "Buat dompet pertama untuk mulai mengelola dana bersama."} />
                {activeWallets.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-slate-200 bg-white px-5 py-8 text-center">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#16A34A]"><Wallet size={21} /></span>
                    <p className="mt-3 text-sm font-semibold text-slate-900">Belum ada dompet aktif</p>
                    <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-slate-500">Gunakan untuk kas rumah, tabungan liburan, atau pengeluaran bersama teman.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {activeWallets.map((wallet) => (
                      <button key={wallet.id} type="button" className="group rounded-[22px] border border-slate-100 bg-white p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]" onClick={() => openWallet(wallet.id)}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#16A34A]"><Wallet size={18} /></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{wallet.name}</p><p className="mt-0.5 truncate text-[11px] text-slate-500">{wallet.description || "Dompet bersama"}</p></div></div>
                          <ChevronRight size={17} className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#16A34A]" />
                        </div>
                        <p className="mt-5 text-xl font-semibold tracking-tight text-slate-950">{rupiah(wallet.balance)}</p>
                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                          <span className="min-w-0 truncate text-[11px] text-slate-500">{wallet.storageAccountName || wallet.storageProvider || (wallet.storageType === "cash" ? "Penyimpanan tunai" : "Penyimpanan belum diatur")}</span>
                          <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${wallet.pendingCount > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-[#15803D]"}`}>{wallet.pendingCount > 0 ? `${wallet.pendingCount} perlu approval` : socialEnumLabel(wallet.role)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      )}

      {!loading && tab === "wallets" && selectedWallet && (
        <div className="space-y-3">
          <button className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500" onClick={() => {
            setShowWalletEditModal(false);
            setShowWalletMembersModal(false);
            setSelectedWallet(null);
          }}><ArrowLeft size={14} /> Kembali</button>
          <div className="rounded-[22px] bg-[#16A34A] p-4 text-white shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-white/70">Saldo bersama � tidak termasuk saldo pribadi</p>
                <h3 className="mt-1 text-2xl font-semibold">{rupiah(selectedWallet.balance)}</h3>
                <p className="mt-1 text-xs text-white/70">
                  {selectedWallet.name} � {selectedWallet.members.filter((member) => member.status === "accepted").length} anggota
                </p>
              </div>
              {["owner", "admin"].includes(selectedWallet.role) && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold text-white"
                    onClick={() => setShowWalletEditModal(true)}
                  >
                    <Settings size={14} /> Edit akun
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold text-white"
                    onClick={() => setShowWalletMembersModal(true)}
                  >
                    <Users size={14} /> Edit anggota
                  </button>
                </div>
              )}
            </div>
            {selectedWallet.storageType === "gold" && (
              <div className="mt-3 rounded-2xl bg-white/10 px-3 py-3">
                <p className="text-[10px] font-medium uppercase text-white/60">Saldo Emas</p>
                <p className="mt-1 text-sm font-semibold">
                  {Number(selectedWallet.goldWeightGrams || 0).toLocaleString("id-ID", { minimumFractionDigits: 4, maximumFractionDigits: 4 })} gram
                </p>
                <p className="mt-1 text-xs text-white/75">
                  Nilai setara: {rupiah(selectedWallet.goldBalanceValue || selectedWallet.balance)}
                </p>
                {selectedWallet.goldPricePerGram && (
                  <p className="mt-1 text-[11px] text-white/75">
                    Harga jual Pegadaian: Rp{Number(selectedWallet.goldPricePerGram).toLocaleString("id-ID")}/gram
                  </p>
                )}
                {selectedWallet.goldPriceFetchedAt && (
                  <p className="mt-1 text-[11px] text-white/75">
                    Update terakhir: {localDate(selectedWallet.goldPriceFetchedAt)}
                  </p>
                )}
              </div>
            )}
            <div className="mt-3 grid grid-cols-3 divide-x divide-white/15 rounded-2xl bg-white/10 py-3">
              <div className="min-w-0 px-3">
                <p className="text-[9px] text-white/65">Setoran</p>
                <p className="mt-1 truncate text-xs font-semibold">{rupiah(selectedWallet.totalDeposit)}</p>
              </div>
              <div className="min-w-0 px-3">
                <p className="text-[9px] text-white/65">Pengeluaran</p>
                <p className="mt-1 truncate text-xs font-semibold">{rupiah(selectedWallet.totalExpense)}</p>
              </div>
              <div className="min-w-0 px-3">
                <p className="text-[9px] text-white/65">Saldo bersih</p>
                <p className="mt-1 truncate text-xs font-semibold">{rupiah(selectedWallet.balance)}</p>
              </div>
            </div>
            <div className="mt-3 rounded-2xl bg-white/10 px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase text-white/60">Dana disimpan di</p>
              <p className="mt-1 text-[10px] text-white/65">
                {selectedWallet.storageType === "gold"
                  ? "Emas"
                  : selectedWallet.storageType === "e_wallet"
                  ? "E-wallet / e-money"
                  : selectedWallet.storageType === "bank"
                  ? "Rekening bank"
                  : selectedWallet.storageType === "cash"
                  ? "Tunai"
                  : "Penyimpanan lainnya"}
              </p>
              <p className="mt-1 text-sm font-semibold">
                {selectedWallet.storageAccountName || selectedWallet.storageProvider || (selectedWallet.storageType === "cash" ? "Tunai" : selectedWallet.storageType)}
              </p>
              {selectedWallet.storageAccountNumber && <p className="mt-0.5 text-xs text-white/75">{selectedWallet.storageAccountNumber}</p>}
              <p className="mt-2 text-[11px] text-white/75">
                Split biaya: {selectedWallet.expenseSplitRule === "percentage" ? "Persentase" : selectedWallet.expenseSplitRule === "manual" ? "Manual" : "Merata"}
                {selectedWallet.activeUntil ? ` � Aktif sampai ${localDate(selectedWallet.activeUntil)}` : " � Aktif tanpa batas waktu"}
              </p>
            </div>
          </div>

          <section className="rounded-[22px] bg-white p-4 shadow-soft">
            <SectionHeader
              title="Anggota dompet"
              caption="Lihat anggota aktif, role, dan akses edit anggota dalam satu tempat."
              action={["owner", "admin"].includes(selectedWallet.role) ? (
                <button type="button" className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-[#16A34A]" onClick={() => setShowWalletMembersModal(true)}>
                  <UserPlus size={14} /> Kelola anggota
                </button>
              ) : undefined}
            />
            <div className="space-y-3">
              {selectedWallet.members.map((member) => (
                <div key={member.id} className="rounded-2xl border border-slate-100 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{member.displayName || member.fullName}</p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">@{member.username} � {socialEnumLabel(member.role)} � {socialEnumLabel(member.status)}</p>
                      {member.memberNote && <p className="mt-1 text-[11px] text-slate-500">{member.memberNote}</p>}
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${member.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                      {member.status === "pending" ? "Menunggu" : socialEnumLabel(member.role)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {showWalletEditModal && ["owner", "admin"].includes(selectedWallet.role) && (
            <WalletAccountEditModal
              wallet={selectedWallet}
              accounts={accounts}
              request={request}
              onClose={() => setShowWalletEditModal(false)}
              onSaved={async (nextMessage) => {
                setMessage(nextMessage);
                setShowWalletEditModal(false);
                await openWallet(selectedWallet.id);
              }}
            />
          )}

          {showWalletMembersModal && ["owner", "admin"].includes(selectedWallet.role) && (
            <WalletMembersManageModal
              walletId={selectedWallet.id}
              walletName={selectedWallet.name}
              members={selectedWallet.members}
              friends={friends}
              request={request}
              onClose={() => setShowWalletMembersModal(false)}
              onSaved={async (nextMessage) => {
                setMessage(nextMessage);
                await openWallet(selectedWallet.id);
              }}
            />
          )}

          <section className="rounded-[22px] bg-white p-4 shadow-soft">
            <SectionHeader title="Perubahan dompet" caption="Permintaan perubahan besar membutuhkan suara mayoritas anggota aktif." />
            <div className="space-y-2">
              {selectedWallet.changeRequests.length === 0 && <p className="rounded-2xl bg-slate-50 px-3 py-3 text-xs text-slate-500">Belum ada permintaan perubahan dompet.</p>}
              {selectedWallet.changeRequests.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-100 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {socialEnumLabel(item.status)} � {item.approvedCount}/{item.requiredApprovals} setuju � dibuat {localDate(item.createdAt)}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                      {item.payload.expenseSplitRule === "percentage" ? "Persentase" : item.payload.expenseSplitRule === "manual" ? "Manual" : "Merata"}
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-600">
                    {item.payload.name && <p>Nama: {item.payload.name}</p>}
                    {item.payload.activeUntil && <p>Aktif sampai: {localDate(item.payload.activeUntil)}</p>}
                  </div>
                  {item.status === "pending" && !item.hasReviewed && item.requestedBy !== currentUser.id && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button className="rounded-xl bg-[#16A34A] px-3 py-2 text-xs font-semibold text-white" onClick={() => runAction(
                        () => request(`/social/wallets/${selectedWallet.id}/change-requests/${item.id}`, { method: "PUT", body: JSON.stringify({ decision: "approved" }) }),
                        "Perubahan dompet disetujui"
                      ).then(() => openWallet(selectedWallet.id))}>Setujui</button>
                      <button className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600" onClick={() => runAction(
                        () => request(`/social/wallets/${selectedWallet.id}/change-requests/${item.id}`, { method: "PUT", body: JSON.stringify({ decision: "rejected" }) }),
                        "Perubahan dompet ditolak"
                      ).then(() => openWallet(selectedWallet.id))}>Tolak</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[22px] bg-white p-4 shadow-soft">
            <SectionHeader
              title="Pengingat dompet"
              caption={`${walletReminders.length} pengingat aktif`}
              action={["owner", "admin"].includes(selectedWallet.role) ? (
                <button type="button" className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-[#16A34A]" onClick={() => setShowWalletReminderForm((current) => !current)}>
                  <Plus size={14} /> Tambah
                </button>
              ) : undefined}
            />
            {showWalletReminderForm && (
              <form className="mb-3 space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3" onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                runAction(
                  () => request(`/social/wallets/${selectedWallet.id}/reminders`, {
                    method: "POST",
                    body: JSON.stringify({
                      intervalType: walletReminderInterval,
                      reminderTime: String(form.get("reminderTime")),
                      dayOfWeek: walletReminderInterval === "weekly" ? Number(form.get("dayOfWeek")) : null,
                      dayOfMonth: walletReminderInterval === "monthly" ? Number(form.get("dayOfMonth")) : null,
                      entryType: String(form.get("entryType")),
                      message: String(form.get("message")),
                      targetUserId: String(form.get("targetUserId") || "") || null,
                      timezone: APP_TIME_ZONE
                    })
                  }),
                  "Pengingat dompet berhasil dibuat"
                ).then(() => {
                  setShowWalletReminderForm(false);
                  openWallet(selectedWallet.id);
                });
              }}>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Interval">
                    <select className="input" value={walletReminderInterval} onChange={(event) => setWalletReminderInterval(event.target.value as typeof walletReminderInterval)}>
                      <option value="daily">Setiap hari</option>
                      <option value="weekly">Setiap minggu</option>
                      <option value="monthly">Setiap bulan</option>
                    </select>
                  </Field>
                  <Field label="Waktu">
                    <input className="input" type="time" name="reminderTime" defaultValue="12:00" required />
                  </Field>
                </div>
                {walletReminderInterval === "weekly" && (
                  <Field label="Hari">
                    <select className="input" name="dayOfWeek" defaultValue="1">
                      {["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"].map((day, index) => <option key={day} value={index}>{day}</option>)}
                    </select>
                  </Field>
                )}
                {walletReminderInterval === "monthly" && (
                  <Field label="Tanggal setiap bulan">
                    <input className="input" name="dayOfMonth" type="number" min="1" max="31" defaultValue="1" required />
                  </Field>
                )}
                <Field label="Buka form">
                  <select className="input" name="entryType" defaultValue="deposit">
                    <option value="deposit">Deposit / setoran</option>
                    <option value="expense">Expense / pengeluaran</option>
                  </select>
                </Field>
                <Field label="Kirim pengingat kepada">
                  <select className="input" name="targetUserId" defaultValue="">
                    <option value="">Semua anggota</option>
                    {selectedWallet.members
                      .filter((member) => member.status === "accepted")
                      .map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}
                  </select>
                </Field>
                <Field label="Pesan notifikasi">
                  <input className="input" name="message" defaultValue="Jangan lupa nabung ya hari ini" maxLength={240} required />
                </Field>
                <button className="btn-primary w-full"><Bell size={15} /> Simpan pengingat</button>
              </form>
            )}
            <div className="space-y-2">
              {walletReminders.length === 0 && <p className="rounded-2xl bg-slate-50 px-3 py-3 text-xs text-slate-500">Belum ada pengingat dompet.</p>}
              {walletReminders.map((reminder) => (
                <div key={reminder.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Bell size={16} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-800">{reminder.message}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {reminder.intervalType} � {reminder.reminderTime.slice(0, 5)} � {reminder.entryType} � {
                        reminder.targetUserId
                          ? selectedWallet.members.find((member) => member.id === reminder.targetUserId)?.fullName ?? "Anggota"
                          : "Semua anggota"
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          {!showWalletEntryForm && (
            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => {
                setShowWalletEntryForm(true);
                setWalletEntryReceiptId(null);
                setWalletEntryAttachmentName("");
                setWalletEntryAttachmentMessage(null);
                setWalletEntryDate(isoDateInput());
                window.setTimeout(() => walletEntryFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
              }}
            >
              <Plus size={16} /> Tambah transaksi dompet
            </button>
          )}
          {showWalletEntryForm && <form ref={walletEntryFormRef} className="rounded-[22px] bg-white p-4 shadow-soft" onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            runAction(
              () => request(`/social/wallets/${selectedWallet.id}/entries`, {
                method: "POST",
                body: JSON.stringify({
                  entryType: String(form.get("entryType")),
                  amount: selectedWallet.storageType === "gold" ? undefined : String(form.get("amount")),
                  goldWeightGrams: selectedWallet.storageType === "gold" ? Number(form.get("goldWeightGrams")) : null,
                  description: String(form.get("description")),
                  transactionDate: String(form.get("transactionDate")),
                  receiptId: walletEntryReceiptId
                })
              }),
              "Transaksi dompet dicatat"
            ).then(() => {
              setShowWalletEntryForm(false);
              setWalletEntryReceiptId(null);
              setWalletEntryAttachmentName("");
              setWalletEntryAttachmentMessage(null);
              openWallet(selectedWallet.id);
            });
          }}>
            <SectionHeader
              title="Catat transaksi dompet"
              caption="Pengeluaran mengikuti aturan approval."
              action={<button type="button" onClick={() => { setShowWalletEntryForm(false); setWalletEntryReceiptId(null); setWalletEntryAttachmentName(""); setWalletEntryAttachmentMessage(null); }}><X size={15} /></button>}
            />
            <div className="space-y-3">
              <select className="input" name="entryType" defaultValue={new URLSearchParams(window.location.search).get("entryType") === "expense" ? "expense" : "deposit"}><option value="deposit">Setoran</option><option value="expense">Pengeluaran</option></select>
              <Field label="Tanggal transaksi">
                <div>
                  <input type="hidden" name="transactionDate" value={walletEntryDate} />
                  <DateFilterPicker
                    label="Tanggal transaksi"
                    value={walletEntryDate}
                    onChange={setWalletEntryDate}
                    language={language}
                    showLabel={false}
                    allowClear={false}
                  />
                </div>
              </Field>
              {selectedWallet.storageType === "gold" ? (
                <div className="space-y-2">
                  <input
                    className="input"
                    name="goldWeightGrams"
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    placeholder="Berat emas (gram)"
                    required
                  />
                  <p className="text-[11px] text-slate-500">
                    Nilai rupiah akan dihitung otomatis berdasarkan harga emas Pegadaian terkini
                  </p>
                </div>
              ) : (
                <input className="input" name="amount" inputMode="numeric" placeholder="Nominal" onInput={handleMoneyInput} required />
              )}
              <input className="input" name="description" placeholder="Keterangan" required />
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3">
                <span className="flex items-center gap-2 text-xs text-slate-600">
                  {walletEntryAttachmentLoading ? <Loader2 className="animate-spin" size={15} /> : <Upload size={15} />}
                  {walletEntryAttachmentName || (walletEntryReceiptId ? "Attachment tersimpan" : "Tambah attachment")}
                </span>
                <span className="text-[10px] font-semibold text-[#16A34A]">{walletEntryReceiptId ? "Ganti file" : "Pilih file"}</span>
                <input className="sr-only" type="file" accept="image/*,video/*,.heic,.heif" onChange={uploadWalletEntryAttachment} disabled={walletEntryAttachmentLoading} />
              </label>
              {(walletEntryAttachmentName || walletEntryReceiptId) && (
                <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs lg:rounded-md ${
                  walletEntryAttachmentLoading
                    ? "border-sky-100 bg-sky-50 text-sky-700"
                    : walletEntryAttachmentMessage && !walletEntryReceiptId
                    ? "border-rose-100 bg-rose-50 text-rose-700"
                    : "border-emerald-100 bg-emerald-50 text-emerald-800"
                }`}>
                  {walletEntryAttachmentName?.match(/\.(mp4|mov|webm|m4v)$/i)
                    ? <Film className="shrink-0" size={15} />
                    : <ReceiptText className="shrink-0" size={15} />}
                  <span className="min-w-0 flex-1 truncate">{walletEntryAttachmentName || "Attachment transaksi tersimpan"}</span>
                  {walletEntryAttachmentLoading
                    ? <Loader2 className="shrink-0 animate-spin" size={14} />
                    : walletEntryReceiptId ? <CheckCircle2 className="shrink-0" size={14} /> : null}
                </div>
              )}
              {walletEntryAttachmentMessage && (
                <p className={`text-[11px] leading-4 ${walletEntryReceiptId ? "text-[#15803D]" : "text-rose-700"}`}>
                  {walletEntryAttachmentMessage}
                </p>
              )}
              <button className="btn-primary w-full" disabled={walletEntryAttachmentLoading}>Simpan transaksi</button>
            </div>
          </form>}
          <section className="rounded-[22px] bg-white p-4 shadow-soft">
            <SectionHeader title="Ringkasan anggota" caption="Kontribusi dari transaksi yang sudah disetujui." />
            <div className="space-y-2">
              {selectedWallet.memberSummary.map((member) => (
                <div key={member.userId} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-2xl bg-slate-50 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-900">
                      {member.fullName}{["owner", "admin"].includes(member.role) ? " (admin)" : ""}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-500">Aktivitas dompet</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-slate-400">Deposit</p>
                    <p className="text-[11px] font-semibold text-[#16A34A]">{rupiah(member.deposit)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-slate-400">Pengeluaran</p>
                    <p className="text-[11px] font-semibold text-rose-600">{rupiah(member.expense)}</p>
                  </div>
                  {selectedWallet.storageType === "gold" && (
                    <div className="col-span-3 flex items-center justify-between rounded-xl bg-white px-3 py-2 text-[11px] text-slate-600">
                      <span>{Number(member.goldBalanceGrams || 0).toLocaleString("id-ID", { minimumFractionDigits: 4, maximumFractionDigits: 4 })} gram</span>
                      <span className="font-semibold text-slate-800">{rupiah(member.goldBalanceValue || 0)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-[22px] bg-white p-4 shadow-soft">
            <SectionHeader title="Audit dompet" caption="Riwayat perubahan untuk kebutuhan audit." />
            <div className="space-y-2">
              {selectedWallet.auditHistory.length === 0 && <p className="rounded-2xl bg-slate-50 px-3 py-3 text-xs text-slate-500">Belum ada log audit dompet.</p>}
              {selectedWallet.auditHistory.map((item) => (
                <div key={item.id} className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-xs font-semibold text-slate-800">{item.action}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{localDate(item.createdAt)}</p>
                </div>
              ))}
            </div>
          </section>
          <div className="rounded-[22px] bg-white p-4 shadow-soft">
            <SectionHeader title="Riwayat transaksi" caption="Dikelompokkan berdasarkan tanggal transaksi." />
            <div className="space-y-4">
              {Object.entries(selectedWallet.entries.reduce<Record<string, WalletDetail["entries"]>>((groups, entry) => {
                const key = entry.transactionDate || entry.createdAt.slice(0, 10);
                (groups[key] ??= []).push(entry);
                return groups;
              }, {})).map(([date, entries]) => (
                <section key={date}>
                  <p className="mb-2 text-[11px] font-semibold text-slate-500">{localDate(`${date}T00:00:00+07:00`)}</p>
                  <div className="space-y-2">
                  {entries.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-slate-100 p-3">
                  <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{entry.description}</p>
                    <p className="text-xs text-slate-500">{entry.createdByName} � {socialEnumLabel(entry.status)}</p>
                  </div>
                  {entry.receiptId && (
                    <button
                      type="button"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition hover:bg-emerald-50 hover:text-[#16A34A]"
                      onClick={() => openWalletAttachment(entry.receiptId!)}
                      aria-label="Lihat attachment"
                      title="Lihat attachment"
                    >
                      <Eye size={15} />
                    </button>
                  )}
                  <p className={`text-sm font-semibold ${entry.entryType === "deposit" ? "text-[#16A34A]" : "text-rose-600"}`}>{entry.entryType === "deposit" ? "+" : "-"}{rupiah(entry.amount)}</p>
                  </div>
                  {entry.status === "pending" && ["owner", "admin"].includes(selectedWallet.role) && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button className="rounded-xl bg-[#16A34A] px-3 py-2 text-xs font-semibold text-white" onClick={() => runAction(
                        () => request(`/social/wallet-entries/${entry.id}/approve`, { method: "PUT", body: JSON.stringify({ status: "approved" }) }),
                        "Transaksi disetujui"
                      ).then(() => openWallet(selectedWallet.id))}>Setujui</button>
                      <button className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600" onClick={() => runAction(
                        () => request(`/social/wallet-entries/${entry.id}/approve`, { method: "PUT", body: JSON.stringify({ status: "rejected" }) }),
                        "Transaksi ditolak"
                      ).then(() => openWallet(selectedWallet.id))}>Tolak</button>
                    </div>
                  )}
                </div>
                  ))}
                  </div>
                </section>
              ))}
              {selectedWallet.entries.length === 0 && <EmptyState text="Belum ada transaksi dompet." />}
            </div>
          </div>
        </div>
      )}

      {!loading && tab === "activity" && (
        <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
          <SectionHeader
            title="Aktivitas Anda"
            caption="Tidak ada feed publik; hanya aktivitas yang melibatkan Anda."
            action={<button className="text-xs font-semibold text-[#16A34A]" onClick={() => runAction(
              () => request("/social/activity/read", { method: "PUT", body: "{}" }),
              "Semua notifikasi ditandai dibaca"
            )}>Tandai dibaca</button>}
          />
          <div className="space-y-5">
            {activity.length === 0 && <EmptyState text="Belum ada aktivitas sosial." />}
            {groupedActivity.map((group) => (
              <section key={group.key}>
                <div className="sticky top-16 z-10 mb-2 bg-white/95 py-1 backdrop-blur">
                  <p className="text-[11px] font-semibold uppercase text-slate-400">{group.label}</p>
                </div>
                <div className="space-y-2">
                  {group.items.map((event) => (
                    <div key={event.id} className={`rounded-2xl p-3 ${event.isRead ? "bg-slate-50" : "border border-emerald-100 bg-emerald-50"}`}>
                      <div className="flex justify-between gap-3"><p className="text-sm font-semibold">{event.title}</p>{!event.isRead && <span className="h-2 w-2 rounded-full bg-[#16A34A]" />}</div>
                      {event.body && <p className="mt-1 text-xs text-slate-600">{event.body}</p>}
                      <p className="mt-1 text-[11px] text-slate-400">
                        {new Intl.DateTimeFormat(language === "en" ? "en-US" : "id-ID", { timeZone: APP_TIME_ZONE, hour: "2-digit", minute: "2-digit" }).format(new Date(event.createdAt))}
                      </p>
                      {event.eventType === "payment_received" && event.entityId && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <button className="rounded-xl bg-[#16A34A] px-3 py-2 text-xs font-semibold text-white" onClick={() => runAction(
                            () => request(`/social/settlements/${event.entityId}/confirm`, { method: "PUT", body: JSON.stringify({ status: "confirmed" }) }),
                            "Pembayaran dikonfirmasi"
                          )}>Sudah diterima</button>
                          <button className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-rose-600" onClick={() => runAction(
                            () => request(`/social/settlements/${event.entityId}/confirm`, { method: "PUT", body: JSON.stringify({ status: "cancelled" }) }),
                            "Pembayaran ditolak"
                          )}>Tolak</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
            <div ref={activitySentinelRef} className="flex min-h-12 items-center justify-center">
              {activityLoadingMore && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 size={15} className="animate-spin" /> Memuat aktivitas...
                </div>
              )}
              {!activityHasMore && activity.length > 0 && <p className="text-[11px] text-slate-400">Semua aktivitas sudah ditampilkan.</p>}
            </div>
          </div>
        </div>
      )}

      {!loading && tab === "privacy" && (
        <form className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          runAction(
            () => request("/social/privacy", {
              method: "PUT",
              body: JSON.stringify({
                allowWalletInvites: form.get("allowWalletInvites") === "on",
                allowGroupInvites: form.get("allowGroupInvites") === "on",
                searchableBy: String(form.get("searchableBy")),
                hidePhone: form.get("hidePhone") === "on"
              })
            }),
            "Pengaturan privasi disimpan"
          );
        }}>
          <SectionHeader title="Kontrol privasi" caption="Saldo, rekening, budget, dan transaksi pribadi tidak pernah dibagikan otomatis." />
          <div className="space-y-3">
            <label className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 text-sm"><span>Izinkan ditambahkan ke dompet bersama</span><input type="checkbox" name="allowWalletInvites" defaultChecked={privacy.allowWalletInvites} /></label>
            <label className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 text-sm"><span>Izinkan ditambahkan ke grup</span><input type="checkbox" name="allowGroupInvites" defaultChecked={privacy.allowGroupInvites} /></label>
            <label className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 text-sm"><span>Sembunyikan nomor telepon</span><input type="checkbox" name="hidePhone" defaultChecked={privacy.hidePhone} /></label>
            <Field label="Siapa yang dapat mencari akun">
              <select className="input" name="searchableBy" defaultValue={privacy.searchableBy}>
                <option value="everyone">Username, email, dan telepon</option>
                <option value="username">Hanya username</option>
                <option value="friends">Teman saja</option>
                <option value="nobody">Tidak seorang pun</option>
              </select>
            </Field>
            <button className="btn-primary w-full"><ShieldCheck size={16} /> Simpan privasi</button>
          </div>
        </form>
      )}
    </section>
  );
}

function ProfileView({
  session,
  request,
  onProfileUpdated,
  onInstall,
  showInstall,
  onLogout
}: {
  session: Session;
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onProfileUpdated: (user: Session["user"]) => void;
  onInstall: () => Promise<void>;
  showInstall: boolean;
  onLogout?: () => void;
}) {
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(session.user.avatarUrl ?? "");
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  useEffect(() => {
    setAvatarUrl(session.user.avatarUrl ?? "");
  }, [session.user.avatarUrl]);

  const chooseAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setProfileMessage("Foto profil harus berupa gambar.");
      return;
    }
    let avatarBlob: Blob = file;
    if (/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)) {
      const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
      avatarBlob = Array.isArray(converted) ? converted[0] : converted;
    }
    const source = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Foto gagal dibaca"));
      reader.readAsDataURL(avatarBlob);
    });
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("Foto tidak valid"));
      nextImage.src = source;
    });
    const size = Math.min(512, Math.max(image.width, image.height));
    const scale = size / Math.max(image.width, image.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    setAvatarUrl(canvas.toDataURL("image/jpeg", 0.85));
    setProfileMessage(null);
    event.target.value = "";
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileMessage(null);
    const form = new FormData(event.currentTarget);
    try {
      const user = await request<Session["user"]>("/auth/profile", {
        method: "PUT",
        body: JSON.stringify({
          fullName: String(form.get("fullName")),
          username: String(form.get("username")),
          phone: String(form.get("phone") || "") || null,
          nickname: String(form.get("nickname") || "") || null,
          title: String(form.get("title") || "") || null,
          avatarUrl: avatarUrl || null
        })
      });
      onProfileUpdated(user);
      setProfileMessage("Profil berhasil diperbarui.");
      setIsEditingProfile(false);
    } catch (err) {
      setProfileMessage(err instanceof Error ? err.message : "Profil gagal diperbarui");
    }
  };

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await request("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: String(form.get("currentPassword")),
          newPassword: String(form.get("newPassword"))
        })
      });
      setPasswordMessage("Password berhasil diubah.");
      formElement.reset();
    } catch (err) {
      setPasswordMessage(err instanceof Error ? err.message : "Password gagal diubah");
    }
  };
  return (
    <div className="mx-auto grid max-w-5xl gap-3 xl:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-[26px] bg-[#16A34A] p-4 text-white shadow-[0_18px_42px_rgba(22,163,74,0.18)] lg:rounded-lg lg:p-5">
        <div className="flex items-start gap-3">
          {avatarUrl ? (
            <img className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-2 ring-white/20 lg:rounded-lg" src={avatarUrl} alt="Foto profil" />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-lg font-semibold lg:rounded-lg">{session.user.fullName.slice(0, 1).toUpperCase()}</span>
          )}
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase text-white/60">Profil</p>
            <h2 className="mt-1 truncate text-xl font-semibold">{session.user.nickname || session.user.fullName}</h2>
            {session.user.title && <p className="truncate text-xs text-emerald-100">{session.user.title}</p>}
            <p className="mt-0.5 truncate text-xs font-semibold text-white/70">{session.user.email}</p>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-2xl bg-white/12 px-3 py-2 lg:rounded-md"><dt className="font-bold text-white/60">Mata uang</dt><dd className="mt-1 font-semibold">IDR</dd></div>
          <div className="rounded-2xl bg-white/12 px-3 py-2 lg:rounded-md"><dt className="font-bold text-white/60">Akun</dt><dd className="mt-1 font-semibold">Aktif</dd></div>
        </dl>
        {showInstall && (
          <button
            type="button"
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/15 lg:rounded-md"
            onClick={onInstall}
          >
            <Download size={15} /> Pasang aplikasi
          </button>
        )}
        {onLogout && (
          <button
            type="button"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#16A34A] transition hover:bg-emerald-50 lg:hidden"
            onClick={onLogout}
          >
            <LogOut size={16} /> Logout
          </button>
        )}
      </section>
      <div className="space-y-3">
        {!isEditingProfile ? (
          <section className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200">
            <SectionHeader
              title="Profil saya"
              caption="Informasi yang tampil pada akun Anda."
              action={(
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-[#16A34A] transition active:scale-95"
                  onClick={() => {
                    setProfileMessage(null);
                    setAvatarUrl(session.user.avatarUrl ?? "");
                    setIsEditingProfile(true);
                  }}
                >
                  <Settings size={14} /> Edit profil
                </button>
              )}
            />
            <dl className="divide-y divide-slate-100">
              {[
                ["Nama lengkap", session.user.fullName],
                ["Username", session.user.username ? `@${session.user.username}` : "-"],
                ["Nomor telepon", session.user.phone || "-"],
                ["Nama panggilan", session.user.nickname || "-"],
                ["Title", session.user.title || "-"]
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="min-w-0 truncate text-right text-xs font-semibold text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
            {profileMessage && <p className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-[#16A34A] lg:rounded-md">{profileMessage}</p>}
          </section>
        ) : (
          <form className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200" onSubmit={saveProfile}>
            <SectionHeader title="Edit profil" caption="Atur identitas yang tampil di aplikasi." />
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 lg:rounded-md">
                {avatarUrl ? <img className="h-12 w-12 rounded-xl object-cover" src={avatarUrl} alt="" /> : <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-400"><UserRound size={20} /></span>}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-700">Foto profil</p>
                  <p className="text-[11px] text-slate-500">Gambar akan dirapikan otomatis.</p>
                </div>
                <label className="cursor-pointer rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#16A34A] shadow-sm">
                  Pilih
                  <input className="sr-only" type="file" accept="image/*,.heic,.heif" onChange={chooseAvatar} />
                </label>
              </div>
              <Field label="Nama lengkap"><input className="input" name="fullName" defaultValue={session.user.fullName} required minLength={2} /></Field>
              <Field label="Username">
                <input className="input" name="username" defaultValue={session.user.username ?? ""} placeholder="contoh: reyandika" pattern="[a-zA-Z0-9_.]{3,40}" required />
              </Field>
              <Field label="Nomor telepon">
                <input className="input" name="phone" type="tel" defaultValue={session.user.phone ?? ""} placeholder="Contoh: 081234567890" />
              </Field>
              <Field label="Nickname"><input className="input" name="nickname" defaultValue={session.user.nickname ?? ""} placeholder="Nama panggilan" /></Field>
              <Field label="Title"><input className="input" name="title" defaultValue={session.user.title ?? ""} placeholder="Contoh: Student, Freelancer" /></Field>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="btn-secondary w-full"
                  onClick={() => {
                    setAvatarUrl(session.user.avatarUrl ?? "");
                    setProfileMessage(null);
                    setIsEditingProfile(false);
                  }}
                >
                  Batal
                </button>
                <button className="btn-primary w-full"><CheckCircle2 size={16} /> Simpan profil</button>
              </div>
              {profileMessage && <p className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600 lg:rounded-md">{profileMessage}</p>}
            </div>
          </form>
        )}

        <form className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200" onSubmit={submitPassword}>
          <SectionHeader title="Keamanan akun" caption="Ubah password secara berkala agar akun tetap aman." />
          <div className="space-y-3">
            <Field label="Password saat ini"><input className="input" name="currentPassword" type="password" placeholder="Masukkan password lama" required /></Field>
            <Field label="Password baru"><input className="input" name="newPassword" type="password" placeholder="Minimal 8 karakter" minLength={8} required /></Field>
            <button className="btn-secondary w-full"><CheckCircle2 size={16} /> Simpan password</button>
            {passwordMessage && <p className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600 lg:rounded-md">{passwordMessage}</p>}
          </div>
        </form>
      </div>
    </div>
  );
}

function AiFieldBadge({ status, language }: { status: "ai" | "changed" | "review" | null; language: AppLanguage }) {
  if (!status) return null;

  const config = {
    ai: {
      label: language === "en" ? "Filled by AI" : "Diisi AI",
      className: "bg-emerald-50 text-[#15803D]",
      icon: <CheckCircle2 size={11} />
    },
    changed: {
      label: language === "en" ? "Edited" : "Diubah",
      className: "bg-sky-50 text-sky-700",
      icon: <CheckCircle2 size={11} />
    },
    review: {
      label: language === "en" ? "Needs Confirmation" : "Perlu Konfirmasi",
      className: "bg-amber-50 text-amber-700",
      icon: <TriangleAlert size={11} />
    }
  }[status];

  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold ${config.className}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

function Field({ label, hint, children }: { label: string; hint?: JSX.Element; children: JSX.Element }) {
  return (
    <label className="block text-xs font-semibold text-slate-600">
      <span className="flex min-h-5 items-center justify-between gap-2">
        <span>{label}</span>
        {hint}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function storedStringSet(key: string) {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return new Set<string>(Array.isArray(value) ? value.map(String) : []);
  } catch {
    return new Set<string>();
  }
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes.buffer;
}

function transactionDateKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  return jakartaDateParts(date).value;
}

function transactionDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tanggal tidak valid";

  const today = jakartaDateParts();
  const yesterdayDate = new Date(Date.UTC(today.year, today.month - 1, today.day - 1, 12));
  const currentKey = jakartaDateParts(date).value;
  if (currentKey === today.value) return "Hari ini";
  if (currentKey === jakartaDateParts(yesterdayDate).value) return "Kemarin";
  return localDate(value);
}

function groupTransactionsByDate(rows: Transaction[]) {
  const groups: Array<{ key: string; label: string; rows: Transaction[]; net: number }> = [];
  const byKey = new Map<string, { key: string; label: string; rows: Transaction[]; net: number }>();

  for (const row of rows) {
    const key = transactionDateKey(row.transactionDate);
    let group = byKey.get(key);
    if (!group) {
      group = { key, label: transactionDateLabel(row.transactionDate), rows: [], net: 0 };
      byKey.set(key, group);
      groups.push(group);
    }
    group.rows.push(row);
    group.net += row.transactionType === "income" ? Number(row.amount) : -Number(row.amount);
  }

  return groups;
}

function transactionTitle(row: Transaction) {
  return row.merchantName ?? row.categoryName ?? "Transaksi";
}

function transactionCategoryIcon(row: Transaction) {
  const category = row.categoryName?.toLowerCase() ?? "";
  if (row.transactionType === "income") {
    if (category.includes("gaji")) return <Wallet size={18} />;
    if (category.includes("bonus")) return <Sparkles size={18} />;
    if (category.includes("penjualan")) return <Store size={18} />;
    if (category.includes("investasi")) return <TrendingUp size={18} />;
    if (category.includes("usaha")) return <Briefcase size={18} />;
    return <CirclePlus size={18} />;
  }
  if (category.includes("makan")) return <Utensils size={18} />;
  if (category.includes("transport")) return <Bus size={18} />;
  if (category.includes("belanja")) return <ShoppingBag size={18} />;
  if (category.includes("tagihan")) return <ReceiptText size={18} />;
  if (category.includes("kesehatan")) return <HeartPulse size={18} />;
  if (category.includes("pendidikan")) return <GraduationCap size={18} />;
  if (category.includes("hiburan")) return <Film size={18} />;
  if (category.includes("cicilan")) return <CreditCard size={18} />;
  if (category.includes("investasi")) return <TrendingUp size={18} />;
  return <CircleMinus size={18} />;
}

function transactionIconClass(row: Transaction) {
  if (row.transactionType === "income") return "bg-emerald-50 text-[#16A34A]";
  const category = row.categoryName?.toLowerCase() ?? "";
  if (category.includes("makan")) return "bg-orange-50 text-orange-600";
  if (category.includes("transport")) return "bg-[#16A34A]/10 text-[#16A34A]";
  if (category.includes("belanja")) return "bg-violet-50 text-violet-600";
  return "bg-slate-100 text-slate-700";
}

function TransactionHistoryItem({
  row,
  onOpen,
  onRemove,
  compact = false,
  selected = false,
  selectionMode = false,
  onToggleSelect,
  onLongPress
}: {
  row: Transaction;
  onOpen?: () => void;
  onRemove?: () => void;
  compact?: boolean;
  selected?: boolean;
  selectionMode?: boolean;
  onToggleSelect?: () => void;
  onLongPress?: () => void;
}) {
  const isIncome = row.transactionType === "income";
  const [deleteRevealed, setDeleteRevealed] = useState(false);
  const dragStartX = useRef<number | null>(null);
  const dragStartY = useRef<number | null>(null);
  const dragged = useRef(false);
  const suppressClickUntil = useRef(0);
  const holdTimer = useRef<number | null>(null);
  const canSwipeDelete = Boolean(onRemove) && !compact && !selectionMode;

  const clearHoldTimer = () => {
    if (holdTimer.current) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (!compact && !selectionMode && onLongPress) {
      holdTimer.current = window.setTimeout(() => {
        suppressClickUntil.current = Date.now() + 350;
        setDeleteRevealed(false);
        onLongPress();
      }, 520);
    }
    if (canSwipeDelete || (!compact && !selectionMode && onLongPress)) {
      dragStartX.current = event.clientX;
      dragStartY.current = event.clientY;
    }
    dragged.current = false;
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (dragStartX.current === null) return;
    const delta = event.clientX - dragStartX.current;
    const verticalDelta = dragStartY.current === null ? 0 : event.clientY - dragStartY.current;
    if (Math.abs(delta) > 8 || Math.abs(verticalDelta) > 8) {
      dragged.current = true;
      clearHoldTimer();
    }
    if (!canSwipeDelete) return;
    if (delta < -42) setDeleteRevealed(true);
    if (delta > 42) setDeleteRevealed(false);
  };

  const handlePointerUp = () => {
    clearHoldTimer();
    if (dragged.current) suppressClickUntil.current = Date.now() + 250;
    dragStartX.current = null;
    dragStartY.current = null;
    dragged.current = false;
  };

  const handleOpen = () => {
    if (Date.now() < suppressClickUntil.current) return;
    if (selectionMode) {
      onToggleSelect?.();
      return;
    }
    if (deleteRevealed) {
      setDeleteRevealed(false);
      return;
    }
    onOpen?.();
  };

  return (
    <div className="relative overflow-hidden bg-white">
      {canSwipeDelete && deleteRevealed && (
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex w-20 items-center justify-center bg-rose-500 text-white"
          onClick={onRemove}
          aria-label="Hapus transaksi"
        >
          <Trash2 size={18} />
        </button>
      )}
      <article
        className={`relative select-none px-4 py-3.5 transition hover:bg-slate-50 ${selected ? "bg-emerald-50/80" : "bg-white"} ${deleteRevealed ? "-translate-x-20" : "translate-x-0"} ${compact ? "lg:px-3" : "lg:px-5"} ${onOpen || selectionMode ? "cursor-pointer" : ""}`}
        role={onOpen ? "button" : undefined}
        tabIndex={onOpen ? 0 : undefined}
        onClick={handleOpen}
        onKeyDown={(event) => {
          if ((event.key === "Enter" || event.key === " ") && (onOpen || selectionMode)) {
            event.preventDefault();
            if (selectionMode) {
              onToggleSelect?.();
            } else {
              onOpen?.();
            }
          }
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition ${
            selected ? "bg-[#16A34A] text-white shadow-[0_10px_20px_rgba(22,163,74,0.18)]" : transactionIconClass(row)
          }`}>
            {selected ? <CheckCircle2 size={18} /> : transactionCategoryIcon(row)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-sm font-semibold text-slate-950">{transactionTitle(row)}</p>
            </div>
            <p className="mt-1 truncate text-xs font-semibold text-slate-500">
              {row.accountName}{row.paymentMethod ? ` - ${row.paymentMethod}` : ""}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="flex items-center justify-end gap-1">
            <p className={`text-sm font-semibold ${isIncome ? "text-[#16A34A]" : "text-slate-950"}`}>
              {isIncome ? "+" : "-"}{rupiah(row.amount)}
            </p>
            {!compact && <ChevronRight size={14} className="text-slate-300" />}
          </div>
          <p className="mt-1 text-[11px] font-semibold text-slate-400">{isIncome ? "Pemasukan" : "Pengeluaran"}</p>
        </div>
      </div>
      </article>
    </div>
  );
}

function TransactionList({ rows }: { rows: Transaction[] }) {
  if (rows.length === 0) return <EmptyState text="Belum ada transaksi." />;
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white lg:rounded-lg">
      {rows.map((row) => (
        <TransactionHistoryItem key={row.id} row={row} compact />
      ))}
    </div>
  );
}

function LegacyTransactionList({ rows }: { rows: Transaction[] }) {
  if (rows.length === 0) return <EmptyState text="Belum ada transaksi." />;
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3 lg:rounded-md">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              row.transactionType === "income" ? "bg-emerald-50 text-[#16A34A]" : "bg-rose-50 text-rose-600"
            }`}>
              {row.transactionType === "income" ? <ArrowDownLeft size={19} /> : <ArrowUpRight size={19} />}
            </span>
            <div className="min-w-0">
              <p className="truncate font-bold">{row.merchantName ?? row.categoryName ?? "Transaksi"}</p>
              <p className="truncate text-xs text-slate-500">{row.categoryName ?? row.sourceType ?? "Manual"} · {row.accountName}</p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className={`font-semibold ${row.transactionType === "income" ? "text-[#16A34A]" : "text-slate-950"}`}>
              {row.transactionType === "income" ? "+" : "-"}{rupiah(row.amount)}
            </p>
            <p className="text-xs text-slate-400">{localDate(row.transactionDate)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-56 items-center justify-center text-slate-500">
      <Loader2 className="mr-2 animate-spin" size={18} /> Memuat data...
    </div>
  );
}

function DataErrorState({
  message,
  onRetry
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-[22px] border border-rose-100 bg-rose-50/80 p-4 text-center text-sm text-rose-700">
      <p className="font-semibold">Data belum bisa dimuat.</p>
      <p className="mt-1 text-xs leading-5 text-rose-600">{message}</p>
      {onRetry && (
        <button type="button" className="btn-secondary mt-3" onClick={onRetry}>
          Coba lagi
        </button>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">{text}</div>;
}


function QrScanner({
  onScan,
  onClose,
  request,
  selectedPocketId
}: {
  onScan: (result: string | null) => void;
  onClose: () => void;
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  selectedPocketId: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        if (!cancelled) setError("Tidak dapat mengakses kamera");
      }
    };
    startCamera();
    return () => {
      cancelled = true;
      if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); }
    };
  }, []);

  useEffect(() => {
    if (!scanning || !videoRef.current) return;
    let animId: number;
    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) { animId = requestAnimationFrame(tick); return; }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { animId = requestAnimationFrame(tick); return; }
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code) {
        setScanning(false);
        onScan(code.data);
        return;
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [scanning]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between bg-black/80 px-4 py-3">
        <button type="button" className="text-sm font-semibold text-white" onClick={onClose}>
          <ArrowLeft size={20} />
        </button>
        <p className="text-sm font-semibold text-white">Scan barcode user</p>
        <div className="w-5" />
      </div>
      <div className="relative flex flex-1 items-center justify-center">
        {error ? (
          <div className="rounded-xl bg-white/10 px-6 py-4 text-center text-sm text-white">{error}</div>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-48 w-48 rounded-2xl border-2 border-emerald-400 shadow-[0_0_40px_rgba(52,211,153,0.3)]" />
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </>
        )}
      </div>
      <div className="bg-black/80 px-4 py-4 text-center text-xs text-white/60">
        Arahkan kamera ke barcode QR user lain
      </div>
    </div>
  );
}


export default App;