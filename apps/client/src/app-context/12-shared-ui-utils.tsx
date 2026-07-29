/**
 * AI context chunk: Shared fields, transaction list, states, QR scanner, and utilities
 * Generated from: App.tsx
 * Read-only snapshot. Do not import this file into the application.
 */
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
