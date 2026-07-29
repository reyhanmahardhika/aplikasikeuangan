/**
 * AI context chunk: Imports, global declarations, shared types, constants
 * Generated from: App.tsx
 * Read-only snapshot. Do not import this file into the application.
 */
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
