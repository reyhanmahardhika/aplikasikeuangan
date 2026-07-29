/**
 * AI context chunk: Manual transaction, receipt, detail, and history
 * Generated from: App.tsx
 * Read-only snapshot. Do not import this file into the application.
 */
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
