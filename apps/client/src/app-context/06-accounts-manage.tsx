/**
 * AI context chunk: Pocket/account helpers, manage screen, schedules, and accounts
 * Generated from: App.tsx
 * Read-only snapshot. Do not import this file into the application.
 */
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
