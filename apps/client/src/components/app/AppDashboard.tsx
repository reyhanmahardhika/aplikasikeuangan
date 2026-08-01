import { ArrowDownLeft, ArrowUpRight, ChevronRight, Lightbulb, LineChart, Plus, Wallet } from "lucide-react";
import type { FormEvent, JSX } from "react";
import { resolveAsyncContentState } from "../../lib/asyncContentState";
import { APP_TIME_ZONE, formatRupiahInput, jakartaDateParts, rupiah } from "../../lib/format";
import type { AppLanguage, DashboardSummary } from "../../types/app";
import { DataErrorState, EmptyState, LoadingState } from "./AppPrimitives";

export const categoryPalette = ["#16c784", "#f6a90b", "#60a5fa", "#2dd4bf", "#8b5cf6", "#ec4899"];

export function handleMoneyInput(event: FormEvent<HTMLInputElement>) {
  event.currentTarget.value = formatRupiahInput(event.currentTarget.value);
}

export function ExpenseDonut({ dashboard, language = "id" }: { dashboard: DashboardSummary; language?: AppLanguage }) {
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
          <h3 className="section-title">{language === "en" ? "Spending mix" : "Komposisi pengeluaran"}</h3>
          <p className="section-caption">{language === "en" ? "This month" : "Bulan ini"}</p>
        </div>
        <span className="status-chip border-emerald-200 bg-emerald-50 text-[#16845B]">Top 5</span>
      </div>
      {rows.length === 0 ? (
        <EmptyState text={language === "en" ? "Categories will appear after your first expense." : "Kategori akan muncul setelah ada pengeluaran."} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
          <div className="relative mx-auto h-40 w-40 rounded-full" style={{ background: donutBackground }}>
            <div className="absolute inset-9 flex flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-500">Total</span>
              <span className="text-sm font-extrabold tracking-[-0.025em]">{rupiah(dashboard.expenseThisMonth)}</span>
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

export function DashboardView({ dashboard, loading, error, language, onAdd, onAssistant, onRetry }: {
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
  const monthLabel = new Intl.DateTimeFormat(language === "en" ? "en-GB" : "id-ID", { timeZone: APP_TIME_ZONE, month: "long", year: "numeric" }).format(new Date());
  const averageExpense = expense / Math.max(jakartaToday.day, 1);
  const runwayDays = averageExpense > 0 ? Math.max(Math.floor(balance / averageExpense), 0) : null;
  const healthLabel = language === "en"
    ? expenseRatio <= 50 ? "Healthy" : expenseRatio <= 80 ? "Good" : expenseRatio <= 100 ? "Watch" : "Tight"
    : expenseRatio <= 50 ? "Sehat" : expenseRatio <= 80 ? "Aman" : expenseRatio <= 100 ? "Waspada" : "Ketat";
  const healthClass = expenseRatio <= 80 ? "bg-emerald-50 text-[#16A34A]" : expenseRatio <= 100 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700";
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
  const copy = language === "en" ? {
    activeBalance: "Active balance",
    balanceHelper: "Across every active pocket",
    monthNet: "Net this month",
    dailyAverage: "Daily spend",
    perDay: "/day",
    add: "Add transaction",
    summary: "Monthly pulse",
    income: "Money in",
    expense: "Money out",
    net: "Net flow",
    runway: "Runway",
    runwayHelper: "Balance estimate",
    days: "days",
    safe: "Stable",
    spendRatio: "Spending ratio",
    topCategory: "Top category",
    noData: "No data yet",
    noExpense: "No expenses yet",
    budget: "Budget watch",
    check: "need attention",
    controlled: "On track",
    noAlert: "No alerts",
    cashFlow: "Daily cash flow",
    cashFlowCaption: "Activity in the current month",
    recent: "Recent activity",
    budgetAlerts: "Budget signals",
    noBudgetAlerts: "Everything is within budget."
  } : {
    activeBalance: "Saldo aktif",
    balanceHelper: "Gabungan semua pocket aktif",
    monthNet: "Net bulan ini",
    dailyAverage: "Rata-rata keluar",
    perDay: "/hari",
    add: "Tambah transaksi",
    summary: "Pulse bulan ini",
    income: "Uang masuk",
    expense: "Uang keluar",
    net: "Arus bersih",
    runway: "Daya tahan",
    runwayHelper: "Estimasi saldo",
    days: "hari",
    safe: "Aman",
    spendRatio: "Rasio pengeluaran",
    topCategory: "Kategori teratas",
    noData: "Belum ada data",
    noExpense: "Belum ada pengeluaran",
    budget: "Pantauan anggaran",
    check: "perlu dicek",
    controlled: "Terkendali",
    noAlert: "Tidak ada peringatan",
    cashFlow: "Arus kas harian",
    cashFlowCaption: "Aktivitas bulan berjalan",
    recent: "Aktivitas terbaru",
    budgetAlerts: "Sinyal anggaran",
    noBudgetAlerts: "Semua anggaran masih terkendali."
  };

  return (
    <div className="space-y-4 lg:space-y-5">
      <section className="grid gap-4 xl:grid-cols-[1.16fr_0.84fr]">
        <div className="balance-hero balance-hero-grid p-5 lg:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/48">{copy.activeBalance}</p>
              <h2 className="mt-2 text-[1.75rem] font-extrabold tracking-[-0.055em] sm:text-4xl">{rupiah(balance)}</h2>
              <p className="mt-1.5 text-[11px] font-semibold text-white/48">{copy.balanceHelper}</p>
            </div>
            <span className="status-chip shrink-0 border-[#DFFF74]/40 bg-[#DFFF74]/10 text-[#DFFF74]">● {healthLabel}</span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2.5">
            <div className="balance-stat rounded-xl px-3.5 py-3">
              <p className="text-[10px] font-bold text-white/43">{copy.monthNet}</p>
              <p className={`mt-1 text-sm font-extrabold ${net >= 0 ? "text-[#DFFF74]" : "text-rose-300"}`}>{net >= 0 ? "+" : "-"}{rupiah(Math.abs(net))}</p>
            </div>
            <div className="balance-stat rounded-xl px-3.5 py-3">
              <p className="text-[10px] font-bold text-white/43">{copy.dailyAverage}</p>
              <p className="mt-1 text-sm font-extrabold">{rupiah(averageExpense)}<span className="text-[10px] font-semibold text-white/45">{copy.perDay}</span></p>
            </div>
          </div>

          <div className="relative z-[1] mt-4 flex flex-wrap gap-2">
            <button className="accent-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition" onClick={onAdd}>
              <Plus size={15} strokeWidth={2.5} /> {copy.add}
            </button>
          </div>
        </div>

        <button type="button" className="surface-card group flex min-h-[188px] w-full flex-col justify-between p-5 text-left transition hover:-translate-y-0.5 hover:border-emerald-200" onClick={onAssistant}>
          <span>
            <span className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E8F5EE] text-[#16845B]">
                <Lightbulb size={17} />
              </span>
              <span className="eyebrow !text-[#16845B]">{language === "en" ? "Today's money note" : "Catatan uang hari ini"}</span>
            </span>
            <span className="mt-4 block text-base font-extrabold leading-6 tracking-[-0.025em] text-slate-950">{weeklyInsightText}</span>
            <span className={`mt-1.5 block text-xs leading-5 ${availableUntilMonthEnd < 0 ? "text-rose-600" : "text-slate-500"}`}>{availabilityInsightText}</span>
          </span>
          <span className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-[11px] font-semibold text-slate-500">{language === "en" ? "Personalized from your ledger" : "Dipersonalisasi dari ledgermu"}</span>
            <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#16845B]">
              {language === "en" ? "Open Copilot" : "Buka Kopilot"}
              <ChevronRight size={15} className="transition group-hover:translate-x-0.5" />
            </span>
          </span>
        </button>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="surface-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 lg:px-5">
            <div>
              <p className="eyebrow">{monthLabel}</p>
              <h3 className="section-title mt-1">{copy.summary}</h3>
            </div>
            <span className={`status-chip ${healthClass}`}>{ratioLabel}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4">
            <DashboardMetric label={copy.income} value={rupiah(income)} helper={language === "en" ? "This month" : "Bulan ini"} tone="income" icon={<ArrowDownLeft size={16} />} />
            <DashboardMetric label={copy.expense} value={rupiah(expense)} helper={language === "en" ? "This month" : "Bulan ini"} tone="expense" icon={<ArrowUpRight size={16} />} />
            <DashboardMetric label={copy.net} value={`${net >= 0 ? "+" : "-"}${rupiah(Math.abs(net))}`} helper={language === "en" ? "In minus out" : "Masuk - keluar"} tone={net >= 0 ? "income" : "expense"} icon={<LineChart size={16} />} />
            <DashboardMetric label={copy.runway} value={runwayDays !== null ? `${runwayDays} ${copy.days}` : copy.safe} helper={copy.runwayHelper} tone="neutral" icon={<Wallet size={16} />} />
          </div>
          <div className="border-t border-slate-100 px-4 py-3.5 lg:px-5">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500">{copy.spendRatio}</span>
              <span className="font-extrabold text-slate-900">{ratioLabel}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${expenseRatio <= 80 ? "bg-[#16A34A]" : expenseRatio <= 100 ? "bg-amber-400" : "bg-rose-500"}`} style={{ width: `${Math.min(expenseRatio, 100)}%` }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-1">
          <div className="surface-card p-4 lg:p-5">
            <p className="eyebrow">{copy.topCategory}</p>
            <p className="mt-2 truncate text-base font-extrabold tracking-[-0.025em] text-slate-950">{topCategory?.category ?? copy.noData}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{topCategory ? rupiah(topCategory.total) : copy.noExpense}</p>
          </div>
          <div className="surface-card p-4 lg:p-5">
            <p className="eyebrow">{copy.budget}</p>
            <p className={`mt-2 text-base font-extrabold tracking-[-0.025em] ${alertCount > 0 ? "text-amber-700" : "text-[#16845B]"}`}>{alertCount > 0 ? `${alertCount} ${copy.check}` : copy.controlled}</p>
            <p className="mt-1 truncate text-xs font-semibold text-slate-500">{alertCount > 0 ? `${dashboard.budgetAlerts[0].category} ${dashboard.budgetAlerts[0].usagePercent}%` : copy.noAlert}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="surface-card p-4 lg:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="section-title">{copy.cashFlow}</h3>
              <p className="section-caption">{copy.cashFlowCaption}</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
              <span className="h-2 w-2 rounded-full bg-[#16845B]" /> {language === "en" ? "In" : "Masuk"}
              <span className="ml-1 h-2 w-2 rounded-full bg-rose-400" /> {language === "en" ? "Out" : "Keluar"}
            </span>
          </div>
          <MiniCashFlowChart daily={dashboard.daily} />
        </div>
        <div className="surface-card p-4 lg:p-5">
          <ExpenseDonut dashboard={dashboard} language={language} />
        </div>
      </section>

      <section className="grid gap-4 lg:gap-5 xl:grid-cols-2">
        <div className="card p-4 lg:p-5">
          <h3 className="section-title mb-4">{copy.recent}</h3>
          <TransactionList rows={dashboard.lastTransactions} />
        </div>
        <div className="card p-4 lg:p-5">
          <h3 className="section-title mb-4">{copy.budgetAlerts}</h3>
          {dashboard.budgetAlerts.length === 0 ? <EmptyState text={copy.noBudgetAlerts} /> : (
            <div className="space-y-3">
              {dashboard.budgetAlerts.map((alert) => (
                <div key={alert.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                  {alert.category} {language === "en" ? "has reached" : "mencapai"} {alert.usagePercent}%.
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export function DashboardMetric({ label, value, helper, tone, icon }: {
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
    <div className="metric-cell p-3.5 lg:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-400">{label}</p>
          <p className="mt-1.5 truncate text-sm font-extrabold tracking-[-0.025em] text-slate-950">{value}</p>
        </div>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>{icon}</span>
      </div>
      <p className="mt-1 truncate text-[11px] font-semibold text-slate-500">{helper}</p>
    </div>
  );
}

export function MiniCashFlowChart({ daily }: { daily: DashboardSummary["daily"] }) {
  const rows = daily.slice(-10);
  const maxDaily = Math.max(...rows.map((item) => Number(item.income) + Number(item.expense)), 1);
  if (rows.length === 0) return <EmptyState text="Belum ada transaksi bulan ini." />;

  return (
    <div className="flex h-40 items-end gap-2">
      {rows.map((item) => {
        const incomeHeight = Math.max((Number(item.income) / maxDaily) * 100, Number(item.income) > 0 ? 5 : 0);
        const expenseHeight = Math.max((Number(item.expense) / maxDaily) * 100, Number(item.expense) > 0 ? 5 : 0);
        return (
          <div key={item.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex h-28 w-full items-end justify-center gap-1 rounded-lg bg-slate-50 px-1.5 pb-1.5">
              <div className="w-2 rounded-full bg-[#16845B]" style={{ height: `${incomeHeight}%` }} />
              <div className="w-2 rounded-full bg-rose-400" style={{ height: `${expenseHeight}%` }} />
            </div>
            <span className="text-[10px] font-bold text-slate-400">{jakartaDateParts(item.date).day || "-"}</span>
          </div>
        );
      })}
    </div>
  );
}

function TransactionList({ rows }: { rows: DashboardSummary["lastTransactions"] }) {
  if (rows.length === 0) return <EmptyState text="Belum ada transaksi terbaru." />;

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const income = row.transactionType === "income";
        return (
          <div key={row.id} className="data-row flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">{row.merchantName || row.categoryName || "Tanpa nama"}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500">{row.accountName || row.paymentMethod || "Transaksi"}</p>
            </div>
            <p className={`shrink-0 text-sm font-semibold ${income ? "text-[#16A34A]" : "text-rose-600"}`}>{income ? "+" : "-"}{rupiah(row.amount)}</p>
          </div>
        );
      })}
    </div>
  );
}
