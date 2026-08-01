import { ArrowLeftRight, ChevronRight, ReceiptText, X, type LucideIcon } from "lucide-react";
import { mobileNavigation } from "../../config/navigation";
import { downloadUrl } from "../../lib/api";
import type { AppLanguage, View } from "../../types/app";

export let debugLogTimer: number | null = null;

export let debugLogPayload: {
  event: string;
  data: unknown;
} | null = null;

export function queueDebugLog(event: string, data: unknown) {
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

export function MobileBottomNav({ view, activeView, language, isScrolling, unreadNotificationCount = 0, pocketActionCount = 0, onNavigate }: {
  view: View;
  activeView?: View;
  language: AppLanguage;
  isScrolling: boolean;
  unreadNotificationCount?: number;
  pocketActionCount?: number;
  onNavigate: (view: View) => void;
}) {
  const resolvedView = activeView ?? view;
  const isActive = (item: { id: View }) =>
    item.id === "accounts"
      ? resolvedView === "accounts"
      : item.id === "manage"
        ? resolvedView === "manage" || resolvedView === "categories" || resolvedView === "budgets" || resolvedView === "profile"
        : resolvedView === item.id;

  return (
    <nav className="mobile-bottom-nav lg:hidden" aria-label={language === "en" ? "Main navigation" : "Navigasi utama"}>
      <div className="mobile-bottom-nav-shell">
        <div className="mobile-bottom-nav-surface" aria-hidden="true" />
        <div className="mobile-bottom-nav-menus !grid grid-cols-5">
          {mobileNavigation.map((item) => <MobileNavButton key={item.id} item={item} language={language} active={isActive(item)} badgeCount={item.id === "notifications" ? unreadNotificationCount : item.id === "accounts" ? pocketActionCount : 0} onNavigate={onNavigate} />)}
        </div>
      </div>
    </nav>
  );
}

export function AddActionSheet({ language, onClose, onTransaction, onTransfer }: {
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
      <button type="button" data-scroll-lock="true" className="fixed inset-0 z-40 cursor-default bg-slate-950/20 backdrop-blur-[1px]" aria-label={language === "en" ? "Close add menu" : "Tutup menu tambah"} onClick={onClose} />
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
              <button key={action.label} type="button" className="ripple-card flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-left shadow-sm transition active:scale-[0.99]" onClick={action.onClick}>
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

export function MobileNavButton({ item, language, active, badgeCount = 0, onNavigate }: {
  item: {
    id: View;
    label: string;
    icon: LucideIcon;
  };
  language: AppLanguage;
  active: boolean;
  badgeCount?: number;
  onNavigate: (view: View) => void;
}) {
  const Icon = item.icon;
  return (
    <button className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-[10px] font-semibold transition ${active ? "text-[#16A34A]" : "text-slate-400"}`} onClick={() => onNavigate(item.id)} aria-current={active ? "page" : undefined}>
      <span className={`relative flex h-7 w-8 items-center justify-center rounded-xl transition ${active ? "bg-emerald-50" : "bg-transparent"}`}>
        <Icon size={18} strokeWidth={active ? 2.5 : 1.9} />
        {badgeCount > 0 && <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-bold text-white">{badgeCount > 9 ? "9+" : badgeCount}</span>}
      </span>
      <span className="max-w-full truncate">{mobileNavLabel(item.id, item.label, language)}</span>
    </button>
  );
}

export function mobileNavLabel(view: View, fallback: string, language: AppLanguage) {
  if (language === "id") return fallback;
  const labels: Partial<Record<View, string>> = {
    dashboard: "Home",
    accounts: "Pocket",
    history: "Transactions",
    assistant: "Copilot",
    reports: "Insights",
    social: "Social",
    manage: "Settings",
    notifications: "Notifications"
  };
  return labels[view] ?? fallback;
}

export function appNavigationLabel(view: View, fallback: string | undefined, language: AppLanguage) {
  if (view === "assistant") return language === "en" ? "Finance Copilot" : "Kopilot Keuangan";
  return fallback;
}
