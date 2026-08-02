/*
 * Generated from App.tsx by refactor-app-final.cjs.
 * This module temporarily contains the remaining legacy sections.
 * Split it further by feature after the application builds successfully.
 */

import { apiFetch, downloadUrl } from "../../lib/api";
import type { Account, AiTrackedField, AppLanguage, AssistantContext, AssistantMessage, BudgetRow, CashFlowReportRow, Category, CategoryReportRow, ChildFrameState, DashboardSummary, ManageTab, ManualDraft, MonthlyReportRow, ParsedManualTransaction, PocketVisual, Schedule, Transaction, TransactionDetail, View } from "../../types/app";
import { ArrowDownLeft, ArrowLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, Banknote, Bell, Briefcase, Bus, CalendarDays, Camera, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleMinus, CirclePlus, CreditCard, Download, Eye, FileSpreadsheet, Film, GraduationCap, GripVertical, HeartPulse, Landmark, Lightbulb, ListFilter, Loader2, LogOut, MessageCircle, QrCode, Search, Share2, ShieldCheck, ShoppingBag, Smartphone, Sparkles, Store, Trash2, TrendingUp, TriangleAlert, Upload, UserPlus, UserRound, Utensils, X, Plus, LineChart, Wallet, Settings, ReceiptText, Bot, Tags, CircleDollarSign, LucideIcon, Users } from "lucide-react";
import type { Session } from "../../lib/api";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { APP_TIME_ZONE, formatRupiahInput, isoDateInput, jakartaDateParts, localDate, rupiah } from "../../lib/format";
import { resolveAsyncContentState } from "../../lib/asyncContentState";
import { currentMonthDateBounds, dateFilterIso, moneyInputValue, transactionDateIso } from "../../lib/appHelpers";
import heic2any from "heic2any";
import QRCode from "qrcode";
import jsQR from "jsqr";
import type { PointerEvent as ReactPointerEvent } from "react";
import { AuthView, GoogleLogo, loadAuthScript } from "./AppAuth";
import { queueDebugLog } from "./AppChrome";
import { categoryPalette, DashboardMetric, DashboardView, ExpenseDonut, handleMoneyInput, MiniCashFlowChart } from "./AppDashboard";
import { DataErrorState, DateInput, EmptyState, Field, LoadingState } from "./AppPrimitives";
export { AddActionSheet, appNavigationLabel, MobileBottomNav, MobileNavButton, mobileNavLabel } from "./AppChrome";
export { AuthView, GoogleLogo, loadAuthScript } from "./AppAuth";
export { categoryPalette, DashboardMetric, DashboardView, ExpenseDonut, handleMoneyInput, MiniCashFlowChart } from "./AppDashboard";
export { DataErrorState, EmptyState, Field, LoadingState } from "./AppPrimitives";
export { queueDebugLog } from "./AppChrome";

export function SummaryCard({ label, value, tone, icon, className = "" }: {
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
    return (<div className={`card p-4 lg:p-5 ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 sm:text-sm">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl lg:h-10 lg:w-10 lg:rounded-xl ${tones[tone]}`}>{icon}</span>
      </div>
      <p className="mt-3 text-xl font-semibold tracking-normal sm:text-2xl lg:mt-4">{value}</p>
    </div>);
}

export function quickAmount(value: string, language: AppLanguage) {
    const amount = Math.round(Number(value));
    if (!Number.isFinite(amount) || amount <= 0)
        return "";
    if (amount >= 1000000 && amount % 1000000 === 0) {
        return `${amount / 1000000}${language === "en" ? "m" : "jt"}`;
    }
    if (amount >= 1000 && amount % 1000 === 0) {
        return `${amount / 1000}k`;
    }
    return new Intl.NumberFormat(language === "en" ? "en-US" : "id-ID").format(amount);
}

export function transactionQuickExamples(transactions: Transaction[], language: AppLanguage) {
    const fallback = language === "en"
        ? ["buy Fore coffee 25k", "ride Gojek 15k", "ride MRT 3500"]
        : ["beli kopi Fore 25k", "naik Gojek 15k", "naik MRT 3500"];
    const patterns = new Map<string, {
        count: number;
        index: number;
        text: string;
    }>();
    transactions.forEach((transaction, index) => {
        if (transaction.transactionType !== "expense"
            || /transfer/i.test(transaction.sourceType ?? ""))
            return;
        const merchant = transaction.merchantName?.trim() ?? "";
        const category = transaction.categoryName?.trim() ?? "";
        const context = `${merchant} ${category} ${transaction.notes ?? ""}`.toLowerCase();
        if (/top[ -]?up|transfer ke/.test(context))
            return;
        const amount = quickAmount(transaction.amount, language);
        const account = transaction.accountName?.trim() ?? "";
        let subject = merchant || category;
        let action = language === "en" ? "pay" : "bayar";
        if (/token|listrik|electric/.test(context)) {
            subject = language === "en" ? "electricity token" : "token listrik";
            action = language === "en" ? "buy" : "isi";
        }
        else if (/\bgrab\b/.test(context)) {
            subject = "Grab";
            action = language === "en" ? "ride" : "naik";
        }
        else if (/\bgojek\b|\bgoride\b/.test(context)) {
            subject = "Gojek";
            action = language === "en" ? "ride" : "naik";
        }
        else if (/\bmrt\b/.test(context)) {
            subject = "MRT";
            action = language === "en" ? "ride" : "naik";
        }
        else if (/\bkrl\b|commuter/.test(context)) {
            subject = "KRL";
            action = language === "en" ? "ride" : "naik";
        }
        else if (/kopi|coffee|cafe|cafÃƒÂ¯Ã‚Â¿Ã‚Â½/.test(context)) {
            subject = merchant && !/kopi|coffee/i.test(merchant)
                ? `${language === "en" ? "coffee" : "kopi"} ${merchant}`
                : merchant || (language === "en" ? "coffee" : "kopi");
            action = language === "en" ? "buy" : "beli";
        }
        else if (!subject) {
            return;
        }
        const text = [action, subject, amount].filter(Boolean).join(" ");
        const key = [
            transaction.transactionType,
            account,
            category,
            merchant
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
    return [...new Set([...personalized, ...fallback])].slice(0, 6);
}

export function pocketPaymentMethod(account?: Account | null) {
    if (!account)
        return "";
    if (account.accountType === "cash")
        return "Tunai";
    if (account.providerName?.trim())
        return account.providerName.trim();
    if (account.accountType === "bank")
        return "Rekening bank";
    if (account.accountType === "e_wallet")
        return "E-wallet";
    if (account.accountType === "credit_card")
        return "Kartu kredit";
    return "E-money";
}

export function ManualTransactionView({ accounts, categories, editing, initialType, initialAccountId, resetKey, language, request, onCancel, onDone }: {
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
    const transactionAccounts = accounts.filter((account) => (!account.isSharedWalletAccount && account.collaborationStatus !== "pending" && (account.canEdit !== false || account.collaboratorRole === "admin" || account.collaboratorRole === "member")) || account.id === editing?.accountId);
    const [transactionType, setTransactionType] = useState<"income" | "expense">(editing?.transactionType ?? initialType);
    const initialDraft = useMemo<ManualDraft>(() => ({
        accountId: (editing?.accountId ?? initialAccountId) || "",
        transactionDate: editing ? jakartaDateParts(editing.transactionDate).value : isoDateInput(),
        amount: moneyInputValue(editing?.amount),
        feeAmount: moneyInputValue(editing?.feeAmount ?? "0"),
        categoryId: editing?.categoryId ?? "",
        merchantName: editing?.merchantName ?? "",
        paymentMethod: editing?.paymentMethod ?? pocketPaymentMethod(accounts.find((account) => account.id === (editing?.accountId ?? initialAccountId))),
        notes: editing?.notes ?? ""
    }), [accounts, editing?.accountId, editing?.amount, editing?.categoryId, editing?.feeAmount, editing?.id, editing?.merchantName, editing?.notes, editing?.transactionDate, initialAccountId]);
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
        steps: ["Reading amount", "Choosing category"],
        addAccountFirst: "Add an account before saving a transaction.",
        confirmation: "Confirmation",
        confirmTitle: "Confirm AI Result",
        confirmSubtitle: "Review the AI result before saving the transaction.",
        confident: "confident",
        income: "Income",
        expense: "Expense",
        date: "Date",
        amount: "Amount",
        fee: "Admin/fee",
        account: "Account",
        currentBalance: "Current balance",
        balanceAfter: "Balance after transaction",
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
        steps: ["Membaca nominal", "Menentukan kategori"],
        addAccountFirst: "Tambahkan pocket dulu sebelum menyimpan transaksi.",
        confirmation: "Konfirmasi",
        confirmTitle: "Konfirmasi Hasil AI",
        confirmSubtitle: "Periksa kembali hasil AI sebelum menyimpan transaksi.",
        confident: "yakin",
        income: "Pemasukan",
        expense: "Pengeluaran",
        date: "Tanggal",
        amount: "Nominal",
        fee: "Admin/fee",
        account: "Pocket",
        currentBalance: "Saldo saat ini",
        balanceAfter: "Saldo setelah transaksi",
        category: "Kategori",
        uncategorized: "Tanpa kategori",
        merchant: "Sumber atau merchant",
        payment: "Metode pembayaran",
        notes: "Catatan",
        analyzeAgain: "Analisis Ulang",
        save: "Simpan Transaksi"
    };
    const examples = useMemo(() => transactionQuickExamples(suggestionTransactions, language), [suggestionTransactions, language]);
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
        setError(null);
        setErrorContext(null);
    }, [editing?.id, initialAccountId, initialType, resetKey]);
    useEffect(() => {
        request<BudgetRow[]>("/budgets")
            .then(setBudgets)
            .catch(() => setBudgets([]));
        request<{
            data: Transaction[];
        }>("/transactions?limit=100&page=1&sort=transaction_date&direction=desc")
            .then((result) => setSuggestionTransactions(result.data))
            .catch(() => setSuggestionTransactions([]));
    }, []);
    const uploadAttachment = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        setAttachmentLoading(true);
        setAttachmentName(file.name);
        setAttachmentMessage("Mengunggah attachment...");
        setError(null);
        setErrorContext(null);
        try {
            const uploadForm = new FormData();
            uploadForm.set("receipt", file);
            const uploaded = await request<{
                id: string;
            }>("/receipts/upload", { method: "POST", body: uploadForm });
            setAttachmentReceiptId(uploaded.id);
            setAttachmentMessage("Attachment berhasil diunggah.");
        }
        catch {
            setAttachmentMessage("Attachment gagal diunggah. Pastikan file berupa gambar atau video.");
        }
        finally {
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
                    for (let step = 1; step <= copy.steps.length; step += 1) {
                        await new Promise((resolve) => window.setTimeout(resolve, 230));
                        setAnalysisStep(step);
                    }
                })()
            ]);
            setParseResult(parsed);
            setChangedFields(new Set());
            setTransactionType(parsed.transactionType);
            setDraft({
                accountId: draft.accountId,
                transactionDate: jakartaDateParts(parsed.transactionDate).value,
                amount: moneyInputValue(parsed.amount),
                feeAmount: moneyInputValue(parsed.feeAmount),
                categoryId: parsed.categoryId ?? "",
                merchantName: parsed.merchantName ?? "",
                paymentMethod: pocketPaymentMethod(accounts.find((account) => account.id === draft.accountId)),
                notes: parsed.notes
            });
            setFormVersion((current) => current + 1);
            window.setTimeout(() => {
                formCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 120);
        }
        catch {
            setError(null);
            setErrorContext("parse");
        }
        finally {
            setParseLoading(false);
        }
    };
    const markFieldChanged = (field: AiTrackedField) => {
        if (!parseResult)
            return;
        setChangedFields((current) => {
            const next = new Set(current);
            next.add(field);
            return next;
        });
    };
    const aiFieldStatus = (field: AiTrackedField): "ai" | "changed" | "review" | null => {
        if (!parseResult)
            return null;
        if (changedFields.has(field))
            return "changed";
        const aliases: Record<AiTrackedField, string[]> = {
            transactionType: ["transactiontype", "type", "tipe"],
            transactionDate: ["transactiondate", "date", "tanggal"],
            amount: ["amount", "nominal", "jumlah"],
            feeAmount: ["feeamount", "fee", "admin", "biayaadmin"],
            accountId: ["account", "accountid", "akun"],
            categoryId: ["category", "categoryid", "kategori"],
            merchantName: ["merchant", "merchantname", "source", "sumber"],
            paymentMethod: ["paymentmethod", "payment", "metode pembayaran"],
            notes: ["notes", "note", "catatan"]
        };
        const reviewFields = parseResult.reviewFields.map((value) => value.toLowerCase().replace(/[\s_-]/g, ""));
        const needsReview = aliases[field].some((alias) => reviewFields.includes(alias.replace(/[\s_-]/g, "")));
        if (needsReview || (parseResult.confidenceScore < 0.65 && ["amount", "categoryId", "accountId"].includes(field)))
            return "review";
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
            if (document.activeElement !== input)
                return;
            if (!digitsBeforeCursor) {
                input.setSelectionRange(0, 0);
                return;
            }
            let seenDigits = 0;
            let nextCursor = formatted.length;
            for (let index = 0; index < formatted.length; index += 1) {
                if (/\d/.test(formatted[index]))
                    seenDigits += 1;
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
            accountId: draft.accountId,
            transactionType,
            transactionDate: transactionDateIso(String(form.get("transactionDate"))),
            amount: String(form.get("amount")),
            feeAmount: String(form.get("feeAmount") || "0"),
            categoryId: String(form.get("categoryId") || "") || null,
            merchantName: String(form.get("merchantName") || "") || null,
            paymentMethod: pocketPaymentMethod(accounts.find((account) => account.id === draft.accountId)) || null,
            notes: String(form.get("notes") || "") || null,
            sourceType: "manual",
            receiptId: attachmentReceiptId,
            items: []
        };
        try {
            await request(editing ? `/transactions/${editing.id}` : "/transactions", {
                method: editing ? "PUT" : "POST",
                body: JSON.stringify(payload)
            });
            await onDone();
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : (language === "en" ? "Transaction could not be saved." : "Transaksi belum bisa disimpan."));
            setErrorContext("submit");
        }
        finally {
            setLoading(false);
        }
    };
    const filteredCategories = categories.filter((category) => category.categoryType === transactionType);
    const selectedAccount = accounts.find((account) => account.id === draft.accountId);
    const selectedBudget = budgets.find((budget) => budget.categoryId === draft.categoryId);
    const amountValue = Number(String(draft.amount).replace(/[^\d]/g, ""));
    const feeValue = Number(String(draft.feeAmount).replace(/[^\d]/g, ""));
    const balanceDelta = (accountType: string, type: "income" | "expense", amount: number, fee: number) => accountType === "credit_card"
        ? (type === "expense" ? amount : -amount) + fee
        : (type === "income" ? amount : -amount) - fee;
    const previousDelta = editing && selectedAccount
        ? balanceDelta(selectedAccount.accountType, editing.transactionType, moneyValue(editing.amount), moneyValue(editing.feeAmount))
        : 0;
    const balanceAfterTransaction = selectedAccount
        ? moneyValue(selectedAccount.currentBalance) - previousDelta + balanceDelta(selectedAccount.accountType, transactionType, amountValue, feeValue)
        : 0;
    const nextExpenseAmount = transactionType === "expense" ? amountValue + feeValue : feeValue;
    const budgetAfterUse = selectedBudget ? moneyValue(selectedBudget.used) + nextExpenseAmount : 0;
    const budgetAfterPercent = selectedBudget && moneyValue(selectedBudget.budgetAmount) > 0 ? Math.round((budgetAfterUse / moneyValue(selectedBudget.budgetAmount)) * 100) : 0;
    return (<section className="mx-auto max-w-4xl space-y-3 lg:space-y-5">
      {!editing && (<div className="overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-soft lg:rounded-2xl lg:border-slate-200">
          <div className="border-b border-slate-100 bg-emerald-50/60 px-4 py-4 lg:px-5">
            <button type="button" className="app-back-button mb-3" onClick={onCancel}>
              <ArrowLeft size={14}/> Kembali
            </button>
            <div className="flex items-start gap-3">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase text-[#16A34A] shadow-sm">
                  <Sparkles size={12}/> AI Quick Add
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
              <textarea className="mt-1 min-h-28 w-full resize-none rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:cursor-wait disabled:opacity-70 lg:rounded-xl" value={freeText} onChange={(event) => setFreeText(event.target.value)} onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                    event.preventDefault();
                    parseFreeText();
                }
            }} placeholder={copy.placeholder} disabled={parseLoading}/>
            </label>
            <div className="flex flex-wrap gap-2">
              {examples.map((example) => (<button type="button" key={example} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-[#16A34A] disabled:opacity-50" onClick={() => setFreeText(example)} disabled={parseLoading}>
                  {example}
                </button>))}
            </div>

            {parseLoading && (<div className="grid grid-cols-2 gap-2 rounded-[18px] border border-emerald-100 bg-emerald-50/60 p-3 sm:grid-cols-4 lg:rounded-xl">
                {copy.steps.map((label, index) => {
                    const done = analysisStep >= index + 1;
                    const active = analysisStep === index;
                    return (<div key={label} className="flex min-w-0 items-center gap-2">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${done ? "bg-[#16A34A] text-white" : "bg-white text-slate-400"}`}>
                        {done ? <CheckCircle2 size={13}/> : active ? <Loader2 className="animate-spin" size={12}/> : <span className="h-1.5 w-1.5 rounded-full bg-slate-300"/>}
                      </span>
                      <span className={`text-[10px] leading-4 ${done ? "font-semibold text-[#15803D]" : "text-slate-500"}`}>{label}</span>
                    </div>);
                })}
              </div>)}

            <button type="button" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(22,163,74,0.18)] transition hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-60 lg:rounded-xl" onClick={parseFreeText} disabled={parseLoading}>
              {parseLoading ? <Loader2 className="animate-spin" size={17}/> : <Sparkles size={17}/>}
              {parseLoading ? copy.analyzing : copy.analyze}
            </button>
            {transactionAccounts.length === 0 && (<p className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-center text-[11px] text-amber-700">
                <TriangleAlert size={13}/>
                {copy.addAccountFirst}
              </p>)}

            {error && errorContext === "parse" && (<p className="rounded-2xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 lg:rounded-xl">{error}</p>)}
          </div>
        </div>)}

      <div ref={formCardRef} className={`scroll-mt-24 overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-soft lg:rounded-2xl lg:border-slate-200 ${parseResult ? "ai-form-enter" : ""}`}>
        <div className="border-b border-slate-100 bg-white px-4 py-4 lg:px-5">
          {editing && (<button type="button" className="app-back-button mb-4" onClick={onCancel}>
              <ArrowLeft size={14}/> {language === "en" ? "Back" : "Kembali"}
            </button>)}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl lg:rounded-xl ${transactionType === "income" ? "bg-emerald-50 text-[#16A34A]" : "bg-rose-50 text-rose-600"}`}>
                {transactionType === "income" ? <ArrowDownLeft size={18}/> : <ArrowUpRight size={18}/>}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase text-[#16A34A]">{editing ? (language === "en" ? "Edit transaction" : "Edit transaksi") : copy.confirmation}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="mt-0.5 text-base font-semibold tracking-normal text-slate-950">
                    {editing ? (language === "en" ? "Edit transaction" : "Edit transaksi") : copy.confirmTitle}
                  </h2>
                  {parseResult && (<span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-[#15803D]">
                      {Math.round(parseResult.confidenceScore * 100)}% {copy.confident}
                    </span>)}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {editing ? (language === "en" ? "Update the fields you need, then save." : "Ubah data yang diperlukan lalu simpan.") : copy.confirmSubtitle}
                </p>
              </div>
            </div>
            <div className="w-full sm:w-fit">
              <div className="mb-1 flex justify-end">
                <AiFieldBadge status={aiFieldStatus("transactionType")} language={language}/>
              </div>
              <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1 lg:rounded-xl">
              <button type="button" className={`rounded-xl px-3 py-2 text-sm font-semibold transition lg:rounded-xl ${transactionType === "income" ? "bg-white text-[#15803D] shadow-sm" : "text-slate-500"}`} onClick={() => {
            markFieldChanged("transactionType");
            setTransactionType("income");
        }}>
                {copy.income}
              </button>
              <button type="button" className={`rounded-xl px-3 py-2 text-sm font-semibold transition lg:rounded-xl ${transactionType === "expense" ? "bg-white text-rose-700 shadow-sm" : "text-slate-500"}`} onClick={() => {
            markFieldChanged("transactionType");
            setTransactionType("expense");
        }}>
                {copy.expense}
              </button>
              </div>
            </div>
          </div>
        </div>
        <form key={formVersion} className="grid gap-3 p-4 md:grid-cols-2 lg:p-5" onSubmit={submit}>
          <div className="md:col-span-2">
            {selectedAccount ? (<div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 lg:rounded-xl">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="mb-1.5 text-[10px] font-medium text-[#15803D]">{language === "en" ? "This transaction will use this pocket." : "Transaksi ini akan menggunakan pocket ini."}</p>
                      <p className="truncate text-sm font-semibold text-slate-950">{selectedAccount.name}</p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">{[accountTypeLabel(selectedAccount.accountType), selectedAccount.providerName].filter(Boolean).join(" Â· ")}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] text-slate-400">{copy.currentBalance}</p>
                      <p className="mt-0.5 text-xs font-bold text-slate-900">{rupiah(selectedAccount.currentBalance)}</p>
                      <p className="mt-1.5 text-[10px] text-slate-400">{copy.balanceAfter}</p>
                      <p className={`mt-0.5 text-xs font-bold ${balanceAfterTransaction < 0 ? "text-rose-600" : "text-[#15803D]"}`}>{rupiah(balanceAfterTransaction)}</p>
                    </div>
                  </div>
                </div>) : (<p className="rounded-2xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                  {language === "en" ? "Open this form from a pocket detail first." : "Buka form transaksi melalui detail pocket terlebih dahulu."}
                </p>)}
          </div>
          <Field label={copy.date} hint={<AiFieldBadge status={aiFieldStatus("transactionDate")} language={language}/>}>
            <div>
              <input type="hidden" name="transactionDate" value={draft.transactionDate}/>
              <DateFilterPicker label={copy.date} value={draft.transactionDate} onChange={(value) => {
            markFieldChanged("transactionDate");
            setDraft((current) => ({ ...current, transactionDate: value }));
        }} language={language} showLabel={false} allowClear={false}/>
            </div>
          </Field>
          <Field label={copy.amount} hint={<AiFieldBadge status={aiFieldStatus("amount")} language={language}/>}>
            <input className="input" name="amount" inputMode="numeric" min="1" value={draft.amount} onChange={updateAmount} required/>
          </Field>
          <Field label={copy.fee} hint={<AiFieldBadge status={aiFieldStatus("feeAmount")} language={language}/>}>
            <input className="input" name="feeAmount" inputMode="numeric" value={draft.feeAmount} onChange={(event) => {
            markFieldChanged("feeAmount");
            setDraft((current) => ({ ...current, feeAmount: formatRupiahInput(event.target.value) }));
        }} placeholder={language === "en" ? "Optional, example: 2,500" : "Opsional, contoh: 2.500"}/>
          </Field>
          <Field label={copy.category} hint={<AiFieldBadge status={aiFieldStatus("categoryId")} language={language}/>}>
            <select className="input" name="categoryId" value={draft.categoryId} onChange={(event) => {
            markFieldChanged("categoryId");
            setDraft((current) => ({ ...current, categoryId: event.target.value }));
        }}>
              <option value="">{copy.uncategorized}</option>
              {filteredCategories.map((category) => (<option key={category.id} value={category.id}>{category.name}</option>))}
            </select>
          </Field>
          {transactionType === "expense" && selectedBudget && (<div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 text-xs md:col-span-2 lg:rounded-xl">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-600">Budget {selectedBudget.category}</span>
                <span className={`font-semibold ${budgetAfterPercent > 100 ? "text-rose-600" : "text-[#16A34A]"}`}>{budgetAfterPercent}% setelah transaksi</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                <div className={`h-full rounded-full ${budgetAfterPercent > 100 ? "bg-rose-500" : "bg-[#16A34A]"}`} style={{ width: `${Math.min(budgetAfterPercent, 100)}%` }}/>
              </div>
              <p className="mt-2 font-semibold text-slate-500">
                Terpakai {rupiah(selectedBudget.used)} + transaksi ini {rupiah(nextExpenseAmount)} dari {rupiah(selectedBudget.budgetAmount)}.
              </p>
            </div>)}
          <Field label={copy.merchant} hint={<AiFieldBadge status={aiFieldStatus("merchantName")} language={language}/>}>
            <input className="input" name="merchantName" value={draft.merchantName} onChange={(event) => {
            markFieldChanged("merchantName");
            setDraft((current) => ({ ...current, merchantName: event.target.value }));
        }}/>
          </Field>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 md:col-span-2 lg:rounded-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-700">Attachment transaksi</p>
                <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                  Tambahkan gambar atau video sebagai bukti pendukung transaksi.
                </p>
              </div>
              <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#16A34A] shadow-sm ring-1 ring-slate-200 transition hover:bg-emerald-50 lg:rounded-xl">
                {attachmentLoading ? <Loader2 className="animate-spin" size={14}/> : <Upload size={14}/>}
                {attachmentReceiptId ? "Ganti" : "Pilih file"}
                <input className="sr-only" type="file" accept="image/*,video/*,.heic,.heif" onChange={uploadAttachment} disabled={attachmentLoading}/>
              </label>
            </div>
            {(attachmentName || editing?.receiptId) && (<div className="mt-2 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs text-slate-600 lg:rounded-xl">
                <ReceiptText className="shrink-0 text-[#16A34A]" size={14}/>
                <span className="truncate">{attachmentName || "Attachment transaksi tersimpan"}</span>
              </div>)}
            {attachmentMessage && (<p className={`mt-2 text-[11px] leading-4 ${attachmentMessage.includes("berhasil") ? "text-[#15803D]" : "text-slate-500"}`}>
                {attachmentMessage}
              </p>)}
          </div>
          <label className="block text-xs font-semibold text-slate-600 md:col-span-2">
            <span className="flex items-center justify-between gap-2">
              <span>{copy.notes}</span>
              <AiFieldBadge status={aiFieldStatus("notes")} language={language}/>
            </span>
            <div className="mt-0.5">
              <textarea className="input min-h-28 whitespace-pre-wrap" name="notes" value={draft.notes} onChange={(event) => {
            markFieldChanged("notes");
            setDraft((current) => ({ ...current, notes: event.target.value }));
        }}/>
            </div>
          </label>
          {error && errorContext === "submit" && <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 md:col-span-2 lg:rounded-xl">{error}</p>}
          <div className="mt-2 space-y-2 border-t border-slate-100 pt-4 md:col-span-2">
            <button className="btn-primary w-full py-3" disabled={loading || attachmentLoading || parseLoading || accounts.length === 0}>
              {loading ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle2 size={16}/>}
              {copy.save}
            </button>
            {!editing && Boolean(freeText.trim()) && (<button type="button" className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-[#16A34A] disabled:opacity-50" onClick={parseFreeText} disabled={parseLoading}>
                {parseLoading ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14}/>}
                {copy.analyzeAgain}
              </button>)}
            <p className="text-center text-[10px] leading-4 text-slate-400">
              {language === "en" ? "Nothing is saved until you confirm." : "Transaksi baru tersimpan setelah Anda mengonfirmasi."}
            </p>
          </div>
        </form>
      </div>
    </section>);
}

export function TransactionDetailView({ transaction, token, request, onBack, onEdit, onDelete, readOnly = false }: {
    transaction: TransactionDetail;
    token: string;
    request: <T>(path: string, options?: RequestInit) => Promise<T>;
    onBack: () => void;
    onEdit: () => void;
    onDelete: () => void;
    readOnly?: boolean;
}) {
    const isIncome = transaction.transactionType === "income";
    const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(null);
    const [attachmentOriginalUrl, setAttachmentOriginalUrl] = useState<string | null>(null);
    const [attachmentPreviewLoading, setAttachmentPreviewLoading] = useState(Boolean(transaction.receiptId));
    const [attachmentContentType, setAttachmentContentType] = useState("");
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
                if (!response.ok)
                    throw new Error("Attachment tidak dapat dimuat");
                const blob = await response.blob();
                const contentType = response.headers.get("content-type") ?? blob.type;
                const fileSignature = new TextDecoder("ascii").decode(await blob.slice(4, 16).arrayBuffer());
                const isHeic = /image\/hei[cf]/i.test(contentType) || /ftyp(?:heic|heix|hevc|hevx|mif1|msf1)/i.test(fileSignature);
                const originalUrl = URL.createObjectURL(blob);
                objectUrls.push(originalUrl);
                if (!active)
                    return;
                setAttachmentOriginalUrl(originalUrl);
                if (isHeic) {
                    try {
                        const converted = await heic2any({ blob, toType: "image/jpeg", quality: 0.9 });
                        const previewBlob = Array.isArray(converted) ? converted[0] : converted;
                        const previewUrl = URL.createObjectURL(previewBlob);
                        objectUrls.push(previewUrl);
                        if (!active)
                            return;
                        setAttachmentContentType("image/jpeg");
                        setAttachmentPreviewUrl(previewUrl);
                    }
                    catch {
                        setAttachmentContentType(contentType);
                        setAttachmentPreviewUrl(null);
                    }
                }
                else {
                    setAttachmentContentType(contentType);
                    setAttachmentPreviewUrl(originalUrl);
                }
            }
            catch {
                if (active) {
                    setAttachmentPreviewUrl(null);
                    setAttachmentOriginalUrl(null);
                }
            }
            finally {
                if (active)
                    setAttachmentPreviewLoading(false);
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
        ["Admin/fee", rupiah(transaction.feeAmount ?? 0)],
        ["Pocket", transaction.accountName ?? "-"],
        ["Metode", transaction.paymentMethod ?? "-"],
        ["Kategori", transaction.categoryName ?? "Tanpa kategori"],
        ["Sumber", transaction.sourceType ?? "Manual"],
        ...(transaction.receiptId ? [["Attachment", "File tersimpan"]] : [])
    ];
    return (<section className="mx-auto max-w-3xl space-y-3">
      <button type="button" className="app-back-button" onClick={onBack}>
        <ArrowLeft size={14}/> Kembali
      </button>

      <div className="overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-soft lg:rounded-2xl lg:border-slate-200">
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
          {detailRows.map(([label, value]) => (<div key={label} className="rounded-2xl bg-slate-50 px-3 py-2.5 lg:rounded-xl">
              <dt className="text-[11px] font-semibold uppercase text-slate-400">{label}</dt>
              <dd className="mt-1 text-sm font-bold text-slate-900">{value}</dd>
            </div>))}
        </dl>

        {transaction.notes && (<div className="border-t border-slate-100 px-5 py-4">
            <p className="text-[11px] font-semibold uppercase text-slate-400">Catatan</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{transaction.notes}</p>
          </div>)}

        {transaction.receiptId && (<div className="border-t border-slate-100 px-5 py-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase text-slate-400">Attachment</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">File attachment transaksi</p>
              </div>
              {attachmentOriginalUrl && (<button type="button" className="text-xs font-semibold text-[#16A34A]" onClick={() => window.open(attachmentOriginalUrl, "_blank", "noopener,noreferrer")}>
                  Buka file
                </button>)}
            </div>
            {attachmentPreviewLoading ? (<div className="flex h-44 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 lg:rounded-xl">
                <Loader2 className="animate-spin" size={22}/>
              </div>) : attachmentPreviewUrl && attachmentContentType.startsWith("video/") ? (<video className="max-h-[520px] w-full rounded-2xl bg-black lg:rounded-xl" src={attachmentPreviewUrl} controls preload="metadata">
                Browser tidak mendukung preview video ini.
              </video>) : attachmentPreviewUrl && attachmentContentType.startsWith("image/") ? (<button type="button" className="block w-full overflow-hidden rounded-2xl bg-slate-100 lg:rounded-xl" onClick={() => window.open(attachmentPreviewUrl, "_blank", "noopener,noreferrer")} aria-label="Buka attachment ukuran penuh">
                <img className="max-h-[520px] w-full object-contain" src={attachmentPreviewUrl} alt="Attachment transaksi"/>
              </button>) : attachmentOriginalUrl ? (<button type="button" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-50 px-4 py-8 text-sm font-semibold text-[#16A34A] lg:rounded-xl" onClick={() => window.open(attachmentOriginalUrl, "_blank", "noopener,noreferrer")}>
                <ReceiptText size={18}/> Buka attachment
              </button>) : (<p className="rounded-2xl bg-rose-50 px-3 py-3 text-xs text-rose-700 lg:rounded-xl">
                Attachment tidak dapat dimuat.
              </p>)}
          </div>)}

        {transaction.canManage !== false && !readOnly && (<div className="grid grid-cols-[1fr_auto] gap-2 border-t border-slate-100 p-5">
            <button type="button" className="btn-primary" onClick={onEdit}>
              <Settings size={15}/> Edit transaksi
            </button>
            <button type="button" className="btn-danger px-3" onClick={onDelete} aria-label="Hapus transaksi">
              <Trash2 size={16}/>
            </button>
          </div>)}
      </div>
    </section>);
}

export function ReceiptView({ accounts, categories, request, onDone }: {
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
        if (!file)
            return;
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
            if (currentPreview)
                URL.revokeObjectURL(currentPreview);
            return file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
        });
        event.target.value = "";
    };
    useEffect(() => () => {
        if (preview)
            URL.revokeObjectURL(preview);
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
            const uploaded = await request<{
                id: string;
            }>("/receipts/upload", { method: "POST", body: form });
            setReceiptId(uploaded.id);
            const processed = await request<{
                parsed: any;
                rawOcrText: string;
                message?: string;
            }>(`/receipts/${uploaded.id}/process`, { method: "POST" });
            setParsed(processed.parsed);
            setRawText(processed.rawOcrText);
            setMessage(processed.message ?? null);
        }
        catch {
            setMessage(null);
        }
        finally {
            setLoading(false);
        }
    };
    const confirm = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!receiptId)
            return;
        const form = new FormData(event.currentTarget);
        const payload = {
            accountId: String(form.get("accountId")),
            categoryId: String(form.get("categoryId") || "") || null,
            merchantName: String(form.get("merchantName")),
            transactionDate: transactionDateIso(String(form.get("transactionDate"))),
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
        }
        catch {
            setMessage(null);
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-2xl lg:border-slate-200 lg:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase text-[#16A34A]">Scan struk</p>
            <h2 className="mt-0.5 text-lg font-semibold text-slate-950">Upload atau foto struk</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">Pilih sumber, cek preview, lalu proses OCR.</p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#16A34A] lg:rounded-xl">
            <Camera size={18}/>
          </span>
        </div>

        <input ref={cameraInputRef} className="sr-only" type="file" accept="image/*" capture="environment" onChange={selectFile}/>
        <input ref={galleryInputRef} className="sr-only" type="file" accept="image/jpeg,image/png" onChange={selectFile}/>
        <input ref={fileInputRef} className="sr-only" type="file" accept="image/jpeg,image/png,application/pdf" onChange={selectFile}/>

        <div className="grid grid-cols-3 gap-2">
          <button type="button" className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-3 text-xs font-semibold text-slate-700 transition hover:border-emerald-100 hover:bg-emerald-50 hover:text-[#16A34A] lg:rounded-xl" onClick={() => cameraInputRef.current?.click()}>
            <Camera size={18}/> Kamera
          </button>
          <button type="button" className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-3 text-xs font-semibold text-slate-700 transition hover:border-emerald-100 hover:bg-emerald-50 hover:text-[#16A34A] lg:rounded-xl" onClick={() => galleryInputRef.current?.click()}>
            <ReceiptText size={18}/> Galeri
          </button>
          <button type="button" className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-3 text-xs font-semibold text-slate-700 transition hover:border-emerald-100 hover:bg-emerald-50 hover:text-[#16A34A] lg:rounded-xl" onClick={() => fileInputRef.current?.click()}>
            <Upload size={18}/> File
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-[22px] border border-dashed border-slate-200 bg-slate-50 lg:rounded-xl">
          {preview ? (<img className="max-h-96 w-full object-contain" src={preview} alt="Preview struk"/>) : selectedFile ? (<div className="flex min-h-44 flex-col items-center justify-center px-4 py-8 text-center">
              <ReceiptText className="mb-3 text-[#16A34A]" size={28}/>
              <p className="text-sm font-semibold text-slate-950">{selectedFile.name}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">PDF siap diproses.</p>
            </div>) : (<div className="flex min-h-44 flex-col items-center justify-center px-4 py-8 text-center">
              <Upload className="mb-3 text-slate-400" size={28}/>
              <p className="text-sm font-semibold text-slate-700">Belum ada struk</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">JPG, PNG, atau PDF maksimal 8 MB.</p>
            </div>)}
        </div>

        <button type="button" className="btn-primary mt-4 w-full" disabled={loading || !selectedFile} onClick={processSelectedFile}>
          {loading ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>}
          {loading ? "Memproses struk..." : "Proses struk"}
        </button>
        {message && <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{message}</p>}
        {rawText && (<details className="mt-4 text-sm">
            <summary className="cursor-pointer font-semibold">Teks OCR</summary>
            <pre className="mt-2 max-h-52 overflow-auto rounded-md bg-slate-900 p-3 text-xs text-white">{rawText}</pre>
          </details>)}
      </section>

      <section className="card p-5">
        <h2 className="mb-4 text-lg font-bold">Konfirmasi hasil scan</h2>
        {!parsed ? (<EmptyState text="Hasil OCR akan tampil di sini."/>) : (<form className="grid gap-4 md:grid-cols-2" onSubmit={confirm}>
            <Field label="Merchant">
              <input className="input" name="merchantName" defaultValue={parsed.merchantName ?? ""} required/>
            </Field>
            <Field label="Tanggal">
                <DateInput name="transactionDate" defaultValue={parsed.transactionDate ?? isoDateInput()} required/>
            </Field>
            <Field label="Total pembayaran">
              <input className="input" name="amount" defaultValue={parsed.total ?? ""} required/>
            </Field>
            <Field label="Confidence">
              <input className="input" value={`${Math.round((parsed.confidenceScore ?? 0) * 100)}%`} readOnly/>
            </Field>
            <Field label="Pocket pembayaran">
              <select className="input" name="accountId" required>
                {accounts.map((account) => (<option key={account.id} value={account.id}>{accountOptionLabel(account)}</option>))}
              </select>
            </Field>
            <Field label="Kategori">
              <select className="input" name="categoryId" defaultValue={expenseCategories.find((category) => category.name === parsed.suggestedCategory)?.id ?? ""}>
                <option value="">Tanpa kategori</option>
                {expenseCategories.map((category) => (<option key={category.id} value={category.id}>{category.name}</option>))}
              </select>
            </Field>
            <Field label="Metode pembayaran">
              <input className="input" name="paymentMethod" defaultValue={parsed.paymentMethod ?? ""}/>
            </Field>
            <Field label="Nomor struk">
              <input className="input" value={parsed.receiptNumber ?? ""} readOnly/>
            </Field>
            <label className="block text-sm font-medium md:col-span-2">
              Catatan
              <textarea className="input mt-1 min-h-20" name="notes" defaultValue={parsed.reviewFields?.length ? "Perlu cek ulang: " + parsed.reviewFields.join(", ") : ""}/>
            </label>
            <div className="md:col-span-2">
              <h3 className="mb-2 text-sm font-semibold">Item struk</h3>
              <div className="max-h-56 overflow-auto rounded-md border border-slate-200">
                {(parsed.items ?? []).length === 0 ? (<p className="p-3 text-sm text-slate-500">Item belum terdeteksi.</p>) : (<table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr><th className="px-3 py-2">Nama</th><th className="px-3 py-2">Qty</th><th className="px-3 py-2">Total</th></tr>
                    </thead>
                    <tbody>
                      {parsed.items.map((item: any, index: number) => (<tr key={`${item.name}-${index}`} className="border-t">
                          <td className="px-3 py-2">{item.name}</td>
                          <td className="px-3 py-2">{item.quantity}</td>
                          <td className="px-3 py-2">{rupiah(item.totalPrice)}</td>
                        </tr>))}
                    </tbody>
                  </table>)}
              </div>
            </div>
            <div className="md:col-span-2">
              <button className="btn-primary" disabled={loading || accounts.length === 0}>
                {loading ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle2 size={16}/>}
                Simpan transaksi dari struk
              </button>
            </div>
          </form>)}
      </section>
    </div>);
}

export function DateFilterPicker({ label, value, onChange, language, align = "left", showLabel = true, allowClear = true }: {
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
    const [visibleMonth, setVisibleMonth] = useState(() => selectedDate ?? jakartaTodayDate);
    const rootRef = useRef<HTMLDivElement>(null);
    const locale = language === "en" ? "en-US" : "id-ID";
    useEffect(() => {
        if (open)
            setVisibleMonth(selectedDate ?? jakartaTodayDate);
    }, [open, value]);
    useEffect(() => {
        if (!open)
            return;
        const closeOutside = (event: MouseEvent | TouchEvent) => {
            if (!rootRef.current?.contains(event.target as Node))
                setOpen(false);
        };
        document.addEventListener("mousedown", closeOutside);
        document.addEventListener("touchstart", closeOutside, { passive: true });
        return () => {
            document.removeEventListener("mousedown", closeOutside);
            document.removeEventListener("touchstart", closeOutside);
        };
    }, [open]);
    useEffect(() => {
        if (!open)
            return;
        const closeWithEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape")
                setOpen(false);
        };
        document.addEventListener("keydown", closeWithEscape);
        return () => document.removeEventListener("keydown", closeWithEscape);
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
    const weekdayLabels = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday: "narrow" }).format(new Date(Date.UTC(2026, 7, 2 + index, 12))));
    const toValue = (date: Date) => [
        date.getUTCFullYear(),
        String(date.getUTCMonth() + 1).padStart(2, "0"),
        String(date.getUTCDate()).padStart(2, "0")
    ].join("-");
    const displayValue = selectedDate
        ? `${String(selectedDate.getUTCDate()).padStart(2, "0")} ${new Intl.DateTimeFormat(locale, { timeZone: "UTC", month: "short" }).format(selectedDate)} ${selectedDate.getUTCFullYear()}`
        : (locale === "en-US" ? "Select date" : "Pilih tanggal");
    const todayValue = todayParts.value;
    return (<div ref={rootRef} className="relative min-w-0">
      <button type="button" className={`flex h-11 w-full items-center justify-between gap-2 rounded-2xl border bg-white px-3 py-0 text-left transition lg:rounded-xl ${open ? "border-emerald-400 ring-2 ring-emerald-100" : "border-slate-200 hover:border-emerald-300"}`} onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setOpen((current) => !current);
    }} aria-expanded={open}>
        <span className="min-w-0">
          {showLabel && <span className="block text-[10px] font-semibold uppercase text-slate-400">{label}</span>}
          <span className={`${showLabel ? "mt-1" : ""} block truncate text-xs font-semibold text-slate-800`}>{displayValue}</span>
        </span>
        <CalendarDays size={15} className="shrink-0 text-slate-400"/>
      </button>

      {open && (<div onClick={(event) => event.stopPropagation()} className={`fixed inset-x-6 bottom-[calc(7rem+env(safe-area-inset-bottom))] z-[80] mx-auto max-h-[calc(100dvh-9rem)] max-w-xs overflow-y-auto rounded-[20px] border border-slate-100 bg-white p-3 shadow-[0_22px_55px_rgba(15,23,42,0.18)] sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-[calc(100%+8px)] sm:z-40 sm:mx-0 sm:w-[min(18rem,calc(100vw-2.5rem))] sm:max-h-none sm:max-w-none sm:overflow-visible ${align === "right" ? "sm:right-0" : "sm:left-0"}`}>
          <div className="flex items-center justify-between">
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50" onClick={() => setVisibleMonth(new Date(Date.UTC(year, month - 1, 1, 12)))} aria-label="Bulan sebelumnya">
              <ChevronLeft size={18}/>
            </button>
            <p className="text-sm font-semibold text-slate-900">
              {new Intl.DateTimeFormat(locale, { timeZone: "UTC", month: "long", year: "numeric" }).format(visibleMonth)}
            </p>
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50" onClick={() => setVisibleMonth(new Date(Date.UTC(year, month + 1, 1, 12)))} aria-label="Bulan berikutnya">
              <ChevronRight size={18}/>
            </button>
          </div>
          <div className="mt-2 grid grid-cols-7">
            {weekdayLabels.map((day, index) => (<span key={`${day}-${index}`} className="flex h-7 items-center justify-center text-[10px] font-semibold text-slate-400">{day}</span>))}
            {days.map((date) => {
                const dateValue = toValue(date);
                const selected = dateValue === value;
                const today = dateValue === todayValue;
                const currentMonth = date.getUTCMonth() === month;
                return (<button key={dateValue} type="button" className={`mx-auto flex h-8 w-8 items-center justify-center rounded-xl text-[11px] transition ${selected
                        ? "bg-[#16A34A] font-semibold text-white shadow-sm"
                        : today
                            ? "bg-emerald-50 font-semibold text-[#16A34A]"
                            : currentMonth
                                ? "text-slate-700 hover:bg-slate-100"
                                : "text-slate-300 hover:bg-slate-50"}`} onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onChange(dateValue);
                        setOpen(false);
                    }}>
                  {date.getUTCDate()}
                </button>);
            })}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
            {allowClear ? (<button type="button" className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50" onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onChange("");
                setOpen(false);
            }}>
                {language === "en" ? "Clear" : "Hapus"}
              </button>) : <span />}
            <div className="flex items-center gap-1.5">
              <button type="button" className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-[#16A34A]" onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onChange(todayValue);
                setOpen(false);
            }}>{language === "en" ? "Today" : "Hari ini"}</button>
              <button type="button" className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200" onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setOpen(false);
            }}>
                <X size={13}/> {language === "en" ? "Close" : "Tutup"}
              </button>
            </div>
          </div>
        </div>)}
    </div>);
}

