/**
 * AI context chunk: Categories and budgets
 * Generated from: App.tsx
 * Read-only snapshot. Do not import this file into the application.
 */
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
