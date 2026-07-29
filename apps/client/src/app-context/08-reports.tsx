/**
 * AI context chunk: Reports and report insights
 * Generated from: App.tsx
 * Read-only snapshot. Do not import this file into the application.
 */
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
