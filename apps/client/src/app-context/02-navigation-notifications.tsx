/**
 * AI context chunk: Navigation, top bar, bottom bar, notifications
 * Generated from: App.tsx
 * Read-only snapshot. Do not import this file into the application.
 */
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