export function HistoryView({ accounts, language, request, onOpen, onChanged, token, initialAccountId, initialFromDate, focusTransactionId, onFocused, onBack, onRegisterRefresh }: {
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
    onBack: () => void;
    onRegisterRefresh?: (callback: () => Promise<void>) => void;
}) {
    const [rows, setRows] = useState<Transaction[]>([]);
    const [search, setSearch] = useState("");
    const [type, setType] = useState("");
    const [accountId, setAccountId] = useState(initialAccountId ?? "");
    const [datePreset, setDatePreset] = useState<"all" | "today" | "last7" | "month" | "custom">(() => initialFromDate ? "custom" : "all");
    const [fromDate, setFromDate] = useState(() => initialFromDate || "");
    const [toDate, setToDate] = useState("");
    const [showDateFilter, setShowDateFilter] = useState(false);
    const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "amount-desc" | "amount-asc">("newest");
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [highlightedTransactionId, setHighlightedTransactionId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
    const transactionRefs = useRef(new Map<string, HTMLDivElement>());
    const load = async (nextSearch = search, nextType = type, nextFromDate = fromDate, nextToDate = toDate, nextAccountId = accountId, nextSortOrder = sortOrder) => {
        setLoading(true);
        setLoadError(null);
        try {
            const params = new URLSearchParams();
            if (nextSearch.trim())
                params.set("search", nextSearch.trim());
            if (nextType)
                params.set("type", nextType);
            if (nextAccountId)
                params.set("accountId", nextAccountId);
            if (nextFromDate)
                params.set("from", dateFilterIso(nextFromDate, "start"));
            if (nextToDate)
                params.set("to", dateFilterIso(nextToDate, "end"));
            params.set("sort", nextSortOrder.startsWith("amount") ? "amount" : "transaction_date");
            params.set("direction", nextSortOrder === "oldest" || nextSortOrder === "amount-asc" ? "asc" : "desc");
            const result = await request<{
                data: Transaction[];
            }>(`/transactions?${params.toString()}`);
            setRows(result.data);
        }
        catch (error) {
            setRows([]);
            setLoadError(error instanceof Error ? error.message : "Riwayat transaksi gagal dimuat");
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        const timer = window.setTimeout(() => {
            load(search, type, fromDate, toDate, accountId, sortOrder).catch(console.error);
        }, 300);
        return () => window.clearTimeout(timer);
    }, [search, type, fromDate, toDate, accountId, sortOrder]);
    useEffect(() => {
        onRegisterRefresh?.(() => load(search, type, fromDate, toDate, accountId, sortOrder));
    }, [accountId, fromDate, onRegisterRefresh, search, sortOrder, toDate, type]);
    useEffect(() => {
        setAccountId(initialAccountId ?? "");
        setDatePreset(initialFromDate ? "custom" : "all");
        setFromDate(initialFromDate || "");
        setToDate("");
    }, [initialAccountId, initialFromDate]);
    const applyDatePreset = (preset: "all" | "today" | "last7" | "month" | "custom") => {
        setDatePreset(preset);
        if (preset === "custom")
            return;
        const today = isoDateInput();
        if (preset === "all") {
            setFromDate("");
            setToDate("");
        }
        else if (preset === "today") {
            setFromDate(today);
            setToDate(today);
        }
        else if (preset === "last7") {
            const start = new Date(`${today}T12:00:00`);
            start.setDate(start.getDate() - 6);
            setFromDate(isoDateInput(start));
            setToDate(today);
        }
        else {
            const month = currentMonthDateBounds();
            setFromDate(month.from);
            setToDate(month.to);
        }
    };
    useEffect(() => {
        if (loading || !focusTransactionId)
            return;
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
        if (!window.confirm("Hapus transaksi ini?"))
            return;
        await request(`/transactions/${id}`, { method: "DELETE" });
        await load(search, type, fromDate, toDate, accountId);
        await onChanged();
    };
    const exportFile = async (format: string) => {
        const params = new URLSearchParams({ format });
        if (search.trim())
            params.set("search", search.trim());
        if (type)
            params.set("type", type);
        if (accountId)
            params.set("accountId", accountId);
        if (fromDate)
            params.set("from", dateFilterIso(fromDate, "start"));
        if (toDate)
            params.set("to", dateFilterIso(toDate, "end"));
        params.set("sort", sortOrder.startsWith("amount") ? "amount" : "transaction_date");
        params.set("direction", sortOrder === "oldest" || sortOrder === "amount-asc" ? "asc" : "desc");
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
    const historyFilterCount = (accountId ? 1 : 0) + (datePreset !== "all" ? 1 : 0) + (sortOrder !== "newest" ? 1 : 0);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
    const typeOptions = [
        { value: "", label: "Semua" },
        { value: "income", label: "Masuk" },
        { value: "expense", label: "Keluar" }
    ];
    const groupedRows = sortOrder.startsWith("amount")
        ? [{
            key: `amount-${sortOrder}`,
            label: language === "en" ? "Sorted by amount" : "Diurutkan berdasarkan nominal",
            rows,
            net: rows.reduce((sum, row) => sum + (row.transactionType === "income" ? Number(row.amount) : -Number(row.amount)), 0)
        }]
        : groupTransactionsByDate(rows);
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
            }
            else {
                next.add(id);
            }
            return next;
        });
    };
    const clearSelection = () => setSelectedIds(new Set());
    const selectAllVisible = () => setSelectedIds(new Set(visibleIds));
    const deleteSelected = async () => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0)
            return;
        if (!window.confirm(`Hapus ${ids.length} transaksi terpilih?`))
            return;
        await Promise.all(ids.map((id) => request(`/transactions/${id}`, { method: "DELETE" })));
        setSelectedIds(new Set());
        await load(search, type, fromDate, toDate, accountId);
        await onChanged();
    };
    return (<section className="mx-auto max-w-6xl space-y-3 lg:space-y-4">
      <button type="button" className="app-back-button" onClick={onBack}>
        <ArrowLeft size={14}/> {language === "en" ? "Back" : "Kembali"}
      </button>
      <div className="rounded-[22px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-2xl lg:border-slate-200">
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
        <div className="mt-3 rounded-2xl bg-[#16A34A] px-4 py-3 text-white lg:rounded-2xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold text-white/75">Net transaksi</p>
              <p className="mt-0.5 text-[11px] font-semibold text-white/65">Sesuai filter aktif</p>
            </div>
            <p className="shrink-0 text-base font-semibold">{netTotal >= 0 ? "+" : "-"}{rupiah(Math.abs(netTotal))}</p>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-emerald-50 px-3 py-2 lg:rounded-xl">
            <p className="text-[11px] font-bold text-[#15803D]">Masuk</p>
            <p className="mt-0.5 text-[13px] font-semibold leading-tight text-[#15803D]">{rupiah(totalIncome)}</p>
          </div>
          <div className="rounded-2xl bg-rose-50 px-3 py-2 lg:rounded-xl">
            <p className="text-[11px] font-bold text-rose-700">Keluar</p>
            <p className="mt-0.5 text-[13px] font-semibold leading-tight text-rose-700">{rupiah(totalExpense)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-[22px] border border-white/80 bg-white p-3 shadow-soft lg:rounded-2xl lg:border-slate-200">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15}/>
            <input className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-9 text-[13px] font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 lg:rounded-xl" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={language === "en" ? "Search transactions" : "Cari transaksi"}/>
            {search && (<button type="button" className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Bersihkan pencarian" title="Bersihkan pencarian" onClick={() => setSearch("")}>
                <X size={14}/>
              </button>)}
          </div>
          <button type="button" className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${historyFilterCount > 0 ? "border-emerald-200 bg-emerald-50 text-[#16A34A]" : "border-slate-200 bg-white text-slate-500"}`} onClick={() => setShowDateFilter(true)} aria-label={language === "en" ? "Transaction filter" : "Filter transaksi"}>
            <ListFilter size={17}/>
            {historyFilterCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#16A34A] px-1 text-[9px] font-bold text-white">{historyFilterCount}</span>}
          </button>
        </div>

        <div className="mt-2 grid grid-cols-3 rounded-xl bg-slate-100 p-1 lg:max-w-sm lg:rounded-xl">
          {typeOptions.map((option) => (<button key={option.value} type="button" className={`rounded-xl px-3 py-2 text-xs font-semibold transition lg:rounded-xl ${type === option.value ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`} onClick={() => applyType(option.value)}>
              {option.label}
            </button>))}
        </div>

        {showDateFilter && (<>
          <button type="button" data-scroll-lock="true" className="fixed inset-0 z-40 cursor-default bg-slate-950/25 backdrop-blur-[1px]" aria-label={language === "en" ? "Close transaction filter" : "Tutup filter transaksi"} onClick={() => setShowDateFilter(false)}/>
          <section className="fixed inset-x-3 bottom-24 z-50 mx-auto max-h-[78vh] max-w-md overflow-y-auto rounded-[26px] border border-slate-100 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.24)] lg:bottom-auto lg:left-auto lg:right-8 lg:top-24 lg:mx-0 lg:w-96 lg:rounded-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">{language === "en" ? "Transaction filter" : "Filter transaksi"}</h2>
                <p className="mt-1 text-xs text-slate-500">{language === "en" ? "Set pocket, period, and transaction order." : "Atur pocket, periode, dan urutan transaksi."}</p>
              </div>
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50" onClick={() => setShowDateFilter(false)}><X size={16}/></button>
            </div>
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-semibold text-slate-700">Pocket</span>
              <select className="input" value={accountId} onChange={(event) => setAccountId(event.target.value)} aria-label={language === "en" ? "Filter by pocket" : "Filter berdasarkan pocket"}>
                <option value="">{language === "en" ? "All pockets" : "Semua pocket"}</option>
                {accounts.map((account) => (<option key={account.id} value={account.id}>{accountOptionLabel(account, { language })}</option>))}
              </select>
            </label>
            <p className="mt-4 text-xs font-semibold text-slate-700">{language === "en" ? "Period" : "Periode"}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                { id: "all" as const, label: language === "en" ? "All dates" : "Semua tanggal" },
                { id: "today" as const, label: language === "en" ? "Today" : "Hari ini" },
                { id: "last7" as const, label: language === "en" ? "Last 7 days" : "7 hari terakhir" },
                { id: "month" as const, label: language === "en" ? "This month" : "Bulan ini" },
                { id: "custom" as const, label: language === "en" ? "Custom date" : "Tanggal kustom" }
              ].map((option) => (<button key={option.id} type="button" className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${datePreset === option.id ? "border-emerald-200 bg-emerald-50 text-[#16A34A]" : "border-slate-200 bg-white text-slate-600"}`} onClick={() => applyDatePreset(option.id)}>
                {option.label}
              </button>))}
            </div>
            {datePreset === "custom" && (<div className="mt-3 grid grid-cols-2 gap-2">
              <DateFilterPicker label={language === "en" ? "Start date" : "Tanggal mulai"} value={fromDate} onChange={setFromDate} language={language}/>
              <DateFilterPicker label={language === "en" ? "End date" : "Tanggal akhir"} value={toDate} onChange={setToDate} language={language} align="right"/>
            </div>)}
            <p className="mt-4 text-xs font-semibold text-slate-700">{language === "en" ? "Order" : "Urutan"}</p>
            <div className="mt-2 space-y-2">
              {[
                { id: "newest" as const, label: language === "en" ? "Recent transactions" : "Transaksi terbaru" },
                { id: "oldest" as const, label: language === "en" ? "Oldest transactions" : "Transaksi terlama" },
                { id: "amount-desc" as const, label: language === "en" ? "Largest amount" : "Nominal paling besar" },
                { id: "amount-asc" as const, label: language === "en" ? "Smallest amount" : "Nominal paling kecil" }
              ].map((option) => (<button key={option.id} type="button" className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition ${sortOrder === option.id ? "border-emerald-200 bg-emerald-50 text-[#16A34A]" : "border-slate-200 bg-white text-slate-600"}`} onClick={() => setSortOrder(option.id)}>
                {option.label}
                {sortOrder === option.id && <CheckCircle2 size={14}/>}
              </button>))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" className="btn-secondary" onClick={() => {
                setAccountId("");
                setSortOrder("newest");
                applyDatePreset("all");
              }}>{language === "en" ? "Reset" : "Reset"}</button>
              <button type="button" className="btn-primary" onClick={() => setShowDateFilter(false)}>
                {language === "en" ? "Apply" : "Terapkan"}
              </button>
            </div>
          </section>
        </>)}

        <div className="mt-2 flex items-center justify-end gap-2 border-t border-slate-100 pt-2">
          <span className="mr-auto text-[10px] font-semibold text-slate-400">{language === "en" ? "Export data" : "Export data"}</span>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50" onClick={() => exportFile("csv")}><Download size={12}/> CSV</button>
            <button className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50" onClick={() => exportFile("excel")}><FileSpreadsheet size={12}/> Excel</button>
          </div>
        </div>
      </div>

      {selectedCount > 0 && (<div className="sticky top-16 z-20 rounded-[22px] border border-emerald-100 bg-white/95 p-3 shadow-soft backdrop-blur lg:top-20 lg:rounded-2xl">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-950">{selectedCount} dipilih</p>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">Tap transaksi lain untuk tambah pilihan.</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50" onClick={clearSelection}>
                Batal
              </button>
              <button type="button" className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-[#16A34A] transition hover:bg-emerald-100" onClick={allVisibleSelected ? clearSelection : selectAllVisible}>
                {allVisibleSelected ? "Batal semua" : "Pilih semua"}
              </button>
              <button type="button" className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-600" onClick={deleteSelected}>
                <Trash2 size={13}/> Hapus
              </button>
            </div>
          </div>
        </div>)}

      <div className="space-y-3">
        {loading ? <LoadingState /> : loadError ? <DataErrorState message={loadError} onRetry={() => { load().catch(() => undefined); }}/> : rows.length === 0 ? <EmptyState text="Tidak ada transaksi."/> : (groupedRows.map((group) => (<section key={group.key} className="overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-soft lg:rounded-2xl lg:border-slate-200">
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
                {group.rows.map((row) => (<div key={row.id} ref={(node) => {
                    if (node) {
                        transactionRefs.current.set(row.id, node);
                    }
                    else {
                        transactionRefs.current.delete(row.id);
                    }
                }} className={`transition ${highlightedTransactionId === row.id ? "bg-emerald-50 ring-2 ring-emerald-200" : "bg-white"}`}>
                    <TransactionHistoryItem row={row} onOpen={() => onOpen(row.id)} onRemove={row.canManage === false ? undefined : () => remove(row.id)} selected={selectedIds.has(row.id)} selectionMode={selectedCount > 0} onToggleSelect={row.canManage === false ? undefined : () => toggleSelected(row.id)} onLongPress={row.canManage === false ? undefined : () => toggleSelected(row.id)}/>
                  </div>))}
              </div>
            </section>)))}
      </div>
    </section>);
}

export function moneyValue(value: string | number | null | undefined) {
    if (typeof value === "number")
        return Number.isFinite(value) ? value : 0;
    const normalized = String(value ?? "").trim();
    if (!normalized)
        return 0;
    if (/^-?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(normalized)) {
        return Number(normalized.replace(/\./g, "").replace(",", "."));
    }
    const parsed = Number(normalized.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
}

export function decimalValue(value: string | number | null | undefined) {
    if (typeof value === "number")
        return Number.isFinite(value) ? value : 0;
    const normalized = String(value ?? "").trim().replace(",", ".");
    if (!normalized)
        return 0;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
}

export function formatGoldGrams(value: string | number | null | undefined) {
    const grams = decimalValue(value);
    return `${new Intl.NumberFormat("id-ID", { minimumFractionDigits: grams % 1 === 0 ? 0 : 2, maximumFractionDigits: 4 }).format(grams)} gr`;
}

export function accountTypeLabel(type: string) {
    const labels: Record<string, string> = {
        cash: "Tunai",
        bank: "Rekening",
        e_wallet: "E-wallet",
        gold: "Emas",
        credit_card: "Kartu kredit",
        other: "Lainnya"
    };
    return labels[type] ?? type;
}

export function accountSharedLabel(account: Account, language: AppLanguage = "id") {
    if (account.isSharedWalletAccount)
        return language === "en" ? "shared wallet" : "dompet bersama";
    return "";
}

export function accountOptionLabel(account: Account, options: {
    balance?: boolean;
    language?: AppLanguage;
} = {}) {
    const balance = options.balance ? ` - ${rupiah(account.currentBalance)}` : "";
    const shared = accountSharedLabel(account, options.language);
    return `${account.name}${balance}${shared ? ` (${shared})` : ""}`;
}

export function accountTypeIcon(type: string): LucideIcon {
    const icons: Record<string, LucideIcon> = {
        cash: Banknote,
        bank: Landmark,
        e_wallet: Smartphone,
        gold: CircleDollarSign,
        credit_card: CreditCard,
        other: Wallet
    };
    return icons[type] ?? Wallet;
}

export const pocketBankOptions = [
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

export const pocketEWalletOptions = [
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

export const pocketEMoneyOptions = [
    "Flazz BCA",
    "Mandiri e-money",
    "BNI TapCash",
    "BRI BRIZZI",
    "JakCard",
    "MegaCash",
    "KMT KAI Commuter",
    "Nobu e-money"
];

export const pocketGoldProviderOptions = [
    "Tring Pegadaian",
    "Bank Jago"
];

export const goldProviderPricePresets: Record<string, { buy: number; sell: number; note: string }> = {
    "Tring Pegadaian": {
        buy: 2552000,
        sell: 2449000,
        note: "Preset awal dari contoh harga Pegadaian 24 Jun 2026. Sesuaikan dengan harga di aplikasi Tring saat transaksi."
    },
    "Bank Jago": {
        buy: 2552000,
        sell: 2449000,
        note: "Bank Jago Kantong Emas bekerja sama dengan Treasury; isi sesuai harga beli/jual yang tampil di aplikasi Jago."
    }
};

export const pocketCardColors = [
    "#16A34A", "#047857", "#0F766E", "#0891B2", "#2563EB", "#1D4ED8",
    "#4F46E5", "#7C3AED", "#9333EA", "#DB2777", "#E11D48", "#EA580C",
    "#D97706", "#854D0E", "#475569", "#111827"
];
export const pocketStickerOptions = [
    "\u{1F60E}", "\u{1F4B3}", "\u{1F4B8}", "\u{1F3E6}", "\u{1FA99}", "\u{1F6CD}\u{FE0F}",
    "\u{2615}", "\u{1F695}", "\u{1F3AF}", "\u{1F4C8}", "\u{1F31F}", "\u{1F389}",
    "\u{1F4B0}", "\u{1F45B}", "\u{1F4B5}", "\u{1F9FE}", "\u{1F4CA}", "\u{1F4C9}",
    "\u{1F3E0}", "\u{1F697}", "\u{2708}\u{FE0F}", "\u{1F6B2}", "\u{1F6F5}", "\u{1F3D6}\u{FE0F}",
    "\u{1F6D2}", "\u{1F381}", "\u{1F37D}\u{FE0F}", "\u{1F35C}", "\u{1F37F}", "\u{1F3AE}",
    "\u{1F4F1}", "\u{1F4BB}", "\u{1F4DA}", "\u{1F393}", "\u{1F3CB}\u{FE0F}", "\u{1F48A}",
    "\u{1F436}", "\u{1F431}", "\u{1F331}", "\u{1F33B}", "\u{1F525}", "\u{26A1}",
    "\u{2764}\u{FE0F}", "\u{1F48E}", "\u{1F680}", "\u{1F3C6}", "\u{2705}", "\u{1F512}"
];

const pocketProviderBrandColors: Record<string, string> = {
    BCA: "#0060AF", Mandiri: "#003D79", BRI: "#00529C", BNI: "#F15A23",
    "CIMB Niaga": "#A71930", Danamon: "#00A650", PermataBank: "#007A5E",
    Maybank: "#FFC600", OCBC: "#E31837", "Panin Bank": "#0072BC", BTN: "#00529B",
    "Bank Syariah Indonesia": "#00A39B", Jago: "#F15A24", SeaBank: "#F36F21",
    "blu by BCA Digital": "#00AEEF", GoPay: "#00AED6", OVO: "#4C3494", DANA: "#118EEA",
    ShopeePay: "#EE4D2D", LinkAja: "#E31E24", Sakuku: "#E21B2D", AstraPay: "#662D91",
    "Flazz BCA": "#0060AF", "Mandiri e-money": "#003D79", "BNI TapCash": "#F15A23",
    "BRI BRIZZI": "#00529C", JakCard: "#E31E24", MegaCash: "#17479E", "KMT KAI Commuter": "#EE6B23",
    "Tring Pegadaian": "#006B4F", "Bank Jago": "#F15A24"
};

export function providerLogoSticker(provider: string) {
    const shortName = provider
        .replace(/\b(bank|wallet|digital|e-?money|commerce|by|kai|commuter)\b/gi, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .slice(0, 2)
        .map((part) => part.slice(0, 5))
        .join(" ");
    const background = pocketProviderBrandColors[provider] ?? "#0F766E";
    const foreground = background === "#FFC600" ? "#111827" : "#FFFFFF";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="${background}"/><text x="64" y="68" fill="${foreground}" font-family="Arial,sans-serif" font-size="${shortName.length > 7 ? 22 : 28}" font-weight="700" text-anchor="middle" dominant-baseline="middle">${shortName}</text></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const pocketVisualStorageKey = "finance-ai-pocket-visuals";

export function loadPocketVisuals(): Record<string, PocketVisual> {
    try {
        return JSON.parse(window.localStorage.getItem(pocketVisualStorageKey) || "{}") as Record<string, PocketVisual>;
    }
    catch {
        return {};
    }
}

export function savePocketVisuals(visuals: Record<string, PocketVisual>) {
    window.localStorage.setItem(pocketVisualStorageKey, JSON.stringify(visuals));
}

export function splitAccountNumberHolder(value?: string | null) {
    const raw = cleanPocketMetadata(value);
    if (!raw) {
        return { number: "", holder: "" };
    }
    const separators = [" \u00B7 ", " \u2022 ", " - "];
    for (const separator of separators) {
        if (!raw.includes(separator))
            continue;
        const [number = "", ...holderParts] = raw.split(separator);
        return {
            number: number.trim(),
            holder: holderParts.join(separator).trim()
        };
    }
    return { number: raw, holder: "" };
}

export function cleanPocketMetadata(value?: string | null) {
    return String(value ?? "")
        .replace(/\s*(?:\u00C2\u00B7|\u00C3\u201A\u00C2\u00B7|\u00EF\u00BF\u00BD|\u00C3\u00AF\u00C2\u00BF\u00C2\u00BD)\s*/g, " \u00B7 ")
        .trim();
}

export function getDefaultPocketLogo(accountType: string): string {
    switch (accountType) {
        case "cash": return "\u{1F4B5}";
        case "bank": return "\u{1F3E6}";
        case "e_wallet": return "\u{1F4F1}";
        case "gold": return "\u{1F947}";
        case "other": return "\u{1F4B3}";
        case "credit_card": return "\u{1F4B3}";
        case "savings": return "\u{1F3E6}";
        case "investment": return "\u{1F4C8}";
        default: return "\u{1F4B0}";
    }
}

export function resolvePocketLogo(logo: string | null | undefined, accountType: string) {
    if (logo?.startsWith("data:image/") || (logo && pocketStickerOptions.includes(logo)))
        return logo;
    return getDefaultPocketLogo(accountType);
}

export function budgetTone(status: string) {
    if (status === "Aman")
        return "bg-emerald-50 text-[#16A34A]";
    if (status === "Peringatan")
        return "bg-amber-50 text-amber-700";
    return "bg-rose-50 text-rose-700";
}

export function SectionHeader({ title, caption, action }: {
    title: string;
    caption?: string;
    action?: JSX.Element;
}) {
    const isBackAction = Boolean(action?.props?.className?.includes("app-back-button"));
    return (<div className={`mb-4 flex gap-3 ${isBackAction ? "flex-col items-start" : "items-start justify-between"}`}>
      {isBackAction && action}
      <div className="min-w-0">
        <h3 className="section-title">{title}</h3>
        {caption && <p className="section-caption">{caption}</p>}
      </div>
      {!isBackAction && action}
    </div>);
}

export function ManageView({ accounts, categories, language, request, onNavigate, onChanged, onOpenAccountTransactions, onChildFrameStateChange }: {
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
    const tabs: Array<{
        id: ManageTab;
        label: string;
        icon: LucideIcon;
        count: string;
        meta: string;
        tone: string;
    }> = [
        { id: "categories", label: isEnglish ? "Categories" : "Kategori", icon: Tags, count: `${categories.length} ${isEnglish ? "categories" : "kategori"}`, meta: isEnglish ? "Income and expense groups" : "Kelompok pemasukan dan pengeluaran", tone: "bg-sky-50 text-sky-700" },
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
        return (<section className="mx-auto max-w-6xl space-y-3 lg:space-y-5">
        <div className="flex items-center justify-between rounded-[20px] border border-slate-100 bg-white p-3 shadow-soft lg:rounded-2xl">
          <button type="button" className="app-back-button" onClick={() => {
                setActiveTab(null);
                setQuickCreate(null);
            }}>
            <ArrowLeft size={14}/> Kembali
          </button>
          <div className="flex min-w-0 items-center gap-2">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${activeItem.tone}`}>
              <ActiveIcon size={17}/>
            </span>
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-semibold text-slate-950">{activeItem.label}</p>
              <p className="text-[10px] text-slate-500">{activeItem.count}</p>
            </div>
          </div>
        </div>

        {activeTab === "budgets" && (<BudgetsView key={`budgets-${viewVersion}`} categories={categories} request={request} onChanged={onChanged} initialView={quickCreate === "budgets" ? "form" : "list"}/>)}
        {activeTab === "categories" && (<CategoriesView key={`categories-${viewVersion}`} categories={categories} request={request} onChanged={onChanged} initialView={quickCreate === "categories" ? "form" : "list"}/>)}
        {activeTab === "schedules" && (<SchedulesView key={`schedules-${viewVersion}`} accounts={accounts} categories={categories} request={request} onNavigate={onNavigate} onTransfer={() => onNavigate("accounts")} initialView={quickCreate === "schedules" ? "form" : "list"}/>)}
      </section>);
    }
    return (<section className="mx-auto max-w-6xl space-y-3 lg:space-y-5">
      <div className="surface-card p-4 lg:p-5">
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow !text-[#16845B]">{isEnglish ? "Settings" : "Atur"}</p>
            <h2 className="mt-1.5 text-lg font-extrabold tracking-[-0.035em] text-slate-950">{isEnglish ? "App settings" : "Pengaturan aplikasi"}</h2>
            <p className="mt-1 text-xs text-slate-500">{isEnglish ? "All essential settings in one place." : "Semua pengaturan penting dalam satu tempat."}</p>
          </div>
          <button type="button" className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[#16A34A] px-3.5 text-xs font-semibold text-white shadow-sm transition active:scale-95" onClick={() => setShowQuickActions((current) => !current)} aria-expanded={showQuickActions}>
            <Plus size={16}/> {isEnglish ? "Add" : "Tambah"}
          </button>
          {showQuickActions && (<div className="absolute right-0 top-12 z-20 w-52 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
              {tabs.map((item) => {
                const Icon = item.icon;
                return (<button key={item.id} type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]" onClick={() => openSection(item.id, true)}>
                    <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${item.tone}`}><Icon size={16}/></span>
                    {isEnglish ? "Add" : "Tambah"} {item.label}
                  </button>);
            })}
            </div>)}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (<button key={tab.id} type="button" className={`ripple-card data-row flex min-h-[88px] items-center gap-3 border p-3 text-left transition ${active ? "border-emerald-200 bg-emerald-50/70" : "border-slate-100 bg-white hover:border-emerald-100 hover:bg-slate-50"}`} onClick={() => openSection(tab.id)}>
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tab.tone}`}>
                  <Icon size={23} strokeWidth={2}/>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-semibold text-slate-950">{tab.label}</span>
                    <span className="max-w-[110px] shrink-0 truncate rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{tab.count}</span>
                  </span>
                  <span className="mt-1 block truncate text-[11px] text-slate-500">{tab.meta}</span>
                </span>
                <ChevronRight size={19} className="shrink-0 text-slate-300"/>
              </button>);
        })}
          <button type="button" className="ripple-card flex min-h-[88px] items-center gap-3 rounded-[18px] border border-slate-100 bg-white p-3 text-left transition hover:border-emerald-100 hover:bg-slate-50 lg:rounded-xl" onClick={() => onNavigate("profile")}>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
              <UserRound size={23}/>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-950">{isEnglish ? "Profile & security" : "Profil & keamanan"}</span>
              <span className="mt-1 block truncate text-[11px] text-slate-500">{isEnglish ? "Personal data, profile barcode, and password" : "Data pribadi, barcode profil, dan password"}</span>
            </span>
            <ChevronRight size={19} className="shrink-0 text-slate-300"/>
          </button>
        </div>
      </div>

    </section>);
}

export function scheduleTone(status: Schedule["reminderStatus"]) {
    if (status === "overdue")
        return "bg-rose-50 text-rose-700";
    if (status === "soon")
        return "bg-amber-50 text-amber-700";
    return "bg-emerald-50 text-[#16A34A]";
}

export function SchedulesView({ accounts, categories, request, onNavigate, onTransfer, initialView = "list" }: {
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
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { load().catch(console.error); }, []);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        const nextDueDate = String(form.get("nextDueDate"));
        try {
            await request(editingSchedule ? `/schedules/${editingSchedule.id}` : "/schedules", {
                method: editingSchedule ? "PUT" : "POST",
                body: JSON.stringify({
                    title: String(form.get("title")),
                    scheduleType: String(form.get("scheduleType")),
                    frequency: String(form.get("frequency")),
                    expiryDate: String(form.get("expiryDate") || "") || null,
                    dueDay: Number(nextDueDate.slice(8, 10)),
                    nextDueDate,
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
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Jadwal gagal disimpan");
        }
    };
    const remove = async (id: string) => {
        if (!window.confirm("Hapus jadwal ini?"))
            return;
        await request(`/schedules/${id}`, { method: "DELETE" });
        await load();
    };
    return (<div className="space-y-3">
      {scheduleView === "list" && (<section className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-2xl lg:border-slate-200">
        <SectionHeader title="Jadwal & pemberitahuan" caption="Pengingat pembayaran, top up, atau transfer rutin." action={(<button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-[#16A34A]" onClick={() => {
                    setError(null);
                    setEditingSchedule(null);
                    setScheduleView("form");
                }}>
              <Plus size={14}/> Tambah
            </button>)}/>
        {loading ? <LoadingState /> : schedules.length === 0 ? (<EmptyState text="Belum ada jadwal. Tambahkan pengingat rutin pertama Anda."/>) : (<div className="grid gap-2 md:grid-cols-2">
            {schedules.map((schedule) => (<article key={schedule.id} className="rounded-2xl border border-slate-100 bg-white px-3 py-3 lg:rounded-xl">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{schedule.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {localDate(schedule.nextDueDate)} {schedule.amount ? `- ${rupiah(schedule.amount)}` : ""}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-[#16A34A]">
                      {{ daily: "Harian", weekly: "Mingguan", monthly: "Bulanan", yearly: "Tahunan" }[schedule.frequency]}
                      {schedule.expiryDate ? ` Â· Berakhir ${localDate(schedule.expiryDate)}` : ""}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${scheduleTone(schedule.reminderStatus)}`}>
                    {schedule.reminderStatus === "overdue" ? "Lewat" : schedule.reminderStatus === "soon" ? `${schedule.daysUntilDue} hari` : "Aktif"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {schedule.scheduleType === "transfer" || schedule.scheduleType === "topup"
                        ? `${schedule.accountName ?? "Pocket"} ke ${schedule.destinationAccountName ?? "tujuan"}`
                        : `${schedule.categoryName ?? "Transaksi"} dari ${schedule.accountName ?? "pocket"}`}
                </p>
                <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2">
                  <button type="button" className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-[#16A34A] transition hover:bg-emerald-100" onClick={() => schedule.scheduleType === "transaction" ? onNavigate("manual") : onTransfer()}>
                    Buat sekarang
                  </button>
                  <button type="button" className="rounded-full bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-[#16A34A]" onClick={() => {
                        setError(null);
                        setEditingSchedule(schedule);
                        setScheduleView("form");
                    }} aria-label={`Edit jadwal ${schedule.title}`}>
                    <Settings size={13}/>
                  </button>
                  <button type="button" className="rounded-full bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600" onClick={() => remove(schedule.id)}>
                    <Trash2 size={13}/>
                  </button>
                </div>
              </article>))}
          </div>)}
      </section>)}

      {scheduleView === "form" && (<form key={editingSchedule?.id ?? "new-schedule"} className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-2xl lg:border-slate-200" onSubmit={submit}>
        <SectionHeader title={editingSchedule ? "Edit jadwal" : "Tambah jadwal"} caption={editingSchedule ? "Sesuaikan pengingat dan detail transaksi terjadwal." : "Contoh: bayar SPP tiap tanggal 1 atau top up GoPay."} action={(<button type="button" className="app-back-button" onClick={() => {
                    setEditingSchedule(null);
                    setError(null);
                    setScheduleView("list");
                }}>
              <ArrowLeft size={14}/> Kembali
            </button>)}/>
        <div className="space-y-3">
          <Field label="Judul">
            <input className="input" name="title" placeholder="Bayar SPP sekolah" defaultValue={editingSchedule?.title ?? ""} required/>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Tipe">
              <select className="input" name="scheduleType" defaultValue={editingSchedule?.scheduleType ?? "transaction"}>
                <option value="transaction">Transaksi</option>
                <option value="transfer">Transfer</option>
                <option value="topup">Top up</option>
              </select>
            </Field>
            <Field label="Frekuensi">
              <select className="input" name="frequency" defaultValue={editingSchedule?.frequency ?? "monthly"} required>
                <option value="daily">Harian</option>
                <option value="weekly">Mingguan</option>
                <option value="monthly">Bulanan</option>
                <option value="yearly">Tahunan</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Jatuh tempo berikutnya">
              <DateInput name="nextDueDate" defaultValue={editingSchedule?.nextDueDate?.slice(0, 10) ?? isoDateInput()} required/>
            </Field>
            <Field label="Tanggal berakhir">
              <DateInput name="expiryDate" min={editingSchedule?.nextDueDate?.slice(0, 10) ?? isoDateInput()} defaultValue={editingSchedule?.expiryDate?.slice(0, 10) ?? ""}/>
            </Field>
          </div>
          <Field label="Nominal">
            <input className="input" name="amount" inputMode="numeric" placeholder="Opsional" defaultValue={moneyInputValue(editingSchedule?.amount)} onInput={handleMoneyInput}/>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Pocket sumber">
              <select className="input" name="accountId" defaultValue={editingSchedule?.accountId ?? ""}>
                <option value="">Pilih pocket</option>
                {accounts.map((account) => <option key={account.id} value={account.id}>{accountOptionLabel(account)}</option>)}
              </select>
            </Field>
            <Field label="Pocket tujuan">
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
          <input className="input" name="paymentMethod" placeholder="Metode pembayaran, misalnya BCA atau GoPay" defaultValue={editingSchedule?.paymentMethod ?? ""}/>
          <input className="input" name="notes" placeholder="Catatan singkat" defaultValue={editingSchedule?.notes ?? ""}/>
          <button className="btn-primary w-full"><Bell size={16}/> {editingSchedule ? "Simpan perubahan" : "Simpan jadwal"}</button>
          {error && <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 lg:rounded-xl">{error}</p>}
        </div>
      </form>)}
    </div>);
}

export function AccountsView({ accounts, categories, currentUserId, request, onChanged, onAddTransaction, onOpenTransactions, onOpenTransaction, onChildFrameStateChange, onNotice, initialView = "list", initialTab = "mine", initialSelectedPocketId = "", resetKey = 0, language = "id", readOnly = false }: {
    accounts: Account[];
    categories: Category[];
    currentUserId: string;
    request: <T>(path: string, options?: RequestInit) => Promise<T>;
    onChanged: () => Promise<void>;
    onAddTransaction?: (accountId: string) => void;
    onOpenTransactions: (accountId: string, fromDate?: string) => void;
    onOpenTransaction?: (accountId: string, transactionId: string) => void;
    onChildFrameStateChange?: (state: ChildFrameState) => void;
    onNotice?: (notice: { message: string; type: "success" | "error" }) => void;
    initialView?: "list" | "account-form" | "transfer-form" | "pocket-detail";
    initialTab?: "mine" | "shared";
    initialSelectedPocketId?: string;
    resetKey?: number;
    language?: AppLanguage;
    readOnly?: boolean;
}) {
    const [error, setError] = useState<string | null>(null);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [accountView, setAccountView] = useState<"list" | "account-form" | "transfer-form" | "pocket-detail">(initialView);
    const [pocketTab, setPocketTab] = useState<"mine" | "shared">(initialTab);
    const [pocketSearch, setPocketSearch] = useState("");
    const [pocketOrder, setPocketOrder] = useState<string[]>([]);
    const pocketOrderRef = useRef<string[]>([]);
    const draggedPocketIdRef = useRef<string | null>(null);
    const dragTargetPocketIdRef = useRef<string | null>(null);
    const pocketDragMovedRef = useRef(false);
    const suppressPocketClickRef = useRef(false);
    const [draggingPocketId, setDraggingPocketId] = useState<string | null>(null);
    const [dropTargetPocketId, setDropTargetPocketId] = useState<string | null>(null);
    const [selectedPocketId, setSelectedPocketId] = useState(initialSelectedPocketId);
    const [pocketTransactionSearch, setPocketTransactionSearch] = useState("");
    const [pocketTransactionType, setPocketTransactionType] = useState<"all" | "income" | "expense">("all");
    const [showPocketTransactionFilter, setShowPocketTransactionFilter] = useState(false);
    const [pocketTransactionDatePreset, setPocketTransactionDatePreset] = useState<"all" | "today" | "last7" | "month" | "custom">("all");
    const [pocketTransactionCustomStart, setPocketTransactionCustomStart] = useState("");
    const [pocketTransactionCustomEnd, setPocketTransactionCustomEnd] = useState("");
    const [pocketTransactionSort, setPocketTransactionSort] = useState<"newest" | "oldest" | "amount-desc" | "amount-asc">("newest");
    const [pocketTransactionMemberId, setPocketTransactionMemberId] = useState("all");
    const [pocketTransactionRows, setPocketTransactionRows] = useState<Transaction[]>([]);
    const [pocketTransactionLoading, setPocketTransactionLoading] = useState(false);
    const [showPocketHistoryShare, setShowPocketHistoryShare] = useState(false);
    const [shareHistorySaving, setShareHistorySaving] = useState(false);
    const [shareHistoryPreset, setShareHistoryPreset] = useState<"today" | "last7" | "month" | "previous-month" | "custom">("last7");
    const [shareHistoryFrom, setShareHistoryFrom] = useState("");
    const [shareHistoryTo, setShareHistoryTo] = useState("");
    const [shareHistoryType, setShareHistoryType] = useState<"all" | "income" | "expense">("all");
    const [shareHistoryCategoryId, setShareHistoryCategoryId] = useState("all");
    const [shareHistoryExpiry, setShareHistoryExpiry] = useState(7);
    const [shareHistoryLink, setShareHistoryLink] = useState("");
    const [activeHistoryShares, setActiveHistoryShares] = useState<Array<{ token: string; dateFrom: string; dateTo: string; transactionType: "income" | "expense" | null; categoryId: string | null; categoryName: string | null; expiresAt: string; createdAt: string }>>([]);
    const [activeHistorySharesLoading, setActiveHistorySharesLoading] = useState(false);
    const [showMutationImportModal, setShowMutationImportModal] = useState(false);
    const [mutationImportText, setMutationImportText] = useState("");
    const [mutationImportRows, setMutationImportRows] = useState<Array<{
        importKey: string;
        transactionDate: string;
        transactionType: "income" | "expense";
        amount: string;
        description: string;
        categoryId: string | null;
        categoryName: string | null;
        duplicate: boolean;
        duplicateReason: string | null;
        confidence: number;
    }>>([]);
    const [selectedMutationImportKeys, setSelectedMutationImportKeys] = useState<Set<string>>(new Set());
    const [mutationImportSummary, setMutationImportSummary] = useState<{ total: number; duplicate: number; ready: number; income: string; expense: string } | null>(null);
    const [mutationImportLoading, setMutationImportLoading] = useState(false);
    const [mutationImportSaving, setMutationImportSaving] = useState(false);
    const [mutationImportFileName, setMutationImportFileName] = useState("");
    const mutationImportInputRef = useRef<HTMLInputElement>(null);
    const [targetBalanceDraft, setTargetBalanceDraft] = useState("");
    const [targetDateDraft, setTargetDateDraft] = useState("");
    const [targetNameDraft, setTargetNameDraft] = useState("");
    const [targetImageDraft, setTargetImageDraft] = useState("");
    const [targetAutoTransferEnabled, setTargetAutoTransferEnabled] = useState(false);
    const [targetAutoTransferSourceId, setTargetAutoTransferSourceId] = useState("");
    const [targetAutoTransferAmount, setTargetAutoTransferAmount] = useState("");
    const [targetAutoTransferFrequency, setTargetAutoTransferFrequency] = useState<"weekly" | "monthly">("monthly");
    const [showTargetBalanceModal, setShowTargetBalanceModal] = useState(false);
    const [targetBalanceSaving, setTargetBalanceSaving] = useState(false);
    const [showAutoBudgetModal, setShowAutoBudgetModal] = useState(false);
    const [autoBudgetSaving, setAutoBudgetSaving] = useState(false);
    const [autoBudgetRule, setAutoBudgetRule] = useState<{
        id: string; amount: string; frequency: "daily" | "weekly" | "monthly" | "yearly";
        sourceAccountId: string; sourceAccountName: string;
        dayOfWeek: number | null; dayOfMonth: number | null; monthOfYear: number | null;
        expiryDate: string | null; nextRunDate: string; targetCurrentBalance: string; targetBalance: string | null;
        executions: Array<{ id: string; runDate: string; status: "success" | "failed"; errorMessage: string | null; transferId: string | null; createdAt: string }>;
    } | null>(null);
    const [autoBudgetDraft, setAutoBudgetDraft] = useState({
        sourceAccountId: "", amount: "", frequency: "monthly" as "daily" | "weekly" | "monthly" | "yearly",
        dayOfWeek: 1, dayOfMonth: 1, monthOfYear: 1, expiryDate: "", noExpiry: true
    });
    const [targetDetails, setTargetDetails] = useState<{
        currentBalance: string;
        targetName: string | null;
        goalImageUrl: string | null;
        targetBalance: string | null;
        targetDate: string | null;
        recommendations: { remaining: string; daysLeft: number; weeklyDeposit: string; monthlyDeposit: string } | null;
        projection: { projectedDate: string | null; status: "completed" | "needs_plan" | "late" | "faster" | "on_track"; dailyAutoTransfer: string } | null;
        milestones: Array<{ percent: number; amount: string; reached: boolean; reachedAt: string | null }>;
        progressHistory: Array<{ eventType: string; amount: string | null; balanceAfter: string | null; notes: string | null; createdAt: string; userFullName: string | null }>;
        autoTransfers: Array<{ id: string; userId: string; userFullName: string; sourceAccountId: string; sourceAccountName: string | null; amount: string; frequency: string; nextRunDate: string; expiryDate: string | null }>;
        contributions: Array<{
            userId: string;
            fullName: string;
            username: string;
            avatarUrl: string | null;
            role: string;
            amount: string;
        }>;
    } | null>(null);
    const [inviteQuery, setInviteQuery] = useState("");
    const [inviteSearchResults, setInviteSearchResults] = useState<Array<{
        id: string;
        fullName: string;
        username: string;
        email: string | null;
        avatarUrl: string | null;
        phone: string | null;
    }>>([]);
    const [inviteSearchLoading, setInviteSearchLoading] = useState(false);
    const [inviteSearchedQuery, setInviteSearchedQuery] = useState("");
    const [inviteSelectedUser, setInviteSelectedUser] = useState<{
        id: string;
        fullName: string;
        username: string;
        email: string;
        avatarUrl: string | null;
    } | null>(null);
    const [invitePermission, setInvitePermission] = useState<"member" | "viewer">("member");
    const [inviteSending, setInviteSending] = useState(false);
    const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
    const inviteRequestRef = useRef(request);
    const [pocketCollaborators, setPocketCollaborators] = useState<Array<{
        user_id: string;
        role: string;
        status: string;
        full_name: string;
        email: string;
        username: string;
        avatar_url: string | null;
    }>>([]);
    useEffect(() => {
        inviteRequestRef.current = request;
    }, [request]);
    const [pocketMemberPreviewMap, setPocketMemberPreviewMap] = useState<Record<string, Array<{
        userId: string;
        fullName: string;
        avatarUrl: string | null;
        status: string;
    }>>>({});
    const pocketPreviewLoadingRef = useRef<Set<string>>(new Set());
    const [showPocketMembersPopup, setShowPocketMembersPopup] = useState(false);
    const [removingPocketMemberId, setRemovingPocketMemberId] = useState<string | null>(null);
    const [showPocketInviteModal, setShowPocketInviteModal] = useState(false);
    const [scanQrOpen, setScanQrOpen] = useState(false);
    const [qrScannerError, setQrScannerError] = useState<string | null>(null);
    const [hasTargetBalance, setHasTargetBalance] = useState(false);
    const [hasAutoBudgeting, setHasAutoBudgeting] = useState(false);
    const [pocketNameDraft, setPocketNameDraft] = useState("");
    const [pocketTypeDraft, setPocketTypeDraft] = useState<"cash" | "bank" | "e_wallet" | "e_money" | "gold">("bank");
    const [pocketInitialBalanceDraft, setPocketInitialBalanceDraft] = useState("");
    const [pocketProviderDraft, setPocketProviderDraft] = useState("");
    const [pocketNumberDraft, setPocketNumberDraft] = useState("");
    const [pocketHolderDraft, setPocketHolderDraft] = useState("");
    const [pocketGoldGramsDraft, setPocketGoldGramsDraft] = useState("");
    const [pocketGoldBuyPriceDraft, setPocketGoldBuyPriceDraft] = useState("");
    const [pocketGoldSellPriceDraft, setPocketGoldSellPriceDraft] = useState("");
    const [pocketLogoDraft, setPocketLogoDraft] = useState("??");
    const [pocketBackgroundDraft, setPocketBackgroundDraft] = useState("#16A34A");
    const pocketProviderOptions = pocketTypeDraft === "bank"
        ? pocketBankOptions
        : pocketTypeDraft === "e_wallet"
            ? pocketEWalletOptions
            : pocketTypeDraft === "gold"
                ? pocketGoldProviderOptions
                : pocketEMoneyOptions;
    const pocketProviderStickerOptions = pocketTypeDraft === "cash" ? [] : pocketProviderOptions;
    const pocketGalleryInputRef = useRef<HTMLInputElement>(null);
    const [showPocketLogoMenu, setShowPocketLogoMenu] = useState(false);
    const [showPocketStickerPicker, setShowPocketStickerPicker] = useState(false);
    const [transferMode, setTransferMode] = useState<"general" | "out" | "in">("general");
    const [sourceAccountId, setSourceAccountId] = useState("");
    const [destinationAccountId, setDestinationAccountId] = useState("");
    const [transferPocketPicker, setTransferPocketPicker] = useState<"source" | "destination" | null>(null);
    const [autoBudgetSourcePickerOpen, setAutoBudgetSourcePickerOpen] = useState(false);
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
    const spendableAccounts = useMemo(() => accounts.filter((account) => !account.isSharedWalletAccount && account.collaborationStatus !== "pending" && (account.canEdit !== false || account.collaboratorRole === "admin" || account.collaboratorRole === "member")), [accounts]);
    const receivableAccounts = useMemo(() => accounts.filter((account) => !account.isSharedWalletAccount && account.collaborationStatus !== "pending"), [accounts]);
    const transferableAccounts = receivableAccounts;
    const sourceAccount = accounts.find((account) => account.id === sourceAccountId);
    const destinationAccount = accounts.find((account) => account.id === destinationAccountId);
    const autoBudgetSourceAccount = accounts.find((account) => account.id === autoBudgetDraft.sourceAccountId);
    const transferAmount = moneyValue(transferDraft.amount);
    const transferFee = moneyValue(transferDraft.feeAmount);
    const sourceBalanceAfter = sourceAccount ? moneyValue(sourceAccount.currentBalance) - transferAmount - transferFee : 0;
    const destinationBalanceAfter = destinationAccount ? moneyValue(destinationAccount.currentBalance) + transferAmount : 0;
    const transferFormCopy = useMemo(() => {
        if (transferMode === "out") {
            return {
                title: "Transfer out",
                caption: "Kirim saldo keluar dari pocket ini ke pocket tujuan.",
                sourceLabel: "Dari pocket ini",
                destinationLabel: "Ke pocket tujuan",
                sourceCaption: "Saldo akan dipotong dari pocket asal.",
                destinationCaption: "Pilih pocket penerima transfer.",
                submitLabel: "Transfer keluar"
            };
        }
        if (transferMode === "in") {
            return {
                title: "Transfer in",
                caption: "Terima saldo dari pocket lain masuk ke pocket ini.",
                sourceLabel: "Dari pocket asal",
                destinationLabel: "Masuk ke pocket ini",
                sourceCaption: "Pilih pocket sumber dana.",
                destinationCaption: "Saldo akan masuk ke pocket tujuan ini.",
                submitLabel: "Transfer masuk"
            };
        }
        return {
            title: "Transfer antar pocket",
            caption: "Pindahkan uang antar pocket tanpa membuat pengeluaran.",
            sourceLabel: "Pocket asal",
            destinationLabel: "Pocket tujuan",
            sourceCaption: "Pilih pocket sumber dana.",
            destinationCaption: "Pilih pocket penerima transfer.",
            submitLabel: "Transfer"
        };
    }, [transferMode]);
    const totalBalance = accounts.reduce((sum, account) => sum + (account.accountType === "credit_card" ? -moneyValue(account.currentBalance) : moneyValue(account.currentBalance)), 0);
    const myPockets = accounts.filter((account) => account.canEdit !== false);
    const sharedPockets = accounts.filter((account) => account.canEdit === false);
    const visiblePocketSource = pocketTab === "mine" ? myPockets : sharedPockets;
    const orderedPocketSource = [...visiblePocketSource].sort((a, b) => {
        const aIndex = pocketOrder.indexOf(a.id);
        const bIndex = pocketOrder.indexOf(b.id);
        return (aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex) - (bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex);
    });
    const visiblePockets = orderedPocketSource.filter((account) => {
        const query = pocketSearch.trim().toLowerCase();
        if (!query)
            return true;
        return [account.name, account.providerName, account.accountNumber, account.accountType].filter(Boolean).join(" ").toLowerCase().includes(query);
    });
    const myPocketTotal = myPockets.reduce((sum, account) => sum + moneyValue(account.currentBalance), 0);
    const sharedPocketTotal = sharedPockets.reduce((sum, account) => sum + moneyValue(account.currentBalance), 0);
    // Count pending invitations for badges
    const myPocketPendingInvites = 0;
    const sharedPocketPendingInvites = sharedPockets.filter((account) => account.collaborationStatus === "pending").length;
    const selectedPocket = accounts.find((account) => account.id === selectedPocketId) ?? null;
    const selectedPocketIsOwner = Boolean(selectedPocket?.canEdit);
    const selectedPocketCanSpend = selectedPocketIsOwner || selectedPocket?.collaboratorRole === "admin" || selectedPocket?.collaboratorRole === "member";
    const selectedMutationImportRows = useMemo(() => mutationImportRows.filter((row) => selectedMutationImportKeys.has(row.importKey) && !row.duplicate), [mutationImportRows, selectedMutationImportKeys]);
    const filteredPocketTransactions = useMemo(() => {
        const query = pocketTransactionSearch.trim().toLowerCase();
        const today = isoDateInput();
        const last7StartDate = new Date(`${today}T12:00:00`);
        last7StartDate.setDate(last7StartDate.getDate() - 6);
        const last7Start = isoDateInput(last7StartDate);
        const filtered = pocketTransactionRows.filter((transaction) => {
            if (pocketTransactionType !== "all" && transaction.transactionType !== pocketTransactionType) {
                return false;
            }
            const transactionDate = jakartaDateParts(transaction.transactionDate).value;
            if (pocketTransactionDatePreset === "today" && transactionDate !== today)
                return false;
            if (pocketTransactionDatePreset === "last7" && (transactionDate < last7Start || transactionDate > today))
                return false;
            if (pocketTransactionDatePreset === "month" && !transactionDate.startsWith(today.slice(0, 7)))
                return false;
            if (pocketTransactionDatePreset === "custom") {
                if (pocketTransactionCustomStart && transactionDate < pocketTransactionCustomStart)
                    return false;
                if (pocketTransactionCustomEnd && transactionDate > pocketTransactionCustomEnd)
                    return false;
            }
            if (pocketTransactionMemberId !== "all" && transaction.userId !== pocketTransactionMemberId)
                return false;
            if (!query) {
                return true;
            }
            return [
                transaction.merchantName,
                transaction.categoryName,
                transaction.paymentMethod,
                transaction.notes,
                transaction.accountName
            ].filter(Boolean).join(" ").toLowerCase().includes(query);
        });
        return [...filtered].sort((a, b) => {
            if (pocketTransactionSort === "amount-desc")
                return moneyValue(b.amount) - moneyValue(a.amount);
            if (pocketTransactionSort === "amount-asc")
                return moneyValue(a.amount) - moneyValue(b.amount);
            const dateComparison = new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime();
            return pocketTransactionSort === "oldest" ? dateComparison : -dateComparison;
        });
    }, [pocketTransactionCustomEnd, pocketTransactionCustomStart, pocketTransactionDatePreset, pocketTransactionMemberId, pocketTransactionRows, pocketTransactionSearch, pocketTransactionSort, pocketTransactionType]);
    const recentPocketTransactions = useMemo(() => filteredPocketTransactions.slice(0, 20), [filteredPocketTransactions]);
    const groupedPocketTransactions = useMemo(() => {
        const groups = new Map<string, Transaction[]>();
        recentPocketTransactions.forEach((transaction) => {
            const date = jakartaDateParts(transaction.transactionDate).value;
            groups.set(date, [...(groups.get(date) ?? []), transaction]);
        });
        return [...groups.entries()].map(([date, rows]) => ({
            date,
            rows,
            netAmount: rows.reduce((sum, transaction) => sum + (transaction.transactionType === "income" ? moneyValue(transaction.amount) : -moneyValue(transaction.amount)), 0)
        }));
    }, [recentPocketTransactions]);
    const pocketTransactionFilterCount = (pocketTransactionDatePreset !== "all" ? 1 : 0) + (pocketTransactionSort !== "newest" ? 1 : 0) + (pocketTransactionMemberId !== "all" ? 1 : 0);
    const shareHistoryCategoryOptions = useMemo(() => categories.filter((category) => shareHistoryType === "all" || category.categoryType === shareHistoryType), [categories, shareHistoryType]);
    const shareHistoryBounds = useMemo(() => {
        if (shareHistoryPreset === "custom") return { from: shareHistoryFrom, to: shareHistoryTo };
        const today = jakartaDateParts();
        const end = new Date(Date.UTC(today.year, today.month - 1, today.day, 12));
        let start = new Date(end);
        if (shareHistoryPreset === "last7") start.setUTCDate(start.getUTCDate() - 6);
        if (shareHistoryPreset === "month") start = new Date(Date.UTC(today.year, today.month - 1, 1, 12));
        if (shareHistoryPreset === "previous-month") {
            start = new Date(Date.UTC(today.year, today.month - 2, 1, 12));
            end.setUTCFullYear(today.year, today.month - 1, 0);
        }
        return { from: isoDateInput(start), to: isoDateInput(end) };
    }, [shareHistoryFrom, shareHistoryPreset, shareHistoryTo]);
    useEffect(() => {
        if (shareHistoryCategoryId === "all") return;
        if (!shareHistoryCategoryOptions.some((category) => category.id === shareHistoryCategoryId)) {
            setShareHistoryCategoryId("all");
        }
    }, [shareHistoryCategoryId, shareHistoryCategoryOptions]);
    const createHistoryShare = async () => {
        if (!selectedPocketId || !shareHistoryBounds.from || !shareHistoryBounds.to) return;
        setShareHistorySaving(true);
        setError(null);
        try {
            const result = await request<{ token: string; expiresAt: string }>(`/accounts/${selectedPocketId}/history-shares`, {
                method: "POST",
                body: JSON.stringify({
                    dateFrom: shareHistoryBounds.from,
                    dateTo: shareHistoryBounds.to,
                    transactionType: shareHistoryType === "all" ? null : shareHistoryType,
                    categoryId: shareHistoryCategoryId === "all" ? null : shareHistoryCategoryId,
                    expiresInDays: shareHistoryExpiry,
                    language
                })
            });
            setShareHistoryLink(`${window.location.origin}/?pocketShare=${result.token}`);
            await loadActiveHistoryShares();
        } finally {
            setShareHistorySaving(false);
        }
    };
    const loadActiveHistoryShares = async () => {
        if (!selectedPocketId) return;
        setActiveHistorySharesLoading(true);
        try {
            setActiveHistoryShares(await request<typeof activeHistoryShares>(`/accounts/${selectedPocketId}/history-shares`));
        } finally {
            setActiveHistorySharesLoading(false);
        }
    };
    const shareGeneratedHistoryLink = async () => {
        if (!shareHistoryLink) return;
        if (navigator.share) {
            await navigator.share({ title: selectedPocket?.name ?? "Pocket history", text: language === "en" ? "See this Pocket history" : "Lihat riwayat Pocket ini", url: shareHistoryLink });
            return;
        }
        await navigator.clipboard.writeText(shareHistoryLink);
        onNotice?.({ message: language === "en" ? "Pocket history share link copied." : "Link share history pocket berhasil disalin.", type: "success" });
    };
    const copyShareHistoryLink = async (url = shareHistoryLink) => {
        if (!url) return;
        await navigator.clipboard.writeText(url);
        onNotice?.({ message: language === "en" ? "Pocket history share link copied." : "Link share history pocket berhasil disalin.", type: "success" });
    };
    const openMutationImportModal = () => {
        if (readOnly) return;
        setError(null);
        setMutationImportText("");
        setMutationImportRows([]);
        setSelectedMutationImportKeys(new Set());
        setMutationImportSummary(null);
        setMutationImportFileName("");
        setShowMutationImportModal(true);
    };
    const applyMutationImportPreview = (result: {
        rows: typeof mutationImportRows;
        summary: { total: number; duplicate: number; ready: number; income: string; expense: string };
    }) => {
        setMutationImportRows(result.rows);
        setMutationImportSummary(result.summary);
        setSelectedMutationImportKeys(new Set(result.rows.filter((row) => !row.duplicate).map((row) => row.importKey)));
    };
    const previewMutationImport = async (file?: File) => {
        if (!selectedPocketId)
            return;
        setMutationImportLoading(true);
        setError(null);
        try {
            const form = new FormData();
            if (file) {
                form.set("file", file);
                setMutationImportFileName(file.name);
            }
            else {
                form.set("text", mutationImportText);
                setMutationImportFileName("");
            }
            const result = await request<{
                rows: typeof mutationImportRows;
                summary: { total: number; duplicate: number; ready: number; income: string; expense: string };
            }>(`/accounts/${selectedPocketId}/mutation-import/preview`, { method: "POST", body: form });
            applyMutationImportPreview(result);
        }
        finally {
            setMutationImportLoading(false);
        }
    };
    const saveMutationImport = async () => {
        if (!selectedPocketId)
            return;
        const rows = mutationImportRows.filter((row) => selectedMutationImportKeys.has(row.importKey) && !row.duplicate);
        if (!rows.length)
            return;
        setMutationImportSaving(true);
        setError(null);
        try {
            await request(`/accounts/${selectedPocketId}/mutation-import/commit`, {
                method: "POST",
                body: JSON.stringify({ rows })
            });
            setShowMutationImportModal(false);
            await Promise.all([loadPocketTransactions(selectedPocketId), loadPocketTarget(selectedPocketId), onChanged()]);
        }
        finally {
            setMutationImportSaving(false);
        }
    };
    const pocketMembers = useMemo(() => {
        if (!selectedPocket)
            return [];
        const owner = selectedPocket.ownerUserId ? {
            userId: selectedPocket.ownerUserId,
            fullName: selectedPocket.ownerName || selectedPocket.name,
            username: "",
            avatarUrl: selectedPocket.ownerAvatarUrl ?? null,
            role: "owner",
            status: "accepted"
        } : null;
        const acceptedCollaborators = pocketCollaborators
            .filter((member) => member.status !== "rejected" && member.user_id !== selectedPocket.ownerUserId)
            .map((member) => ({
            userId: member.user_id,
            fullName: member.full_name,
            username: member.username,
            avatarUrl: member.avatar_url,
            role: member.role,
            status: member.status
        }));
        return owner ? [owner, ...acceptedCollaborators] : acceptedCollaborators;
    }, [pocketCollaborators, selectedPocket]);
    const activePocketMembers = useMemo(() => pocketMembers.filter((member) => member.status === "accepted"), [pocketMembers]);
    const loadPocketTransactions = async (accountId = selectedPocketId) => {
        if (!accountId) {
            setPocketTransactionRows([]);
            setPocketTransactionLoading(false);
            return;
        }
        setPocketTransactionLoading(true);
        try {
            const params = new URLSearchParams();
            params.set("accountId", accountId);
            params.set("limit", "100");
            params.set("page", "1");
            params.set("sort", "transaction_date");
            params.set("direction", "desc");
            const result = await request<{
                data: Transaction[];
            }>(`/transactions?${params.toString()}`);
            setPocketTransactionRows(result.data);
        }
        catch {
            setPocketTransactionRows([]);
        }
        finally {
            setPocketTransactionLoading(false);
        }
    };
    const respondPocketInvite = async (accountId: string, status: "accepted" | "rejected") => {
        await request(`/accounts/${accountId}/collaborators/invite`, {
            method: "PUT", body: JSON.stringify({ status })
        });
        await onChanged();
    };
    const loadPocketTarget = async (accountId = selectedPocketId) => {
        if (!accountId) {
            setTargetDetails(null);
            return;
        }
        const details = await request<{
            currentBalance: string;
            targetName: string | null;
            goalImageUrl: string | null;
            targetBalance: string | null;
            targetDate: string | null;
            recommendations: { remaining: string; daysLeft: number; weeklyDeposit: string; monthlyDeposit: string } | null;
            projection: { projectedDate: string | null; status: "completed" | "needs_plan" | "late" | "faster" | "on_track"; dailyAutoTransfer: string } | null;
            milestones: Array<{ percent: number; amount: string; reached: boolean; reachedAt: string | null }>;
            progressHistory: Array<{ eventType: string; amount: string | null; balanceAfter: string | null; notes: string | null; createdAt: string; userFullName: string | null }>;
            autoTransfers: Array<{ id: string; userId: string; userFullName: string; sourceAccountId: string; sourceAccountName: string | null; amount: string; frequency: string; nextRunDate: string; expiryDate: string | null }>;
            contributions: Array<{ userId: string; fullName: string; username: string; avatarUrl: string | null; role: string; amount: string }>;
        }>(`/accounts/${accountId}/target`);
        setTargetDetails(details);
    };
    const openTargetBalanceModal = () => {
        if (readOnly) return;
        setError(null);
        setTargetNameDraft(targetDetails?.targetName ?? (selectedPocket?.name ? `Target ${selectedPocket.name}` : ""));
        setTargetImageDraft(targetDetails?.goalImageUrl ?? "");
        setTargetBalanceDraft(moneyInputValue(targetDetails?.targetBalance ?? selectedPocket?.targetBalance ?? ""));
        setTargetDateDraft(targetDetails?.targetDate?.slice(0, 10) ?? selectedPocket?.targetDate?.slice(0, 10) ?? "");
        const recommendedMonthly = targetDetails?.recommendations?.monthlyDeposit ? moneyInputValue(targetDetails.recommendations.monthlyDeposit) : "";
        setTargetAutoTransferEnabled(Boolean(autoBudgetRule));
        setTargetAutoTransferSourceId(autoBudgetRule?.sourceAccountId ?? spendableAccounts.find((account) => account.id !== selectedPocketId)?.id ?? "");
        setTargetAutoTransferAmount(moneyInputValue(autoBudgetRule?.amount ?? recommendedMonthly));
        setTargetAutoTransferFrequency((autoBudgetRule?.frequency === "weekly" || autoBudgetRule?.frequency === "monthly") ? autoBudgetRule.frequency : "monthly");
        setShowTargetBalanceModal(true);
    };
    const savePocketTarget = async () => {
        if (!selectedPocketId || !targetBalanceDraft || !targetDateDraft)
            return;
        setTargetBalanceSaving(true);
        try {
            await request(`/accounts/${selectedPocketId}/target`, {
                method: "PUT",
                body: JSON.stringify({
                    targetName: targetNameDraft,
                    goalImageUrl: targetImageDraft || null,
                    targetBalance: targetBalanceDraft.replace(/\./g, ""),
                    targetDate: targetDateDraft
                })
            });
            if (targetAutoTransferEnabled && targetAutoTransferSourceId && targetAutoTransferAmount) {
                const dayOfMonth = Math.max(1, Math.min(31, Number(targetDateDraft.slice(8, 10)) || 1));
                await request(`/accounts/${selectedPocketId}/auto-budget`, {
                    method: "PUT",
                    body: JSON.stringify({
                        sourceAccountId: targetAutoTransferSourceId,
                        amount: targetAutoTransferAmount.replace(/\./g, ""),
                        frequency: targetAutoTransferFrequency,
                        dayOfWeek: targetAutoTransferFrequency === "weekly" ? 1 : null,
                        dayOfMonth: targetAutoTransferFrequency === "monthly" ? dayOfMonth : null,
                        monthOfYear: null,
                        expiryDate: targetDateDraft
                    })
                });
            }
            setShowTargetBalanceModal(false);
            await Promise.all([onChanged(), loadPocketTarget(selectedPocketId), loadAutoBudget(selectedPocketId)]);
        }
        finally {
            setTargetBalanceSaving(false);
        }
    };
    const loadAutoBudget = async (accountId = selectedPocketId) => {
        if (!accountId) return setAutoBudgetRule(null);
        setAutoBudgetRule(await request<typeof autoBudgetRule>(`/accounts/${accountId}/auto-budget`));
    };
    const openAutoBudgetModal = () => {
        if (readOnly) return;
        setError(null);
        setAutoBudgetDraft({
            sourceAccountId: autoBudgetRule?.sourceAccountId ?? spendableAccounts.find((account) => account.id !== selectedPocketId)?.id ?? "",
            amount: moneyInputValue(autoBudgetRule?.amount ?? ""),
            frequency: autoBudgetRule?.frequency ?? "monthly",
            dayOfWeek: autoBudgetRule?.dayOfWeek ?? 1,
            dayOfMonth: autoBudgetRule?.dayOfMonth ?? 1,
            monthOfYear: autoBudgetRule?.monthOfYear ?? 1,
            expiryDate: autoBudgetRule?.expiryDate ?? "",
            noExpiry: !autoBudgetRule?.expiryDate
        });
        setShowAutoBudgetModal(true);
    };
    const saveAutoBudget = async () => {
        if (!selectedPocketId || !autoBudgetDraft.amount) return;
        setAutoBudgetSaving(true);
        try {
            await request(`/accounts/${selectedPocketId}/auto-budget`, {
                method: "PUT",
                body: JSON.stringify({
                    sourceAccountId: autoBudgetDraft.sourceAccountId,
                    amount: autoBudgetDraft.amount.replace(/\./g, ""), frequency: autoBudgetDraft.frequency,
                    dayOfWeek: autoBudgetDraft.frequency === "weekly" ? autoBudgetDraft.dayOfWeek : null,
                    dayOfMonth: ["monthly", "yearly"].includes(autoBudgetDraft.frequency) ? autoBudgetDraft.dayOfMonth : null,
                    monthOfYear: autoBudgetDraft.frequency === "yearly" ? autoBudgetDraft.monthOfYear : null,
                    expiryDate: autoBudgetDraft.noExpiry ? null : autoBudgetDraft.expiryDate || null
                })
            });
            setShowAutoBudgetModal(false);
            await Promise.all([loadAutoBudget(selectedPocketId), onChanged()]);
        } finally {
            setAutoBudgetSaving(false);
        }
    };
    const removeAutoBudget = async () => {
        if (!selectedPocketId) return;
        setAutoBudgetSaving(true);
        try {
            await request(`/accounts/${selectedPocketId}/auto-budget`, { method: "DELETE" });
            setShowAutoBudgetModal(false);
            setAutoBudgetRule(null);
            await onChanged();
        } finally {
            setAutoBudgetSaving(false);
        }
    };
    useEffect(() => {
        if (accountView !== "pocket-detail" || !selectedPocketId) {
            setPocketTransactionRows([]);
            setPocketTransactionLoading(false);
            return;
        }
        loadPocketTransactions(selectedPocketId).catch(() => undefined);
        loadPocketTarget(selectedPocketId).catch(() => setTargetDetails(null));
        loadAutoBudget(selectedPocketId).catch(() => setAutoBudgetRule(null));
    }, [accountView, selectedPocketId]);
    useEffect(() => {
        const previewTargets = accounts.filter((account) => Boolean(account.ownerUserId));
        const knownIds = new Set(previewTargets.map((account) => account.id));
        setPocketMemberPreviewMap((current) => {
            const filteredEntries = Object.entries(current).filter(([accountId]) => knownIds.has(accountId));
            if (filteredEntries.length === Object.keys(current).length) {
                return current;
            }
            return Object.fromEntries(filteredEntries);
        });
        previewTargets.forEach((account) => {
            if (pocketMemberPreviewMap[account.id] || pocketPreviewLoadingRef.current.has(account.id))
                return;
            pocketPreviewLoadingRef.current.add(account.id);
            request<Array<{
                user_id: string;
                role: string;
                status: string;
                full_name: string;
                email: string;
                username: string;
                avatar_url: string | null;
            }>>(`/accounts/${account.id}/collaborators`)
                .then((rows) => {
                const owner = account.ownerUserId ? [{
                        userId: account.ownerUserId,
                        fullName: account.ownerName || account.name,
                        avatarUrl: account.ownerAvatarUrl ?? null,
                        status: "accepted"
                    }] : [];
                const acceptedMembers = rows
                    .filter((member) => member.status !== "rejected" && member.user_id !== account.ownerUserId)
                    .map((member) => ({
                    userId: member.user_id,
                    fullName: member.full_name,
                    avatarUrl: member.avatar_url,
                    status: member.status
                }));
                setPocketMemberPreviewMap((current) => ({
                    ...current,
                    [account.id]: [...owner, ...acceptedMembers]
                }));
            })
                .catch(() => {
                setPocketMemberPreviewMap((current) => ({
                    ...current,
                    [account.id]: []
                }));
            })
                .finally(() => {
                pocketPreviewLoadingRef.current.delete(account.id);
            });
        });
    }, [accounts, pocketMemberPreviewMap, request]);
    useEffect(() => {
        if (initialSelectedPocketId)
            setSelectedPocketId(initialSelectedPocketId);
        setAccountView(initialView);
        if (initialView !== "transfer-form") {
            setTransferMode("general");
        }
    }, [initialSelectedPocketId, initialView, resetKey]);
    useEffect(() => {
        if (!onChildFrameStateChange)
            return;
        const returnFromChild = () => {
            setError(null);
            setTransferPocketPicker(null);
            if (accountView === "transfer-form" && transferMode !== "general" && selectedPocketId) {
                setAccountView("pocket-detail");
                return;
            }
            setAccountView("list");
        };
        onChildFrameStateChange({
            active: accountView !== "list",
            onBack: accountView !== "list" ? returnFromChild : null,
            onRefresh: null
        });
        return () => onChildFrameStateChange({ active: false, onBack: null, onRefresh: null });
    }, [accountView, onChildFrameStateChange, selectedPocketId, transferMode]);
    useEffect(() => {
        setPocketTab(initialTab);
    }, [initialTab, resetKey]);
    useEffect(() => {
        setPocketOrder((current) => {
            const next = [...accounts]
                .sort((a, b) => (a.displayOrder ?? Number.MAX_SAFE_INTEGER) - (b.displayOrder ?? Number.MAX_SAFE_INTEGER))
                .map((account) => account.id);
            pocketOrderRef.current = next;
            return next.every((id, index) => current[index] === id) && current.length === next.length ? current : next;
        });
    }, [accounts]);
    useEffect(() => {
        if (accountView !== "transfer-form")
            return;
        setError(null);
        setTransferText("");
        setTransferParsed(false);
        setTransferAnalysisStep(-1);
        setTransferDraft({ amount: "", feeAmount: "", transferDate: isoDateInput(), notes: "" });
        setTransferAttachmentId(null);
        setTransferAttachmentName("");
        setTransferAttachmentMessage(null);
        if (!selectedPocketId) {
            setTransferMode("general");
        }
    }, [accountView, resetKey]);
    useEffect(() => {
        if (accountView !== "pocket-detail" || !selectedPocketId || !selectedPocket) {
            setPocketCollaborators([]);
            setShowPocketMembersPopup(false);
            return;
        }
        const previewMembers = pocketMemberPreviewMap[selectedPocketId] ?? [];
        const shouldLoadCollaborators = selectedPocket.canEdit === false || previewMembers.length > 1;
        if (!shouldLoadCollaborators) {
            setPocketCollaborators([]);
            setShowPocketMembersPopup(false);
            return;
        }
        let active = true;
        request<Array<{
            user_id: string;
            role: string;
            status: string;
            full_name: string;
            email: string;
            username: string;
            avatar_url: string | null;
        }>>(`/accounts/${selectedPocketId}/collaborators`)
            .then((rows) => {
            if (!active)
                return;
            setPocketCollaborators(rows);
        })
            .catch(() => {
            if (!active)
                return;
            setPocketCollaborators([]);
        });
        return () => { active = false; };
    }, [accountView, pocketMemberPreviewMap, request, selectedPocket, selectedPocketId]);
    useEffect(() => {
        if (!showPocketInviteModal) {
            setInviteQuery("");
            setInviteSearchResults([]);
            setInviteSelectedUser(null);
            setInvitePermission("member");
            setInviteSuccess(null);
            setInviteSearchLoading(false);
            setInviteSearchedQuery("");
            return;
        }
        const query = inviteQuery.trim();
        if (query.length < 2) {
            setInviteSearchResults([]);
            setInviteSelectedUser(null);
            setInviteSearchLoading(false);
            setInviteSearchedQuery("");
            return;
        }
        let active = true;
        const timer = window.setTimeout(async () => {
            setInviteSearchLoading(true);
            try {
                const results = await inviteRequestRef.current<Array<{
                    id: string;
                    fullName: string;
                    username: string;
                    email: string | null;
                    avatarUrl: string | null;
                    phone: string | null;
                }>>(`/users/search?q=${encodeURIComponent(query)}&purpose=pocket_invite`);
                if (!active)
                    return;
                const filtered = results.slice(0, 1);
                setInviteSearchResults(filtered);
                if (!filtered.some((person) => person.id === inviteSelectedUser?.id)) {
                    setInviteSelectedUser(null);
                }
            }
            catch {
                if (!active)
                    return;
                setInviteSearchResults([]);
                setInviteSelectedUser(null);
            }
            finally {
                if (active) {
                    setInviteSearchLoading(false);
                    setInviteSearchedQuery(query);
                }
            }
        }, 260);
        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [inviteQuery, inviteSelectedUser?.id, showPocketInviteModal]);
    const submitPocketInvite = async () => {
        if (!selectedPocketId || !inviteSelectedUser)
            return;
        setInviteSending(true);
        setInviteSuccess(null);
        try {
            await request(`/accounts/${selectedPocketId}/collaborators`, {
                method: "POST",
                body: JSON.stringify({
                    targetUserId: inviteSelectedUser.id,
                    role: invitePermission
                })
            });
            setShowPocketInviteModal(false);
            setInviteSuccess(null);
            request<Array<{
                user_id: string;
                role: string;
                status: string;
                full_name: string;
                email: string;
                username: string;
                avatar_url: string | null;
            }>>(`/accounts/${selectedPocketId}/collaborators`).then((rows) => {
            setPocketCollaborators(rows);
            if (selectedPocket) {
                const owner = selectedPocket.ownerUserId ? [{
                    userId: selectedPocket.ownerUserId,
                    fullName: selectedPocket.ownerName || selectedPocket.name,
                    avatarUrl: selectedPocket.ownerAvatarUrl ?? null,
                    status: "accepted"
                }] : [];
                const invitedMembers = rows
                    .filter((member) => member.status !== "rejected" && member.user_id !== selectedPocket.ownerUserId)
                    .map((member) => ({
                    userId: member.user_id,
                    fullName: member.full_name,
                    avatarUrl: member.avatar_url,
                    status: member.status
                }));
                setPocketMemberPreviewMap((current) => ({
                    ...current,
                    [selectedPocketId]: [...owner, ...invitedMembers]
                }));
            }
            }).catch(() => undefined);
        }
        catch (err) {
            setInviteSuccess(err instanceof Error ? err.message : "Undangan gagal dikirim");
        }
        finally {
            setInviteSending(false);
        }
    };
    const removePocketMember = async (memberId: string, memberName: string) => {
        if (!selectedPocketId || selectedPocket?.ownerUserId !== currentUserId)
            return;
        const confirmation = language === "en"
            ? `Remove ${memberName} from this Pocket?`
            : `Hapus ${memberName} dari Pocket ini?`;
        if (!window.confirm(confirmation))
            return;
        setRemovingPocketMemberId(memberId);
        try {
            await request(`/accounts/${selectedPocketId}/collaborators/${memberId}`, { method: "DELETE" });
            const remaining = pocketCollaborators.filter((member) => member.user_id !== memberId);
            setPocketCollaborators(remaining);
            const ownerPreview = selectedPocket.ownerUserId ? [{
                userId: selectedPocket.ownerUserId,
                fullName: selectedPocket.ownerName || selectedPocket.name,
                avatarUrl: selectedPocket.ownerAvatarUrl ?? null,
                status: "accepted"
            }] : [];
            setPocketMemberPreviewMap((current) => ({
                ...current,
                [selectedPocketId]: [
                    ...ownerPreview,
                    ...remaining.filter((member) => member.status !== "rejected").map((member) => ({
                        userId: member.user_id,
                        fullName: member.full_name,
                        avatarUrl: member.avatar_url,
                        status: member.status
                    }))
                ]
            }));
            await onChanged();
        }
        finally {
            setRemovingPocketMemberId(null);
        }
    };
    const handlePocketInviteScan = async (rawValue: string | null) => {
        setScanQrOpen(false);
        setQrScannerError(null);
        const value = (rawValue ?? "").trim();
        if (!value) {
            setQrScannerError("Barcode tidak terbaca.");
            return;
        }
        setInviteQuery(value.replace(/^finance-ai:user:/i, ""));
        setInviteSearchLoading(true);
        try {
            const results = await request<Array<{
                id: string;
                fullName: string;
                username: string;
                email: string | null;
                avatarUrl: string | null;
                phone: string | null;
            }>>(`/users/search?q=${encodeURIComponent(value)}&purpose=pocket_invite`);
            const match = results[0] ?? null;
            setInviteSearchResults(match ? [match] : []);
            setInviteSelectedUser(match ? {
                id: match.id,
                fullName: match.fullName,
                username: match.username,
                email: match.email ?? "",
                avatarUrl: match.avatarUrl
            } : null);
            if (!match) {
                setQrScannerError("User tidak ditemukan. Pastikan barcode milik user yang valid.");
            }
        }
        catch (err) {
            setInviteSearchResults([]);
            setInviteSelectedUser(null);
            setQrScannerError(err instanceof Error ? err.message : "Barcode belum bisa diproses.");
        }
        finally {
            setInviteSearchLoading(false);
        }
    };
    useEffect(() => {
        if (accountView !== "account-form")
            return;
        const accountNumberParts = splitAccountNumberHolder(editingAccount?.accountNumber);
        const savedType = editingAccount?.accountType;
        setPocketNameDraft(editingAccount?.name ?? "");
        setPocketTypeDraft(savedType === "cash" || savedType === "bank" || savedType === "e_wallet" || savedType === "e_money" || savedType === "gold" ? savedType : "bank");
        setPocketInitialBalanceDraft(editingAccount ? moneyInputValue(editingAccount.initialBalance) : "");
        setPocketProviderDraft(editingAccount?.providerName ?? "");
        setPocketNumberDraft(accountNumberParts.number);
        setPocketHolderDraft(editingAccount?.accountHolderName ?? accountNumberParts.holder);
        setPocketGoldGramsDraft(editingAccount?.accountType === "gold" ? String(editingAccount.goldBalanceGrams ?? "").replace(".", ",") : "");
        setPocketGoldBuyPriceDraft(editingAccount?.accountType === "gold" ? moneyInputValue(editingAccount.goldBuyPricePerGram) : "");
        setPocketGoldSellPriceDraft(editingAccount?.accountType === "gold" ? moneyInputValue(editingAccount.goldSellPricePerGram) : "");
        // Gunakan logo dan background dari server jika tersedia, jika tidak gunakan localStorage atau default
        const visuals = loadPocketVisuals();
        const accountVisual = editingAccount?.logo ? { logo: editingAccount.logo, background: editingAccount.background } : visuals[editingAccount?.id ?? ""];
        setPocketLogoDraft(resolvePocketLogo(accountVisual?.logo, savedType || "bank"));
        setPocketBackgroundDraft(accountVisual?.background || "#16A34A");
        setShowPocketLogoMenu(false);
        setShowPocketStickerPicker(false);
    }, [accountView, editingAccount?.id, editingAccount?.accountNumber, editingAccount?.accountType, editingAccount?.initialBalance, editingAccount?.name, editingAccount?.providerName, editingAccount?.logo, editingAccount?.background, editingAccount?.goldBalanceGrams, editingAccount?.goldBuyPricePerGram, editingAccount?.goldSellPricePerGram]);
    const movePocket = (fromId: string, toId: string) => {
        if (!fromId || fromId === toId)
            return;
        setPocketOrder((current) => {
            const base = current.length ? current : accounts.map((account) => account.id);
            const next = [...base];
            const fromIndex = next.indexOf(fromId);
            const toIndex = next.indexOf(toId);
            if (fromIndex === -1 || toIndex === -1)
                return current;
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);
            pocketOrderRef.current = next;
            return next;
        });
    };
    const savePocketOrder = () => {
        const ownedIds = new Set(myPockets.map((account) => account.id));
        const accountIds = pocketOrderRef.current.filter((id) => ownedIds.has(id));
        if (!accountIds.length)
            return;
        request("/accounts/order", {
            method: "PUT",
            body: JSON.stringify({ accountIds })
        }).catch(() => onChanged());
    };
    const startPocketPointerDrag = (event: React.PointerEvent<HTMLElement>, pocketId: string) => {
        if (pocketTab !== "mine")
            return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        draggedPocketIdRef.current = pocketId;
        dragTargetPocketIdRef.current = pocketId;
        pocketDragMovedRef.current = false;
        setDraggingPocketId(pocketId);
        setDropTargetPocketId(null);
        suppressPocketClickRef.current = true;
    };
    const updatePocketPointerDrag = (event: React.PointerEvent<HTMLElement>) => {
        const draggedId = draggedPocketIdRef.current;
        if (!draggedId)
            return;
        event.preventDefault();
        event.stopPropagation();
        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-pocket-id]");
        const targetId = target?.dataset.pocketId;
        if (!targetId || targetId === dragTargetPocketIdRef.current)
            return;
        movePocket(draggedId, targetId);
        pocketDragMovedRef.current = true;
        dragTargetPocketIdRef.current = targetId;
        setDropTargetPocketId(targetId);
    };
    const finishPocketPointerDrag = (event: React.PointerEvent<HTMLElement>) => {
        if (!draggedPocketIdRef.current)
            return;
        event.preventDefault();
        event.stopPropagation();
        if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        const shouldSave = pocketDragMovedRef.current;
        draggedPocketIdRef.current = null;
        dragTargetPocketIdRef.current = null;
        pocketDragMovedRef.current = false;
        setDraggingPocketId(null);
        setDropTargetPocketId(null);
        if (shouldSave)
            savePocketOrder();
        window.setTimeout(() => {
            suppressPocketClickRef.current = false;
        }, 0);
    };
    useEffect(() => {
        if (!spendableAccounts.length || !receivableAccounts.length) {
            setSourceAccountId("");
            setDestinationAccountId("");
            return;
        }
        setSourceAccountId((current) => spendableAccounts.some((account) => account.id === current) ? current : spendableAccounts[0].id);
        setDestinationAccountId((current) => {
            if (receivableAccounts.some((account) => account.id === current && account.id !== sourceAccountId))
                return current;
            return receivableAccounts.find((account) => account.id !== sourceAccountId)?.id ?? receivableAccounts[0].id;
        });
    }, [receivableAccounts, sourceAccountId, spendableAccounts]);
    const uploadTransferAttachment = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        setTransferAttachmentLoading(true);
        setTransferAttachmentName(file.name);
        setTransferAttachmentMessage("Mengunggah attachment...");
        setError(null);
        try {
            const uploadForm = new FormData();
            uploadForm.set("receipt", file);
            const uploaded = await request<{
                id: string;
            }>("/receipts/upload", { method: "POST", body: uploadForm });
            setTransferAttachmentId(uploaded.id);
            setTransferAttachmentMessage("Attachment berhasil diunggah.");
        }
        catch {
            setTransferAttachmentId(null);
            setTransferAttachmentMessage("Attachment gagal diunggah. Pastikan file berupa gambar atau video.");
        }
        finally {
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
        const goldGrams = decimalValue(pocketGoldGramsDraft);
        const goldBuyPrice = moneyValue(pocketGoldBuyPriceDraft);
        const goldSellPrice = moneyValue(pocketGoldSellPriceDraft);
        const goldInitialBalance = Math.round(goldGrams * goldSellPrice);
        try {
            const payload = {
                name: pocketNameDraft.trim(),
                accountType: selectedPocketType === "e_money" ? "other" : selectedPocketType,
                initialBalance: selectedPocketType === "gold" ? String(goldInitialBalance) : String(form.get("initialBalance") || pocketInitialBalanceDraft),
                currency: "IDR",
                providerName: selectedPocketType === "cash" ? null : pocketProviderDraft.trim() || null,
                accountNumber: selectedPocketType === "cash" || selectedPocketType === "gold" ? null : accountNumber || null,
                accountHolderName: selectedPocketType === "cash" || selectedPocketType === "e_money" || selectedPocketType === "gold" ? null : accountHolderName || null,
                goldBalanceGrams: selectedPocketType === "gold" ? String(goldGrams) : null,
                goldBuyPricePerGram: selectedPocketType === "gold" ? String(goldBuyPrice) : null,
                goldSellPricePerGram: selectedPocketType === "gold" ? String(goldSellPrice) : null,
                goldPriceUpdatedAt: selectedPocketType === "gold" ? new Date().toISOString() : null,
                allowNegative: false,
                logo: pocketLogoDraft || null,
                background: pocketBackgroundDraft || null
            };
            const saved = await request<{
                id: string;
            }>(editingAccount ? `/accounts/${editingAccount.id}` : "/accounts", {
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
            const returnToDetail = Boolean(editingAccount && pocketId);
            setEditingAccount(null);
            if (returnToDetail) {
                setSelectedPocketId(pocketId);
                setAccountView("pocket-detail");
            }
            else {
                setAccountView("list");
            }
            onChanged().catch(() => setError("Pocket berhasil disimpan, tetapi data terbaru belum dapat dimuat."));
        }
        catch {
            setError(null);
        }
    };
    const handlePocketImage = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        event.target.value = "";
        setError(null);
        const isHeic = /\.hei[cf]$/i.test(file.name) || /image\/hei[cf]/i.test(file.type);
        if (!file.type.startsWith("image/") && !isHeic) {
            setError("File logo harus berupa gambar.");
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError("Ukuran gambar maksimal 10 MB.");
            return;
        }
        try {
            let readableFile: Blob = file;
            if (isHeic) {
                const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
                readableFile = Array.isArray(converted) ? converted[0] : converted;
            }
            const source = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => typeof reader.result === "string"
                    ? resolve(reader.result)
                    : reject(new Error("Gambar tidak dapat dibaca."));
                reader.onerror = () => reject(reader.error ?? new Error("Gambar tidak dapat dibaca."));
                reader.readAsDataURL(readableFile);
            });
            const image = await new Promise<HTMLImageElement>((resolve, reject) => {
                const nextImage = new Image();
                nextImage.onload = () => resolve(nextImage);
                nextImage.onerror = () => reject(new Error("Format gambar tidak didukung."));
                nextImage.src = source;
            });
            const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
            canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
            const context = canvas.getContext("2d");
            if (!context)
                throw new Error("Gambar tidak dapat diproses.");
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            setPocketLogoDraft(canvas.toDataURL("image/webp", 0.82));
            setShowPocketLogoMenu(false);
        }
        catch (error) {
            setError(error instanceof Error ? error.message : "Gambar gagal dipilih.");
        }
    };
    const resetAccount = async (form: HTMLFormElement) => {
        if (!editingAccount)
            return;
        const formData = new FormData(form);
        const initialBalance = String(formData.get("initialBalance") || "0");
        const confirmed = window.confirm(`Reset pocket ${editingAccount.name}?\n\nSemua transaksi dan transfer terkait pocket ini akan dihapus permanen. Saldo pocket akan dimulai lagi dari saldo awal yang tertera.`);
        if (!confirmed)
            return;
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
        }
        catch {
            setError(null);
        }
        finally {
            setResettingAccount(false);
        }
    };
    const transfer = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        const formElement = event.currentTarget;
        if (!sourceAccountId || !destinationAccountId) {
            setError(language === "en" ? "Choose source and destination Pocket first." : "Pilih pocket asal dan tujuan terlebih dahulu.");
            return;
        }
        if (sourceAccountId === destinationAccountId) {
            setError(language === "en" ? "Source and destination Pocket must be different." : "Pocket asal dan tujuan harus berbeda.");
            return;
        }
        if (!transferDraft.amount.trim()) {
            setError(language === "en" ? "Amount is required." : "Nominal wajib diisi.");
            return;
        }
        if (!transferDraft.transferDate) {
            setError(language === "en" ? "Transfer date is required." : "Tanggal transfer wajib diisi.");
            return;
        }
        try {
            await request("/transfers", {
                method: "POST",
                body: JSON.stringify({
                    sourceAccountId,
                    destinationAccountId,
                    amount: transferDraft.amount,
                    feeAmount: transferDraft.feeAmount || "0",
                    transferDate: transactionDateIso(transferDraft.transferDate),
                    notes: transferDraft.notes.trim() || null,
                    receiptId: transferAttachmentId
                })
            });
            formElement.reset();
            setTransferAttachmentId(null);
            setTransferAttachmentName("");
            setTransferAttachmentMessage(null);
            setTransferText("");
            setTransferDraft({ amount: "", feeAmount: "", transferDate: isoDateInput(), notes: "" });
            setAccountView(transferMode !== "general" && selectedPocketId ? "pocket-detail" : "list");
            onChanged().catch(() => setError("Transfer berhasil disimpan, tetapi data terbaru belum dapat dimuat."));
        }
        catch (err) {
            setError(err instanceof Error ? err.message : (language === "en" ? "Transfer could not be saved." : "Transfer belum bisa disimpan."));
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
                const multiplier = ["jt", "juta", "mio", "m"].includes(suffix) ? 1000000 : ["rb", "ribu", "k"].includes(suffix) ? 1000 : 1;
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
                if (!cleaned)
                    return undefined;
                return spendableAccounts.find((account) => {
                    if (account.id === exceptId)
                        return false;
                    return accountTokens(account).some((token) => cleaned.includes(token));
                });
            };
            const directionMatch = lower.match(/(?:transfer|kirim|pindah|tarik)?\s*(?:dari\s+)?(.+?)\s+(?:ke|to)\s+(.+?)(?=\s+(?:rp|\d|fee|admin|biaya)|$)/i);
            const fromToMatch = lower.match(/(?:dari|from)\s+(.+?)\s+(?:ke|to)\s+(.+?)(?=\s+(?:rp|\d|fee|admin|biaya)|$)/i);
            const sourceSegment = fromToMatch?.[1] ?? directionMatch?.[1] ?? "";
            const destinationSegment = fromToMatch?.[2] ?? directionMatch?.[2] ?? "";
            const source = sourceSegment
                ? findAccountInSegment(sourceSegment)
                : spendableAccounts.find((account) => accountTokens(account).some((token) => lower.includes(token)));
            const destination = destinationSegment
                ? findAccountInSegment(destinationSegment, source?.id)
                : receivableAccounts.find((account) => account.id !== source?.id && accountTokens(account).some((token) => lower.includes(token)));
            const nextSourceId = source?.id ?? sourceAccountId;
            const nextDestinationId = destination?.id && destination.id !== nextSourceId ? destination.id : destinationAccountId;
            if (nextSourceId)
                setSourceAccountId(nextSourceId);
            if (nextDestinationId && nextDestinationId !== nextSourceId)
                setDestinationAccountId(nextDestinationId);
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
        }
        finally {
            setTransferParseLoading(false);
            window.setTimeout(() => setTransferAnalysisStep(-1), 350);
        }
    };
    return (<div className="space-y-3">
      {accountView === "list" && (<section className="space-y-3">
          <div className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-2xl lg:border-slate-200">
            <SectionHeader title="Pocket" caption={pocketTab === "mine" ? `${myPockets.length} pocket pribadi` : `${sharedPockets.length} shared pocket`} action={(<div className="flex items-center gap-2">
                  <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-100 bg-white text-[#16A34A] shadow-sm" onClick={() => onOpenTransactions("")} aria-label="View all transactions" title="View all transactions">
                    <ReceiptText size={15}/>
                  </button>
                  {pocketTab === "mine" && !readOnly && (<button type="button" className="inline-flex items-center gap-1 rounded-full bg-[#16A34A] px-3 py-1.5 text-xs font-semibold text-white" onClick={() => {
                setError(null);
                setEditingAccount(null);
                setAccountView("account-form");
            }}>
                      <Plus size={14}/> Add Pocket
                    </button>)}
                </div>)}/>
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#F8FAFC] p-1">
              {[
                { id: "mine" as const, label: "My Pockets", total: myPocketTotal },
                { id: "shared" as const, label: "Shared with me", total: sharedPocketTotal }
            ].map((item) => {
              const pendingCount = item.id === "mine" ? myPocketPendingInvites : sharedPocketPendingInvites;
              return (<button key={item.id} type="button" className={`relative rounded-xl px-3 py-2 text-left transition ${pocketTab === item.id ? "bg-white text-[#16A34A] shadow-sm" : "text-slate-500"}`} onClick={() => setPocketTab(item.id)}>
                  <span className="flex items-center gap-1.5"><span className="text-xs font-semibold">{item.label}</span>
                  {pendingCount > 0 && (<span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#16A34A] px-1 text-[10px] font-bold leading-none text-white">{pendingCount}</span>)}</span>
                  <span className="mt-0.5 block text-[11px] font-semibold">{rupiah(item.total)}</span>
                </button>);
            })}
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
              <Search size={16} className="text-slate-400"/>
              <input className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-slate-400" value={pocketSearch} onChange={(event) => setPocketSearch(event.target.value)} placeholder="Search pocket"/>
              {pocketSearch && (<button type="button" className="text-slate-400" onClick={() => setPocketSearch("")}>
                  <X size={15}/>
                </button>)}
            </div>
          </div>

          {visiblePockets.length === 0 ? (<EmptyState text={pocketTab === "mine" ? "Belum ada pocket. Tambahkan pocket pertama Anda." : "Belum ada pocket yang dibagikan ke Anda."}/>) : (<div className="grid grid-cols-3 gap-2">
              {visiblePockets.map((account) => {
                    if (account.collaborationStatus === "pending") {
                        return (<article key={account.id} className="col-span-3 rounded-[20px] border border-amber-200 bg-amber-50/70 p-3 shadow-sm">
                          <div className="flex items-start gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-600"><UserPlus size={19}/></span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-950">{account.name}</p>
                              <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{language === "en" ? `${account.ownerName ?? "The owner"} invited you to this Pocket.` : `${account.ownerName ?? "Owner"} mengundang Anda ke Pocket ini.`}</p>
                              <p className="mt-1 text-[10px] font-semibold text-amber-700">{account.collaboratorRole === "viewer" ? (language === "en" ? "Can save only" : "Hanya bisa menabung") : (language === "en" ? "Can spend money" : "Bisa menggunakan saldo")}</p>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button type="button" className="btn-secondary w-full" onClick={() => respondPocketInvite(account.id, "rejected").catch((err) => setError(err instanceof Error ? err.message : "Undangan gagal ditolak"))}>{language === "en" ? "Decline" : "Tolak"}</button>
                            <button type="button" className="btn-primary w-full" onClick={() => respondPocketInvite(account.id, "accepted").catch((err) => setError(err instanceof Error ? err.message : "Undangan gagal diterima"))}>{language === "en" ? "Accept" : "Terima"}</button>
                          </div>
                        </article>);
                    }
                    const AccountIcon = accountTypeIcon(account.accountType);
                    const sharedLabel = accountSharedLabel(account, language);
                    const memberPreview = pocketMemberPreviewMap[account.id] ?? [];
                    const hasMultipleMembers = memberPreview.length > 1;
                    // Ambil visual dari server, localStorage, atau gunakan warna default hijau
                    const visuals = loadPocketVisuals();
                    const accountVisual = account.logo ? { logo: account.logo, background: account.background } : visuals[account.id];
                    const cardBackground = accountVisual?.background || "#16A34A";
                    const cardLogo = resolvePocketLogo(accountVisual?.logo, account.accountType);
                    const isDraggingThisPocket = draggingPocketId === account.id;
                    return (<button key={account.id} data-pocket-id={account.id} type="button" className={`ripple-card min-h-[100px] overflow-hidden rounded-xl p-3 text-left text-white lg:rounded-2xl ${isDraggingThisPocket ? "z-20 ring-2 ring-white/90" : "active:scale-[0.99]"} ${dropTargetPocketId === account.id ? "ring-2 ring-emerald-300 ring-offset-2" : ""}`} style={{
                            background: `linear-gradient(135deg, ${cardBackground}, #064E3B)`,
                            transform: isDraggingThisPocket ? "translate3d(0, -12px, 0) scale(1.08) rotate(1.5deg)" : "translate3d(0, 0, 0) scale(1) rotate(0deg)",
                            boxShadow: isDraggingThisPocket ? "0 24px 42px rgba(15, 23, 42, 0.34)" : "0 10px 20px rgba(15, 23, 42, 0.16)",
                            opacity: isDraggingThisPocket ? 0.92 : 1,
                            transition: "transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 180ms ease, opacity 180ms ease",
                            willChange: isDraggingThisPocket ? "transform" : undefined
                        }} onClick={() => {
                            if (suppressPocketClickRef.current)
                                return;
                            setSelectedPocketId(account.id);
                            setTargetBalanceDraft("");
                            setInviteQuery("");
                            setPocketTransactionSearch("");
                            setPocketTransactionType("all");
                            setPocketTransactionDatePreset("all");
                            setPocketTransactionCustomStart("");
                            setPocketTransactionCustomEnd("");
                            setPocketTransactionSort("newest");
                            setAccountView("pocket-detail");
                        }}>
                    <div className="absolute right-[-28px] top-[-28px] h-24 w-24 rounded-full bg-white/15"/>
                    <div className="relative z-10">
                      <div className="flex items-start justify-between gap-2">
                        <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl bg-white/18 text-lg ring-1 ring-white/25 backdrop-blur">
                          {cardLogo.startsWith("data:") ? (<img src={cardLogo} alt="" className="h-full w-full object-cover"/>) : (<span className="text-lg">{cardLogo}</span>)}
                        </span>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`flex h-8 w-8 items-center justify-center rounded-full text-white backdrop-blur transition-all duration-150 ${pocketTab === "mine" ? "cursor-grab touch-none select-none active:cursor-grabbing" : ""} ${isDraggingThisPocket ? "scale-110 bg-white/30 shadow-md" : "bg-white/14 text-white/80"}`} role={pocketTab === "mine" ? "button" : undefined} aria-label={pocketTab === "mine" ? (language === "en" ? "Drag to reorder pocket" : "Tarik untuk mengurutkan pocket") : undefined} onPointerDown={(event) => startPocketPointerDrag(event, account.id)} onPointerMove={updatePocketPointerDrag} onPointerUp={finishPocketPointerDrag} onPointerCancel={finishPocketPointerDrag}>
                            {pocketTab === "mine" ? <GripVertical className={isDraggingThisPocket ? "animate-pulse" : ""} size={17}/> : <span className="px-2 text-[9px] font-semibold">Shared</span>}
                          </span>
                        </div>
                      </div>
                      <div className="mt-0.5">
                        <p className="truncate text-base font-semibold">{account.name}</p>
                        <p className="mt-0.5 text-[10px] font-medium text-white/70">{accountTypeLabel(account.accountType)}{account.providerName ? ` \u00B7 ${account.providerName}` : ""}</p>
                        <p className="mt-3 text-[10px] font-medium text-white/70">{account.accountType === "gold" ? "Nilai jual saat ini" : "Saldo saat ini"}</p>
                        <p className="mt-0.5 text-lg font-semibold">{rupiah(account.currentBalance)}</p>
                        {account.accountType === "gold" && <p className="mt-0.5 text-[10px] font-semibold text-white/75">{formatGoldGrams(account.goldBalanceGrams)}</p>}
                      </div>
                      {hasMultipleMembers && (<button type="button" className="absolute bottom-0 right-0 inline-flex items-center rounded-full bg-black/15 px-1.5 py-1 backdrop-blur transition hover:bg-black/20 active:scale-[0.98]" aria-label={language === "en" ? "View Pocket users" : "Lihat pengguna Pocket"} onClick={(event) => {
                                event.stopPropagation();
                                setSelectedPocketId(account.id);
                                setAccountView("pocket-detail");
                                setShowPocketMembersPopup(true);
                            }}>
                          <span className="flex items-center -space-x-1.5">
                            {memberPreview.slice(0, 2).map((member) => (<span key={member.userId} title={member.fullName} className="relative flex h-5 w-5 items-center justify-center rounded-full border border-white/80 bg-emerald-50 text-[8px] font-semibold text-[#16A34A] shadow-sm">
                                <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full">
                                  {member.avatarUrl ? <img src={member.avatarUrl} alt="" className="h-full w-full object-cover"/> : member.fullName.slice(0, 1).toUpperCase()}
                                </span>
                                {member.status === "pending" && <span className="absolute -bottom-1 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full border border-white bg-amber-400 text-[6px] font-bold leading-none text-amber-950 shadow-sm">P</span>}
                              </span>))}
                          </span>
                          <span className="ml-1.5 text-[8px] font-semibold text-white/90">{memberPreview.length}</span>
                        </button>)}
                    </div>
                  </button>);
                })}
            </div>)}
        </section>)}

      {accountView === "pocket-detail" && selectedPocket && (<section className="space-y-3">
          <div className="relative overflow-hidden rounded-[26px] p-4 text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${selectedPocket.background || loadPocketVisuals()[selectedPocket.id]?.background || "#16A34A"}, #064E3B)` }}>
            <div className="absolute right-[-38px] top-[-38px] h-32 w-32 rounded-full bg-white/15"/>
            <div className="relative z-10 flex items-start justify-between gap-3">
              <button type="button" className="app-back-button app-back-button-on-dark" onClick={() => setAccountView("list")}>
                <ArrowLeft size={14}/> Kembali
              </button>
              <div className="flex items-center gap-2">
                {selectedPocket.canEdit !== false && !readOnly && (<button type="button" className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/14 text-white/90 backdrop-blur" onClick={() => {
                    setShowPocketInviteModal(true);
                }} aria-label={language === "en" ? "Invite user" : "Undang user"} title={language === "en" ? "Invite user" : "Undang user"}>
                    <UserPlus size={15}/>
                    {(() => {
                      const preview = pocketMemberPreviewMap[selectedPocketId] ?? [];
                      const pendingCount = preview.filter(m => m.status === "pending").length;
                      return pendingCount > 0 ? (<span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm">{pendingCount}</span>) : null;
                    })()}
                  </button>)}
                {selectedPocket.canEdit !== false && !readOnly && (<button type="button" className="inline-flex h-9 items-center justify-center gap-1 rounded-full bg-white/14 px-3 text-xs font-semibold text-white/90 backdrop-blur" onClick={() => {
                    setEditingAccount(selectedPocket);
                    setAccountView("account-form");
                }}>
                    <Settings size={13}/> Edit
                  </button>)}
              </div>
            </div>
            <div className="relative z-10 mt-4 flex items-start gap-3">
              {(() => {
                const visuals = loadPocketVisuals();
                const accountVisual = selectedPocket.logo ? { logo: selectedPocket.logo, background: selectedPocket.background } : visuals[selectedPocket.id];
                const cardLogo = resolvePocketLogo(accountVisual?.logo, selectedPocket.accountType);
                return (<>
                    <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white/18 ring-1 ring-white/25 backdrop-blur">
                      {cardLogo.startsWith("data:") ? (<img src={cardLogo} alt="" className="h-full w-full object-cover"/>) : (<span className="flex h-full w-full items-center justify-center text-[36px] leading-none">{cardLogo}</span>)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xl font-semibold text-white">{selectedPocket.name}</p>
                      <p className="mt-1 text-3xl font-semibold text-white">{rupiah(selectedPocket.currentBalance)}</p>
                      {selectedPocket.accountType === "gold" && <p className="mt-1 text-sm font-semibold text-white/85">{formatGoldGrams(selectedPocket.goldBalanceGrams)} · jual {rupiah(selectedPocket.goldSellPricePerGram)}/gr</p>}
                      <p className="mt-1 text-xs text-white/75">
                        {[accountTypeLabel(selectedPocket.accountType), selectedPocket.providerName, cleanPocketMetadata(selectedPocket.accountNumber)].filter(Boolean).join(" \u00B7 ")}
                      </p>
                    </div>
                  </>);
            })()}
            </div>
            {pocketMembers.length > 1 && (<div className="relative z-10 mt-4 flex items-center justify-between gap-3">
                <div className="flex items-center -space-x-2">
                  {pocketMembers.slice(0, 4).map((member) => (<button key={member.userId} type="button" className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-emerald-50 text-[11px] font-semibold text-[#16A34A]" onClick={() => setShowPocketMembersPopup(true)}>
                      <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full">
                        {member.avatarUrl ? <img src={member.avatarUrl} alt="" className="h-full w-full object-cover"/> : member.fullName.slice(0, 1).toUpperCase()}
                      </span>
                      {member.status === "pending" && <span className="absolute -bottom-1 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-amber-400 text-[8px] font-bold leading-none text-amber-950 shadow-sm">P</span>}
                    </button>))}
                  {pocketMembers.length > 4 && (<button type="button" className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-white text-[10px] font-semibold text-slate-700" onClick={() => setShowPocketMembersPopup(true)}>
                      +{pocketMembers.length - 4}
                    </button>)}
                </div>
                <button type="button" className="rounded-full bg-white/14 px-3 py-1.5 text-[11px] font-semibold text-white/90 backdrop-blur" onClick={() => setShowPocketMembersPopup(true)}>
                  {pocketMembers.length} user
                </button>
              </div>)}
          </div>

          {showPocketMembersPopup && (<>
              <button type="button" data-scroll-lock="true" className="fixed inset-0 z-40 cursor-default bg-slate-950/25 backdrop-blur-[1px]" aria-label={language === "en" ? "Close Pocket users" : "Tutup pengguna Pocket"} onClick={() => setShowPocketMembersPopup(false)}/>
              <section className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-md rounded-[26px] border border-slate-100 bg-white p-4 text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.22)] lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">Pengguna Pocket</h2>
                    <p className="mt-1 text-xs text-slate-500">{pocketMembers.length} {language === "en" ? "users have access to this Pocket." : "user memiliki akses ke Pocket ini."}</p>
                  </div>
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50" onClick={() => setShowPocketMembersPopup(false)}>
                    <X size={17}/>
                  </button>
                </div>
                <div className="mt-4 max-h-[52vh] space-y-2 overflow-y-auto overscroll-contain">
                  {pocketMembers.map((member) => {
                    const isOwner = member.role === "owner" || member.userId === selectedPocket.ownerUserId;
                    const canRemove = selectedPocket.ownerUserId === currentUserId && !isOwner;
                    const roleLabel = isOwner
                        ? "Owner Pocket"
                        : member.status === "pending"
                            ? "Menunggu konfirmasi"
                            : member.role === "viewer"
                                ? (language === "en" ? "Can save only" : "Hanya bisa nabung")
                                : (language === "en" ? "Can spend money" : "Bisa spend uang");
                    return (<div key={member.userId} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
                        {member.avatarUrl ? <img src={member.avatarUrl} alt="" className="h-11 w-11 rounded-2xl object-cover"/> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-[#16A34A] shadow-sm">{member.fullName.slice(0, 1).toUpperCase()}</span>}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-950">{member.fullName}</p>
                          {member.username && <p className="truncate text-[11px] text-slate-500">@{member.username}</p>}
                          <p className={`mt-0.5 text-[11px] font-medium ${member.status === "pending" ? "text-amber-600" : "text-[#16A34A]"}`}>{roleLabel}</p>
                        </div>
                        {canRemove && (<button type="button" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:opacity-50" aria-label={language === "en" ? `Remove ${member.fullName}` : `Hapus ${member.fullName}`} disabled={removingPocketMemberId === member.userId} onClick={() => removePocketMember(member.userId, member.fullName)}>
                            {removingPocketMemberId === member.userId ? <Loader2 size={16} className="animate-spin"/> : <Trash2 size={16}/>} 
                          </button>)}
                      </div>);
                })}
                </div>
              </section>
            </>)}

          {!readOnly && <div className={`grid gap-2 ${selectedPocketCanSpend ? "grid-cols-3" : "grid-cols-2"}`}>
            {selectedPocketCanSpend && (<button type="button" className="rounded-[20px] bg-white p-3 text-left shadow-soft transition active:scale-[0.99]" disabled={receivableAccounts.filter((account) => account.id !== selectedPocket.id).length < 1} onClick={() => {
                setTransferMode("out");
                setSourceAccountId(selectedPocket.id);
                setDestinationAccountId(receivableAccounts.find((account) => account.id !== selectedPocket.id)?.id ?? "");
                setAccountView("transfer-form");
            }}>
              <ArrowUpRight className="text-rose-600" size={18}/>
              <p className="mt-2 text-sm font-semibold">{language === "en" ? "Transfer out" : "Transfer keluar"}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">{language === "en" ? "Send to another pocket" : "Kirim ke pocket lain"}</p>
            </button>)}
            <button type="button" className="rounded-[20px] bg-white p-3 text-left shadow-soft transition active:scale-[0.99]" disabled={spendableAccounts.filter((account) => account.id !== selectedPocket.id).length < 1} onClick={() => {
                setTransferMode("in");
                setDestinationAccountId(selectedPocket.id);
                setSourceAccountId(spendableAccounts.find((account) => account.id !== selectedPocket.id)?.id ?? "");
                setAccountView("transfer-form");
            }}>
              <ArrowDownLeft className="text-[#16A34A]" size={18}/>
              <p className="mt-2 text-sm font-semibold">{selectedPocketCanSpend ? (language === "en" ? "Transfer in" : "Transfer masuk") : (language === "en" ? "Save to Pocket" : "Nabung ke Pocket")}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">{selectedPocketCanSpend ? (language === "en" ? "Receive from another pocket" : "Terima dari pocket lain") : (language === "en" ? "Deposit from your Pocket" : "Setor dari pocket milik Anda")}</p>
            </button>
            {selectedPocketCanSpend && (<button type="button" className="rounded-[20px] bg-white p-3 text-left shadow-soft transition active:scale-[0.99]" onClick={() => onAddTransaction?.(selectedPocket.id)}>
              <ShoppingBag className="text-sky-700" size={18}/>
              <p className="mt-2 text-sm font-semibold">{language === "en" ? "New transaction" : "Transaksi baru"}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">{language === "en" ? "Buy, pay, receive money" : "Beli, bayar, atau terima uang"}</p>
            </button>)}
            {selectedPocketCanSpend && (<button type="button" className="rounded-[20px] bg-white p-3 text-left shadow-soft transition active:scale-[0.99]" onClick={openMutationImportModal}>
              <FileSpreadsheet className="text-emerald-700" size={18}/>
              <p className="mt-2 text-sm font-semibold">{language === "en" ? "Import statement" : "Import mutasi"}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">{language === "en" ? "CSV, XLSX, PDF, or paste text" : "CSV, XLSX, PDF, atau paste teks"}</p>
            </button>)}
            {/* Tampilkan set target balance hanya jika pocket belum memiliki target balance */}
            {selectedPocket.canEdit !== false && !readOnly && !selectedPocket.targetBalance && !targetDetails?.targetBalance && (<button type="button" className="rounded-[20px] bg-white p-3 text-left shadow-soft transition active:scale-[0.99]" onClick={openTargetBalanceModal}>
                <TrendingUp className="text-violet-700" size={18}/>
                <p className="mt-2 text-sm font-semibold">{language === "en" ? "Set financial goal" : "Atur target keuangan"}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{language === "en" ? "Plan deposits and timeline" : "Rencanakan setoran dan timeline"}</p>
              </button>)}
            <button type="button" className="rounded-[20px] bg-white p-3 text-left shadow-soft transition active:scale-[0.99]" onClick={openAutoBudgetModal}>
                <Settings className="text-amber-600" size={18}/>
                <p className="mt-2 text-sm font-semibold">{autoBudgetRule ? (language === "en" ? "Edit auto budgeting" : "Edit auto budgeting") : (language === "en" ? "Set auto budgeting" : "Atur auto budgeting")}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{autoBudgetRule ? `${rupiah(autoBudgetRule.amount)} · ${autoBudgetRule.frequency}` : (language === "en" ? "Your personal automation" : "Otomatisasi pribadi Anda")}</p>
              </button>
          </div>

          {targetDetails?.targetBalance && (() => {
            const targetAmount = moneyValue(targetDetails.targetBalance);
            const currentAmount = moneyValue(selectedPocket.currentBalance);
            const progress = targetAmount > 0 ? Math.min(100, Math.max(0, currentAmount / targetAmount * 100)) : 0;
            const remaining = Math.max(0, targetAmount - currentAmount);
            const projectionCopy = targetDetails.projection?.status === "completed"
                ? (language === "en" ? "Goal reached" : "Target tercapai")
                : targetDetails.projection?.status === "late"
                    ? (language === "en" ? "Projected late" : "Proyeksi terlambat")
                    : targetDetails.projection?.status === "faster"
                        ? (language === "en" ? "Projected faster" : "Proyeksi lebih cepat")
                        : targetDetails.projection?.status === "on_track"
                            ? (language === "en" ? "On track" : "Sesuai target")
                            : (language === "en" ? "Needs auto-transfer plan" : "Butuh rencana auto-transfer");
            return (<section className="overflow-hidden rounded-[26px] border border-emerald-100 bg-white shadow-soft lg:rounded-2xl">
                <div className="relative min-h-28 bg-gradient-to-br from-emerald-600 via-teal-600 to-slate-900 p-4 text-white">
                  {targetDetails.goalImageUrl ? <img src={targetDetails.goalImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45"/> : null}
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-950/55 to-transparent"/>
                  <div className="relative z-10 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">{language === "en" ? "Financial goal" : "Target keuangan"}</p>
                      <h3 className="mt-1 truncate text-lg font-semibold text-white">{targetDetails.targetName || (language === "en" ? "Financial goal" : "Target keuangan")}</h3>
                      <p className="mt-1 text-xs text-white/75">{language === "en" ? "Target date" : "Target tanggal"}: {localDate(targetDetails.targetDate)}</p>
                    </div>
                    {selectedPocket.canEdit !== false && !readOnly && (<button type="button" className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold text-white backdrop-blur" onClick={openTargetBalanceModal}>
                      <Settings size={14}/> {language === "en" ? "Edit" : "Edit"}
                    </button>)}
                  </div>
                </div>
                <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] text-slate-500">{language === "en" ? "Target amount" : "Target nominal"}</p>
                    <h3 className="mt-0.5 text-xl font-semibold text-slate-950">{rupiah(targetAmount)}</h3>
                  </div>
                  <div className="text-right"><p className="text-[11px] text-slate-500">{projectionCopy}</p><p className="mt-0.5 text-xs font-semibold text-[#16A34A]">{targetDetails.projection?.projectedDate ? localDate(targetDetails.projection.projectedDate) : "-"}</p></div>
                </div>
                <div className="mt-4">
                  <div className="mb-2 flex items-end justify-between gap-3">
                    <div><p className="text-[11px] text-slate-500">{language === "en" ? "Saved balance" : "Saldo terkumpul"}</p><p className="mt-0.5 text-sm font-semibold text-slate-950">{rupiah(currentAmount)}</p></div>
                    <p className="text-right text-xs font-semibold text-[#16A34A]">{Math.round(progress)}%</p>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-emerald-50"><div className="h-full rounded-full bg-[#16A34A] transition-all" style={{ width: `${progress}%` }}/></div>
                  <p className="mt-2 text-[11px] text-slate-500">{remaining > 0 ? (language === "en" ? `${rupiah(remaining)} remaining to reach this goal.` : `Kurang ${rupiah(remaining)} untuk mencapai target.`) : (language === "en" ? "This goal has been reached." : "Target sudah tercapai.")}</p>
                </div>
                {targetDetails.recommendations && (<div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-emerald-50 p-3"><p className="text-[10px] font-semibold text-[#16A34A]">{language === "en" ? "Weekly deposit" : "Setoran mingguan"}</p><p className="mt-1 text-sm font-semibold text-slate-950">{rupiah(targetDetails.recommendations.weeklyDeposit)}</p></div>
                  <div className="rounded-2xl bg-sky-50 p-3"><p className="text-[10px] font-semibold text-sky-700">{language === "en" ? "Monthly deposit" : "Setoran bulanan"}</p><p className="mt-1 text-sm font-semibold text-slate-950">{rupiah(targetDetails.recommendations.monthlyDeposit)}</p></div>
                </div>)}
                {targetDetails.milestones.length > 0 && (<div className="mt-4">
                  <p className="mb-2 text-xs font-semibold text-slate-900">Milestone</p>
                  <div className="grid grid-cols-4 gap-2">{targetDetails.milestones.map((milestone) => <div key={milestone.percent} className={`rounded-2xl border p-2 text-center ${milestone.reached ? "border-emerald-100 bg-emerald-50 text-[#16A34A]" : "border-slate-100 bg-slate-50 text-slate-400"}`}><p className="text-xs font-bold">{milestone.percent}%</p><p className="mt-1 truncate text-[9px]">{milestone.reachedAt ? localDate(milestone.reachedAt) : rupiah(milestone.amount)}</p></div>)}</div>
                </div>)}
                {targetDetails.autoTransfers.length > 0 && (<div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">
                  <p className="text-xs font-semibold text-slate-900">{language === "en" ? "Active auto-transfer" : "Auto-transfer aktif"}</p>
                  <div className="mt-2 space-y-2">{targetDetails.autoTransfers.map((rule) => <div key={rule.id} className="flex items-center justify-between gap-3 text-xs"><span className="min-w-0 truncate text-slate-600">{rule.userFullName} · {rule.sourceAccountName}</span><span className="shrink-0 font-semibold text-[#16A34A]">{rupiah(rule.amount)} / {rule.frequency}</span></div>)}</div>
                </div>)}
                {targetDetails.contributions.length > 1 && (<div className="mt-4 border-t border-slate-100 pt-4">
                  <div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold text-slate-900">{language === "en" ? "Member contributions" : "Kontribusi anggota"}</p><span className="text-[10px] text-slate-400">{language === "en" ? "Net contribution" : "Kontribusi bersih"}</span></div>
                  <div className="space-y-2">
                    {targetDetails.contributions.map((member) => {
                    const memberAmount = moneyValue(member.amount);
                    const contributionPercent = targetAmount > 0 ? memberAmount / targetAmount * 100 : 0;
                    return (<div key={member.userId} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2.5">
                        {member.avatarUrl ? <img src={member.avatarUrl} alt="" className="h-9 w-9 rounded-xl object-cover"/> : <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-xs font-semibold text-[#16A34A]">{member.fullName.slice(0, 1).toUpperCase()}</span>}
                        <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-900">{member.fullName}</p><p className="truncate text-[10px] text-slate-500">{member.role === "owner" ? "Owner" : `@${member.username}`}</p></div>
                        <div className="shrink-0 text-right"><p className={`text-xs font-semibold ${memberAmount < 0 ? "text-rose-600" : "text-[#16A34A]"}`}>{rupiah(member.amount)}</p><p className={`mt-0.5 text-[10px] font-semibold ${contributionPercent < 0 ? "text-rose-500" : "text-slate-500"}`}>{Math.round(contributionPercent)}%</p></div>
                      </div>);
                })}
                  </div>
                </div>)}
                {targetDetails.progressHistory.length > 0 && (<div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="mb-2 text-xs font-semibold text-slate-900">{language === "en" ? "Progress history" : "Riwayat progres"}</p>
                  <div className="space-y-2">{targetDetails.progressHistory.slice(0, 5).map((event, index) => <div key={`${event.createdAt}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2.5"><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-900">{event.notes || (event.eventType === "goal_updated" ? (language === "en" ? "Goal updated" : "Target diperbarui") : event.eventType)}</p><p className="mt-0.5 truncate text-[10px] text-slate-500">{[event.userFullName, localDate(event.createdAt)].filter(Boolean).join(" · ")}</p></div>{event.amount && <p className="shrink-0 text-xs font-semibold text-slate-700">{rupiah(event.amount)}</p>}</div>)}</div>
                </div>)}
                </div>
              </section>);
        })()}

          <div className="min-w-0 overflow-hidden rounded-[22px] bg-white p-4 shadow-soft lg:rounded-2xl">
            <div className="mb-3 flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-950">Transaction history</h3>
                <p className="mt-0.5 text-xs font-semibold leading-4 text-slate-500">Search and filter transactions in this pocket.</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                  {selectedPocket.canEdit !== false && !readOnly && (<button type="button" className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-violet-600 hover:bg-violet-50" onClick={() => {
                    setShareHistoryLink("");
                    setShowPocketHistoryShare(true);
                    loadActiveHistoryShares().catch(() => setActiveHistoryShares([]));
                  }}>
                    <Share2 size={13}/> {language === "en" ? "Share" : "Bagikan"}
                  </button>)}
                  <button type="button" className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold ${pocketTransactionFilterCount > 0 ? "bg-emerald-50 text-[#16A34A]" : "text-slate-500 hover:bg-slate-50"}`} onClick={() => setShowPocketTransactionFilter(true)}>
                    <ListFilter size={13}/> Filter{pocketTransactionFilterCount > 0 ? ` (${pocketTransactionFilterCount})` : ""}
                  </button>
                  <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-[#16A34A]" onClick={() => Promise.all([loadPocketTransactions(), loadPocketTarget()]).catch(() => undefined)} disabled={pocketTransactionLoading}>
                    {pocketTransactionLoading ? <Loader2 size={13} className="animate-spin"/> : <ArrowLeftRight size={13}/>} Refresh
                  </button>
              </div>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                <Search size={16} className="text-slate-400"/>
                <input className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-slate-400" value={pocketTransactionSearch} onChange={(event) => setPocketTransactionSearch(event.target.value)} placeholder="Search transaction"/>
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-2xl bg-[#F8FAFC] p-1">
                {[
                { id: "all" as const, label: "All" },
                { id: "income" as const, label: "Income" },
                { id: "expense" as const, label: "Expense" }
            ].map((item) => (<button key={item.id} type="button" className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${pocketTransactionType === item.id ? "bg-white text-[#16A34A] shadow-sm" : "text-slate-500"}`} onClick={() => setPocketTransactionType(item.id)}>
                    {item.label}
                  </button>))}
              </div>
              <div className="space-y-2">
                {pocketTransactionLoading ? (<div className="rounded-2xl border border-slate-100 bg-[#F8FAFC] px-3 py-4 text-center text-xs font-medium text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin"/> Loading transactions...
                    </span>
                  </div>) : groupedPocketTransactions.length > 0 ? (groupedPocketTransactions.map((group) => (<section key={group.date} className="overflow-hidden rounded-2xl border border-slate-100 bg-[#F8FAFC]">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-3 py-2.5">
                      <div>
                        <p className="text-xs font-semibold text-slate-900">{localDate(group.date)}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">{group.rows.length} {language === "en" ? (group.rows.length === 1 ? "transaction" : "transactions") : "transaksi"}</p>
                      </div>
                      <p className={`text-xs font-bold ${group.netAmount > 0 ? "text-[#16A34A]" : group.netAmount < 0 ? "text-rose-600" : "text-slate-500"}`}>{group.netAmount > 0 ? "+" : group.netAmount < 0 ? "-" : ""}{rupiah(Math.abs(group.netAmount))}</p>
                    </div>
                    <div className="divide-y divide-slate-100">
                    {group.rows.map((transaction) => {
                      const isIncome = transaction.transactionType === "income";
                      return (<button type="button" key={transaction.id} className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 overflow-hidden px-3 py-3 text-left transition hover:bg-white active:scale-[0.995]" onClick={() => selectedPocketId && onOpenTransaction?.(selectedPocketId, transaction.id)}>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isIncome ? "bg-emerald-100 text-[#16A34A]" : "bg-rose-100 text-rose-600"}`}>
                              {isIncome ? <ArrowDownLeft size={15}/> : <ArrowUpRight size={15}/>}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">{transaction.merchantName || transaction.categoryName || "Untitled transaction"}</p>
                              <p className="truncate text-[11px] text-slate-500">{[activePocketMembers.length > 1 ? transaction.userFullName : null, transaction.categoryName, transaction.paymentMethod].filter(Boolean).join(" · ")}</p>
                            </div>
                          </div>
                        </div>
                        <div className="max-w-[42vw] shrink-0 text-right">
                          <p className={`whitespace-nowrap text-[13px] font-bold ${isIncome ? "text-[#16A34A]" : "text-slate-900"}`}>{isIncome ? "+" : "-"}{rupiah(transaction.amount)}</p>
                          <p className="mt-0.5 text-[10px] text-slate-400">{language === "en" ? "Tap details" : "Lihat detail"}</p>
                        </div>
                      </button>);
                    })}
                    </div>
                  </section>))) : (<div className="rounded-2xl border border-dashed border-slate-200 bg-[#F8FAFC] px-3 py-4 text-center text-xs font-medium text-slate-500">
                    No transactions found for this pocket.
                  </div>)}
              </div>
            </div>
          </div>
          {showPocketHistoryShare && selectedPocket.canEdit !== false && !readOnly && (<>
              <button type="button" data-scroll-lock="true" className="fixed inset-0 z-40 cursor-default bg-slate-950/30 backdrop-blur-[2px]" aria-label={language === "en" ? "Close share history" : "Tutup bagikan riwayat"} onClick={() => setShowPocketHistoryShare(false)}/>
              <section className="fixed inset-x-3 bottom-24 z-50 mx-auto max-h-[78vh] max-w-md overflow-y-auto rounded-[28px] border border-white/80 bg-white p-4 shadow-[0_28px_80px_rgba(15,23,42,0.28)] lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2">
                <div className="rounded-[22px] bg-gradient-to-br from-violet-600 via-fuchsia-500 to-orange-400 p-4 text-white">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/75">Pocket story</p><h2 className="mt-1 text-xl font-bold">{language === "en" ? "Share the money recap" : "Bagikan cerita keuangan"}</h2><p className="mt-1 text-xs leading-5 text-white/80">{language === "en" ? "A clean, read-only recap. No login needed." : "Ringkasan read-only yang aman. Tanpa perlu login."}</p></div>
                    <button type="button" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white" onClick={() => setShowPocketHistoryShare(false)}><X size={17}/></button>
                  </div>
                </div>
                {!shareHistoryLink ? (<div className="mt-4 space-y-4">
                  <div><p className="mb-2 text-xs font-semibold text-slate-700">{language === "en" ? "Date range" : "Rentang tanggal"}</p><div className="grid grid-cols-2 gap-2">
                    {[
                      ["today", language === "en" ? "Today" : "Hari ini"], ["last7", language === "en" ? "Last 7 days" : "7 hari terakhir"],
                      ["month", language === "en" ? "This month" : "Bulan ini"], ["previous-month", language === "en" ? "Previous month" : "Bulan sebelumnya"],
                      ["custom", language === "en" ? "Custom date" : "Tanggal custom"]
                    ].map(([id, label]) => (<button key={id} type="button" className={`rounded-xl border px-3 py-2 text-xs font-semibold ${shareHistoryPreset === id ? "border-violet-200 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-600"}`} onClick={() => setShareHistoryPreset(id as typeof shareHistoryPreset)}>{label}</button>))}
                  </div></div>
                  {shareHistoryPreset === "custom" && (<div className="grid grid-cols-2 gap-2"><DateFilterPicker label={language === "en" ? "From" : "Dari"} value={shareHistoryFrom} onChange={setShareHistoryFrom} language={language}/><DateFilterPicker label={language === "en" ? "To" : "Sampai"} value={shareHistoryTo} onChange={setShareHistoryTo} language={language} align="right"/></div>)}
                  <div><p className="mb-2 text-xs font-semibold text-slate-700">{language === "en" ? "Transaction type" : "Jenis transaksi"}</p><div className="grid grid-cols-3 gap-2">{[["all", language === "en" ? "All" : "Semua"], ["income", language === "en" ? "Income" : "Pemasukan"], ["expense", language === "en" ? "Expense" : "Pengeluaran"]].map(([id, label]) => (<button key={id} type="button" className={`rounded-xl border px-2 py-2 text-xs font-semibold ${shareHistoryType === id ? "border-emerald-200 bg-emerald-50 text-[#16A34A]" : "border-slate-200 text-slate-600"}`} onClick={() => setShareHistoryType(id as typeof shareHistoryType)}>{label}</button>))}</div></div>
                  <Field label={language === "en" ? "Category" : "Kategori"}>
                    <select className="input" value={shareHistoryCategoryId} onChange={(event) => setShareHistoryCategoryId(event.target.value)}>
                      <option value="all">{language === "en" ? "All categories" : "Semua kategori"}</option>
                      {shareHistoryCategoryOptions.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                  </Field>
                  <Field label={language === "en" ? "Link validity (days)" : "Masa berlaku link (hari)"}><input className="input" type="number" min={1} max={30} value={shareHistoryExpiry} onChange={(event) => setShareHistoryExpiry(Math.max(1, Math.min(30, Number(event.target.value) || 7)))}/></Field>
                  <p className="rounded-2xl bg-slate-50 px-3 py-2 text-[11px] leading-5 text-slate-500">{language === "en" ? "Default 7 days, maximum 30 days. Anyone with the link can view this recap until it expires." : "Default 7 hari, maksimal 30 hari. Siapa pun yang memiliki link dapat melihat ringkasan sampai kedaluwarsa."}</p>
                  <button type="button" className="btn-primary w-full" disabled={shareHistorySaving || !shareHistoryBounds.from || !shareHistoryBounds.to} onClick={() => createHistoryShare().catch((reason) => setError(reason instanceof Error ? reason.message : "Gagal membuat link"))}>{shareHistorySaving ? <Loader2 size={16} className="animate-spin"/> : <Share2 size={16}/>} {language === "en" ? "Create share link" : "Buat link berbagi"}</button>
                </div>) : (<div className="mt-4 space-y-3"><div className="rounded-[20px] border border-emerald-100 bg-emerald-50 p-4 text-center"><CheckCircle2 className="mx-auto text-[#16A34A]" size={28}/><p className="mt-2 text-sm font-bold text-slate-900">{language === "en" ? "Your link is ready!" : "Link siap dibagikan!"}</p><p className="mt-1 break-all text-[11px] text-slate-500">{shareHistoryLink}</p></div><button type="button" className="btn-primary w-full" onClick={() => shareGeneratedHistoryLink().catch(() => copyShareHistoryLink())}><Share2 size={16}/> {language === "en" ? "Share link" : "Bagikan link"}</button><button type="button" className="btn-secondary w-full" onClick={() => copyShareHistoryLink()}>{language === "en" ? "Copy link" : "Salin link"}</button><button type="button" className="w-full text-center text-xs font-semibold text-violet-600" onClick={() => setShareHistoryLink("")}>{language === "en" ? "Create another link" : "Buat link lainnya"}</button></div>)}
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold text-slate-900">{language === "en" ? "Active links" : "Link yang sedang aktif"}</p><p className="mt-0.5 text-[11px] text-slate-500">{language === "en" ? "Links that can still be opened by guests." : "Link yang masih bisa dibuka oleh guest."}</p></div><span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-600">{activeHistoryShares.length}</span></div>
                  <div className="mt-3 space-y-2">
                    {activeHistorySharesLoading ? (<div className="flex items-center justify-center rounded-2xl bg-slate-50 py-5"><Loader2 size={17} className="animate-spin text-violet-500"/></div>) : activeHistoryShares.length ? activeHistoryShares.map((share) => {
                      const url = `${window.location.origin}/?pocketShare=${share.token}`;
                      return (<div key={share.token} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold text-slate-900">{localDate(share.dateFrom)} – {localDate(share.dateTo)}</p><p className="mt-1 text-[10px] text-slate-500">{share.transactionType === "income" ? (language === "en" ? "Income" : "Pemasukan") : share.transactionType === "expense" ? (language === "en" ? "Expense" : "Pengeluaran") : (language === "en" ? "All transactions" : "Semua transaksi")} · {share.categoryName ?? (language === "en" ? "All categories" : "Semua kategori")} · {language === "en" ? "expires" : "berakhir"} {localDate(share.expiresAt)}</p></div><span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 ring-4 ring-emerald-100"/></div>
                        <div className="mt-3 grid grid-cols-3 gap-2"><button type="button" className="rounded-xl bg-white px-2 py-2 text-[10px] font-bold text-slate-600 shadow-sm" onClick={() => window.open(url, "_blank", "noopener,noreferrer")}>{language === "en" ? "Preview" : "Lihat"}</button><button type="button" className="rounded-xl bg-white px-2 py-2 text-[10px] font-bold text-slate-600 shadow-sm" onClick={() => copyShareHistoryLink(url)}>{language === "en" ? "Copy" : "Salin"}</button><button type="button" className="rounded-xl bg-violet-600 px-2 py-2 text-[10px] font-bold text-white" onClick={() => navigator.share ? navigator.share({ title: selectedPocket.name, url }).catch(() => copyShareHistoryLink(url)) : copyShareHistoryLink(url)}>{language === "en" ? "Share" : "Bagikan"}</button></div>
                      </div>);
                    }) : <p className="rounded-2xl bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">{language === "en" ? "No active links yet." : "Belum ada link yang aktif."}</p>}
                  </div>
                </div>
              </section>
            </>)}
          {showPocketTransactionFilter && (<>
              <button type="button" data-scroll-lock="true" className="fixed inset-0 z-40 cursor-default bg-slate-950/25 backdrop-blur-[1px]" aria-label="Tutup filter transaksi" onClick={() => setShowPocketTransactionFilter(false)}/>
              <section className="fixed inset-x-3 bottom-24 z-50 mx-auto max-h-[78vh] max-w-md overflow-y-auto rounded-[26px] border border-slate-100 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.24)] lg:bottom-auto lg:left-auto lg:right-8 lg:top-24 lg:mx-0 lg:w-96 lg:rounded-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">Filter transaksi</h2>
                    <p className="mt-1 text-xs text-slate-500">Atur periode dan urutan transaksi.</p>
                  </div>
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50" onClick={() => setShowPocketTransactionFilter(false)}>
                    <X size={16}/>
                  </button>
                </div>

                {activePocketMembers.length > 1 && (<div className="mt-4">
                    <p className="text-xs font-semibold text-slate-700">Member</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button type="button" className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${pocketTransactionMemberId === "all" ? "border-emerald-200 bg-emerald-50 text-[#16A34A]" : "border-slate-200 bg-white text-slate-600"}`} onClick={() => setPocketTransactionMemberId("all")}>{language === "en" ? "All members" : "Semua member"}</button>
                      {activePocketMembers.map((member) => (<button key={member.userId} type="button" className={`truncate rounded-xl border px-3 py-2 text-xs font-semibold transition ${pocketTransactionMemberId === member.userId ? "border-emerald-200 bg-emerald-50 text-[#16A34A]" : "border-slate-200 bg-white text-slate-600"}`} onClick={() => setPocketTransactionMemberId(member.userId)} title={member.fullName}>{member.fullName}</button>))}
                    </div>
                  </div>)}

                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-700">Periode</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {[
                    { id: "all" as const, label: "Semua tanggal" },
                    { id: "today" as const, label: "Today" },
                    { id: "last7" as const, label: "Last 7 days" },
                    { id: "month" as const, label: "This month" },
                    { id: "custom" as const, label: "Custom tanggal" }
                ].map((option) => (<button key={option.id} type="button" className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${pocketTransactionDatePreset === option.id ? "border-emerald-200 bg-emerald-50 text-[#16A34A]" : "border-slate-200 bg-white text-slate-600"}`} onClick={() => setPocketTransactionDatePreset(option.id)}>
                        {option.label}
                      </button>))}
                  </div>
                  {pocketTransactionDatePreset === "custom" && (<div className="mt-3 grid grid-cols-2 gap-2">
                      <Field label="Dari tanggal">
                        <DateInput value={pocketTransactionCustomStart} onChange={(event) => setPocketTransactionCustomStart(event.target.value)}/>
                      </Field>
                      <Field label="Sampai tanggal">
                        <DateInput min={pocketTransactionCustomStart || undefined} value={pocketTransactionCustomEnd} onChange={(event) => setPocketTransactionCustomEnd(event.target.value)}/>
                      </Field>
                    </div>)}
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-700">Urutkan</p>
                  <div className="mt-2 space-y-2">
                    {[
                    { id: "newest" as const, label: "Transaksi terbaru" },
                    { id: "oldest" as const, label: "Transaksi terlama" },
                    { id: "amount-desc" as const, label: "Nominal paling besar" },
                    { id: "amount-asc" as const, label: "Nominal paling kecil" }
                ].map((option) => (<button key={option.id} type="button" className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition ${pocketTransactionSort === option.id ? "border-emerald-200 bg-emerald-50 text-[#16A34A]" : "border-slate-200 bg-white text-slate-600"}`} onClick={() => setPocketTransactionSort(option.id)}>
                        {option.label}
                        {pocketTransactionSort === option.id && <CheckCircle2 size={14}/>}
                      </button>))}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button type="button" className="btn-secondary w-full" onClick={() => {
                    setPocketTransactionDatePreset("all");
                    setPocketTransactionCustomStart("");
                    setPocketTransactionCustomEnd("");
                    setPocketTransactionSort("newest");
                    setPocketTransactionMemberId("all");
                }}>
                    Reset
                  </button>
                  <button type="button" className="btn-primary w-full" onClick={() => setShowPocketTransactionFilter(false)}>
                    Terapkan
                  </button>
                </div>
              </section>
            </>)}
          {showMutationImportModal && selectedPocketCanSpend && (<>
              <button type="button" data-scroll-lock="true" className="fixed inset-0 z-40 cursor-default bg-slate-950/30 backdrop-blur-[2px]" aria-label={language === "en" ? "Close mutation import" : "Tutup import mutasi"} onClick={() => setShowMutationImportModal(false)}/>
              <section className="fixed inset-x-3 bottom-24 z-50 mx-auto max-h-[82vh] max-w-md overflow-y-auto overscroll-contain rounded-[28px] border border-white/80 bg-white p-4 shadow-[0_28px_80px_rgba(15,23,42,0.28)] lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#16A34A]">{language === "en" ? "Bank statement" : "Mutasi rekening"}</p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-950">{language === "en" ? "Import statement" : "Import mutasi"}</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{language === "en" ? "Preview CSV, XLSX, PDF, or pasted text before saving." : "Preview CSV, XLSX, PDF, atau teks paste sebelum disimpan."}</p>
                  </div>
                  <button type="button" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50" onClick={() => setShowMutationImportModal(false)}>
                    <X size={17}/>
                  </button>
                </div>
                <div className="mt-4 grid gap-3">
                  <input ref={mutationImportInputRef} className="sr-only" type="file" accept=".csv,.xlsx,.pdf,.txt,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file)
                        previewMutationImport(file).catch((reason) => setError(reason instanceof Error ? reason.message : "Import mutasi gagal diproses"));
                    event.currentTarget.value = "";
                }}/>
                  <button type="button" className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-left transition active:scale-[0.99]" onClick={() => mutationImportInputRef.current?.click()} disabled={mutationImportLoading || mutationImportSaving}>
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#16A34A] shadow-sm"><Upload size={17}/></span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-950">{language === "en" ? "Upload statement file" : "Upload file mutasi"}</span>
                        <span className="block truncate text-xs text-slate-500">{mutationImportFileName || "CSV, XLSX, PDF, TXT"}</span>
                      </span>
                    </span>
                    {mutationImportLoading ? <Loader2 size={17} className="shrink-0 animate-spin text-[#16A34A]"/> : <ChevronRight size={17} className="shrink-0 text-emerald-400"/>}
                  </button>
                  <Field label={language === "en" ? "Paste statement text" : "Paste teks mutasi"}>
                    <textarea className="input min-h-28 resize-none py-3 leading-5" value={mutationImportText} onChange={(event) => setMutationImportText(event.target.value)} placeholder={language === "en" ? "Paste copied bank/e-wallet statement rows here..." : "Paste baris mutasi bank/e-wallet di sini..."}/>
                  </Field>
                  <button type="button" className="btn-secondary w-full" disabled={mutationImportLoading || mutationImportSaving || !mutationImportText.trim()} onClick={() => previewMutationImport().catch((reason) => setError(reason instanceof Error ? reason.message : "Import mutasi gagal diproses"))}>
                    {mutationImportLoading ? <Loader2 size={16} className="animate-spin"/> : <FileSpreadsheet size={16}/>} {language === "en" ? "Preview pasted text" : "Preview teks"}
                  </button>
                </div>

                {mutationImportSummary && (<div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-slate-50 p-3"><p className="text-[10px] font-semibold text-slate-500">{language === "en" ? "Ready" : "Siap import"}</p><p className="mt-1 text-lg font-semibold text-slate-950">{mutationImportSummary.ready}</p></div>
                  <div className="rounded-2xl bg-amber-50 p-3"><p className="text-[10px] font-semibold text-amber-700">{language === "en" ? "Duplicates" : "Duplikat"}</p><p className="mt-1 text-lg font-semibold text-amber-700">{mutationImportSummary.duplicate}</p></div>
                  <div className="rounded-2xl bg-emerald-50 p-3"><p className="text-[10px] font-semibold text-[#16A34A]">{language === "en" ? "Credit" : "Kredit"}</p><p className="mt-1 text-sm font-semibold text-[#16A34A]">+{rupiah(mutationImportSummary.income)}</p></div>
                  <div className="rounded-2xl bg-rose-50 p-3"><p className="text-[10px] font-semibold text-rose-600">{language === "en" ? "Debit" : "Debit"}</p><p className="mt-1 text-sm font-semibold text-rose-600">-{rupiah(mutationImportSummary.expense)}</p></div>
                </div>)}

                {mutationImportRows.length > 0 && (<div className="mt-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-slate-700">{language === "en" ? "Preview" : "Preview"}</p>
                    <button type="button" className="text-xs font-semibold text-[#16A34A]" onClick={() => setSelectedMutationImportKeys(new Set(mutationImportRows.filter((row) => !row.duplicate).map((row) => row.importKey)))}>
                      {language === "en" ? "Select ready" : "Pilih yang siap"}
                    </button>
                  </div>
                  <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                    {mutationImportRows.map((row) => {
                    const selected = selectedMutationImportKeys.has(row.importKey);
                    const isIncome = row.transactionType === "income";
                    return (<button key={row.importKey} type="button" className={`w-full rounded-2xl border px-3 py-3 text-left transition ${row.duplicate ? "border-amber-100 bg-amber-50/70 opacity-80" : selected ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-white hover:bg-slate-50"}`} disabled={row.duplicate} onClick={() => setSelectedMutationImportKeys((current) => {
                            const next = new Set(current);
                            if (next.has(row.importKey))
                                next.delete(row.importKey);
                            else
                                next.add(row.importKey);
                            return next;
                        })}>
                        <div className="flex items-start gap-3">
                          <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected && !row.duplicate ? "border-[#16A34A] bg-[#16A34A] text-white" : "border-slate-200 bg-white text-white"}`}>{selected && !row.duplicate ? <CheckCircle2 size={13}/> : null}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="line-clamp-2 text-sm font-semibold text-slate-950">{row.description || (language === "en" ? "Statement row" : "Baris mutasi")}</p>
                              <p className={`shrink-0 text-xs font-bold ${isIncome ? "text-[#16A34A]" : "text-rose-600"}`}>{isIncome ? "+" : "-"}{rupiah(row.amount)}</p>
                            </div>
                            <p className="mt-1 text-[11px] text-slate-500">{localDate(row.transactionDate)} · {row.categoryName || (language === "en" ? "No category yet" : "Belum ada kategori")}</p>
                            {row.duplicate && <p className="mt-1 text-[10px] font-semibold text-amber-700">{row.duplicateReason}</p>}
                          </div>
                        </div>
                      </button>);
                })}
                  </div>
                </div>)}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button type="button" className="btn-secondary w-full" onClick={() => setShowMutationImportModal(false)}>{language === "en" ? "Cancel" : "Batal"}</button>
                  <button type="button" className="btn-primary w-full" disabled={mutationImportSaving || selectedMutationImportRows.length === 0} onClick={() => saveMutationImport().catch((reason) => setError(reason instanceof Error ? reason.message : "Import mutasi gagal disimpan"))}>
                    {mutationImportSaving ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>} {language === "en" ? `Save ${selectedMutationImportRows.length}` : `Simpan ${selectedMutationImportRows.length}`}
                  </button>
                </div>
              </section>
            </>)}


        </section>)}
      {accountView === "pocket-detail" && selectedPocket && showTargetBalanceModal && (<>
          <button type="button" data-scroll-lock="true" className="fixed inset-0 z-40 cursor-default bg-slate-950/25 backdrop-blur-[1px]" aria-label="Tutup target balance" onClick={() => setShowTargetBalanceModal(false)}/>
          <section className="fixed inset-x-3 bottom-24 z-50 mx-auto max-h-[calc(100dvh-7rem)] max-w-md overflow-y-auto rounded-[26px] border border-slate-100 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.22)] lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="text-base font-semibold text-slate-950">{targetDetails?.targetBalance ? (language === "en" ? "Edit financial goal" : "Edit target keuangan") : (language === "en" ? "Set financial goal" : "Atur target keuangan")}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{language === "en" ? "Make the goal actionable with a deposit plan and auto-transfer." : "Buat target lebih actionable dengan rencana setoran dan auto-transfer."}</p></div>
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50" onClick={() => setShowTargetBalanceModal(false)}><X size={17}/></button>
            </div>
            <div className="mt-4 space-y-3">
              <Field label={language === "en" ? "Goal name" : "Nama tujuan"}>
                <input className="input" value={targetNameDraft} onChange={(event) => setTargetNameDraft(event.target.value)} placeholder={language === "en" ? "Example: Japan trip, emergency fund" : "Contoh: Liburan Jepang, dana darurat"} autoFocus/>
              </Field>
              <Field label={language === "en" ? "Goal image" : "Gambar tujuan"}>
                <div className="flex items-center gap-2">
                  {targetImageDraft ? <img src={targetImageDraft} alt="" className="h-12 w-12 shrink-0 rounded-2xl object-cover"/> : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#16A34A]"><TrendingUp size={18}/></span>}
                  <input className="input min-w-0 flex-1" value={targetImageDraft} onChange={(event) => setTargetImageDraft(event.target.value)} placeholder={language === "en" ? "Image URL or data image" : "URL gambar atau data image"}/>
                </div>
              </Field>
              <Field label={language === "en" ? "Target amount" : "Target nominal"}>
                <input className="input" inputMode="numeric" value={targetBalanceDraft} onChange={(event) => setTargetBalanceDraft(formatRupiahInput(event.target.value))} placeholder="Contoh: 5.000.000" required/>
              </Field>
              <Field label={language === "en" ? "Target date" : "Tanggal target"}>
                <DateFilterPicker label={language === "en" ? "Target date" : "Tanggal target"} value={targetDateDraft} onChange={setTargetDateDraft} language={language} showLabel={false} allowClear/>
              </Field>
              {targetDetails?.recommendations && (<div className="grid grid-cols-2 gap-2">
                <button type="button" className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-left" onClick={() => {
                    setTargetAutoTransferAmount(moneyInputValue(targetDetails.recommendations?.weeklyDeposit ?? ""));
                    setTargetAutoTransferFrequency("weekly");
                    setTargetAutoTransferEnabled(true);
                }}>
                  <p className="text-[10px] font-semibold text-[#16A34A]">{language === "en" ? "Recommended weekly" : "Rekomendasi mingguan"}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">{rupiah(targetDetails.recommendations.weeklyDeposit)}</p>
                </button>
                <button type="button" className="rounded-2xl border border-sky-100 bg-sky-50 p-3 text-left" onClick={() => {
                    setTargetAutoTransferAmount(moneyInputValue(targetDetails.recommendations?.monthlyDeposit ?? ""));
                    setTargetAutoTransferFrequency("monthly");
                    setTargetAutoTransferEnabled(true);
                }}>
                  <p className="text-[10px] font-semibold text-sky-700">{language === "en" ? "Recommended monthly" : "Rekomendasi bulanan"}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">{rupiah(targetDetails.recommendations.monthlyDeposit)}</p>
                </button>
              </div>)}
              <div className="rounded-[22px] border border-slate-100 bg-slate-50 p-3">
                <button type="button" className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setTargetAutoTransferEnabled((current) => !current)}>
                  <span><span className="block text-sm font-semibold text-slate-950">{language === "en" ? "Auto-transfer from source Pocket" : "Auto-transfer dari pocket sumber"}</span><span className="mt-0.5 block text-[11px] text-slate-500">{language === "en" ? "Automatically move money toward this goal." : "Pindahkan uang otomatis menuju target ini."}</span></span>
                  <span className={`h-6 w-11 rounded-full p-1 transition ${targetAutoTransferEnabled ? "bg-[#16A34A]" : "bg-slate-300"}`}><span className={`block h-4 w-4 rounded-full bg-white transition ${targetAutoTransferEnabled ? "translate-x-5" : ""}`}/></span>
                </button>
                {targetAutoTransferEnabled && (<div className="mt-3 space-y-3">
                  <Field label={language === "en" ? "Source pocket" : "Pocket sumber"}>
                    <select className="input" value={targetAutoTransferSourceId} onChange={(event) => setTargetAutoTransferSourceId(event.target.value)}>
                      <option value="">{language === "en" ? "Select source Pocket" : "Pilih Pocket sumber"}</option>
                      {spendableAccounts.filter((account) => account.id !== selectedPocket.id).map((account) => <option key={account.id} value={account.id}>{account.name} · {rupiah(account.currentBalance)}</option>)}
                    </select>
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label={language === "en" ? "Amount" : "Nominal"}><input className="input" inputMode="numeric" value={targetAutoTransferAmount} onChange={(event) => setTargetAutoTransferAmount(formatRupiahInput(event.target.value))}/></Field>
                    <Field label={language === "en" ? "Frequency" : "Frekuensi"}><select className="input" value={targetAutoTransferFrequency} onChange={(event) => setTargetAutoTransferFrequency(event.target.value as typeof targetAutoTransferFrequency)}><option value="weekly">{language === "en" ? "Weekly" : "Mingguan"}</option><option value="monthly">{language === "en" ? "Monthly" : "Bulanan"}</option></select></Field>
                  </div>
                </div>)}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="btn-secondary w-full" onClick={() => setShowTargetBalanceModal(false)}>Batal</button>
                <button type="button" className="btn-primary w-full" disabled={targetBalanceSaving || !targetBalanceDraft || !targetDateDraft || (targetAutoTransferEnabled && (!targetAutoTransferSourceId || !targetAutoTransferAmount))} onClick={() => savePocketTarget().catch((err) => setError(err instanceof Error ? err.message : "Target gagal disimpan"))}>
                  {targetBalanceSaving ? <Loader2 size={16} className="animate-spin"/> : <TrendingUp size={16}/>} {language === "en" ? "Save goal" : "Simpan target"}
                </button>
              </div>
              {error && <p className="rounded-2xl bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}
            </div>
          </section>
        </>)}
      {accountView === "pocket-detail" && selectedPocket && showAutoBudgetModal && (<>
          <button type="button" data-scroll-lock="true" className="fixed inset-0 z-40 cursor-default bg-slate-950/25 backdrop-blur-[1px]" aria-label={language === "en" ? "Close auto budgeting" : "Tutup auto budgeting"} onClick={() => {
            setAutoBudgetSourcePickerOpen(false);
            setShowAutoBudgetModal(false);
          }}/>
          <section className="fixed inset-x-3 bottom-24 z-50 mx-auto max-h-[calc(100dvh-7rem)] max-w-md overflow-y-auto rounded-[26px] border border-slate-100 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.22)] lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="text-base font-semibold text-slate-950">{autoBudgetRule ? (language === "en" ? "Edit auto budgeting" : "Edit auto budgeting") : (language === "en" ? "Set auto budgeting" : "Atur auto budgeting")}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{language === "en" ? "This is your personal rule. Other Pocket members can create their own rules." : "Ini adalah aturan pribadi Anda. Anggota Pocket lain dapat membuat aturan masing-masing."}</p></div>
              <button type="button" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50" onClick={() => {
                setAutoBudgetSourcePickerOpen(false);
                setShowAutoBudgetModal(false);
              }}><X size={17}/></button>
            </div>
            <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50/60 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-700">{language === "en" ? "Destination pocket" : "Pocket tujuan"}</p>
              <div className="mt-1 flex items-center justify-between gap-3"><span className="truncate text-sm font-semibold text-slate-950">{selectedPocket.name}</span><span className="text-xs font-bold text-slate-900">{rupiah(selectedPocket.currentBalance)}</span></div>
              <p className="mt-1.5 text-[11px] leading-4 text-slate-500">{language === "en" ? "Funds will be transferred periodically into this Pocket." : "Dana akan ditransfer secara berkala ke Pocket ini."}</p>
            </div>
            <div className="mt-4 space-y-3">
              <Field label={language === "en" ? "Source pocket" : "Pocket sumber"}>
                <button type="button" className="flex min-h-16 w-full min-w-0 items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-3 py-3 text-left transition active:scale-[0.99]" onClick={() => setAutoBudgetSourcePickerOpen(true)}>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-xl text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${autoBudgetSourceAccount?.background || "#16A34A"}, #064E3B)` }}>
                    {(() => {
                      const visual = autoBudgetSourceAccount?.logo ? { logo: autoBudgetSourceAccount.logo, background: autoBudgetSourceAccount.background } : (autoBudgetSourceAccount ? loadPocketVisuals()[autoBudgetSourceAccount.id] : undefined);
                      const logo = visual?.logo || (autoBudgetSourceAccount ? getDefaultPocketLogo(autoBudgetSourceAccount.accountType) : "↗");
                      return logo.startsWith("data:") ? <img src={logo} alt="" className="h-full w-full object-cover"/> : <span>{logo}</span>;
                    })()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">{language === "en" ? "Choose source pocket" : "Pilih pocket sumber"}</span>
                    <span className="mt-0.5 block truncate text-sm font-semibold text-slate-950">{autoBudgetSourceAccount?.name ?? (language === "en" ? "Select source Pocket" : "Pilih Pocket sumber")}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-slate-500">{autoBudgetSourceAccount ? `${accountTypeLabel(autoBudgetSourceAccount.accountType)}${autoBudgetSourceAccount.providerName ? ` · ${autoBudgetSourceAccount.providerName}` : ""}` : (language === "en" ? "Balance will be auto-debited if available." : "Saldo pocket sumber akan auto-debet jika tersedia.")}</span>
                  </span>
                  <span className="max-w-[96px] shrink-0 text-right">
                    <span className="block text-[10px] font-medium text-slate-400">{language === "en" ? "Balance" : "Saldo"}</span>
                    <span className="mt-0.5 block truncate text-xs font-bold text-slate-900">{autoBudgetSourceAccount ? rupiah(autoBudgetSourceAccount.currentBalance) : "-"}</span>
                  </span>
                </button>
              </Field>
              <Field label={language === "en" ? "Amount" : "Nominal"}>
                <input className="input" inputMode="numeric" value={autoBudgetDraft.amount} onChange={(event) => setAutoBudgetDraft((current) => ({ ...current, amount: formatRupiahInput(event.target.value) }))} placeholder="Contoh: 100.000" autoFocus/>
              </Field>
              <Field label={language === "en" ? "Frequency" : "Frekuensi"}>
                <select className="input" value={autoBudgetDraft.frequency} onChange={(event) => setAutoBudgetDraft((current) => ({ ...current, frequency: event.target.value as typeof current.frequency }))}>
                  <option value="daily">{language === "en" ? "Daily" : "Harian"}</option><option value="weekly">{language === "en" ? "Weekly" : "Mingguan"}</option><option value="monthly">{language === "en" ? "Monthly" : "Bulanan"}</option><option value="yearly">{language === "en" ? "Yearly" : "Tahunan"}</option>
                </select>
              </Field>
              {autoBudgetDraft.frequency === "weekly" && (<Field label={language === "en" ? "Execution day" : "Hari pelaksanaan"}>
                  <select className="input" value={autoBudgetDraft.dayOfWeek} onChange={(event) => setAutoBudgetDraft((current) => ({ ...current, dayOfWeek: Number(event.target.value) }))}>
                    {(language === "en" ? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] : ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]).map((day, index) => <option key={day} value={index + 1}>{day}</option>)}
                  </select>
                </Field>)}
              {autoBudgetDraft.frequency === "monthly" && (<Field label={language === "en" ? "Execution date" : "Tanggal pelaksanaan"}>
                  <select className="input" value={autoBudgetDraft.dayOfMonth} onChange={(event) => setAutoBudgetDraft((current) => ({ ...current, dayOfMonth: Number(event.target.value) }))}>{Array.from({ length: 31 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select>
                </Field>)}
              {autoBudgetDraft.frequency === "yearly" && (<div className="grid grid-cols-2 gap-2">
                  <Field label={language === "en" ? "Month" : "Bulan"}><select className="input" value={autoBudgetDraft.monthOfYear} onChange={(event) => setAutoBudgetDraft((current) => ({ ...current, monthOfYear: Number(event.target.value) }))}>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Intl.DateTimeFormat(language === "en" ? "en-US" : "id-ID", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, index, 1)))}</option>)}</select></Field>
                  <Field label={language === "en" ? "Date" : "Tanggal"}><select className="input" value={autoBudgetDraft.dayOfMonth} onChange={(event) => setAutoBudgetDraft((current) => ({ ...current, dayOfMonth: Number(event.target.value) }))}>{Array.from({ length: 31 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></Field>
                </div>)}
              <div>
                <p className="text-xs font-semibold text-slate-600">{language === "en" ? "Expiry" : "Masa berlaku"}</p>
                <div className="mt-1 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
                  <button type="button" className={`rounded-xl px-3 py-2 text-xs font-semibold ${autoBudgetDraft.noExpiry ? "bg-white text-[#15803D] shadow-sm" : "text-slate-500"}`} onClick={() => setAutoBudgetDraft((current) => ({ ...current, noExpiry: true, expiryDate: "" }))}>{language === "en" ? "No expiry" : "Tanpa batas"}</button>
                  <button type="button" className={`rounded-xl px-3 py-2 text-xs font-semibold ${!autoBudgetDraft.noExpiry ? "bg-white text-[#15803D] shadow-sm" : "text-slate-500"}`} onClick={() => setAutoBudgetDraft((current) => ({ ...current, noExpiry: false }))}>{language === "en" ? "Choose date" : "Pilih tanggal"}</button>
                </div>
              </div>
              {!autoBudgetDraft.noExpiry && <DateFilterPicker label={language === "en" ? "Expiry date" : "Tanggal berakhir"} value={autoBudgetDraft.expiryDate} onChange={(value) => setAutoBudgetDraft((current) => ({ ...current, expiryDate: value }))} language={language} allowClear/>}
              {autoBudgetRule?.nextRunDate && <p className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-500">{language === "en" ? "Next debit" : "Debit berikutnya"}: <strong>{localDate(autoBudgetRule.nextRunDate)}</strong></p>}
              {autoBudgetRule?.targetBalance && (() => { const current = moneyValue(autoBudgetRule.targetCurrentBalance); const target = moneyValue(autoBudgetRule.targetBalance); const progress = target > 0 ? Math.min(100, current / target * 100) : 0; return <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3"><div className="flex items-end justify-between"><div><p className="text-[10px] font-semibold uppercase text-emerald-700">{language === "en" ? "Target progress" : "Progres target"}</p><p className="mt-1 text-xs font-bold text-slate-900">{rupiah(current)} / {rupiah(target)}</p></div><p className="text-sm font-bold text-emerald-700">{Math.round(progress)}%</p></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }}/></div></div>; })()}
              {autoBudgetRule && <div><p className="mb-2 text-xs font-semibold text-slate-700">{language === "en" ? "Execution history" : "Riwayat eksekusi"}</p><div className="max-h-48 space-y-2 overflow-y-auto">{autoBudgetRule.executions.length ? autoBudgetRule.executions.map((execution) => <div key={execution.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3"><div className="flex items-center justify-between gap-2"><div><p className="text-xs font-bold text-slate-900">{localDate(execution.runDate)}</p><p className={`mt-0.5 text-[10px] font-semibold ${execution.status === "success" ? "text-emerald-600" : "text-rose-600"}`}>{execution.status === "success" ? (language === "en" ? "Transfer successful" : "Transfer berhasil") : (execution.errorMessage || (language === "en" ? "Transfer failed" : "Transfer gagal"))}</p></div>{execution.status === "failed" && <button type="button" className="rounded-xl bg-rose-50 px-3 py-2 text-[10px] font-bold text-rose-600" onClick={() => request(`/accounts/${selectedPocket.id}/auto-budget/executions/${execution.id}/retry`, { method: "POST" }).then(() => Promise.all([loadAutoBudget(selectedPocket.id), onChanged()])).catch((err) => setError(err instanceof Error ? err.message : "Retry gagal"))}>{language === "en" ? "Try again" : "Coba lagi"}</button>}</div></div>) : <p className="rounded-2xl bg-slate-50 p-3 text-center text-[11px] text-slate-500">{language === "en" ? "No executions yet." : "Belum ada eksekusi."}</p>}</div></div>}
              {error && <p className="rounded-2xl bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}
              <div className={`grid gap-2 ${autoBudgetRule ? "grid-cols-2" : ""}`}>
                {autoBudgetRule && <button type="button" className="btn-secondary w-full text-rose-600" disabled={autoBudgetSaving} onClick={() => removeAutoBudget().catch((err) => setError(err instanceof Error ? err.message : "Auto budgeting gagal dihapus"))}><Trash2 size={15}/> {language === "en" ? "Disable" : "Nonaktifkan"}</button>}
                <button type="button" className="btn-primary w-full" disabled={autoBudgetSaving || !autoBudgetDraft.sourceAccountId || !autoBudgetDraft.amount || (!autoBudgetDraft.noExpiry && !autoBudgetDraft.expiryDate)} onClick={() => saveAutoBudget().catch((err) => setError(err instanceof Error ? err.message : "Auto budgeting gagal disimpan"))}>{autoBudgetSaving ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>} {language === "en" ? "Save" : "Simpan"}</button>
              </div>
            </div>
          </section>
        </>)}
      {accountView === "pocket-detail" && selectedPocket && showAutoBudgetModal && autoBudgetSourcePickerOpen && (<>
          <button type="button" data-scroll-lock="true" className="fixed inset-0 z-[60] cursor-default bg-slate-950/25 backdrop-blur-[1px]" aria-label={language === "en" ? "Close source pocket picker" : "Tutup pilihan pocket sumber"} onClick={() => setAutoBudgetSourcePickerOpen(false)}/>
          <div className="fixed left-3 right-3 top-1/2 z-[70] mx-auto flex max-h-[82vh] max-w-md -translate-y-1/2 flex-col rounded-[26px] border border-slate-100 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.24)] sm:left-4 sm:right-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-semibold text-slate-950">{language === "en" ? "Choose source pocket" : "Pilih pocket sumber"}</p>
                <p className="mt-0.5 text-xs leading-5 text-slate-500">{language === "en" ? `Funds will be transferred to ${selectedPocket.name}.` : `Dana akan ditransfer ke ${selectedPocket.name}.`}</p>
              </div>
              <button type="button" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50" onClick={() => setAutoBudgetSourcePickerOpen(false)}>
                <X size={16}/>
              </button>
            </div>
            <div className="space-y-2 overflow-y-auto pr-0.5">
              {spendableAccounts.filter((account) => account.id !== selectedPocket.id).map((account) => {
                const visual = account.logo ? { logo: account.logo, background: account.background } : loadPocketVisuals()[account.id];
                const logo = visual?.logo || getDefaultPocketLogo(account.accountType);
                const selected = account.id === autoBudgetDraft.sourceAccountId;
                return (<button key={account.id} type="button" className={`flex w-full min-w-0 items-center gap-3 rounded-[20px] border p-3 text-left transition active:scale-[0.99] ${selected ? "border-emerald-300 bg-emerald-50" : "border-slate-100 bg-white hover:bg-slate-50"}`} onClick={() => {
                    setAutoBudgetDraft((current) => ({ ...current, sourceAccountId: account.id }));
                    setAutoBudgetSourcePickerOpen(false);
                }}>
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-2xl text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${visual?.background || "#16A34A"}, #064E3B)` }}>
                      {logo.startsWith("data:") ? <img src={logo} alt="" className="h-full w-full object-cover"/> : <span>{logo}</span>}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-950">{account.name}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-slate-500">{[accountTypeLabel(account.accountType), account.providerName].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="max-w-[104px] shrink-0 text-right">
                      <span className="block text-[10px] font-medium text-slate-400">{language === "en" ? "Balance" : "Saldo"}</span>
                      <span className="mt-0.5 block truncate text-xs font-bold text-slate-900">{rupiah(account.currentBalance)}</span>
                    </span>
                  </button>);
              })}
              {spendableAccounts.filter((account) => account.id !== selectedPocket.id).length === 0 && (
                <p className="rounded-2xl bg-slate-50 p-3 text-center text-xs text-slate-500">{language === "en" ? "No source pocket available." : "Tidak ada pocket sumber yang tersedia."}</p>
              )}
            </div>
          </div>}
        </>)}
      {accountView === "pocket-detail" && selectedPocket && showPocketInviteModal && (<>
          <button type="button" data-scroll-lock="true" className="fixed inset-0 z-40 cursor-default bg-slate-950/20 backdrop-blur-[1px]" aria-label="Close invite user" onClick={() => setShowPocketInviteModal(false)}/>
          <section className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-md rounded-[26px] border border-slate-100 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.22)] lg:bottom-auto lg:left-auto lg:right-8 lg:top-24 lg:mx-0 lg:w-96 lg:rounded-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Invite user</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">Cari 1 user dengan username, email, atau nomor telepon lengkap.</p>
              </div>
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50" onClick={() => setShowPocketInviteModal(false)}>
                <X size={17}/>
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                <UserPlus size={16} className="text-slate-400"/>
                <input className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-slate-400" value={inviteQuery} onChange={(event) => {
                setInviteQuery(event.target.value);
                setInviteSearchedQuery("");
                setInviteSuccess(null);
            }} placeholder="Username, email, atau phone"/>
              </div>
              <button type="button" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-[#16A34A]" onClick={() => {
                setQrScannerError(null);
                setScanQrOpen(true);
            }}>
                <QrCode size={15}/> Scan barcode
              </button>
              {inviteSearchLoading && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-[#166534]">Mencari user yang cocok...</div>}
              {!inviteSearchLoading && inviteSearchedQuery === inviteQuery.trim() && inviteSearchResults.length === 0 && !inviteSelectedUser && (<div className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Tidak ditemukan, silakan isi username/email/phone secara lengkap.
                </div>)}
              {qrScannerError && <div className="rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-600">{qrScannerError}</div>}
              {!inviteSelectedUser && inviteSearchResults.length > 0 && (<div className="space-y-2">
                  {inviteSearchResults.map((person) => (<button key={person.id} type="button" className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50/60" onClick={() => {
                    setInviteSelectedUser({
                        id: person.id,
                        fullName: person.fullName,
                        username: person.username,
                        email: person.email ?? "",
                        avatarUrl: person.avatarUrl
                    });
                    setInviteSuccess(null);
                }}>
                      {person.avatarUrl ? <img src={person.avatarUrl} alt="" className="h-11 w-11 rounded-2xl object-cover"/> : <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-sm font-semibold text-[#16A34A]">{person.fullName.slice(0, 1).toUpperCase()}</span>}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-950">{person.fullName}</p>
                        <p className="truncate text-xs text-slate-500">@{person.username}</p>
                      </div>
                      <ChevronRight size={16} className="text-slate-300"/>
                    </button>))}
                </div>)}
              {inviteSelectedUser && (<div className="space-y-3 rounded-[22px] border border-emerald-100 bg-emerald-50/60 p-3">
                  <div className="flex items-center gap-3">
                    {inviteSelectedUser.avatarUrl ? <img src={inviteSelectedUser.avatarUrl} alt="" className="h-12 w-12 rounded-2xl object-cover"/> : <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-[#16A34A]">{inviteSelectedUser.fullName.slice(0, 1).toUpperCase()}</span>}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-950">{inviteSelectedUser.fullName}</p>
                      <p className="truncate text-xs text-slate-500">@{inviteSelectedUser.username}</p>
                      <p className="truncate text-[11px] text-slate-400">{inviteSelectedUser.email}</p>
                    </div>
                    <button type="button" className="text-xs font-semibold text-slate-500" onClick={() => {
                    setInviteSelectedUser(null);
                    setInviteSuccess(null);
                }}>
                      Ganti
                    </button>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Akses pocket</p>
                    <button type="button" className={`flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition ${invitePermission === "member" ? "border-emerald-200 bg-white shadow-sm" : "border-slate-200 bg-white/80"}`} onClick={() => setInvitePermission("member")}>
                      <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-emerald-200">{invitePermission === "member" && <span className="h-2.5 w-2.5 rounded-full bg-[#16A34A]"/>}</span>
                      <span>
                        <span className="block text-sm font-semibold text-slate-950">Bisa spend uang</span>
                        <span className="block text-xs leading-5 text-slate-500">Bisa menabung, melihat saldo, dan mencatat transaksi pocket.</span>
                      </span>
                    </button>
                    <button type="button" className={`flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition ${invitePermission === "viewer" ? "border-emerald-200 bg-white shadow-sm" : "border-slate-200 bg-white/80"}`} onClick={() => setInvitePermission("viewer")}>
                      <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-emerald-200">{invitePermission === "viewer" && <span className="h-2.5 w-2.5 rounded-full bg-[#16A34A]"/>}</span>
                      <span>
                        <span className="block text-sm font-semibold text-slate-950">Hanya bisa nabung</span>
                        <span className="block text-xs leading-5 text-slate-500">Bisa ikut setor saldo, tapi tidak bisa memakai saldo pocket untuk transaksi.</span>
                      </span>
                    </button>
                  </div>
                  <button type="button" className="btn-primary w-full" disabled={inviteSending} onClick={() => submitPocketInvite()}>
                    {inviteSending ? <Loader2 size={16} className="animate-spin"/> : <UserPlus size={16}/>}
                    {inviteSending ? "Mengirim undangan..." : "Invite user"}
                  </button>
                </div>)}
              {inviteSuccess && <div className={`rounded-2xl px-3 py-2 text-xs ${inviteSuccess.toLowerCase().includes("gagal") ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-[#166534]"}`}>{inviteSuccess}</div>}
            </div>
          </section>
        </>)}
      {accountView === "pocket-detail" && scanQrOpen && <QrScanner onScan={handlePocketInviteScan} onClose={() => setScanQrOpen(false)} request={request} selectedPocketId={selectedPocketId}/>}

      {accountView === "account-form" && (<form key={editingAccount?.id ?? "new-pocket"} className="flex min-h-[calc(100vh-132px)] flex-col rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-2xl lg:border-slate-200" onSubmit={submit}>
          <SectionHeader title={editingAccount ? "Edit pocket" : "Add pocket"} caption="Atur identitas pocket, jenis penyimpanan, dan saldo awal." action={(<button type="button" className="app-back-button" onClick={() => {
                    const isEditingExistingPocket = Boolean(editingAccount);
                    setEditingAccount(null);
                    setError(null);
                    setAccountView(isEditingExistingPocket ? "pocket-detail" : "list");
                }}>
                <ArrowLeft size={14}/> Kembali
              </button>)}/>

          <input id="pocket-logo-upload" ref={pocketGalleryInputRef} className="sr-only" type="file" accept="image/*,.heic,.heif" onChange={handlePocketImage}/>

          <div className="flex-1 space-y-4">
            <div className="relative overflow-hidden rounded-[24px] p-4 text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${pocketBackgroundDraft}, #064E3B)` }}>
              <div className="absolute right-[-38px] top-[-38px] h-32 w-32 rounded-full bg-white/15"/>
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="relative">
                  <button type="button" className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white/18 ring-1 ring-white/25 backdrop-blur" onClick={() => {
                setShowPocketStickerPicker(false);
                setShowPocketLogoMenu((current) => !current);
            }} aria-label="Ubah logo pocket">
                    {pocketLogoDraft.startsWith("data:") ? <img src={pocketLogoDraft} alt="" className="h-full w-full object-cover"/> : <span className="flex h-full w-full items-center justify-center text-[34px] leading-none">{pocketLogoDraft}</span>}
                  </button>
                </div>
                <div className="flex max-h-[62px] max-w-[190px] flex-wrap justify-end gap-1.5 overflow-y-auto rounded-xl bg-black/10 p-1.5">
                  {pocketCardColors.map((color) => (<button key={color} type="button" className={`h-6 w-6 rounded-full border-2 ${pocketBackgroundDraft === color ? "border-white" : "border-white/40"}`} style={{ backgroundColor: color }} onClick={() => setPocketBackgroundDraft(color)} aria-label={`Pilih warna ${color}`}/>))}
                </div>
              </div>
              <div className="relative z-10 mt-7">
                <p className="text-xs font-medium text-white/70">Pocket preview</p>
                <p className="mt-1 truncate text-xl font-semibold">{pocketNameDraft || "Nama pocket"}</p>
                <p className="mt-4 text-xs font-medium text-white/70">{pocketTypeDraft === "gold" ? "Saldo emas" : "Start balance"}</p>
                <p className="mt-1 text-2xl font-semibold">{pocketTypeDraft === "gold" ? formatGoldGrams(pocketGoldGramsDraft) : rupiah(moneyValue(pocketInitialBalanceDraft.replace(/\./g, "")))}</p>
                {pocketTypeDraft === "gold" && <p className="mt-1 text-xs font-semibold text-white/75">{rupiah(Math.round(decimalValue(pocketGoldGramsDraft) * moneyValue(pocketGoldSellPriceDraft)))}</p>}
              </div>
              <p className="relative z-10 mt-4 text-[11px] font-medium text-white/70">Tap logo untuk memilih sticker atau upload gambar. Pilih warna untuk background kartu.</p>
            </div>
            {showPocketLogoMenu && (<>
                <button type="button" data-scroll-lock="true" className="fixed inset-0 z-40 cursor-default bg-slate-950/20 backdrop-blur-[1px]" aria-label="Tutup menu logo pocket" onClick={() => setShowPocketLogoMenu(false)}/>
                <div className="fixed inset-x-4 top-1/2 z-50 mx-auto w-full max-w-xs -translate-y-1/2 rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">Ubah logo pocket</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">Pilih sticker atau gunakan gambar sendiri.</p>
                    </div>
                    <button type="button" className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50" onClick={() => setShowPocketLogoMenu(false)}>
                      <X size={14}/>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" className="flex min-h-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50" onClick={() => {
                setShowPocketLogoMenu(false);
                setShowPocketStickerPicker(true);
            }}>
                      Sticker
                    </button>
                    <button type="button" className="flex min-h-14 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-3 text-center text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50" onClick={() => {
                pocketGalleryInputRef.current?.click();
                setShowPocketLogoMenu(false);
            }}>
                      Upload gambar
                    </button>
                  </div>
                </div>
              </>)}
            {showPocketStickerPicker && (<>
                <button type="button" data-scroll-lock="true" className="fixed inset-0 z-40 cursor-default bg-slate-950/20 backdrop-blur-[1px]" aria-label="Tutup pilihan sticker" onClick={() => setShowPocketStickerPicker(false)}/>
                <div className="fixed inset-x-4 top-1/2 z-50 mx-auto flex max-h-[80vh] w-full max-w-sm -translate-y-1/2 flex-col rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">Pilih sticker</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">Pilih icon untuk logo pocket.</p>
                    </div>
                    <button type="button" className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50" onClick={() => setShowPocketStickerPicker(false)}>
                      <X size={14}/>
                    </button>
                  </div>
                  <div className="overflow-y-auto pr-1">
                    {pocketProviderStickerOptions.length > 0 && (<div className="mb-4">
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Logo {pocketTypeDraft === "bank" ? "bank" : pocketTypeDraft === "e_wallet" ? "e-wallet" : pocketTypeDraft === "gold" ? "emas" : "e-money"}</p>
                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                          {pocketProviderStickerOptions.map((provider) => (<button key={provider} type="button" className="flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-slate-100 bg-slate-50 p-2 transition hover:border-emerald-100 hover:bg-emerald-50" onClick={() => {
                    setPocketLogoDraft(providerLogoSticker(provider));
                    setShowPocketStickerPicker(false);
                }} title={provider}>
                              <img src={providerLogoSticker(provider)} alt="" className="h-9 w-9 rounded-xl object-cover"/>
                              <span className="w-full truncate text-center text-[9px] font-semibold text-slate-600">{provider}</span>
                            </button>))}
                        </div>
                      </div>)}
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Sticker umum</p>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {pocketStickerOptions.map((sticker) => (<button key={sticker} type="button" className="flex aspect-square min-h-12 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-[28px] transition hover:border-emerald-100 hover:bg-emerald-50" onClick={() => {
                setPocketLogoDraft(sticker);
                setShowPocketStickerPicker(false);
            }}>
                        <span className="leading-none">{sticker}</span>
                      </button>))}
                    </div>
                  </div>
                </div>
              </>)}

            <Field label="Nama pocket">
              <input className="input" name="name" placeholder="Contoh: BCA utama" value={pocketNameDraft} onChange={(event) => setPocketNameDraft(event.target.value)} required/>
            </Field>

            <Field label="Jenis pocket">
              <select className="input" name="pocketType" value={pocketTypeDraft} onChange={(event) => {
                const nextType = event.target.value as "cash" | "bank" | "e_wallet" | "e_money" | "gold";
                setPocketTypeDraft(nextType);
                const nextProvider = nextType === "gold" ? pocketGoldProviderOptions[0] : "";
                const pricePreset = nextProvider ? goldProviderPricePresets[nextProvider] : null;
                setPocketProviderDraft(nextProvider);
                setPocketNumberDraft("");
                setPocketHolderDraft("");
                setPocketGoldGramsDraft("");
                setPocketGoldBuyPriceDraft(pricePreset ? formatRupiahInput(pricePreset.buy) : "");
                setPocketGoldSellPriceDraft(pricePreset ? formatRupiahInput(pricePreset.sell) : "");
                setPocketLogoDraft(nextProvider ? providerLogoSticker(nextProvider) : getDefaultPocketLogo(nextType === "e_money" ? "other" : nextType));
            }}>
                <option value="cash">Tunai</option>
                <option value="bank">Rekening Bank</option>
                <option value="e_wallet">E-wallet</option>
                <option value="e_money">E-money</option>
                <option value="gold">Emas</option>
              </select>
            </Field>

            {pocketTypeDraft !== "cash" && (<div className="space-y-3 rounded-[22px] bg-[#F8FAFC] p-3">
                <Field label={pocketTypeDraft === "bank" ? "Pilih Bank" : pocketTypeDraft === "e_wallet" ? "Pilih e-wallet" : pocketTypeDraft === "gold" ? "Pilih penyedia emas" : "Pilih e-money"}>
                  <select className="input" name="providerName" value={pocketProviderDraft} onChange={(event) => {
                const provider = event.target.value;
                setPocketProviderDraft(provider);
                const pricePreset = goldProviderPricePresets[provider];
                if (pocketTypeDraft === "gold" && pricePreset) {
                    setPocketGoldBuyPriceDraft(formatRupiahInput(pricePreset.buy));
                    setPocketGoldSellPriceDraft(formatRupiahInput(pricePreset.sell));
                    setPocketLogoDraft(providerLogoSticker(provider));
                }
            }} required>
                    <option value="" disabled>{pocketTypeDraft === "bank" ? "Pilih bank" : pocketTypeDraft === "e_wallet" ? "Pilih e-wallet" : pocketTypeDraft === "gold" ? "Pilih penyedia emas" : "Pilih e-money"}</option>
                    {pocketProviderDraft && !pocketProviderOptions.includes(pocketProviderDraft) && <option value={pocketProviderDraft}>{pocketProviderDraft}</option>}
                    {pocketProviderOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </Field>

                {pocketTypeDraft === "gold" ? (<div className="space-y-3">
                    <Field label={language === "en" ? "Gold balance (grams)" : "Saldo emas (gram)"}>
                      <input className="input" name="goldBalanceGrams" inputMode="decimal" placeholder="Contoh: 0,25" value={pocketGoldGramsDraft} onChange={(event) => setPocketGoldGramsDraft(event.target.value.replace(/[^\d,.]/g, ""))} required/>
                    </Field>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label={language === "en" ? "Buy price / gram" : "Harga beli / gram"}>
                        <input className="input" name="goldBuyPricePerGram" inputMode="numeric" value={pocketGoldBuyPriceDraft} onChange={(event) => setPocketGoldBuyPriceDraft(formatRupiahInput(event.target.value))} required/>
                      </Field>
                      <Field label={language === "en" ? "Sell price / gram" : "Harga jual / gram"}>
                        <input className="input" name="goldSellPricePerGram" inputMode="numeric" value={pocketGoldSellPriceDraft} onChange={(event) => setPocketGoldSellPriceDraft(formatRupiahInput(event.target.value))} required/>
                      </Field>
                    </div>
                    <p className="rounded-2xl bg-amber-50 px-3 py-2 text-[11px] leading-4 text-amber-700">
                      {goldProviderPricePresets[pocketProviderDraft]?.note ?? (language === "en" ? "Update the price according to the provider app before saving." : "Update harga sesuai aplikasi penyedia sebelum disimpan.")}
                    </p>
                  </div>) : (<>
                    <Field label={`${pocketTypeDraft === "bank" ? (language === "en" ? "Account number" : "Nomor rekening") : pocketTypeDraft === "e_wallet" ? (language === "en" ? "E-wallet number" : "Nomor e-wallet") : (language === "en" ? "E-money number" : "Nomor e-money")} (${language === "en" ? "optional" : "opsional"})`}>
                      <input className="input" name="accountNumber" inputMode="numeric" placeholder={language === "en" ? "Account number (optional)" : "Nomor akun (opsional)"} value={pocketNumberDraft} onChange={(event) => setPocketNumberDraft(event.target.value)}/>
                    </Field>

                    {pocketTypeDraft !== "e_money" && (<Field label={language === "en" ? "Account holder (optional)" : "Atas nama (opsional)"}>
                        <input className="input" name="accountHolderName" placeholder={language === "en" ? "Account holder name (optional)" : "Nama pemilik (opsional)"} value={pocketHolderDraft} onChange={(event) => setPocketHolderDraft(event.target.value)}/>
                      </Field>)}
                  </>)}
              </div>)}

            {pocketTypeDraft === "gold" ? (<div className="rounded-[22px] border border-amber-100 bg-amber-50/60 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">{language === "en" ? "Estimated sell value" : "Estimasi nilai jual"}</p>
                <p className="mt-1 text-xl font-bold text-slate-950">{rupiah(Math.round(decimalValue(pocketGoldGramsDraft) * moneyValue(pocketGoldSellPriceDraft)))}</p>
                <p className="mt-1 text-[11px] text-slate-500">{formatGoldGrams(pocketGoldGramsDraft)} × {rupiah(moneyValue(pocketGoldSellPriceDraft))}</p>
              </div>) : (<Field label="Saldo awal">
                <input className="input" name="initialBalance" inputMode="numeric" placeholder="Contoh: 500.000" value={pocketInitialBalanceDraft} onInput={handleMoneyInput} onChange={(event) => setPocketInitialBalanceDraft(event.target.value)} required/>
              </Field>)}

            {editingAccount && (<p className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 lg:rounded-xl">
                Saldo sekarang {rupiah(editingAccount.currentBalance)}. Saldo awal tidak bisa dibuat minus dari form ini.
              </p>)}

            {error && <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 lg:rounded-xl">{error}</p>}
          </div>

          <div className="sticky bottom-24 mt-5 bg-white/90 pt-2 backdrop-blur">
            <button className="btn-primary w-full">{editingAccount ? <CheckCircle2 size={16}/> : <Plus size={16}/>} {editingAccount ? "Simpan perubahan" : "Simpan pocket"}</button>
          </div>
        </form>)}

      {accountView === "transfer-form" && (<form className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-2xl lg:border-slate-200" onSubmit={transfer}>
          <SectionHeader title={transferFormCopy.title} caption={transferFormCopy.caption} action={(<button type="button" className="app-back-button" onClick={() => {
                    setError(null);
                    setTransferPocketPicker(null);
                    setAccountView(transferMode !== "general" && selectedPocketId ? "pocket-detail" : "list");
                }}>
                <ArrowLeft size={14}/> Kembali
              </button>)}/>
          <div className="mb-4 rounded-[24px] border border-slate-100 bg-[#F8FAFC] p-2.5 lg:rounded-xl">
            <div className="relative grid grid-cols-2 gap-2.5">
              <button type="button" disabled={transferMode === "out"} onClick={() => setTransferPocketPicker("source")} className={`relative min-h-[118px] rounded-[18px] border px-3 py-3 pb-11 text-left shadow-sm lg:rounded-xl ${transferMode === "in" ? "order-2" : "order-1"} ${transferMode === "out" ? "cursor-default border-slate-100 bg-white" : "border-emerald-200 bg-emerald-50/60 transition hover:border-emerald-300 active:scale-[0.99]"}`}>
                <p className="text-[10px] font-semibold text-slate-400">{transferFormCopy.sourceLabel}</p>
                <p className="mt-1.5 truncate text-sm font-semibold text-slate-950">{sourceAccount?.name ?? "-"}</p>
                {transferMode !== "out" && <span className="mt-2 inline-flex rounded-full bg-white px-2 py-1 text-[9px] font-semibold text-[#16A34A] shadow-sm">Pilih pocket asal</span>}
                <div className="absolute inset-x-3 bottom-3">
                  <p className="text-[9px] text-slate-400">Saldo saat ini</p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-slate-800">{sourceAccount ? rupiah(sourceAccount.currentBalance) : "-"}</p>
                </div>
              </button>
              <span className={`pointer-events-none absolute left-1/2 top-1/2 z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-[#F8FAFC] shadow-sm ${transferMode === "in" ? "bg-emerald-100 text-[#16A34A]" : "bg-rose-100 text-rose-600"}`}>
                {transferMode === "in" ? <ArrowLeft size={17}/> : <ArrowRight size={17}/>}
              </span>
              <button type="button" disabled={transferMode === "in"} onClick={() => setTransferPocketPicker("destination")} className={`relative min-h-[118px] rounded-[18px] border px-3 py-3 pb-11 text-left shadow-sm lg:rounded-xl ${transferMode === "in" ? "order-1" : "order-2"} ${transferMode === "in" ? "cursor-default border-slate-100 bg-white" : "border-emerald-200 bg-emerald-50/60 transition hover:border-emerald-300 active:scale-[0.99]"}`}>
                <p className="text-[10px] font-semibold text-slate-400">{transferFormCopy.destinationLabel}</p>
                <p className="mt-1.5 truncate text-sm font-semibold text-slate-950">{destinationAccount?.name ?? "-"}</p>
                {transferMode !== "in" && <span className="mt-2 inline-flex rounded-full bg-white px-2 py-1 text-[9px] font-semibold text-[#16A34A] shadow-sm">Pilih pocket tujuan</span>}
                <div className="absolute inset-x-3 bottom-3">
                  <p className="text-[9px] text-slate-400">Saldo saat ini</p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-slate-800">{destinationAccount ? rupiah(destinationAccount.currentBalance) : "-"}</p>
                </div>
              </button>
            </div>
          </div>
          <div ref={transferFormFieldsRef} className="space-y-3 scroll-mt-24">
            <input type="hidden" name="sourceAccountId" value={sourceAccountId}/>
            <input type="hidden" name="destinationAccountId" value={destinationAccountId}/>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Nominal">
                <input className="input h-11" name="amount" inputMode="numeric" placeholder="100000" value={transferDraft.amount} onChange={(event) => setTransferDraft((current) => ({ ...current, amount: formatRupiahInput(event.target.value) }))} required/>
              </Field>
              <Field label="Tanggal">
                <div>
                  <input type="hidden" name="transferDate" value={transferDraft.transferDate}/>
                  <DateFilterPicker label="Tanggal" value={transferDraft.transferDate} onChange={(value) => setTransferDraft((current) => ({ ...current, transferDate: value }))} language={language} showLabel={false} allowClear/>
                </div>
              </Field>
            </div>
            <Field label="Fee/admin">
              <input className="input h-11" name="feeAmount" inputMode="numeric" placeholder="Opsional, contoh: 2500" value={transferDraft.feeAmount} onChange={(event) => setTransferDraft((current) => ({ ...current, feeAmount: formatRupiahInput(event.target.value) }))}/>
            </Field>
            {sourceAccount && destinationAccount && transferAmount > 0 && (<div className="rounded-[22px] border border-emerald-100 bg-emerald-50/70 p-3 lg:rounded-xl">
                <p className="text-xs font-semibold text-emerald-900">Simulasi saldo setelah transfer</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-white p-3 lg:rounded-xl">
                    <p className="truncate text-[11px] font-semibold text-slate-500">{sourceAccount.name}</p>
                    <p className="mt-1 text-xs text-slate-400">{rupiah(sourceAccount.currentBalance)}</p>
                    <p className={`mt-1 text-sm font-bold ${sourceBalanceAfter < 0 ? "text-rose-600" : "text-slate-950"}`}>{rupiah(sourceBalanceAfter)}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">Setelah nominal + biaya admin</p>
                  </div>
                  <div className="rounded-2xl bg-white p-3 lg:rounded-xl">
                    <p className="truncate text-[11px] font-semibold text-slate-500">{destinationAccount.name}</p>
                    <p className="mt-1 text-xs text-slate-400">{rupiah(destinationAccount.currentBalance)}</p>
                    <p className="mt-1 text-sm font-bold text-[#16A34A]">{rupiah(destinationBalanceAfter)}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">Setelah menerima transfer</p>
                  </div>
                </div>
              </div>)}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 lg:rounded-xl">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700">Attachment transfer</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-slate-500">Tambahkan gambar atau video sebagai bukti transfer.</p>
                </div>
                <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#16A34A] shadow-sm ring-1 ring-slate-200 transition hover:bg-emerald-50 lg:rounded-xl">
                  {transferAttachmentLoading ? <Loader2 className="animate-spin" size={14}/> : <Upload size={14}/>}
                  {transferAttachmentId ? "Ganti" : "Pilih file"}
                  <input className="sr-only" type="file" accept="image/*,video/*,.heic,.heif" onChange={uploadTransferAttachment} disabled={transferAttachmentLoading}/>
                </label>
              </div>
              {transferAttachmentName && (<div className="mt-2 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs text-slate-600 lg:rounded-xl">
                  <ReceiptText className="shrink-0 text-[#16A34A]" size={14}/>
                  <span className="truncate">{transferAttachmentName}</span>
                </div>)}
              {transferAttachmentMessage && (<p className={`mt-2 text-[11px] leading-4 ${transferAttachmentMessage.includes("berhasil") ? "text-[#15803D]" : "text-slate-500"}`}>
                  {transferAttachmentMessage}
                </p>)}
            </div>
            <input className="input h-11" name="notes" placeholder="Catatan transfer (opsional)" value={transferDraft.notes} onChange={(event) => setTransferDraft((current) => ({ ...current, notes: event.target.value }))}/>
            <button type="submit" className="btn-primary w-full" disabled={!transferDraft.amount.trim() || !transferDraft.transferDate || sourceAccountId === destinationAccountId || !spendableAccounts.some((account) => account.id === sourceAccountId) || !receivableAccounts.some((account) => account.id === destinationAccountId) || transferAttachmentLoading || transferParseLoading}>
              <ArrowLeftRight size={16}/> {transferFormCopy.submitLabel}
            </button>
          </div>
        </form>)}
      {accountView === "transfer-form" && transferPocketPicker && (<>
          <button type="button" data-scroll-lock="true" className="fixed inset-0 z-40 cursor-default bg-slate-950/25 backdrop-blur-[1px]" aria-label="Tutup pilihan pocket" onClick={() => setTransferPocketPicker(null)}/>
          <div className="fixed left-3 right-3 top-1/2 z-50 mx-auto flex max-h-[82vh] max-w-md -translate-y-1/2 flex-col rounded-[26px] border border-slate-100 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.24)] sm:left-4 sm:right-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-slate-950">{transferPocketPicker === "source" ? "Pilih pocket asal" : "Pilih pocket tujuan"}</p>
                <p className="mt-0.5 text-xs text-slate-500">Saldo saat ini ditampilkan pada setiap pocket.</p>
              </div>
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50" onClick={() => setTransferPocketPicker(null)}>
                <X size={16}/>
              </button>
            </div>
            <div className="space-y-2 overflow-y-auto pr-0.5">
              {(transferPocketPicker === "source" ? spendableAccounts : receivableAccounts)
                .filter((account) => transferPocketPicker === "source" ? account.id !== destinationAccountId : account.id !== sourceAccountId)
                .map((account) => {
                const visual = account.logo
                    ? { logo: account.logo, background: account.background }
                    : loadPocketVisuals()[account.id];
                const logo = visual?.logo || getDefaultPocketLogo(account.accountType);
                const selected = transferPocketPicker === "source" ? account.id === sourceAccountId : account.id === destinationAccountId;
                return (<button key={account.id} type="button" className={`flex w-full min-w-0 items-center gap-3 rounded-[20px] border p-3 text-left transition active:scale-[0.99] ${selected ? "border-emerald-300 bg-emerald-50" : "border-slate-100 bg-white hover:bg-slate-50"}`} onClick={() => {
                    if (transferPocketPicker === "source")
                        setSourceAccountId(account.id);
                    else
                        setDestinationAccountId(account.id);
                    setTransferPocketPicker(null);
                }}>
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-2xl text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${visual?.background || "#16A34A"}, #064E3B)` }}>
                      {logo.startsWith("data:") ? <img src={logo} alt="" className="h-full w-full object-cover"/> : <span>{logo}</span>}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-950">{account.name}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-slate-500">{[accountTypeLabel(account.accountType), account.providerName].filter(Boolean).join(" Â· ")}</span>
                    </span>
                    <span className="max-w-[104px] shrink-0 text-right">
                      <span className="block text-[10px] font-medium text-slate-400">Saldo saat ini</span>
                      <span className="mt-0.5 block text-xs font-bold text-slate-900">{rupiah(account.currentBalance)}</span>
                    </span>
                  </button>);
            })}
            </div>
          </div>
        </>)}
      {error && <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 lg:rounded-xl">{error}</p>}
    </div>);
}

export function CategoriesView({ categories, request, onChanged, initialView = "list" }: {
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
        if (editingCategory &&
            editingCategory.categoryType !== nextCategoryType &&
            !window.confirm("Ubah tipe kategori? Transaksi lama yang tidak sesuai akan menjadi Tanpa kategori."))
            return;
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
        }
        catch {
            setError(null);
        }
    };
    const removeCategory = async () => {
        if (!editingCategory || editingCategory.isDefault)
            return;
        if (!window.confirm("Hapus kategori ini? Transaksi yang menggunakannya akan tetap tersimpan sebagai Tanpa kategori."))
            return;
        setDeleting(true);
        setError(null);
        try {
            await request(`/categories/${editingCategory.id}`, { method: "DELETE" });
            setEditingCategory(null);
            await onChanged();
            setCategoryView("list");
        }
        catch {
            setError(null);
        }
        finally {
            setDeleting(false);
        }
    };
    return (<div className="space-y-3">
      {categoryView === "list" && (<section className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-2xl lg:border-slate-200">
        <SectionHeader title="Kategori transaksi" caption={`${expenseCategories.length} pengeluaran - ${incomeCategories.length} pemasukan`} action={(<button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-[#16A34A]" onClick={() => {
                    setError(null);
                    setEditingCategory(null);
                    setCategoryView("form");
                }}>
              <Plus size={14}/> Tambah
            </button>)}/>
        <div className="space-y-4">
          <CategoryGroup title="Pengeluaran" rows={expenseCategories} tone="expense" onEdit={(category) => {
                if (category.isDefault)
                    return;
                setError(null);
                setEditingCategory(category);
                setCategoryView("form");
            }}/>
          <CategoryGroup title="Pemasukan" rows={incomeCategories} tone="income" onEdit={(category) => {
                if (category.isDefault)
                    return;
                setError(null);
                setEditingCategory(category);
                setCategoryView("form");
            }}/>
        </div>
      </section>)}

      {categoryView === "form" && (<form key={editingCategory?.id ?? "new-category"} className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-2xl lg:border-slate-200" onSubmit={submit}>
        <SectionHeader title={editingCategory ? "Edit kategori" : "Kategori baru"} caption={editingCategory ? "Ubah nama atau tipe kategori transaksi." : "Buat kategori yang mudah dipilih oleh AI dan form manual."} action={(<button type="button" className="app-back-button" onClick={() => {
                    setEditingCategory(null);
                    setError(null);
                    setCategoryView("list");
                }}>
              <ArrowLeft size={14}/> Kembali
            </button>)}/>
        <div className="space-y-3">
          <Field label="Nama kategori">
            <input className="input" name="name" placeholder="Contoh: Kopi & cafe" defaultValue={editingCategory?.name ?? ""} required/>
          </Field>
          <Field label="Tipe">
            <select className="input" name="categoryType" defaultValue={editingCategory?.categoryType ?? "expense"}>
              <option value="expense">Pengeluaran</option>
              <option value="income">Pemasukan</option>
            </select>
          </Field>
          <button className="btn-primary w-full" disabled={deleting}>{editingCategory ? <CheckCircle2 size={16}/> : <Plus size={16}/>} {editingCategory ? "Simpan perubahan" : "Tambah kategori"}</button>
          {editingCategory?.isDefault && (<p className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2.5 text-xs text-slate-500 lg:rounded-xl">
              <ShieldCheck size={15} className="shrink-0 text-[#16A34A]"/>
              Kategori bawaan sistem dilindungi dan tidak dapat dihapus.
            </p>)}
          {editingCategory && !editingCategory.isDefault && (<button type="button" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 lg:rounded-xl" onClick={removeCategory} disabled={deleting}>
              {deleting ? <Loader2 className="animate-spin" size={16}/> : <Trash2 size={16}/>}
              {deleting ? "Menghapus kategori..." : "Hapus kategori"}
            </button>)}
          {error && <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 lg:rounded-xl">{error}</p>}
        </div>
      </form>)}
    </div>);
}

export function CategoryGroup({ title, rows, tone, onEdit }: {
    title: string;
    rows: Category[];
    tone: "income" | "expense";
    onEdit?: (category: Category) => void;
}) {
    const toneClass = tone === "income" ? "bg-emerald-50 text-[#16A34A]" : "bg-rose-50 text-rose-600";
    return (<div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500">{title}</p>
        <span className="text-[11px] font-bold text-slate-400">{rows.length} kategori</span>
      </div>
      {rows.length === 0 ? (<EmptyState text={`Belum ada kategori ${title.toLowerCase()}.`}/>) : (<div className="grid gap-2 sm:grid-cols-2">
          {rows.map((category) => (<div key={category.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2.5 lg:rounded-xl">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl lg:rounded-xl ${toneClass}`}>
                  <Tags size={15}/>
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{category.name}</p>
                  <p className="text-[11px] font-semibold text-slate-500">{category.isDefault ? "Default" : "Custom"}</p>
                </div>
              </div>
              {!category.isDefault && (<button type="button" className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-[#16A34A]" onClick={() => onEdit?.(category)}>
                  <Settings size={12}/> Edit
                </button>)}
            </div>))}
        </div>)}
    </div>);
}

export function LegacyCategoriesView({ categories, request, onChanged }: {
    categories: Category[];
    request: <T>(path: string, options?: RequestInit) => Promise<T>;
    onChanged: () => Promise<void>;
}) {
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
    return (<div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => (<div key={category.id} className="card p-4">
            <p className="font-semibold">{category.name}</p>
            <p className="mt-1 text-sm text-slate-500">{category.categoryType === "income" ? "Pemasukan" : "Pengeluaran"} {category.isDefault ? "Ãƒâ€šÃ‚Â· Default" : ""}</p>
          </div>))}
      </section>
      <form className="card space-y-3 p-5" onSubmit={submit}>
        <h2 className="font-bold">Kategori baru</h2>
        <input className="input" name="name" placeholder="Nama kategori" required/>
        <select className="input" name="categoryType">
          <option value="expense">Pengeluaran</option>
          <option value="income">Pemasukan</option>
        </select>
        <button className="btn-primary w-full"><Plus size={16}/> Tambah kategori</button>
      </form>
    </div>);
}

export function BudgetsView({ categories, request, onChanged, initialView = "list" }: {
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
        }
        finally {
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
        }
        catch {
            setError(null);
        }
    };
    const now = jakartaDateParts();
    const totalBudget = budgets.reduce((sum, budget) => sum + moneyValue(budget.budgetAmount), 0);
    const totalUsed = budgets.reduce((sum, budget) => sum + moneyValue(budget.used), 0);
    const totalPercent = totalBudget > 0 ? Math.round((totalUsed / totalBudget) * 100) : 0;
    const sortedBudgets = [...budgets].sort((a, b) => moneyValue(b.usagePercent) - moneyValue(a.usagePercent));
    return (<div className="space-y-3">
      {budgetView === "list" && (<section className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-2xl lg:border-slate-200">
        <SectionHeader title="Budget bulan ini" caption={budgets.length > 0 ? `${budgets.length} kategori dipantau - ${totalPercent}% terpakai` : "Belum ada batas pengeluaran"} action={(<button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-[#16A34A]" onClick={() => {
                    setError(null);
                    setEditingBudget(null);
                    setBudgetView("form");
                }}>
              <Plus size={14}/> Tambah
            </button>)}/>
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${totalPercent <= 80 ? "bg-[#16A34A]" : totalPercent <= 100 ? "bg-amber-400" : "bg-rose-500"}`} style={{ width: `${Math.min(totalPercent, 100)}%` }}/>
        </div>
        {loading ? (<LoadingState />) : sortedBudgets.length === 0 ? (<EmptyState text="Buat budget pertama agar pengeluaran lebih mudah dipantau."/>) : (<div className="grid gap-2 md:grid-cols-2">
            {sortedBudgets.map((budget) => {
                    const percent = Math.round(moneyValue(budget.usagePercent));
                    return (<div key={budget.id} className="rounded-2xl border border-slate-100 bg-white px-3 py-3 lg:rounded-xl">
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
                    <div className={`h-full rounded-full ${percent <= 80 ? "bg-[#16A34A]" : percent <= 100 ? "bg-amber-400" : "bg-rose-500"}`} style={{ width: `${Math.min(percent, 100)}%` }}/>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <button type="button" className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-[#16A34A]" onClick={() => {
                            setError(null);
                            setEditingBudget(budget);
                            setBudgetView("form");
                        }}>
                      <Settings size={12}/> Edit
                    </button>
                    <p className="text-[11px] font-semibold text-slate-400">{percent}%</p>
                  </div>
                </div>);
                })}
          </div>)}
      </section>)}

      {budgetView === "form" && (<form key={editingBudget?.id ?? "new-budget"} className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-2xl lg:border-slate-200" onSubmit={submit}>
        <SectionHeader title={editingBudget ? "Edit budget" : "Atur budget"} caption={editingBudget ? "Sesuaikan kategori, periode, atau batas nominal." : "Pilih kategori pengeluaran, periode, lalu isi batas nominal."} action={(<button type="button" className="app-back-button" onClick={() => {
                    setEditingBudget(null);
                    setError(null);
                    setBudgetView("list");
                }}>
              <ArrowLeft size={14}/> Kembali
            </button>)}/>
        <div className="space-y-3">
          <Field label="Kategori">
            <select className="input" name="categoryId" defaultValue={editingBudget?.categoryId ?? expenseCategories[0]?.id ?? ""} required disabled={expenseCategories.length === 0}>
              {expenseCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Bulan">
              <input className="input" name="month" type="number" min={1} max={12} defaultValue={editingBudget?.month ?? now.month} required/>
            </Field>
            <Field label="Tahun">
              <input className="input" name="year" type="number" min={2000} max={2100} defaultValue={editingBudget?.year ?? now.year} required/>
            </Field>
          </div>
          <Field label="Nilai budget">
            <input className="input" name="budgetAmount" inputMode="numeric" placeholder="Contoh: 1000000" defaultValue={moneyInputValue(editingBudget?.budgetAmount)} onInput={handleMoneyInput} required/>
          </Field>
          <button className="btn-primary w-full" disabled={expenseCategories.length === 0}><CheckCircle2 size={16}/> {editingBudget ? "Simpan perubahan" : "Simpan budget"}</button>
          {expenseCategories.length === 0 && <p className="text-xs font-semibold text-slate-500">Buat kategori pengeluaran dulu sebelum menambahkan budget.</p>}
          {error && <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 lg:rounded-xl">{error}</p>}
        </div>
      </form>)}
    </div>);
}

export function LegacyBudgetsView({ categories, request }: {
    categories: Category[];
    request: <T>(path: string, options?: RequestInit) => Promise<T>;
}) {
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
    return (<div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="grid gap-4 md:grid-cols-2">
        {budgets.length === 0 ? <EmptyState text="Belum ada anggaran."/> : budgets.map((budget) => (<div key={budget.id} className="card p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{budget.category}</h3>
              <span className={`rounded px-2 py-1 text-xs font-bold ${budget.status === "Aman" ? "bg-emerald-50 text-[#15803D]" : budget.status === "Peringatan" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>{budget.status}</span>
            </div>
            <p className="mt-3 text-2xl font-bold">{rupiah(budget.used)} / {rupiah(budget.budgetAmount)}</p>
            <div className="mt-4 h-3 rounded bg-slate-100">
              <div className="h-3 rounded bg-sky-600" style={{ width: `${Math.min(Number(budget.usagePercent), 100)}%` }}/>
            </div>
            <p className="mt-2 text-sm text-slate-500">Sisa {rupiah(budget.remaining)}</p>
          </div>))}
      </section>
      <form className="card space-y-3 p-5" onSubmit={submit}>
        <h2 className="font-bold">Anggaran bulanan</h2>
        <select className="input" name="categoryId" required>{expenseCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <div className="grid grid-cols-2 gap-3">
          <input className="input" name="month" type="number" min={1} max={12} defaultValue={now.month} required/>
          <input className="input" name="year" type="number" min={2000} max={2100} defaultValue={now.year} required/>
        </div>
        <input className="input" name="budgetAmount" placeholder="Nilai anggaran" required/>
        <button className="btn-primary w-full"><CheckCircle2 size={16}/> Simpan anggaran</button>
      </form>
    </div>);
}

export function monthYearLabel(value: string | Date) {
    return new Intl.DateTimeFormat("id-ID", { timeZone: APP_TIME_ZONE, month: "short", year: "numeric" }).format(new Date(value));
}

export function ReportsView({ request }: {
    request: <T>(path: string, options?: RequestInit) => Promise<T>;
}) {
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
            if (!active)
                return;
            setCashFlow(nextCashFlow);
            setCategories(nextCategories);
            setMonths(nextMonths);
        })
            .catch(console.error)
            .finally(() => {
            if (active)
                setLoading(false);
        });
        return () => {
            active = false;
        };
    }, []);
    if (loading)
        return <LoadingState />;
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
    const trendLabel = expenseTrend === null
        ? "Belum ada pembanding"
        : expenseTrend > 0
            ? `Naik ${rupiah(expenseTrend)}`
            : expenseTrend < 0
                ? `Turun ${rupiah(Math.abs(expenseTrend))}`
                : "Tidak berubah";
    const trendHelper = previousMonth ? `Dibanding ${monthYearLabel(previousMonth.month)}` : "Butuh minimal 2 bulan data";
    return (<section className="mx-auto max-w-6xl space-y-3 lg:space-y-5">
      <div className="rounded-[26px] border border-slate-100 bg-white p-4 text-slate-950 shadow-soft lg:rounded-2xl lg:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase text-[#16A34A]">Insight</p>
            <h2 className="mt-1 text-xl font-semibold tracking-normal">Laporan keuangan</h2>
            <p className="mt-1 text-xs font-medium text-slate-500">Ringkasan dari transaksi bulan berjalan dan perbandingan bulanan.</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${totalNet >= 0 ? "bg-emerald-50 text-[#16A34A]" : "bg-rose-50 text-rose-700"}`}>
            {totalNet >= 0 ? "Surplus" : "Defisit"}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-slate-50 px-3 py-2 lg:rounded-xl">
            <p className="text-[10px] font-medium text-slate-500">Masuk</p>
            <p className="mt-1 truncate text-sm font-semibold text-[#16A34A]">{rupiah(totalIncome)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-3 py-2 lg:rounded-xl">
            <p className="text-[10px] font-medium text-slate-500">Keluar</p>
            <p className="mt-1 truncate text-sm font-semibold text-rose-600">{rupiah(totalExpense)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-3 py-2 lg:rounded-xl">
            <p className="text-[10px] font-medium text-slate-500">Net</p>
            <p className={`mt-1 truncate text-sm font-semibold ${totalNet >= 0 ? "text-[#16A34A]" : "text-rose-600"}`}>{totalNet >= 0 ? "+" : "-"}{rupiah(Math.abs(totalNet))}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ReportInsightCard label="Pengeluaran terbesar" value={topExpense?.category ?? "Belum ada"} helper={topExpense ? `Bulan ini - ${rupiah(topExpense.total)}` : "Belum ada pengeluaran"} tone="expense" icon={<ShoppingBag size={16}/>}/>
        <ReportInsightCard label="Pemasukan terbesar" value={topIncome?.category ?? "Belum ada"} helper={topIncome ? `Bulan ini - ${rupiah(topIncome.total)}` : "Belum ada pemasukan"} tone="income" icon={<Wallet size={16}/>}/>
        <ReportInsightCard label="Net bulan terakhir" value={`${latestNet >= 0 ? "+" : "-"}${rupiah(Math.abs(latestNet))}`} helper={latestMonthLabel} tone={latestNet >= 0 ? "income" : "expense"} icon={<LineChart size={16}/>}/>
        <ReportInsightCard label="Perubahan pengeluaran" value={trendLabel} helper={trendHelper} tone={expenseTrend === null ? "neutral" : expenseTrend > 0 ? "expense" : "income"} icon={expenseTrend === null ? <LineChart size={16}/> : expenseTrend > 0 ? <ArrowUpRight size={16}/> : <ArrowDownLeft size={16}/>}/>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-2xl lg:border-slate-200">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-950">Arus kas</h3>
              <p className="text-xs font-semibold text-slate-500">{cashFlow.length} hari tercatat</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-[#16A34A]">Harian</span>
          </div>
          <CashFlowInsightList rows={cashFlow}/>
        </section>

        <section className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-2xl lg:border-slate-200">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-950">Kategori</h3>
              <p className="text-xs font-semibold text-slate-500">Pengeluaran terbesar</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">{expenseCategories.length} kategori</span>
          </div>
          <CategoryInsightList rows={expenseCategories}/>
        </section>
      </div>

      <section className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-2xl lg:border-slate-200">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-950">Antarbulan</h3>
            <p className="text-xs font-semibold text-slate-500">Masuk, keluar, dan net per bulan</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">{months.length} bulan</span>
        </div>
        <MonthlyInsightList rows={months}/>
      </section>
    </section>);
}

export function ReportInsightCard({ label, value, helper, tone, icon }: {
    label: string;
    value: string;
    helper: string;
    tone: "income" | "expense" | "neutral";
    icon: JSX.Element;
}) {
    const toneClass = tone === "income"
        ? "bg-emerald-50 text-[#16A34A]"
        : tone === "expense"
            ? "bg-rose-50 text-rose-600"
            : "bg-slate-100 text-slate-500";
    return (<div className="rounded-[22px] border border-white/80 bg-white p-3 shadow-soft lg:rounded-2xl lg:border-slate-200">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold leading-tight text-slate-400">{label}</p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-950">{value}</p>
        </div>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl lg:rounded-xl ${toneClass}`}>{icon}</span>
      </div>
      <p className="mt-1 truncate text-xs font-semibold text-slate-500">{helper}</p>
    </div>);
}

export function CashFlowInsightList({ rows }: {
    rows: CashFlowReportRow[];
}) {
    const visibleRows = rows.slice(-7).reverse();
    const maxValue = Math.max(...visibleRows.map((row) => Number(row.income) + Number(row.expense)), 1);
    if (visibleRows.length === 0)
        return <EmptyState text="Belum ada data arus kas."/>;
    return (<div className="space-y-2">
      {visibleRows.map((row) => {
            const net = Number(row.net);
            const incomePercent = Math.max((Number(row.income) / maxValue) * 100, Number(row.income) > 0 ? 5 : 0);
            const expensePercent = Math.max((Number(row.expense) / maxValue) * 100, Number(row.expense) > 0 ? 5 : 0);
            return (<div key={row.date} className="rounded-2xl border border-slate-100 bg-white px-3 py-2.5 lg:rounded-xl">
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
                <div className="h-full rounded-full bg-[#16A34A]" style={{ width: `${incomePercent}%` }}/>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-rose-50">
                <div className="h-full rounded-full bg-rose-400" style={{ width: `${expensePercent}%` }}/>
              </div>
            </div>
          </div>);
        })}
    </div>);
}

export function CategoryInsightList({ rows }: {
    rows: CategoryReportRow[];
}) {
    const visibleRows = rows.slice(0, 6);
    const maxValue = Math.max(...visibleRows.map((row) => Number(row.total)), 1);
    if (visibleRows.length === 0)
        return <EmptyState text="Belum ada data kategori."/>;
    return (<div className="space-y-2.5">
      {visibleRows.map((row, index) => {
            const percent = Math.round((Number(row.total) / maxValue) * 100);
            return (<div key={`${row.category}-${index}`} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: categoryPalette[index % categoryPalette.length] }}/>
                <span className="truncate text-xs font-semibold text-slate-950">{row.category ?? "Tanpa kategori"}</span>
                <span className="shrink-0 text-[10px] font-bold text-slate-400">{row.count}x</span>
              </div>
              <span className="shrink-0 text-xs font-semibold text-slate-900">{rupiah(row.total)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: categoryPalette[index % categoryPalette.length] }}/>
            </div>
          </div>);
        })}
    </div>);
}

export function MonthlyInsightList({ rows }: {
    rows: MonthlyReportRow[];
}) {
    const visibleRows = rows.slice(-6).reverse();
    if (visibleRows.length === 0)
        return <EmptyState text="Belum ada data antarbulan."/>;
    return (<div className="grid gap-2 md:grid-cols-2">
      {visibleRows.map((row) => {
            const income = Number(row.income);
            const expense = Number(row.expense);
            const net = income - expense;
            const expenseRatio = Math.round((expense / Math.max(income, 1)) * 100);
            const ratioTone = expenseRatio <= 80 ? "bg-[#16A34A]" : expenseRatio <= 100 ? "bg-amber-400" : "bg-rose-500";
            return (<div key={row.month} className="rounded-2xl border border-slate-100 bg-white p-3 lg:rounded-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-950">{monthYearLabel(row.month)}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-500">Ringkasan bulanan</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${net >= 0 ? "bg-emerald-50 text-[#16A34A]" : "bg-rose-50 text-rose-600"}`}>
                {net >= 0 ? "Surplus" : "Defisit"}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-emerald-50 px-2.5 py-2 lg:rounded-xl">
                <p className="text-[10px] font-semibold uppercase text-[#15803D]">Masuk</p>
                <p className="mt-1 truncate text-xs font-semibold text-[#16A34A]">{rupiah(income)}</p>
              </div>
              <div className="rounded-2xl bg-rose-50 px-2.5 py-2 lg:rounded-xl">
                <p className="text-[10px] font-semibold uppercase text-rose-600">Keluar</p>
                <p className="mt-1 truncate text-xs font-semibold text-rose-600">{rupiah(expense)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-2.5 py-2 lg:rounded-xl">
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
                <div className={`h-full rounded-full ${ratioTone}`} style={{ width: `${Math.min(expenseRatio, 100)}%` }}/>
              </div>
            </div>
          </div>);
        })}
    </div>);
}

export function AssistantView({ request, language, onNavigate, context }: {
    request: <T>(path: string, options?: RequestInit) => Promise<T>;
    language: AppLanguage;
    onNavigate: (view: View) => void;
    context?: AssistantContext | null;
}) {
    const copy = language === "en" ? {
        greeting: "Hi, I can help you make financial decisions using the data recorded in this app.",
        header: "Finance Copilot",
        subheader: "Ask about affordability, budgets, bills, balances, or shared debt",
        placeholder: "Example: Can I afford shoes for 1 million?",
        send: "Send",
        loading: "Checking your finances...",
        error: "The assistant is temporarily unavailable. Please try again.",
        suggestions: [
            "Can I afford shoes for 1 million?",
            "Check my finances this month",
            "Any bills due soon?",
            "How do I use the app features?"
        ]
    } : {
        greeting: "Hai, aku bisa membantu mengambil keputusan keuangan berdasarkan data yang tercatat di aplikasi ini.",
        header: "Kopilot Keuangan",
        subheader: "Tanya kelayakan belanja, budget, tagihan, saldo, atau utang bersama",
        placeholder: "Contoh: Boleh beli sepatu 1 juta?",
        send: "Kirim",
        loading: "Memeriksa kondisi keuangan...",
        error: "Kopilot sedang tidak bisa menjawab. Coba lagi sebentar.",
        suggestions: [
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
            text: copy.greeting,
            suggestions: initialSuggestions
        }
    ]);
    const [loading, setLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        setMessages([{
                role: "assistant",
                text: copy.greeting,
                suggestions: copy.suggestions
            }]);
    }, [language]);
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [messages, loading]);
    const sendMessage = async (rawMessage: string) => {
        const message = rawMessage.trim();
        if (!message || loading)
            return;
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
        }
        catch {
            setMessages((current) => [
                ...current,
                {
                    role: "assistant",
                    text: copy.error,
                    suggestions: initialSuggestions
                }
            ]);
        }
        finally {
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
    return (<section className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white lg:h-[calc(100vh-7rem)]">
      <div className="shrink-0 border-b border-slate-100 bg-white px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] lg:px-5 lg:py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#16A34A] lg:rounded-2xl">
            <Bot size={20}/>
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-tight text-slate-950">{copy.header}</h2>
            <p className="mt-0.5 truncate text-xs text-slate-500">{copy.subheader}</p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/70 px-3 py-4 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-3">
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
            return (<div key={index} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div className={`${isUser ? "max-w-[86%] items-end" : "w-full items-start"}`}>
                  <div className={`rounded-[18px] px-3.5 py-2.5 text-sm leading-relaxed shadow-sm lg:rounded-2xl ${isUser
                    ? "rounded-br-md bg-[#15803D] text-white"
                    : `rounded-bl-md border text-slate-800 ${responseStyles[responseTone]}`}`}>
                    <p>{message.text}</p>
                    {!isUser && message.highlights && message.highlights.length > 0 && (<div className={`mt-3 grid gap-2 ${message.highlights.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                        {message.highlights.map((highlight) => (<div key={`${highlight.label}-${highlight.value}`} className={`min-w-0 rounded-xl px-2.5 py-2 ${highlightStyles[highlight.tone]}`}>
                            <p className="truncate text-[10px] opacity-70">{highlight.label}</p>
                            <p className="mt-0.5 break-words text-xs font-semibold leading-4">{highlight.value}</p>
                          </div>))}
                      </div>)}
                    {!isUser && message.actions && message.actions.length > 0 && (<div className="mt-3 flex flex-wrap gap-2">
                        {message.actions.map((action) => (<button key={`${action.view}-${action.label}`} type="button" className="inline-flex items-center gap-1.5 rounded-xl bg-[#16A34A] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#15803D]" onClick={() => {
                            const allowedViews: View[] = ["manual", "history", "manage", "profile", "dashboard"];
                            if (allowedViews.includes(action.view as View))
                                onNavigate(action.view as View);
                        }}>
                            {action.label}
                            <ChevronRight size={14}/>
                          </button>))}
                      </div>)}
                    {message.disclaimer && <p className="mt-2 text-[11px] font-semibold opacity-70">{message.disclaimer}</p>}
                  </div>
                  {!isUser && message.suggestions && message.suggestions.length > 0 && (<div className="mt-2 flex flex-wrap gap-1.5">
                      {message.suggestions.map((suggestion) => (<button key={suggestion} type="button" className="rounded-full border border-emerald-100 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#16A34A] shadow-sm transition hover:bg-emerald-50 disabled:opacity-50" onClick={() => sendMessage(suggestion)} disabled={loading}>
                          {suggestion}
                        </button>))}
                    </div>)}
                </div>
              </div>);
        })}
          {loading && (<div className="flex justify-start">
              <div className="inline-flex items-center gap-2 rounded-[18px] rounded-bl-md border border-emerald-100 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-500 shadow-sm lg:rounded-2xl">
                <Loader2 className="animate-spin text-[#16A34A]" size={15}/> {copy.loading}
              </div>
            </div>)}
          <div ref={chatEndRef}/>
        </div>
      </div>

      <form className="shrink-0 border-t border-slate-100 bg-white p-3" onSubmit={submit}>
        <div className="mx-auto flex max-w-4xl items-center gap-2">
          <input className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[13px] font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 lg:rounded-xl" name="message" placeholder={copy.placeholder} autoComplete="off" disabled={loading}/>
          <button className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#16A34A] px-4 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(22,163,74,0.22)] transition hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-60 lg:rounded-xl" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={16}/> : <Bot size={16}/>}
            {copy.send}
          </button>
        </div>
      </form>
    </section>);
}

export function SocialMetric({ label, value, tone, icon }: {
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
    return (<div className="flex min-w-0 items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[11px] text-slate-400">{label}</p>
        <p className="mt-1 truncate text-sm font-semibold text-slate-950">{value}</p>
      </div>
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</span>
    </div>);
}

export function ProfileView({ session, request, onProfileUpdated, onInstall, showInstall, onLogout, onBack }: {
    session: Session;
    request: <T>(path: string, options?: RequestInit) => Promise<T>;
    onProfileUpdated: (user: Session["user"]) => void;
    onInstall: () => Promise<void>;
    showInstall: boolean;
    onLogout?: () => void;
    onBack: () => void;
}) {
    const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
    const [profileMessage, setProfileMessage] = useState<string | null>(null);
    const [avatarUrl, setAvatarUrl] = useState(session.user.avatarUrl ?? "");
    const [profileQrDataUrl, setProfileQrDataUrl] = useState("");
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [isEditingPassword, setIsEditingPassword] = useState(false);
    useEffect(() => {
        setAvatarUrl(session.user.avatarUrl ?? "");
    }, [session.user.avatarUrl]);
    useEffect(() => {
        const identifier = session.user.username || session.user.email || session.user.id;
        QRCode.toDataURL(`finance-ai:user:${identifier}`, {
            width: 220,
            margin: 1,
            color: { dark: "#16A34A", light: "#FFFFFF" }
        }).then(setProfileQrDataUrl).catch(() => setProfileQrDataUrl(""));
    }, [session.user.email, session.user.id, session.user.username]);
    const chooseAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
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
        }
        catch (err) {
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
            setIsEditingPassword(false);
        }
        catch (err) {
            setPasswordMessage(err instanceof Error ? err.message : "Password gagal diubah");
        }
    };
    return (<div className="mx-auto max-w-3xl space-y-3">
      <div className="flex items-center">
        <button type="button" className="app-back-button" onClick={onBack}><ArrowLeft size={14}/> Kembali</button>
      </div>
      <section className="overflow-hidden rounded-[26px] border border-emerald-100 bg-gradient-to-br from-white to-emerald-50 p-4 text-slate-950 shadow-soft lg:rounded-2xl lg:p-5">
        <div className="flex items-start gap-3">
          {avatarUrl ? (<img className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-4 ring-white shadow-sm lg:rounded-2xl" src={avatarUrl} alt="Foto profil"/>) : (<span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-xl font-semibold text-[#16A34A] lg:rounded-2xl">{session.user.fullName.slice(0, 1).toUpperCase()}</span>)}
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#16A34A]">Profil</p>
            <h2 className="mt-1 truncate text-xl font-semibold">{session.user.nickname || session.user.fullName}</h2>
            {session.user.title && <p className="truncate text-xs text-slate-500">{session.user.title}</p>}
            <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{session.user.email}</p>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-2xl border border-white bg-white/80 px-3 py-2 lg:rounded-xl"><dt className="font-medium text-slate-400">Mata uang</dt><dd className="mt-1 font-semibold text-slate-900">IDR</dd></div>
          <div className="rounded-2xl border border-white bg-white/80 px-3 py-2 lg:rounded-xl"><dt className="font-medium text-slate-400">Status akun</dt><dd className="mt-1 font-semibold text-[#16A34A]">Aktif</dd></div>
        </dl>
        {showInstall && (<button type="button" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-white px-4 py-2.5 text-xs font-semibold text-[#16A34A] transition hover:bg-emerald-50 lg:rounded-xl" onClick={onInstall}>
            <Download size={15}/> Pasang aplikasi
          </button>)}
        {onLogout && (<button type="button" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-white px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 lg:hidden" onClick={onLogout}>
            <LogOut size={16}/> Logout
          </button>)}
      </section>
      <div className="space-y-3">
        {!isEditingProfile ? (<section className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-2xl lg:border-slate-200">
            <SectionHeader title="Profil saya" caption="Informasi yang tampil pada akun Anda." action={(<button type="button" className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-[#16A34A] transition active:scale-95" onClick={() => {
                    setProfileMessage(null);
                    setAvatarUrl(session.user.avatarUrl ?? "");
                    setIsEditingProfile(true);
                }}>
                  <Settings size={14}/> Edit profil
                </button>)}/>
            <dl className="divide-y divide-slate-100">
              {[
                ["Nama lengkap", session.user.fullName],
                ["Username", session.user.username ? `@${session.user.username}` : "-"],
                ["Nomor telepon", session.user.phone || "-"],
                ["Nama panggilan", session.user.nickname || "-"],
                ["Title", session.user.title || "-"]
            ].map(([label, value]) => (<div key={label} className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="min-w-0 truncate text-right text-xs font-semibold text-slate-900">{value}</dd>
                </div>))}
            </dl>
            {profileMessage && <p className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-[#16A34A] lg:rounded-xl">{profileMessage}</p>}
            {profileQrDataUrl && (<div className="mt-4 rounded-[24px] border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Barcode profil</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">Scan untuk tambah ke pocket atau pertemanan</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">User lain bisa scan barcode ini tanpa perlu mengetik manual.</p>
                  </div>
                  <img src={profileQrDataUrl} alt="Barcode profil" className="h-24 w-24 rounded-2xl bg-white p-2 shadow-sm"/>
                </div>
              </div>)}
          </section>) : (<form className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-2xl lg:border-slate-200" onSubmit={saveProfile}>
            <SectionHeader title="Edit profil" caption="Atur identitas yang tampil di aplikasi."/>
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 lg:rounded-xl">
                {avatarUrl ? <img className="h-12 w-12 rounded-xl object-cover" src={avatarUrl} alt=""/> : <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-400"><UserRound size={20}/></span>}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-700">Foto profil</p>
                  <p className="text-[11px] text-slate-500">Gambar akan dirapikan otomatis.</p>
                </div>
                <label className="cursor-pointer rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#16A34A] shadow-sm">
                  Pilih
                  <input className="sr-only" type="file" accept="image/*,.heic,.heif" onChange={chooseAvatar}/>
                </label>
              </div>
              <Field label="Nama lengkap"><input className="input" name="fullName" defaultValue={session.user.fullName} required minLength={2}/></Field>
              <Field label="Username">
                <input className="input" name="username" defaultValue={session.user.username ?? ""} placeholder="contoh: reyandika" pattern="[a-zA-Z0-9_.]{3,40}" required/>
              </Field>
              <Field label="Nomor telepon">
                <input className="input" name="phone" type="tel" defaultValue={session.user.phone ?? ""} placeholder="Contoh: 081234567890"/>
              </Field>
              <Field label="Nickname"><input className="input" name="nickname" defaultValue={session.user.nickname ?? ""} placeholder="Nama panggilan"/></Field>
              <Field label="Title"><input className="input" name="title" defaultValue={session.user.title ?? ""} placeholder="Contoh: Student, Freelancer"/></Field>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="btn-secondary w-full" onClick={() => {
                setAvatarUrl(session.user.avatarUrl ?? "");
                setProfileMessage(null);
                setIsEditingProfile(false);
            }}>
                  Batal
                </button>
                <button className="btn-primary w-full"><CheckCircle2 size={16}/> Simpan profil</button>
              </div>
              {profileMessage && <p className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600 lg:rounded-xl">{profileMessage}</p>}
            </div>
          </form>)}

        <section className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-2xl lg:border-slate-200">
          <SectionHeader title="Keamanan akun" caption="Kelola password untuk melindungi akun Anda." action={!isEditingPassword ? (<button type="button" className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700" onClick={() => {
                    setPasswordMessage(null);
                    setIsEditingPassword(true);
                }}><ShieldCheck size={14}/> Ubah password</button>) : undefined}/>
          {!isEditingPassword ? (<div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#16A34A] shadow-sm"><ShieldCheck size={18}/></span>
              <div><p className="text-xs font-semibold text-slate-900">Password tersimpan</p><p className="mt-0.5 text-[11px] text-slate-500">Tekan Ubah password jika ingin menggantinya.</p></div>
            </div>) : (<form className="space-y-3" onSubmit={submitPassword}>
            <Field label="Password saat ini"><input className="input" name="currentPassword" type="password" placeholder="Masukkan password lama" required/></Field>
            <Field label="Password baru"><input className="input" name="newPassword" type="password" placeholder="Minimal 8 karakter" minLength={8} required/></Field>
            <div className="grid grid-cols-2 gap-2"><button type="button" className="btn-secondary w-full" onClick={() => setIsEditingPassword(false)}>Batal</button><button className="btn-primary w-full"><CheckCircle2 size={16}/> Simpan</button></div>
            {passwordMessage && <p className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600 lg:rounded-xl">{passwordMessage}</p>}
          </form>)}
        </section>
      </div>
    </div>);
}

export function AiFieldBadge({ status, language }: {
    status: "ai" | "changed" | "review" | null;
    language: AppLanguage;
}) {
    if (!status)
        return null;
    const config = {
        ai: {
            label: language === "en" ? "Filled by AI" : "Diisi AI",
            className: "bg-emerald-50 text-[#15803D]",
            icon: <CheckCircle2 size={11}/>
        },
        changed: {
            label: language === "en" ? "Edited" : "Diubah",
            className: "bg-sky-50 text-sky-700",
            icon: <CheckCircle2 size={11}/>
        },
        review: {
            label: language === "en" ? "Needs Confirmation" : "Perlu Konfirmasi",
            className: "bg-amber-50 text-amber-700",
            icon: <TriangleAlert size={11}/>
        }
    }[status];
    return (<span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold ${config.className}`}>
      {config.icon}
      {config.label}
    </span>);
}

export function storedStringSet(key: string) {
    try {
        const value = JSON.parse(localStorage.getItem(key) ?? "[]");
        return new Set<string>(Array.isArray(value) ? value.map(String) : []);
    }
    catch {
        return new Set<string>();
    }
}

export function urlBase64ToUint8Array(value: string) {
    const padding = "=".repeat((4 - value.length % 4) % 4);
    const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = window.atob(base64);
    const bytes = new Uint8Array(raw.length);
    for (let index = 0; index < raw.length; index += 1)
        bytes[index] = raw.charCodeAt(index);
    return bytes.buffer;
}

export function transactionDateKey(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return "unknown";
    return jakartaDateParts(date).value;
}

export function transactionDateLabel(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return "Tanggal tidak valid";
    const today = jakartaDateParts();
    const yesterdayDate = new Date(Date.UTC(today.year, today.month - 1, today.day - 1, 12));
    const currentKey = jakartaDateParts(date).value;
    if (currentKey === today.value)
        return "Hari ini";
    if (currentKey === jakartaDateParts(yesterdayDate).value)
        return "Kemarin";
    return localDate(value);
}


export function groupTransactionsByDate(rows: Transaction[]) {
    const groups: Array<{
        key: string;
        label: string;
        rows: Transaction[];
        net: number;
    }> = [];
    const byKey = new Map<string, {
        key: string;
        label: string;
        rows: Transaction[];
        net: number;
    }>();
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

export function transactionTitle(row: Transaction) {
    return row.merchantName ?? row.categoryName ?? "Transaksi";
}

export function transactionCategoryIcon(row: Transaction) {
    const category = row.categoryName?.toLowerCase() ?? "";
    if (row.transactionType === "income") {
        if (category.includes("gaji"))
            return <Wallet size={18}/>;
        if (category.includes("bonus"))
            return <Sparkles size={18}/>;
        if (category.includes("penjualan"))
            return <Store size={18}/>;
        if (category.includes("investasi"))
            return <TrendingUp size={18}/>;
        if (category.includes("usaha"))
            return <Briefcase size={18}/>;
        return <CirclePlus size={18}/>;
    }
    if (category.includes("makan"))
        return <Utensils size={18}/>;
    if (category.includes("transport"))
        return <Bus size={18}/>;
    if (category.includes("belanja"))
        return <ShoppingBag size={18}/>;
    if (category.includes("tagihan"))
        return <ReceiptText size={18}/>;
    if (category.includes("kesehatan"))
        return <HeartPulse size={18}/>;
    if (category.includes("pendidikan"))
        return <GraduationCap size={18}/>;
    if (category.includes("hiburan"))
        return <Film size={18}/>;
    if (category.includes("cicilan"))
        return <CreditCard size={18}/>;
    if (category.includes("investasi"))
        return <TrendingUp size={18}/>;
    return <CircleMinus size={18}/>;
}

export function transactionIconClass(row: Transaction) {
    if (row.transactionType === "income")
        return "bg-emerald-50 text-[#16A34A]";
    const category = row.categoryName?.toLowerCase() ?? "";
    if (category.includes("makan"))
        return "bg-orange-50 text-orange-600";
    if (category.includes("transport"))
        return "bg-[#16A34A]/10 text-[#16A34A]";
    if (category.includes("belanja"))
        return "bg-violet-50 text-violet-600";
    return "bg-slate-100 text-slate-700";
}

export function TransactionHistoryItem({ row, onOpen, onRemove, compact = false, selected = false, selectionMode = false, onToggleSelect, onLongPress }: {
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
        if (dragStartX.current === null)
            return;
        const delta = event.clientX - dragStartX.current;
        const verticalDelta = dragStartY.current === null ? 0 : event.clientY - dragStartY.current;
        if (Math.abs(delta) > 8 || Math.abs(verticalDelta) > 8) {
            dragged.current = true;
            clearHoldTimer();
        }
        if (!canSwipeDelete)
            return;
        if (delta < -42)
            setDeleteRevealed(true);
        if (delta > 42)
            setDeleteRevealed(false);
    };
    const handlePointerUp = () => {
        clearHoldTimer();
        if (dragged.current)
            suppressClickUntil.current = Date.now() + 250;
        dragStartX.current = null;
        dragStartY.current = null;
        dragged.current = false;
    };
    const handleOpen = () => {
        if (Date.now() < suppressClickUntil.current)
            return;
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
    return (<div className="relative overflow-hidden bg-white">
      {canSwipeDelete && deleteRevealed && (<button type="button" className="absolute inset-y-0 right-0 flex w-20 items-center justify-center bg-rose-500 text-white" onClick={onRemove} aria-label="Hapus transaksi">
          <Trash2 size={18}/>
        </button>)}
      <article className={`relative select-none px-4 py-3.5 transition hover:bg-slate-50 ${selected ? "bg-emerald-50/80" : "bg-white"} ${deleteRevealed ? "-translate-x-20" : "translate-x-0"} ${compact ? "lg:px-3" : "lg:px-5"} ${onOpen || selectionMode ? "cursor-pointer" : ""}`} role={onOpen ? "button" : undefined} tabIndex={onOpen ? 0 : undefined} onClick={handleOpen} onKeyDown={(event) => {
            if ((event.key === "Enter" || event.key === " ") && (onOpen || selectionMode)) {
                event.preventDefault();
                if (selectionMode) {
                    onToggleSelect?.();
                }
                else {
                    onOpen?.();
                }
            }
        }} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}>
        <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition ${selected ? "bg-[#16A34A] text-white shadow-[0_10px_20px_rgba(22,163,74,0.18)]" : transactionIconClass(row)}`}>
            {selected ? <CheckCircle2 size={18}/> : transactionCategoryIcon(row)}
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
            {!compact && <ChevronRight size={14} className="text-slate-300"/>}
          </div>
          <p className="mt-1 text-[11px] font-semibold text-slate-400">{isIncome ? "Pemasukan" : "Pengeluaran"}</p>
        </div>
      </div>
      </article>
    </div>);
}

export function TransactionList({ rows }: {
    rows: Transaction[];
}) {
    if (rows.length === 0)
        return <EmptyState text="Belum ada transaksi."/>;
    return (<div className="overflow-hidden rounded-2xl border border-slate-100 bg-white lg:rounded-2xl">
      {rows.map((row) => (<TransactionHistoryItem key={row.id} row={row} compact/>))}
    </div>);
}

export function LegacyTransactionList({ rows }: {
    rows: Transaction[];
}) {
    if (rows.length === 0)
        return <EmptyState text="Belum ada transaksi."/>;
    return (<div className="space-y-3">
      {rows.map((row) => (<div key={row.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3 lg:rounded-xl">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${row.transactionType === "income" ? "bg-emerald-50 text-[#16A34A]" : "bg-rose-50 text-rose-600"}`}>
              {row.transactionType === "income" ? <ArrowDownLeft size={19}/> : <ArrowUpRight size={19}/>}
            </span>
            <div className="min-w-0">
              <p className="truncate font-bold">{row.merchantName ?? row.categoryName ?? "Transaksi"}</p>
              <p className="truncate text-xs text-slate-500">{row.categoryName ?? row.sourceType ?? "Manual"} Ãƒâ€šÃ‚Â· {row.accountName}</p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className={`font-semibold ${row.transactionType === "income" ? "text-[#16A34A]" : "text-slate-950"}`}>
              {row.transactionType === "income" ? "+" : "-"}{rupiah(row.amount)}
            </p>
            <p className="text-xs text-slate-400">{localDate(row.transactionDate)}</p>
          </div>
        </div>))}
    </div>);
}

export function QrScanner({ onScan, onClose, request, selectedPocketId }: {
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
                if (cancelled) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current)
                    videoRef.current.srcObject = stream;
            }
            catch {
                if (!cancelled)
                    setError("Tidak dapat mengakses kamera");
            }
        };
        startCamera();
        return () => {
            cancelled = true;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
            }
        };
    }, []);
    useEffect(() => {
        if (!scanning || !videoRef.current)
            return;
        let animId: number;
        const tick = () => {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!video || !canvas || video.readyState < 2) {
                animId = requestAnimationFrame(tick);
                return;
            }
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                animId = requestAnimationFrame(tick);
                return;
            }
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
    return (<div data-scroll-lock="true" className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between bg-black/80 px-4 py-3">
        <button type="button" className="app-back-button app-back-button-on-dark" onClick={onClose}>
          <ArrowLeft size={14}/> Kembali
        </button>
        <p className="text-sm font-semibold text-white">Scan barcode user</p>
        <div className="w-5"/>
      </div>
      <div className="relative flex flex-1 items-center justify-center">
        {error ? (<div className="rounded-xl bg-white/10 px-6 py-4 text-center text-sm text-white">{error}</div>) : (<>
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover"/>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-48 w-48 rounded-2xl border-2 border-emerald-400 shadow-[0_0_40px_rgba(52,211,153,0.3)]"/>
            </div>
            <canvas ref={canvasRef} className="hidden"/>
          </>)}
      </div>
      <div className="bg-black/80 px-4 py-4 text-center text-xs text-white/60">
        Arahkan kamera ke barcode QR user lain
      </div>
    </div>);
}

