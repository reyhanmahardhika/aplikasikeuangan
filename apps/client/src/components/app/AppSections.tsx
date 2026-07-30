/*
 * Generated from App.tsx by refactor-app-final.cjs.
 * This module temporarily contains the remaining legacy sections.
 * Split it further by feature after the application builds successfully.
 */

import { ApiError, apiFetch, downloadUrl } from "../../lib/api";
import type { Account, AiTrackedField, AppLanguage, AssistantContext, AssistantMessage, BudgetRow, CashFlowReportRow, Category, CategoryReportRow, ChildFrameState, DashboardSummary, GroupDetail, ManageTab, ManualDraft, MonthlyReportRow, ParsedManualTransaction, PocketVisual, Schedule, SocialActivity, SocialFriend, SocialGroup, SocialSummary, SocialWallet, Transaction, TransactionDetail, View, WalletDetail, WalletReminder } from "../../types/app";
import { ArrowDownLeft, ArrowLeft, ArrowLeftRight, ArrowUpRight, Banknote, Bell, Briefcase, Bus, CalendarDays, Camera, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleMinus, CirclePlus, CreditCard, Download, Eye, FileSpreadsheet, Film, GraduationCap, GripVertical, HeartPulse, Landmark, Lightbulb, ListFilter, Loader2, LogOut, MessageCircle, QrCode, Search, Share2, ShieldCheck, ShoppingBag, Smartphone, Sparkles, Store, Trash2, TrendingUp, TriangleAlert, Upload, UserPlus, UserRound, Utensils, X, Plus, LineChart, Wallet, Settings, ReceiptText, Bot, Tags, CircleDollarSign, LucideIcon, Users } from "lucide-react";
import type { Session } from "../../lib/api";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { APP_TIME_ZONE, formatRupiahInput, isoDateInput, jakartaDateParts, localDate, rupiah } from "../../lib/format";
import { resolveAsyncContentState } from "../../lib/asyncContentState";
import { currentMonthDateBounds, dateFilterIso, moneyInputValue } from "../../lib/appHelpers";
import heic2any from "heic2any";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { WalletAccountEditModal } from "../SharedWalletEditModals";
import type { PointerEvent as ReactPointerEvent } from "react";
import { AuthView, GoogleLogo, loadAuthScript } from "./AppAuth";
import { queueDebugLog } from "./AppChrome";
import { categoryPalette, DashboardMetric, DashboardView, ExpenseDonut, handleMoneyInput, MiniCashFlowChart } from "./AppDashboard";
import { DataErrorState, EmptyState, Field, LoadingState } from "./AppPrimitives";
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
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl lg:h-10 lg:w-10 lg:rounded-md ${tones[tone]}`}>{icon}</span>
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
        else if (/kopi|coffee|cafe|cafÃ¯Â¿Â½/.test(context)) {
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
    const transactionAccounts = accounts.filter((account) => (!account.isSharedWalletAccount && account.canEdit !== false) || account.id === editing?.accountId);
    const [transactionType, setTransactionType] = useState<"income" | "expense">(editing?.transactionType ?? initialType);
    const initialDraft = useMemo<ManualDraft>(() => ({
        accountId: (editing?.accountId ?? initialAccountId) || "",
        transactionDate: editing ? editing.transactionDate.slice(0, 10) : isoDateInput(),
        amount: moneyInputValue(editing?.amount),
        categoryId: editing?.categoryId ?? "",
        merchantName: editing?.merchantName ?? "",
        paymentMethod: pocketPaymentMethod(accounts.find((account) => account.id === (editing?.accountId ?? initialAccountId))),
        notes: editing?.notes ?? ""
    }), [accounts, editing?.accountId, editing?.amount, editing?.categoryId, editing?.id, editing?.merchantName, editing?.notes, editing?.transactionDate, initialAccountId]);
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
        account: "Pocket",
        currentBalance: "Saldo saat ini",
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
    }, [editing?.id, initialDraft, initialType, resetKey]);
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
            try {
                const uploaded = await request<{
                    id: string;
                }>("/receipts/upload", { method: "POST", body: uploadForm });
                setAttachmentReceiptId(uploaded.id);
            }
            catch (err) {
                const duplicateId = err instanceof ApiError && err.status === 409 && err.details && typeof err.details === "object"
                    ? String((err.details as {
                        receiptId?: unknown;
                    }).receiptId ?? "")
                    : "";
                if (!duplicateId)
                    throw err;
                setAttachmentReceiptId(duplicateId);
            }
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
                transactionDate: parsed.transactionDate.slice(0, 10),
                amount: moneyInputValue(parsed.amount),
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
            transactionDate: dateFilterIso(String(form.get("transactionDate")), "start"),
            amount: String(form.get("amount")),
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
        catch {
            setError(null);
            setErrorContext("submit");
        }
        finally {
            setLoading(false);
        }
    };
    const filteredCategories = categories.filter((category) => category.categoryType === transactionType);
    const selectedAccount = accounts.find((account) => account.id === draft.accountId);
    const selectedBudget = budgets.find((budget) => budget.categoryId === draft.categoryId);
    const nextExpenseAmount = transactionType === "expense" ? Number(String(draft.amount).replace(/[^\d]/g, "")) : 0;
    const budgetAfterUse = selectedBudget ? moneyValue(selectedBudget.used) + nextExpenseAmount : 0;
    const budgetAfterPercent = selectedBudget && moneyValue(selectedBudget.budgetAmount) > 0 ? Math.round((budgetAfterUse / moneyValue(selectedBudget.budgetAmount)) * 100) : 0;
    return (<section className="mx-auto max-w-4xl space-y-3 lg:space-y-5">
      {!editing && (<div className="overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-soft lg:rounded-lg lg:border-slate-200">
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
              <textarea className="mt-1 min-h-28 w-full resize-none rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:cursor-wait disabled:opacity-70 lg:rounded-md" value={freeText} onChange={(event) => setFreeText(event.target.value)} onKeyDown={(event) => {
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

            {parseLoading && (<div className="grid grid-cols-2 gap-2 rounded-[18px] border border-emerald-100 bg-emerald-50/60 p-3 sm:grid-cols-4 lg:rounded-md">
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

            <button type="button" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(22,163,74,0.18)] transition hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-60 lg:rounded-md" onClick={parseFreeText} disabled={parseLoading}>
              {parseLoading ? <Loader2 className="animate-spin" size={17}/> : <Sparkles size={17}/>}
              {parseLoading ? copy.analyzing : copy.analyze}
            </button>
            {transactionAccounts.length === 0 && (<p className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-center text-[11px] text-amber-700">
                <TriangleAlert size={13}/>
                {copy.addAccountFirst}
              </p>)}

            {error && errorContext === "parse" && (<p className="rounded-2xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 lg:rounded-md">{error}</p>)}
          </div>
        </div>)}

      <div ref={formCardRef} className={`scroll-mt-24 overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-soft lg:rounded-lg lg:border-slate-200 ${parseResult ? "ai-form-enter" : ""}`}>
        <div className="border-b border-slate-100 bg-white px-4 py-4 lg:px-5">
          {editing && (<button type="button" className="app-back-button mb-4" onClick={onCancel}>
              <ArrowLeft size={14}/> Kembali
            </button>)}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl lg:rounded-md ${transactionType === "income" ? "bg-emerald-50 text-[#16A34A]" : "bg-rose-50 text-rose-600"}`}>
                {transactionType === "income" ? <ArrowDownLeft size={18}/> : <ArrowUpRight size={18}/>}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase text-[#16A34A]">{editing ? "Edit" : copy.confirmation}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="mt-0.5 text-base font-semibold tracking-normal text-slate-950">
                    {editing ? "Edit transaksi" : copy.confirmTitle}
                  </h2>
                  {parseResult && (<span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-[#15803D]">
                      {Math.round(parseResult.confidenceScore * 100)}% {copy.confident}
                    </span>)}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {editing ? "Ubah data yang diperlukan lalu simpan." : copy.confirmSubtitle}
                </p>
              </div>
            </div>
            <div className="w-full sm:w-fit">
              <div className="mb-1 flex justify-end">
                <AiFieldBadge status={aiFieldStatus("transactionType")} language={language}/>
              </div>
              <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1 lg:rounded-md">
              <button type="button" className={`rounded-xl px-3 py-2 text-sm font-semibold transition lg:rounded-md ${transactionType === "income" ? "bg-white text-[#15803D] shadow-sm" : "text-slate-500"}`} onClick={() => {
            markFieldChanged("transactionType");
            setTransactionType("income");
        }}>
                {copy.income}
              </button>
              <button type="button" className={`rounded-xl px-3 py-2 text-sm font-semibold transition lg:rounded-md ${transactionType === "expense" ? "bg-white text-rose-700 shadow-sm" : "text-slate-500"}`} onClick={() => {
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
            <Field label={language === "en" ? "Transaction pocket" : "Pocket transaksi"}>
              {selectedAccount ? (<div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 lg:rounded-md">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">{selectedAccount.name}</p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">{[accountTypeLabel(selectedAccount.accountType), selectedAccount.providerName].filter(Boolean).join(" · ")}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] text-slate-400">{copy.currentBalance}</p>
                      <p className="mt-0.5 text-xs font-bold text-slate-900">{rupiah(selectedAccount.currentBalance)}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] font-medium text-[#15803D]">{language === "en" ? "This transaction will use this pocket." : "Transaksi ini akan menggunakan pocket ini."}</p>
                </div>) : (<p className="rounded-2xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                  {language === "en" ? "Open this form from a pocket detail first." : "Buka form transaksi melalui detail pocket terlebih dahulu."}
                </p>)}
            </Field>
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
          <Field label={copy.category} hint={<AiFieldBadge status={aiFieldStatus("categoryId")} language={language}/>}>
            <select className="input" name="categoryId" value={draft.categoryId} onChange={(event) => {
            markFieldChanged("categoryId");
            setDraft((current) => ({ ...current, categoryId: event.target.value }));
        }}>
              <option value="">{copy.uncategorized}</option>
              {filteredCategories.map((category) => (<option key={category.id} value={category.id}>{category.name}</option>))}
            </select>
          </Field>
          {transactionType === "expense" && selectedBudget && (<div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 text-xs md:col-span-2 lg:rounded-md">
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
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 md:col-span-2 lg:rounded-md">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-700">Attachment transaksi</p>
                <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                  Tambahkan gambar atau video sebagai bukti pendukung transaksi.
                </p>
              </div>
              <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#16A34A] shadow-sm ring-1 ring-slate-200 transition hover:bg-emerald-50 lg:rounded-md">
                {attachmentLoading ? <Loader2 className="animate-spin" size={14}/> : <Upload size={14}/>}
                {attachmentReceiptId ? "Ganti" : "Pilih file"}
                <input className="sr-only" type="file" accept="image/*,video/*,.heic,.heif" onChange={uploadAttachment} disabled={attachmentLoading}/>
              </label>
            </div>
            {(attachmentName || editing?.receiptId) && (<div className="mt-2 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs text-slate-600 lg:rounded-md">
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
          {error && errorContext === "submit" && <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 md:col-span-2 lg:rounded-md">{error}</p>}
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

export function TransactionDetailView({ transaction, token, request, onBack, onEdit, onDelete }: {
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
          {detailRows.map(([label, value]) => (<div key={label} className="rounded-2xl bg-slate-50 px-3 py-2.5 lg:rounded-md">
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
            {attachmentPreviewLoading ? (<div className="flex h-44 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 lg:rounded-md">
                <Loader2 className="animate-spin" size={22}/>
              </div>) : attachmentPreviewUrl && attachmentContentType.startsWith("video/") ? (<video className="max-h-[520px] w-full rounded-2xl bg-black lg:rounded-md" src={attachmentPreviewUrl} controls preload="metadata">
                Browser tidak mendukung preview video ini.
              </video>) : attachmentPreviewUrl && attachmentContentType.startsWith("image/") ? (<button type="button" className="block w-full overflow-hidden rounded-2xl bg-slate-100 lg:rounded-md" onClick={() => window.open(attachmentPreviewUrl, "_blank", "noopener,noreferrer")} aria-label="Buka attachment ukuran penuh">
                <img className="max-h-[520px] w-full object-contain" src={attachmentPreviewUrl} alt="Attachment transaksi"/>
              </button>) : attachmentOriginalUrl ? (<button type="button" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-50 px-4 py-8 text-sm font-semibold text-[#16A34A] lg:rounded-md" onClick={() => window.open(attachmentOriginalUrl, "_blank", "noopener,noreferrer")}>
                <ReceiptText size={18}/> Buka attachment
              </button>) : (<p className="rounded-2xl bg-rose-50 px-3 py-3 text-xs text-rose-700 lg:rounded-md">
                Attachment tidak dapat dimuat.
              </p>)}
          </div>)}

        {transaction.canManage !== false && (<div className="grid grid-cols-[1fr_auto] gap-2 border-t border-slate-100 p-5">
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
        }
        catch {
            setMessage(null);
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200 lg:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase text-[#16A34A]">Scan struk</p>
            <h2 className="mt-0.5 text-lg font-semibold text-slate-950">Upload atau foto struk</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">Pilih sumber, cek preview, lalu proses OCR.</p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#16A34A] lg:rounded-md">
            <Camera size={18}/>
          </span>
        </div>

        <input ref={cameraInputRef} className="sr-only" type="file" accept="image/*" capture="environment" onChange={selectFile}/>
        <input ref={galleryInputRef} className="sr-only" type="file" accept="image/jpeg,image/png" onChange={selectFile}/>
        <input ref={fileInputRef} className="sr-only" type="file" accept="image/jpeg,image/png,application/pdf" onChange={selectFile}/>

        <div className="grid grid-cols-3 gap-2">
          <button type="button" className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-3 text-xs font-semibold text-slate-700 transition hover:border-emerald-100 hover:bg-emerald-50 hover:text-[#16A34A] lg:rounded-md" onClick={() => cameraInputRef.current?.click()}>
            <Camera size={18}/> Kamera
          </button>
          <button type="button" className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-3 text-xs font-semibold text-slate-700 transition hover:border-emerald-100 hover:bg-emerald-50 hover:text-[#16A34A] lg:rounded-md" onClick={() => galleryInputRef.current?.click()}>
            <ReceiptText size={18}/> Galeri
          </button>
          <button type="button" className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-3 text-xs font-semibold text-slate-700 transition hover:border-emerald-100 hover:bg-emerald-50 hover:text-[#16A34A] lg:rounded-md" onClick={() => fileInputRef.current?.click()}>
            <Upload size={18}/> File
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-[22px] border border-dashed border-slate-200 bg-slate-50 lg:rounded-md">
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
              <input className="input" type="date" name="transactionDate" defaultValue={parsed.transactionDate ?? isoDateInput()} required/>
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
        ? new Intl.DateTimeFormat(locale, { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" }).format(selectedDate)
        : (locale === "en-US" ? "Select date" : "Pilih tanggal");
    const todayValue = todayParts.value;
    return (<div ref={rootRef} className="relative min-w-0">
      <button type="button" className={`flex h-11 w-full items-center justify-between gap-2 rounded-2xl border bg-white px-3 py-0 text-left transition lg:rounded-md ${open ? "border-emerald-400 ring-2 ring-emerald-100" : "border-slate-200 hover:border-emerald-300"}`} onClick={() => setOpen((current) => !current)} aria-expanded={open}>
        <span className="min-w-0">
          {showLabel && <span className="block text-[10px] font-semibold uppercase text-slate-400">{label}</span>}
          <span className={`${showLabel ? "mt-1" : ""} block truncate text-xs font-semibold text-slate-800`}>{displayValue}</span>
        </span>
        <CalendarDays size={15} className="shrink-0 text-slate-400"/>
      </button>

      {open && (<div className={`absolute top-[calc(100%+8px)] z-40 w-[min(18rem,calc(100vw-2.5rem))] rounded-[20px] border border-slate-100 bg-white p-3 shadow-[0_22px_55px_rgba(15,23,42,0.18)] ${align === "right" ? "right-0" : "left-0"}`}>
          <div className="flex items-center justify-between">
            <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50" onClick={() => setVisibleMonth(new Date(Date.UTC(year, month - 1, 1, 12)))} aria-label="Bulan sebelumnya">
              <ChevronLeft size={18}/>
            </button>
            <p className="text-sm font-semibold text-slate-900">
              {new Intl.DateTimeFormat(locale, { timeZone: "UTC", month: "long", year: "numeric" }).format(visibleMonth)}
            </p>
            <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50" onClick={() => setVisibleMonth(new Date(Date.UTC(year, month + 1, 1, 12)))} aria-label="Bulan berikutnya">
              <ChevronRight size={18}/>
            </button>
          </div>
          <div className="mt-2 grid grid-cols-7">
            {weekdayLabels.map((day, index) => (<span key={`${day}-${index}`} className="flex h-8 items-center justify-center text-[10px] font-semibold text-slate-400">{day}</span>))}
            {days.map((date) => {
                const dateValue = toValue(date);
                const selected = dateValue === value;
                const today = dateValue === todayValue;
                const currentMonth = date.getUTCMonth() === month;
                return (<button key={dateValue} type="button" className={`mx-auto flex h-9 w-9 items-center justify-center rounded-xl text-xs transition ${selected
                        ? "bg-[#16A34A] font-semibold text-white shadow-sm"
                        : today
                            ? "bg-emerald-50 font-semibold text-[#16A34A]"
                            : currentMonth
                                ? "text-slate-700 hover:bg-slate-100"
                                : "text-slate-300 hover:bg-slate-50"}`} onClick={() => {
                        onChange(dateValue);
                        setOpen(false);
                    }}>
                  {date.getUTCDate()}
                </button>);
            })}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
            {allowClear ? (<button type="button" className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50" onClick={() => onChange("")}>
                {language === "en" ? "Clear" : "Hapus"}
              </button>) : <span />}
            <button type="button" className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-[#16A34A]" onClick={() => {
                onChange(todayValue);
                setOpen(false);
            }}>{language === "en" ? "Today" : "Hari ini"}</button>
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
            load(search, type, fromDate, toDate, accountId).catch(console.error);
        }, 300);
        return () => window.clearTimeout(timer);
    }, [search, type, fromDate, toDate, accountId]);
    useEffect(() => {
        onRegisterRefresh?.(() => load(search, type, fromDate, toDate, accountId));
    }, [accountId, fromDate, onRegisterRefresh, search, toDate, type]);
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
        setShowDateFilter(false);
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
          <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={15}/>
          <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-9 py-2.5 text-[13px] font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 lg:rounded-md" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari transaksi"/>
          {search && (<button type="button" className="absolute right-2 top-1.5 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Bersihkan pencarian" title="Bersihkan pencarian" onClick={() => setSearch("")}>
              <X size={14}/>
            </button>)}
        </div>

        <div className="mt-3 grid grid-cols-3 rounded-2xl bg-slate-100 p-1 lg:max-w-sm lg:rounded-md">
          {typeOptions.map((option) => (<button key={option.value} type="button" className={`rounded-xl px-3 py-2 text-xs font-semibold transition lg:rounded-md ${type === option.value ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`} onClick={() => applyType(option.value)}>
              {option.label}
            </button>))}
        </div>

        <label className="mt-3 block">
          <span className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">Pocket</span>
          <select className="input" value={accountId} onChange={(event) => setAccountId(event.target.value)} aria-label="Filter berdasarkan pocket">
            <option value="">Semua pocket</option>
            {accounts.map((account) => (<option key={account.id} value={account.id}>{accountOptionLabel(account, { language })}</option>))}
          </select>
        </label>

        <div className="mt-3">
          <button type="button" className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-xs font-semibold text-slate-700" onClick={() => setShowDateFilter(true)}>
            <span className="inline-flex items-center gap-2">
              <ListFilter size={15} className="text-[#16A34A]"/>
              {language === "en" ? "Date filter" : "Filter tanggal"}
            </span>
            <span className="text-[#16A34A]">
              {datePreset === "today" ? (language === "en" ? "Today" : "Hari ini")
                : datePreset === "last7" ? (language === "en" ? "Last 7 days" : "7 hari terakhir")
                    : datePreset === "month" ? (language === "en" ? "This month" : "Bulan ini")
                        : datePreset === "custom" ? (language === "en" ? "Custom" : "Kustom")
                            : (language === "en" ? "All dates" : "Semua tanggal")}
            </span>
          </button>
        </div>

        {showDateFilter && (<>
          <button type="button" data-scroll-lock="true" className="fixed inset-0 z-40 cursor-default bg-slate-950/25 backdrop-blur-[1px]" aria-label={language === "en" ? "Close date filter" : "Tutup filter tanggal"} onClick={() => setShowDateFilter(false)}/>
          <section className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-md rounded-[26px] border border-slate-100 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.24)] lg:bottom-auto lg:left-auto lg:right-8 lg:top-24 lg:mx-0 lg:w-96 lg:rounded-lg">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">{language === "en" ? "Date filter" : "Filter tanggal"}</h2>
                <p className="mt-1 text-xs text-slate-500">{language === "en" ? "Choose a transaction period." : "Pilih periode transaksi."}</p>
              </div>
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50" onClick={() => setShowDateFilter(false)}><X size={16}/></button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
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
            {datePreset === "custom" && (<button type="button" className="btn-primary mt-4 w-full" onClick={() => setShowDateFilter(false)}>
              {language === "en" ? "Apply filter" : "Terapkan filter"}
            </button>)}
          </section>
        </>)}

        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
          <p className="text-[11px] font-bold text-slate-400">Export</p>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50" onClick={() => exportFile("csv")}><Download size={13}/> CSV</button>
            <button className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50" onClick={() => exportFile("excel")}><FileSpreadsheet size={13}/> Excel</button>
          </div>
        </div>
      </div>

      {selectedCount > 0 && (<div className="sticky top-16 z-20 rounded-[22px] border border-emerald-100 bg-white/95 p-3 shadow-soft backdrop-blur lg:top-20 lg:rounded-lg">
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

      {!loading && rows.length > 0 && selectedCount === 0 && (<div className="overflow-x-auto rounded-[20px] border border-white/80 bg-white/85 px-3 py-2 shadow-soft backdrop-blur lg:rounded-lg">
          <div className="flex min-w-max items-center gap-2 text-[11px] font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[#16A34A]">
              <ChevronRight size={12}/> Tap detail
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
              <CheckCircle2 size={12}/> Tahan pilih
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-rose-500">
              <ArrowLeft size={12}/> Swipe hapus
            </span>
          </div>
        </div>)}

      <div className="space-y-3">
        {loading ? <LoadingState /> : loadError ? <DataErrorState message={loadError} onRetry={() => { load().catch(() => undefined); }}/> : rows.length === 0 ? <EmptyState text="Tidak ada transaksi."/> : (groupedRows.map((group) => (<section key={group.key} className="overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-soft lg:rounded-lg lg:border-slate-200">
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

export function accountTypeLabel(type: string) {
    const labels: Record<string, string> = {
        cash: "Tunai",
        bank: "Rekening",
        e_wallet: "E-wallet",
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

export const pocketCardColors = ["#16A34A", "#0F766E", "#111827", "#2563EB", "#7C3AED", "#E11D48"];
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
    return (<div className={`mb-3 flex gap-3 ${isBackAction ? "flex-col items-start" : "items-start justify-between"}`}>
      {isBackAction && action}
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        {caption && <p className="mt-0.5 text-xs font-semibold text-slate-500">{caption}</p>}
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
        return (<section className="mx-auto max-w-6xl space-y-3 lg:space-y-5">
        <div className="flex items-center justify-between rounded-[20px] border border-slate-100 bg-white p-3 shadow-soft lg:rounded-lg">
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
      <div className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-soft lg:rounded-lg">
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase text-[#16A34A]">{isEnglish ? "Settings" : "Atur"}</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">{isEnglish ? "Finance & reminders" : "Keuangan & pengingat"}</h2>
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
            return (<button key={tab.id} type="button" className={`ripple-card flex min-h-[88px] items-center gap-3 rounded-[18px] border p-3 text-left transition lg:rounded-md ${active ? "border-emerald-200 bg-emerald-50/70" : "border-slate-100 bg-white hover:border-emerald-100 hover:bg-slate-50"}`} onClick={() => openSection(tab.id)}>
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
        }
        catch {
            setError(null);
        }
    };
    const remove = async (id: string) => {
        if (!window.confirm("Hapus jadwal ini?"))
            return;
        await request(`/schedules/${id}`, { method: "DELETE" });
        await load();
    };
    return (<div className="space-y-3">
      {scheduleView === "list" && (<section className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200">
        <SectionHeader title="Jadwal & pemberitahuan" caption="Pengingat pembayaran, top up, atau transfer rutin." action={(<button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-[#16A34A]" onClick={() => {
                    setError(null);
                    setEditingSchedule(null);
                    setScheduleView("form");
                }}>
              <Plus size={14}/> Tambah
            </button>)}/>
        {loading ? <LoadingState /> : schedules.length === 0 ? (<EmptyState text="Belum ada jadwal. Tambahkan pengingat rutin pertama Anda."/>) : (<div className="grid gap-2 md:grid-cols-2">
            {schedules.map((schedule) => (<article key={schedule.id} className="rounded-2xl border border-slate-100 bg-white px-3 py-3 lg:rounded-md">
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

      {scheduleView === "form" && (<form key={editingSchedule?.id ?? "new-schedule"} className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200" onSubmit={submit}>
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
            <Field label="Tanggal rutin">
              <input className="input" name="dueDay" type="number" min={1} max={31} defaultValue={editingSchedule?.dueDay ?? 1} required/>
            </Field>
          </div>
          <Field label="Jatuh tempo berikutnya">
            <input className="input" name="nextDueDate" type="date" defaultValue={editingSchedule?.nextDueDate ? isoDateInput(new Date(editingSchedule.nextDueDate)) : isoDateInput()} required/>
          </Field>
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
          {error && <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 lg:rounded-md">{error}</p>}
        </div>
      </form>)}
    </div>);
}

export function AccountsView({ accounts, request, onChanged, onAddTransaction, onOpenTransactions, onChildFrameStateChange, initialView = "list", initialSelectedPocketId = "", resetKey = 0, language = "id" }: {
    accounts: Account[];
    request: <T>(path: string, options?: RequestInit) => Promise<T>;
    onChanged: () => Promise<void>;
    onAddTransaction?: (accountId: string) => void;
    onOpenTransactions: (accountId: string, fromDate?: string) => void;
    onChildFrameStateChange?: (state: ChildFrameState) => void;
    initialView?: "list" | "account-form" | "transfer-form" | "pocket-detail";
    initialSelectedPocketId?: string;
    resetKey?: number;
    language?: AppLanguage;
}) {
    const [error, setError] = useState<string | null>(null);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [accountView, setAccountView] = useState<"list" | "account-form" | "transfer-form" | "pocket-detail">(initialView);
    const [pocketTab, setPocketTab] = useState<"mine" | "shared">("mine");
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
    const [pocketTransactionRows, setPocketTransactionRows] = useState<Transaction[]>([]);
    const [pocketTransactionLoading, setPocketTransactionLoading] = useState(false);
    const [targetBalanceDraft, setTargetBalanceDraft] = useState("");
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
    }>>>({});
    const pocketPreviewLoadingRef = useRef<Set<string>>(new Set());
    const [showPocketMembersPopup, setShowPocketMembersPopup] = useState(false);
    const [showPocketInviteModal, setShowPocketInviteModal] = useState(false);
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
    const pocketGalleryInputRef = useRef<HTMLInputElement>(null);
    const [showPocketLogoMenu, setShowPocketLogoMenu] = useState(false);
    const [showPocketStickerPicker, setShowPocketStickerPicker] = useState(false);
    const [transferMode, setTransferMode] = useState<"general" | "out" | "in">("general");
    const [sourceAccountId, setSourceAccountId] = useState("");
    const [destinationAccountId, setDestinationAccountId] = useState("");
    const [transferPocketPicker, setTransferPocketPicker] = useState<"source" | "destination" | null>(null);
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
    const transferableAccounts = useMemo(() => accounts.filter((account) => !account.isSharedWalletAccount && account.canEdit !== false), [accounts]);
    const sourceAccount = accounts.find((account) => account.id === sourceAccountId);
    const destinationAccount = accounts.find((account) => account.id === destinationAccountId);
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
    const selectedPocket = accounts.find((account) => account.id === selectedPocketId) ?? null;
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
            const transactionDate = transaction.transactionDate.slice(0, 10);
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
    }, [pocketTransactionCustomEnd, pocketTransactionCustomStart, pocketTransactionDatePreset, pocketTransactionRows, pocketTransactionSearch, pocketTransactionSort, pocketTransactionType]);
    const recentPocketTransactions = useMemo(() => filteredPocketTransactions.slice(0, 20), [filteredPocketTransactions]);
    const pocketTransactionFilterCount = (pocketTransactionDatePreset !== "all" ? 1 : 0) + (pocketTransactionSort !== "newest" ? 1 : 0);
    const pocketMembers = useMemo(() => {
        if (!selectedPocket)
            return [];
        const owner = selectedPocket.ownerUserId ? {
            userId: selectedPocket.ownerUserId,
            fullName: selectedPocket.ownerName || selectedPocket.name,
            username: "",
            avatarUrl: null as string | null,
            role: "owner",
            status: "accepted"
        } : null;
        const acceptedCollaborators = pocketCollaborators
            .filter((member) => member.status === "accepted" && member.user_id !== selectedPocket.ownerUserId)
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
    useEffect(() => {
        if (accountView !== "pocket-detail" || !selectedPocketId) {
            setPocketTransactionRows([]);
            setPocketTransactionLoading(false);
            return;
        }
        loadPocketTransactions(selectedPocketId).catch(() => undefined);
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
                        avatarUrl: null as string | null
                    }] : [];
                const acceptedMembers = rows
                    .filter((member) => member.status === "accepted" && member.user_id !== account.ownerUserId)
                    .map((member) => ({
                    userId: member.user_id,
                    fullName: member.full_name,
                    avatarUrl: member.avatar_url
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
                }>>(`/social/people/search?q=${encodeURIComponent(query)}&exact=1&purpose=pocket_invite`);
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
            setInviteSuccess(invitePermission === "member"
                ? "Undangan terkirim. User ini bisa menabung dan memakai saldo pocket."
                : "Undangan terkirim. User ini hanya bisa menabung di pocket.");
            const rows = await request<Array<{
                user_id: string;
                role: string;
                status: string;
                full_name: string;
                email: string;
                username: string;
                avatar_url: string | null;
            }>>(`/accounts/${selectedPocketId}/collaborators`);
            setPocketCollaborators(rows);
            setInviteQuery("");
            setInviteSearchResults([]);
            setInviteSelectedUser(null);
            setInvitePermission("member");
        }
        catch (err) {
            setInviteSuccess(err instanceof Error ? err.message : "Undangan gagal dikirim");
        }
        finally {
            setInviteSending(false);
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
            }>>(`/social/people/search?q=${encodeURIComponent(value)}&exact=1&purpose=pocket_invite`);
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
        setPocketTypeDraft(savedType === "cash" || savedType === "bank" || savedType === "e_wallet" ? savedType : "e_money");
        setPocketInitialBalanceDraft(editingAccount ? moneyInputValue(editingAccount.initialBalance) : "");
        setPocketProviderDraft(editingAccount?.providerName ?? "");
        setPocketNumberDraft(accountNumberParts.number);
        setPocketHolderDraft(accountNumberParts.holder);
        // Gunakan logo dan background dari server jika tersedia, jika tidak gunakan localStorage atau default
        const visuals = loadPocketVisuals();
        const accountVisual = editingAccount?.logo ? { logo: editingAccount.logo, background: editingAccount.background } : visuals[editingAccount?.id ?? ""];
        setPocketLogoDraft(resolvePocketLogo(accountVisual?.logo, savedType || "bank"));
        setPocketBackgroundDraft(accountVisual?.background || "#16A34A");
        setShowPocketLogoMenu(false);
        setShowPocketStickerPicker(false);
    }, [accountView, editingAccount?.id, editingAccount?.accountNumber, editingAccount?.accountType, editingAccount?.initialBalance, editingAccount?.name, editingAccount?.providerName, editingAccount?.logo, editingAccount?.background]);
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
        if (!transferableAccounts.length) {
            setSourceAccountId("");
            setDestinationAccountId("");
            return;
        }
        setSourceAccountId((current) => transferableAccounts.some((account) => account.id === current) ? current : transferableAccounts[0].id);
        setDestinationAccountId((current) => {
            if (transferableAccounts.some((account) => account.id === current && account.id !== sourceAccountId))
                return current;
            return transferableAccounts.find((account) => account.id !== sourceAccountId)?.id ?? transferableAccounts[0].id;
        });
    }, [transferableAccounts, sourceAccountId]);
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
            try {
                const uploaded = await request<{
                    id: string;
                }>("/receipts/upload", { method: "POST", body: uploadForm });
                setTransferAttachmentId(uploaded.id);
            }
            catch (err) {
                const duplicateId = err instanceof ApiError && err.status === 409 && err.details && typeof err.details === "object"
                    ? String((err.details as {
                        receiptId?: unknown;
                    }).receiptId ?? "")
                    : "";
                if (!duplicateId)
                    throw err;
                setTransferAttachmentId(duplicateId);
            }
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
        const accountNumberPayload = accountHolderName && selectedPocketType !== "e_money" ? `${accountNumber} · ${accountHolderName}` : accountNumber;
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
        if (!file.type.startsWith("image/")) {
            setError("File logo harus berupa gambar.");
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError("Ukuran gambar maksimal 10 MB.");
            return;
        }
        try {
            const source = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => typeof reader.result === "string"
                    ? resolve(reader.result)
                    : reject(new Error("Gambar tidak dapat dibaca."));
                reader.onerror = () => reject(reader.error ?? new Error("Gambar tidak dapat dibaca."));
                reader.readAsDataURL(file);
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
            setAccountView(transferMode !== "general" && selectedPocketId ? "pocket-detail" : "list");
            onChanged().catch(() => setError("Transfer berhasil disimpan, tetapi data terbaru belum dapat dimuat."));
        }
        catch {
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
                return transferableAccounts.find((account) => {
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
                : transferableAccounts.find((account) => accountTokens(account).some((token) => lower.includes(token)));
            const destination = destinationSegment
                ? findAccountInSegment(destinationSegment, source?.id)
                : transferableAccounts.find((account) => account.id !== source?.id && accountTokens(account).some((token) => lower.includes(token)));
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
          <div className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200">
            <SectionHeader title="Pocket" caption={pocketTab === "mine" ? `${myPockets.length} pocket pribadi` : `${sharedPockets.length} shared pocket`} action={(<div className="flex items-center gap-2">
                  <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-100 bg-white text-[#16A34A] shadow-sm" onClick={() => onOpenTransactions("")} aria-label="View all transactions" title="View all transactions">
                    <ReceiptText size={15}/>
                  </button>
                  {pocketTab === "mine" && (<button type="button" className="inline-flex items-center gap-1 rounded-full bg-[#16A34A] px-3 py-1.5 text-xs font-semibold text-white" onClick={() => {
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
            ].map((item) => (<button key={item.id} type="button" className={`rounded-xl px-3 py-2 text-left transition ${pocketTab === item.id ? "bg-white text-[#16A34A] shadow-sm" : "text-slate-500"}`} onClick={() => setPocketTab(item.id)}>
                  <span className="block text-xs font-semibold">{item.label}</span>
                  <span className="mt-0.5 block text-[11px] font-semibold">{rupiah(item.total)}</span>
                </button>))}
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
                    const AccountIcon = accountTypeIcon(account.accountType);
                    const sharedLabel = accountSharedLabel(account, language);
                    const memberPreview = pocketMemberPreviewMap[account.id] ?? [];
                    const hasMultipleMembers = memberPreview.length > 1;
                    // Ambil visual dari server, localStorage, atau gunakan warna default hijau
                    const visuals = loadPocketVisuals();
                    const accountVisual = account.logo ? { logo: account.logo, background: account.background } : visuals[account.id];
                    const cardBackground = accountVisual?.background || "#16A34A";
                    const cardLogo = resolvePocketLogo(accountVisual?.logo, account.accountType);
                    return (<button key={account.id} data-pocket-id={account.id} type="button" className={`ripple-card min-h-[100px] overflow-hidden rounded-xl p-3 text-left text-white shadow-lg transition-all duration-200 lg:rounded-lg ${draggingPocketId === account.id ? "z-20 scale-[1.03] opacity-80 ring-2 ring-white/80 shadow-2xl" : "active:scale-[0.99]"} ${dropTargetPocketId === account.id ? "ring-2 ring-emerald-300 ring-offset-2" : ""}`} style={{ background: `linear-gradient(135deg, ${cardBackground}, #064E3B)` }} onClick={() => {
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
                          <span className={`flex h-8 w-8 items-center justify-center rounded-full bg-white/14 text-white/80 backdrop-blur ${pocketTab === "mine" ? "cursor-grab touch-none select-none active:cursor-grabbing" : ""}`} role={pocketTab === "mine" ? "button" : undefined} aria-label={pocketTab === "mine" ? (language === "en" ? "Drag to reorder pocket" : "Tarik untuk mengurutkan pocket") : undefined} onPointerDown={(event) => startPocketPointerDrag(event, account.id)} onPointerMove={updatePocketPointerDrag} onPointerUp={finishPocketPointerDrag} onPointerCancel={finishPocketPointerDrag}>
                            {pocketTab === "mine" ? <GripVertical size={16}/> : <span className="px-2 text-[9px] font-semibold">Shared</span>}
                          </span>
                          {hasMultipleMembers && (<button type="button" className="inline-flex items-center rounded-full bg-white/12 px-1.5 py-1 backdrop-blur transition hover:bg-white/18 active:scale-[0.98]" onClick={(event) => {
                                    event.stopPropagation();
                                    setSelectedPocketId(account.id);
                                    setShowPocketMembersPopup(true);
                                }}>
                              <div className="flex items-center -space-x-2">
                                {memberPreview.slice(0, 3).map((member) => (<span key={member.userId} title={member.fullName} className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border-2 border-emerald-900/35 bg-emerald-50 text-[9px] font-semibold text-[#16A34A] shadow-sm">
                                    {member.avatarUrl ? <img src={member.avatarUrl} alt="" className="h-full w-full object-cover"/> : member.fullName.slice(0, 1).toUpperCase()}
                                  </span>))}
                              </div>
                              <span className="ml-2 text-[9px] font-semibold text-white/85">+{memberPreview.length - 1}</span>
                            </button>)}
                        </div>
                      </div>
                      <div className="mt-0.5">
                        <p className="truncate text-base font-semibold">{account.name}</p>
                        <p className="mt-0.5 text-[10px] font-medium text-white/70">{accountTypeLabel(account.accountType)}{account.providerName ? ` \u00B7 ${account.providerName}` : ""}</p>
                        <p className="mt-3 text-[10px] font-medium text-white/70">Saldo saat ini</p>
                        <p className="mt-0.5 text-lg font-semibold">{rupiah(account.currentBalance)}</p>
                      </div>
                      
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
                {selectedPocket.canEdit !== false && (<button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/14 text-white/90 backdrop-blur" onClick={() => {
                    setShowPocketInviteModal(true);
                }}>
                    <UserPlus size={15}/>
                  </button>)}
                {selectedPocket.canEdit !== false && (<button type="button" className="inline-flex items-center gap-1 rounded-full bg-white/14 px-2.5 py-2 text-[11px] font-semibold text-white/90 backdrop-blur" onClick={() => {
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
                      <p className="mt-1 text-xs text-white/75">
                        {[accountTypeLabel(selectedPocket.accountType), selectedPocket.providerName, cleanPocketMetadata(selectedPocket.accountNumber)].filter(Boolean).join(" \u00B7 ")}
                      </p>
                    </div>
                  </>);
            })()}
            </div>
            {pocketMembers.length > 1 && (<div className="relative z-10 mt-4 flex items-center justify-between gap-3">
                <div className="flex items-center -space-x-2">
                  {pocketMembers.slice(0, 4).map((member) => (<button key={member.userId} type="button" className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-emerald-50 text-[11px] font-semibold text-[#16A34A]" onClick={() => setShowPocketMembersPopup(true)}>
                      {member.avatarUrl ? <img src={member.avatarUrl} alt="" className="h-full w-full object-cover"/> : member.fullName.slice(0, 1).toUpperCase()}
                    </button>))}
                  {pocketMembers.length > 4 && (<button type="button" className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-white text-[10px] font-semibold text-slate-700" onClick={() => setShowPocketMembersPopup(true)}>
                      +{pocketMembers.length - 4}
                    </button>)}
                </div>
                <button type="button" className="rounded-full bg-white/14 px-3 py-1.5 text-[11px] font-semibold text-white/90 backdrop-blur" onClick={() => setShowPocketMembersPopup(true)}>
                  {pocketMembers.length} user
                </button>
              </div>)}
            {showPocketMembersPopup && (<div className="absolute inset-x-4 top-[calc(100%_-_8px)] z-20 rounded-[22px] border border-slate-100 bg-white p-3 text-slate-900 shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold">Pocket users</p>
                  <button type="button" className="text-slate-400" onClick={() => setShowPocketMembersPopup(false)}>
                    <X size={16}/>
                  </button>
                </div>
                <div className="space-y-2">
                  {pocketMembers.map((member) => (<div key={member.userId} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
                      {member.avatarUrl ? <img src={member.avatarUrl} alt="" className="h-10 w-10 rounded-xl object-cover"/> : <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-semibold text-[#16A34A]">{member.fullName.slice(0, 1).toUpperCase()}</span>}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-950">{member.fullName}</p>
                        <p className="truncate text-[11px] text-slate-500">{member.role}</p>
                      </div>
                    </div>))}
                </div>
              </div>)}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button type="button" className="rounded-[20px] bg-white p-3 text-left shadow-soft transition active:scale-[0.99]" disabled={transferableAccounts.length < 2} onClick={() => {
                setTransferMode("out");
                setSourceAccountId(selectedPocket.id);
                setDestinationAccountId(transferableAccounts.find((account) => account.id !== selectedPocket.id)?.id ?? "");
                setAccountView("transfer-form");
            }}>
              <ArrowUpRight className="text-rose-600" size={18}/>
              <p className="mt-2 text-sm font-semibold">Transfer out</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Send to another pocket</p>
            </button>
            <button type="button" className="rounded-[20px] bg-white p-3 text-left shadow-soft transition active:scale-[0.99]" disabled={transferableAccounts.length < 2} onClick={() => {
                setTransferMode("in");
                setDestinationAccountId(selectedPocket.id);
                setSourceAccountId(transferableAccounts.find((account) => account.id !== selectedPocket.id)?.id ?? "");
                setAccountView("transfer-form");
            }}>
              <ArrowDownLeft className="text-[#16A34A]" size={18}/>
              <p className="mt-2 text-sm font-semibold">Transfer in</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Receive from another pocket</p>
            </button>
            <button type="button" className="rounded-[20px] bg-white p-3 text-left shadow-soft transition active:scale-[0.99]" onClick={() => onAddTransaction?.(selectedPocket.id)}>
              <ShoppingBag className="text-sky-700" size={18}/>
              <p className="mt-2 text-sm font-semibold">New transaction</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Buy, pay, receive money</p>
            </button>
            {/* Tampilkan set target balance hanya jika pocket belum memiliki target balance */}
            {!selectedPocket.targetBalance && (<button type="button" className="rounded-[20px] bg-white p-3 text-left shadow-soft transition active:scale-[0.99]" onClick={() => setTargetBalanceDraft(targetBalanceDraft || moneyInputValue(selectedPocket.currentBalance))}>
                <TrendingUp className="text-violet-700" size={18}/>
                <p className="mt-2 text-sm font-semibold">Set target balance</p>
                <p className="mt-0.5 text-[11px] text-slate-500">Plan pocket balance</p>
              </button>)}
            {/* Tampilkan set auto-budgeting hanya jika user belum mengatur auto budgeting pada pocket ini */}
            {!selectedPocket.autoBudgetingEnabled && (<button type="button" className="rounded-[20px] bg-white p-3 text-left shadow-soft transition active:scale-[0.99]" onClick={() => {
                    // TODO: Buka modal untuk mengatur auto-budgeting
                    console.log("Open auto-budgeting setup for pocket:", selectedPocket.id);
                }}>
                <Settings className="text-amber-600" size={18}/>
                <p className="mt-2 text-sm font-semibold">Set auto-budgeting</p>
                <p className="mt-0.5 text-[11px] text-slate-500">Automate your budget</p>
              </button>)}
          </div>

          <div className="min-w-0 overflow-hidden rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
            <div className="mb-3 flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-950">Transaction history</h3>
                <p className="mt-0.5 text-xs font-semibold leading-4 text-slate-500">Search and filter transactions in this pocket.</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                  <button type="button" className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold ${pocketTransactionFilterCount > 0 ? "bg-emerald-50 text-[#16A34A]" : "text-slate-500 hover:bg-slate-50"}`} onClick={() => setShowPocketTransactionFilter(true)}>
                    <ListFilter size={13}/> Filter{pocketTransactionFilterCount > 0 ? ` (${pocketTransactionFilterCount})` : ""}
                  </button>
                  <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-[#16A34A]" onClick={() => loadPocketTransactions().catch(() => undefined)} disabled={pocketTransactionLoading}>
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
                  </div>) : recentPocketTransactions.length > 0 ? (recentPocketTransactions.map((transaction) => {
                    const isIncome = transaction.transactionType === "income";
                    return (<div key={transaction.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 overflow-hidden rounded-2xl border border-slate-100 bg-[#F8FAFC] px-3 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isIncome ? "bg-emerald-100 text-[#16A34A]" : "bg-rose-100 text-rose-600"}`}>
                              {isIncome ? <ArrowDownLeft size={15}/> : <ArrowUpRight size={15}/>}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">{transaction.merchantName || transaction.categoryName || "Untitled transaction"}</p>
                              <p className="truncate text-[11px] text-slate-500">{[transaction.categoryName, transaction.paymentMethod, localDate(transaction.transactionDate)].filter(Boolean).join(" • ")}</p>
                            </div>
                          </div>
                        </div>
                        <div className="max-w-[42vw] shrink-0 text-right">
                          <p className={`whitespace-nowrap text-[13px] font-bold ${isIncome ? "text-[#16A34A]" : "text-slate-900"}`}>{isIncome ? "+" : "-"}{rupiah(transaction.amount)}</p>
                          <p className="mt-0.5 text-[10px] text-slate-400">{isIncome ? "Income" : "Expense"}</p>
                        </div>
                      </div>);
                })) : (<div className="rounded-2xl border border-dashed border-slate-200 bg-[#F8FAFC] px-3 py-4 text-center text-xs font-medium text-slate-500">
                    No transactions found for this pocket.
                  </div>)}
              </div>
            </div>
          </div>
          {showPocketTransactionFilter && (<>
              <button type="button" data-scroll-lock="true" className="fixed inset-0 z-40 cursor-default bg-slate-950/25 backdrop-blur-[1px]" aria-label="Tutup filter transaksi" onClick={() => setShowPocketTransactionFilter(false)}/>
              <section className="fixed inset-x-3 bottom-24 z-50 mx-auto max-h-[78vh] max-w-md overflow-y-auto rounded-[26px] border border-slate-100 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.24)] lg:bottom-auto lg:left-auto lg:right-8 lg:top-24 lg:mx-0 lg:w-96 lg:rounded-lg">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">Filter transaksi</h2>
                    <p className="mt-1 text-xs text-slate-500">Atur periode dan urutan transaksi.</p>
                  </div>
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50" onClick={() => setShowPocketTransactionFilter(false)}>
                    <X size={16}/>
                  </button>
                </div>

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
                        <input className="input" type="date" value={pocketTransactionCustomStart} onChange={(event) => setPocketTransactionCustomStart(event.target.value)}/>
                      </Field>
                      <Field label="Sampai tanggal">
                        <input className="input" type="date" min={pocketTransactionCustomStart || undefined} value={pocketTransactionCustomEnd} onChange={(event) => setPocketTransactionCustomEnd(event.target.value)}/>
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
                }}>
                    Reset
                  </button>
                  <button type="button" className="btn-primary w-full" onClick={() => setShowPocketTransactionFilter(false)}>
                    Terapkan
                  </button>
                </div>
              </section>
            </>)}


          {targetBalanceDraft !== "" && (<div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
              <SectionHeader title="Target balance" caption="Target tersimpan lokal sebagai rencana pocket."/>
              <input className="input" inputMode="numeric" value={targetBalanceDraft} onChange={(event) => setTargetBalanceDraft(formatRupiahInput(event.target.value))} placeholder="Contoh: 5.000.000"/>
              <button className="btn-primary mt-2 w-full" type="button">Save target</button>
            </div>)}

        </section>)}
      {accountView === "pocket-detail" && selectedPocket && showPocketInviteModal && (<>
          <button type="button" data-scroll-lock="true" className="fixed inset-0 z-40 cursor-default bg-slate-950/20 backdrop-blur-[1px]" aria-label="Close invite user" onClick={() => setShowPocketInviteModal(false)}/>
          <section className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-md rounded-[26px] border border-slate-100 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.22)] lg:bottom-auto lg:left-auto lg:right-8 lg:top-24 lg:mx-0 lg:w-96 lg:rounded-lg">
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

      {accountView === "account-form" && (<form key={editingAccount?.id ?? "new-pocket"} className="flex min-h-[calc(100vh-132px)] flex-col rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200" onSubmit={submit}>
          <SectionHeader title={editingAccount ? "Edit pocket" : "Add pocket"} caption="Atur identitas pocket, jenis penyimpanan, dan saldo awal." action={(<button type="button" className="app-back-button" onClick={() => {
                    const isEditingExistingPocket = Boolean(editingAccount);
                    setEditingAccount(null);
                    setError(null);
                    setAccountView(isEditingExistingPocket ? "pocket-detail" : "list");
                }}>
                <ArrowLeft size={14}/> Kembali
              </button>)}/>

          <input id="pocket-logo-upload" ref={pocketGalleryInputRef} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handlePocketImage}/>

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
                <div className="flex flex-wrap justify-end gap-1.5">
                  {pocketCardColors.map((color) => (<button key={color} type="button" className={`h-6 w-6 rounded-full border-2 ${pocketBackgroundDraft === color ? "border-white" : "border-white/40"}`} style={{ backgroundColor: color }} onClick={() => setPocketBackgroundDraft(color)} aria-label={`Pilih warna ${color}`}/>))}
                </div>
              </div>
              <div className="relative z-10 mt-7">
                <p className="text-xs font-medium text-white/70">Pocket preview</p>
                <p className="mt-1 truncate text-xl font-semibold">{pocketNameDraft || "Nama pocket"}</p>
                <p className="mt-4 text-xs font-medium text-white/70">Start balance</p>
                <p className="mt-1 text-2xl font-semibold">{rupiah(moneyValue(pocketInitialBalanceDraft.replace(/\./g, "")))}</p>
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
                    <label htmlFor="pocket-logo-upload" className="flex min-h-14 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-3 text-center text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50" onClick={() => setShowPocketLogoMenu(false)}>
                      Upload gambar
                    </label>
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
                  <div className="grid grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-5">
                    {pocketStickerOptions.map((sticker) => (<button key={sticker} type="button" className="flex aspect-square min-h-12 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-[28px] transition hover:border-emerald-100 hover:bg-emerald-50" onClick={() => {
                setPocketLogoDraft(sticker);
                setShowPocketStickerPicker(false);
            }}>
                        <span className="leading-none">{sticker}</span>
                      </button>))}
                  </div>
                </div>
              </>)}

            <Field label="Nama pocket">
              <input className="input" name="name" placeholder="Contoh: BCA utama" value={pocketNameDraft} onChange={(event) => setPocketNameDraft(event.target.value)} required/>
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

            {pocketTypeDraft !== "cash" && (<div className="space-y-3 rounded-[22px] bg-[#F8FAFC] p-3">
                <Field label={pocketTypeDraft === "bank" ? "Pilih Bank" : pocketTypeDraft === "e_wallet" ? "Pilih e-wallet" : "Pilih e-money"}>
                  <input className="input" name="providerName" list={pocketTypeDraft === "bank" ? "pocket-bank-options" : pocketTypeDraft === "e_wallet" ? "pocket-ewallet-options" : "pocket-emoney-options"} placeholder={pocketTypeDraft === "bank" ? "Cari bank..." : pocketTypeDraft === "e_wallet" ? "Cari e-wallet..." : "Cari e-money..."} value={pocketProviderDraft} onChange={(event) => setPocketProviderDraft(event.target.value)} required/>
                </Field>
                <datalist id="pocket-bank-options">{pocketBankOptions.map((option) => <option key={option} value={option}/>)}</datalist>
                <datalist id="pocket-ewallet-options">{pocketEWalletOptions.map((option) => <option key={option} value={option}/>)}</datalist>
                <datalist id="pocket-emoney-options">{pocketEMoneyOptions.map((option) => <option key={option} value={option}/>)}</datalist>

                <Field label={pocketTypeDraft === "bank" ? "Nomor rekening" : pocketTypeDraft === "e_wallet" ? "Nomor e-wallet" : "Nomor e-money"}>
                  <input className="input" name="accountNumber" inputMode="numeric" placeholder="Nomor akun" value={pocketNumberDraft} onChange={(event) => setPocketNumberDraft(event.target.value)} required/>
                </Field>

                {pocketTypeDraft !== "e_money" && (<Field label="Atas nama">
                    <input className="input" name="accountHolderName" placeholder="Nama pemilik rekening" value={pocketHolderDraft} onChange={(event) => setPocketHolderDraft(event.target.value)} required/>
                  </Field>)}
              </div>)}

            <Field label="Saldo awal">
              <input className="input" name="initialBalance" inputMode="numeric" placeholder="Contoh: 500.000" value={pocketInitialBalanceDraft} onInput={handleMoneyInput} onChange={(event) => setPocketInitialBalanceDraft(event.target.value)} required/>
            </Field>

            {editingAccount && (<p className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 lg:rounded-md">
                Saldo sekarang {rupiah(editingAccount.currentBalance)}. Saldo awal tidak bisa dibuat minus dari form ini.
              </p>)}

            {error && <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 lg:rounded-md">{error}</p>}
          </div>

          <div className="sticky bottom-24 mt-5 bg-white/90 pt-2 backdrop-blur">
            <button className="btn-primary w-full">{editingAccount ? <CheckCircle2 size={16}/> : <Plus size={16}/>} {editingAccount ? "Simpan perubahan" : "Simpan pocket"}</button>
          </div>
        </form>)}

      {accountView === "transfer-form" && (<form className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200" onSubmit={transfer}>
          <SectionHeader title={transferFormCopy.title} caption={transferFormCopy.caption} action={(<button type="button" className="app-back-button" onClick={() => {
                    setError(null);
                    setTransferPocketPicker(null);
                    setAccountView(transferMode !== "general" && selectedPocketId ? "pocket-detail" : "list");
                }}>
                <ArrowLeft size={14}/> Kembali
              </button>)}/>
          <div className="mb-4 rounded-[22px] border border-slate-100 bg-[#F8FAFC] p-3 lg:rounded-md">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <button type="button" disabled={transferMode === "out"} onClick={() => setTransferPocketPicker("source")} className={`rounded-2xl bg-white px-3 py-3 text-left shadow-sm lg:rounded-md ${transferMode === "out" ? "cursor-default" : "transition hover:ring-2 hover:ring-emerald-100 active:scale-[0.99]"}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{transferFormCopy.sourceLabel}</p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-950">{sourceAccount?.name ?? "-"}</p>
                {transferMode !== "out" && <p className="mt-1 text-[11px] text-slate-500">Pilih pocket asal.</p>}
                <p className="mt-2 text-xs font-semibold text-slate-700">{sourceAccount ? rupiah(sourceAccount.currentBalance) : "-"}</p>
              </button>
              <span className={`flex h-10 w-10 items-center justify-center rounded-full ${transferMode === "in" ? "bg-emerald-100 text-[#16A34A]" : "bg-rose-100 text-rose-600"}`}>
                {transferMode === "in" ? <ArrowDownLeft size={18}/> : <ArrowUpRight size={18}/>}
              </span>
              <button type="button" disabled={transferMode === "in"} onClick={() => setTransferPocketPicker("destination")} className={`rounded-2xl bg-white px-3 py-3 text-left shadow-sm lg:rounded-md ${transferMode === "in" ? "cursor-default" : "transition hover:ring-2 hover:ring-emerald-100 active:scale-[0.99]"}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{transferFormCopy.destinationLabel}</p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-950">{destinationAccount?.name ?? "-"}</p>
                {transferMode !== "in" && <p className="mt-1 text-[11px] text-slate-500">Pilih pocket tujuan.</p>}
                <p className="mt-2 text-xs font-semibold text-slate-700">{destinationAccount ? rupiah(destinationAccount.currentBalance) : "-"}</p>
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
                <input className="input h-11" name="transferDate" type="date" value={transferDraft.transferDate} onChange={(event) => setTransferDraft((current) => ({ ...current, transferDate: event.target.value }))} required/>
              </Field>
            </div>
            <Field label="Fee/admin">
              <input className="input h-11" name="feeAmount" inputMode="numeric" placeholder="Opsional, contoh: 2500" value={transferDraft.feeAmount} onChange={(event) => setTransferDraft((current) => ({ ...current, feeAmount: formatRupiahInput(event.target.value) }))}/>
            </Field>
            {sourceAccount && destinationAccount && transferAmount > 0 && (<div className="rounded-[22px] border border-emerald-100 bg-emerald-50/70 p-3 lg:rounded-md">
                <p className="text-xs font-semibold text-emerald-900">Simulasi saldo setelah transfer</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-white p-3 lg:rounded-md">
                    <p className="truncate text-[11px] font-semibold text-slate-500">{sourceAccount.name}</p>
                    <p className="mt-1 text-xs text-slate-400">{rupiah(sourceAccount.currentBalance)}</p>
                    <p className={`mt-1 text-sm font-bold ${sourceBalanceAfter < 0 ? "text-rose-600" : "text-slate-950"}`}>{rupiah(sourceBalanceAfter)}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">Setelah nominal + biaya admin</p>
                  </div>
                  <div className="rounded-2xl bg-white p-3 lg:rounded-md">
                    <p className="truncate text-[11px] font-semibold text-slate-500">{destinationAccount.name}</p>
                    <p className="mt-1 text-xs text-slate-400">{rupiah(destinationAccount.currentBalance)}</p>
                    <p className="mt-1 text-sm font-bold text-[#16A34A]">{rupiah(destinationBalanceAfter)}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">Setelah menerima transfer</p>
                  </div>
                </div>
              </div>)}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 lg:rounded-md">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700">Attachment transfer</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-slate-500">Tambahkan gambar atau video sebagai bukti transfer.</p>
                </div>
                <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#16A34A] shadow-sm ring-1 ring-slate-200 transition hover:bg-emerald-50 lg:rounded-md">
                  {transferAttachmentLoading ? <Loader2 className="animate-spin" size={14}/> : <Upload size={14}/>}
                  {transferAttachmentId ? "Ganti" : "Pilih file"}
                  <input className="sr-only" type="file" accept="image/*,video/*,.heic,.heif" onChange={uploadTransferAttachment} disabled={transferAttachmentLoading}/>
                </label>
              </div>
              {transferAttachmentName && (<div className="mt-2 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs text-slate-600 lg:rounded-md">
                  <ReceiptText className="shrink-0 text-[#16A34A]" size={14}/>
                  <span className="truncate">{transferAttachmentName}</span>
                </div>)}
              {transferAttachmentMessage && (<p className={`mt-2 text-[11px] leading-4 ${transferAttachmentMessage.includes("berhasil") ? "text-[#15803D]" : "text-slate-500"}`}>
                  {transferAttachmentMessage}
                </p>)}
            </div>
            <input className="input h-11" name="notes" placeholder="Catatan transfer (opsional)" value={transferDraft.notes} onChange={(event) => setTransferDraft((current) => ({ ...current, notes: event.target.value }))}/>
            <button className="btn-primary w-full" disabled={transferableAccounts.length < 2 || transferAttachmentLoading || transferParseLoading}>
              <ArrowLeftRight size={16}/> {transferFormCopy.submitLabel}
            </button>
          </div>
        </form>)}
      {accountView === "transfer-form" && transferPocketPicker && (<>
          <button type="button" data-scroll-lock="true" className="fixed inset-0 z-40 cursor-default bg-slate-950/25 backdrop-blur-[1px]" aria-label="Tutup pilihan pocket" onClick={() => setTransferPocketPicker(null)}/>
          <div className="fixed inset-x-4 top-1/2 z-50 mx-auto flex max-h-[82vh] w-full max-w-md -translate-y-1/2 flex-col rounded-[26px] border border-slate-100 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.24)]">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-slate-950">{transferPocketPicker === "source" ? "Pilih pocket asal" : "Pilih pocket tujuan"}</p>
                <p className="mt-0.5 text-xs text-slate-500">Saldo saat ini ditampilkan pada setiap pocket.</p>
              </div>
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50" onClick={() => setTransferPocketPicker(null)}>
                <X size={16}/>
              </button>
            </div>
            <div className="space-y-2 overflow-y-auto pr-1">
              {transferableAccounts
                .filter((account) => transferPocketPicker === "source" ? account.id !== destinationAccountId : account.id !== sourceAccountId)
                .map((account) => {
                const visual = account.logo
                    ? { logo: account.logo, background: account.background }
                    : loadPocketVisuals()[account.id];
                const logo = visual?.logo || getDefaultPocketLogo(account.accountType);
                const selected = transferPocketPicker === "source" ? account.id === sourceAccountId : account.id === destinationAccountId;
                return (<button key={account.id} type="button" className={`flex w-full items-center gap-3 rounded-[20px] border p-3 text-left transition active:scale-[0.99] ${selected ? "border-emerald-300 bg-emerald-50" : "border-slate-100 bg-white hover:bg-slate-50"}`} onClick={() => {
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
                      <span className="mt-0.5 block truncate text-[11px] text-slate-500">{[accountTypeLabel(account.accountType), account.providerName].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-[10px] font-medium text-slate-400">Saldo saat ini</span>
                      <span className="mt-0.5 block text-xs font-bold text-slate-900">{rupiah(account.currentBalance)}</span>
                    </span>
                  </button>);
            })}
            </div>
          </div>
        </>)}
      {error && <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 lg:rounded-md">{error}</p>}
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
      {categoryView === "list" && (<section className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200">
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

      {categoryView === "form" && (<form key={editingCategory?.id ?? "new-category"} className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200" onSubmit={submit}>
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
          {editingCategory?.isDefault && (<p className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2.5 text-xs text-slate-500 lg:rounded-md">
              <ShieldCheck size={15} className="shrink-0 text-[#16A34A]"/>
              Kategori bawaan sistem dilindungi dan tidak dapat dihapus.
            </p>)}
          {editingCategory && !editingCategory.isDefault && (<button type="button" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 lg:rounded-md" onClick={removeCategory} disabled={deleting}>
              {deleting ? <Loader2 className="animate-spin" size={16}/> : <Trash2 size={16}/>}
              {deleting ? "Menghapus kategori..." : "Hapus kategori"}
            </button>)}
          {error && <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 lg:rounded-md">{error}</p>}
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
          {rows.map((category) => (<div key={category.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2.5 lg:rounded-md">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl lg:rounded-md ${toneClass}`}>
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
            <p className="mt-1 text-sm text-slate-500">{category.categoryType === "income" ? "Pemasukan" : "Pengeluaran"} {category.isDefault ? "Ã‚Â· Default" : ""}</p>
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
      {budgetView === "list" && (<section className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200">
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
                    return (<div key={budget.id} className="rounded-2xl border border-slate-100 bg-white px-3 py-3 lg:rounded-md">
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

      {budgetView === "form" && (<form key={editingBudget?.id ?? "new-budget"} className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200" onSubmit={submit}>
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
          {error && <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 lg:rounded-md">{error}</p>}
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
      <div className="rounded-[26px] border border-slate-100 bg-white p-4 text-slate-950 shadow-soft lg:rounded-lg lg:p-5">
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
        <ReportInsightCard label="Pengeluaran terbesar" value={topExpense?.category ?? "Belum ada"} helper={topExpense ? `Bulan ini - ${rupiah(topExpense.total)}` : "Belum ada pengeluaran"} tone="expense" icon={<ShoppingBag size={16}/>}/>
        <ReportInsightCard label="Pemasukan terbesar" value={topIncome?.category ?? "Belum ada"} helper={topIncome ? `Bulan ini - ${rupiah(topIncome.total)}` : "Belum ada pemasukan"} tone="income" icon={<Wallet size={16}/>}/>
        <ReportInsightCard label="Net bulan terakhir" value={`${latestNet >= 0 ? "+" : "-"}${rupiah(Math.abs(latestNet))}`} helper={latestMonthLabel} tone={latestNet >= 0 ? "income" : "expense"} icon={<LineChart size={16}/>}/>
        <ReportInsightCard label="Perubahan pengeluaran" value={trendLabel} helper={trendHelper} tone={expenseTrend === null ? "neutral" : expenseTrend > 0 ? "expense" : "income"} icon={expenseTrend === null ? <LineChart size={16}/> : expenseTrend > 0 ? <ArrowUpRight size={16}/> : <ArrowDownLeft size={16}/>}/>
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
          <CashFlowInsightList rows={cashFlow}/>
        </section>

        <section className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200">
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

      <section className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200">
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
    return (<div className="rounded-[22px] border border-white/80 bg-white p-3 shadow-soft lg:rounded-lg lg:border-slate-200">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold leading-tight text-slate-400">{label}</p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-950">{value}</p>
        </div>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl lg:rounded-md ${toneClass}`}>{icon}</span>
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
            return (<div key={row.date} className="rounded-2xl border border-slate-100 bg-white px-3 py-2.5 lg:rounded-md">
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
            return (<div key={row.month} className="rounded-2xl border border-slate-100 bg-white p-3 lg:rounded-md">
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
    return (<section className="mx-auto flex h-full min-h-0 max-w-3xl flex-col overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-soft lg:h-[calc(100vh-8rem)] lg:rounded-lg lg:border-slate-200">
      <div className="shrink-0 border-b border-slate-100 bg-white px-4 py-3 lg:px-5 lg:py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#16A34A] lg:rounded-lg">
            <Bot size={20}/>
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-tight text-slate-950">{copy.header}</h2>
            <p className="mt-0.5 truncate text-xs text-slate-500">{copy.subheader}</p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-3 py-4 lg:px-5">
        <div className="space-y-3">
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
                  <div className={`rounded-[18px] px-3.5 py-2.5 text-sm leading-relaxed shadow-sm lg:rounded-lg ${isUser
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
                            const allowedViews: View[] = ["manual", "history", "manage", "social", "profile", "dashboard"];
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
              <div className="inline-flex items-center gap-2 rounded-[18px] rounded-bl-md border border-emerald-100 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-500 shadow-sm lg:rounded-lg">
                <Loader2 className="animate-spin text-[#16A34A]" size={15}/> {copy.loading}
              </div>
            </div>)}
          <div ref={chatEndRef}/>
        </div>
      </div>

      <form className="shrink-0 border-t border-slate-100 bg-white p-3" onSubmit={submit}>
        <div className="flex items-center gap-2">
          <input className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[13px] font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 lg:rounded-md" name="message" placeholder={copy.placeholder} autoComplete="off" disabled={loading}/>
          <button className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#16A34A] px-4 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(22,163,74,0.22)] transition hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-60 lg:rounded-md" disabled={loading}>
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

export function SocialSkeleton() {
    return (<div className="space-y-3" aria-label="Memuat data sosial">
      {[104, 188, 112].map((height) => (<div key={height} className="animate-pulse rounded-[20px] border border-slate-100 bg-white p-4 shadow-soft" style={{ height }}>
          <div className="h-3 w-24 rounded bg-slate-100"/>
          <div className="mt-3 h-10 rounded-xl bg-slate-100"/>
        </div>))}
    </div>);
}

export function SocialFriendPicker({ friends, selectedIds, onToggle, excludedIds = new Set<string>(), title = "Pilih anggota" }: {
    friends: SocialFriend[];
    selectedIds: Set<string>;
    onToggle: (friendId: string) => void;
    excludedIds?: Set<string>;
    title?: string;
}) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const acceptedFriends = friends.filter((friend) => friend.status === "accepted" && !excludedIds.has(friend.userId));
    const selectedFriends = acceptedFriends.filter((friend) => selectedIds.has(friend.userId));
    const normalizedQuery = query.trim().toLowerCase();
    const suggestions = acceptedFriends
        .filter((friend) => !selectedIds.has(friend.userId))
        .filter((friend) => !normalizedQuery
        || friend.fullName.toLowerCase().includes(normalizedQuery)
        || friend.username.toLowerCase().includes(normalizedQuery))
        .slice(0, 8);
    return (<div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-700">{title}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">Hanya teman Anda yang dapat dipilih.</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-[#16A34A]">
          {selectedIds.size} dipilih
        </span>
      </div>
      {acceptedFriends.length === 0 ? (<div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-400"><UserPlus size={17}/></span>
          <div>
            <p className="text-xs font-medium text-slate-700">Belum ada teman yang dapat dipilih</p>
            <p className="mt-0.5 text-[10px] text-slate-500">Tambahkan teman dan tunggu hingga permintaan diterima.</p>
          </div>
        </div>) : (<div className="relative">
          {selectedFriends.length > 0 && (<div className="mb-2 flex flex-wrap gap-1.5">
              {selectedFriends.map((friend) => (<button key={friend.userId} type="button" className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[11px] font-medium text-emerald-800 transition hover:bg-emerald-100" onClick={() => onToggle(friend.userId)} title="Hapus pilihan">
                  <span className="max-w-32 truncate">{friend.fullName}</span>
                  <X size={12}/>
                </button>))}
            </div>)}
          <div className={`flex items-center gap-2 rounded-2xl border bg-white px-3 transition ${open ? "border-[#16A34A] ring-2 ring-emerald-100" : "border-slate-200"}`}>
            <Search size={15} className="shrink-0 text-slate-400"/>
            <input className="h-11 min-w-0 flex-1 bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400" value={query} onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
            }} onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 140)} placeholder="Cari nama atau username..." autoComplete="off"/>
            <ChevronDown size={15} className={`shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}/>
          </div>
          {open && (<div className="absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_44px_rgba(15,23,42,0.16)]">
              {suggestions.length > 0 ? suggestions.map((friend) => (<button key={friend.userId} type="button" className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-slate-50" onMouseDown={(event) => event.preventDefault()} onClick={() => {
                        onToggle(friend.userId);
                        setQuery("");
                    }}>
                  {friend.avatarUrl
                        ? <img src={friend.avatarUrl} className="h-9 w-9 shrink-0 rounded-xl object-cover" alt=""/>
                        : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#16A34A]"><UserRound size={16}/></span>}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-slate-900">{friend.fullName}</span>
                    <span className="block truncate text-[10px] text-slate-500">@{friend.username}</span>
                  </span>
                  <Plus size={15} className="shrink-0 text-[#16A34A]"/>
                </button>)) : (<p className="px-3 py-3 text-xs text-slate-500">
                  {selectedIds.size === acceptedFriends.length ? "Semua teman sudah dipilih." : "Teman tidak ditemukan."}
                </p>)}
            </div>)}
        </div>)}
    </div>);
}

export function WalletMembersManageModal({ walletId, walletName, members, friends, request, onClose, onSaved }: {
    walletId: string;
    walletName: string;
    members: WalletDetail["members"];
    friends: SocialFriend[];
    request: <T>(path: string, options?: RequestInit) => Promise<T>;
    onClose: () => void;
    onSaved: (message: string) => Promise<void> | void;
}) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const existingMemberIds = useMemo(() => new Set(members.map((member) => member.id)), [members]);
    const toggleMember = (userId: string) => {
        setSelectedIds((current) => {
            const next = new Set(current);
            if (next.has(userId))
                next.delete(userId);
            else
                next.add(userId);
            return next;
        });
    };
    const addMembers = async () => {
        if (selectedIds.size === 0 || loading)
            return;
        try {
            setLoading(true);
            setError(null);
            await Promise.all([...selectedIds].map((userId) => request(`/social/wallets/${walletId}/members`, {
                method: "POST",
                body: JSON.stringify({ userId, role: "member" })
            })));
            setSelectedIds(new Set());
            await onSaved(`${selectedIds.size} anggota berhasil ditambahkan`);
        }
        catch {
            setError(null);
        }
        finally {
            setLoading(false);
        }
    };
    const removeMember = async (member: WalletDetail["members"][number]) => {
        if (member.role === "owner" || removingMemberId)
            return;
        if (!window.confirm(`Hapus ${member.fullName} dari dompet ${walletName}?`))
            return;
        try {
            setRemovingMemberId(member.id);
            setError(null);
            await request(`/social/wallets/${walletId}/members/${member.id}`, {
                method: "DELETE"
            });
            await onSaved(`${member.fullName} berhasil dihapus dari dompet`);
        }
        catch {
            setError(null);
        }
        finally {
            setRemovingMemberId(null);
        }
    };
    return (<div data-scroll-lock="true" className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Tutup" onClick={onClose}/>

      <section className="relative max-h-[90dvh] w-full overflow-y-auto rounded-t-[26px] bg-white p-4 shadow-xl sm:max-w-lg sm:rounded-[26px]">
        <SectionHeader title="Kelola anggota" caption={`Tambah atau hapus anggota dari ${walletName}.`} action={(<button type="button" className="mobile-icon-btn" aria-label="Tutup" onClick={onClose}>
              <X size={18}/>
            </button>)}/>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-100 p-3">
            <SocialFriendPicker friends={friends} selectedIds={selectedIds} excludedIds={existingMemberIds} title="Tambah anggota" onToggle={toggleMember}/>

            <button type="button" className="btn-primary mt-3 w-full justify-center" disabled={selectedIds.size === 0 || loading} onClick={addMembers}>
              {loading ? <Loader2 size={16} className="animate-spin"/> : <UserPlus size={16}/>}
              {loading ? "Menambahkan..." : `Tambahkan ${selectedIds.size || ""} anggota`}
            </button>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-slate-700">Anggota saat ini</p>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                {members.length} anggota
              </span>
            </div>

            <div className="space-y-2">
              {members.map((member) => {
            const isOwner = member.role === "owner";
            const isRemoving = removingMemberId === member.id;
            return (<div key={member.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 px-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{member.fullName}</p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        @{member.username} Ã¯Â¿Â½ {member.status === "pending" ? "Menunggu" : "Aktif"}
                      </p>
                    </div>

                    {isOwner ? (<span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">Pemilik</span>) : (<button type="button" className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 disabled:opacity-50" disabled={Boolean(removingMemberId)} onClick={() => removeMember(member)}>
                        {isRemoving ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>}
                        {isRemoving ? "Menghapus" : "Hapus"}
                      </button>)}
                  </div>);
        })}
            </div>
          </div>

          {error && (<p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>)}
        </div>
      </section>
    </div>);
}

export function SocialFriendsPanel({ currentUser, friends, groups, summary, qrDataUrl, searchResults, searchPerson, scanQrFile, shareQr, runAction, request, onNavigate, onOpenGroups, onOpenPrivacy, selectedFriend, setSelectedFriend, friendSearchRef }: {
    currentUser: Session["user"];
    friends: SocialFriend[];
    groups: SocialGroup[];
    summary: SocialSummary | null;
    qrDataUrl: string;
    searchResults: any[];
    searchPerson: (event: FormEvent<HTMLFormElement>) => Promise<void>;
    scanQrFile: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
    shareQr: () => Promise<void>;
    runAction: (work: () => Promise<unknown>, success: string) => Promise<void>;
    request: <T>(path: string, options?: RequestInit) => Promise<T>;
    onNavigate: (view: View) => void;
    onOpenGroups: (create?: boolean) => void;
    onOpenPrivacy: () => void;
    selectedFriend: any;
    setSelectedFriend: (friend: any) => void;
    friendSearchRef: {
        current: HTMLInputElement | null;
    };
}) {
    const accepted = friends.filter((friend) => friend.status === "accepted");
    const incoming = friends.filter((friend) => friend.status === "pending" && friend.incoming);
    const outgoing = friends.filter((friend) => friend.status === "pending" && !friend.incoming);
    const focusSearch = () => {
        friendSearchRef.current?.focus();
        friendSearchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    return (<div className="space-y-3">
      <form className="social-enter rounded-[20px] border border-[#E5E7EB] bg-white p-4 shadow-soft lg:rounded-lg" onSubmit={searchPerson}>
        <SectionHeader title="Tambah teman" caption="Cari menggunakan username, email, nomor, atau QR Code."/>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
            <input ref={friendSearchRef} className="input h-11 w-full pl-9 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" name="query" placeholder="Cari username atau email..." required/>
          </div>
          <button className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-[#16A34A] px-4 text-xs font-semibold text-white shadow-sm transition active:scale-[0.97]" aria-label="Cari pengguna">
            <Search size={17}/><span className="ml-1.5 hidden sm:inline">Cari</span>
          </button>
        </div>
        {searchResults.length > 0 && (<div className="mt-3 space-y-2 border-t border-[#E5E7EB] pt-3">
            {searchResults.map((person) => (<div key={person.id} className="flex items-center justify-between gap-2 rounded-2xl bg-[#F8FAFC] p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#111827]">{person.fullName}</p>
                  <p className="truncate text-xs text-[#6B7280]">@{person.username}</p>
                </div>
                <button type="button" className="shrink-0 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-[#16A34A] disabled:text-slate-400" disabled={person.relationshipStatus !== "none"} onClick={() => runAction(() => request("/social/friends/request", {
                    method: "POST",
                    body: JSON.stringify({ identifier: person.username })
                }), "Permintaan pertemanan dikirim")}>
                  {person.relationshipStatus === "none" ? "Tambah" : "Terhubung"}
                </button>
              </div>))}
          </div>)}
      </form>

      <div className="social-enter rounded-[20px] border border-[#E5E7EB] bg-white p-4 shadow-soft lg:rounded-lg">
        <SectionHeader title="QR akun Anda" caption="Tunjukkan atau bagikan agar teman dapat menemukan Anda."/>
        <div className="flex flex-col items-center">
          <div className="rounded-[20px] border border-slate-100 bg-white p-3 shadow-sm">
            {qrDataUrl
            ? <img src={qrDataUrl} className="h-40 w-40 rounded-xl" alt={`QR akun @${currentUser.username ?? ""}`}/>
            : <span className="flex h-40 w-40 items-center justify-center rounded-xl bg-slate-50 text-[#16A34A]"><QrCode size={54}/></span>}
          </div>
          <p className="mt-3 text-sm font-semibold text-[#111827]">@{currentUser.username ?? "atur-username"}</p>
          <p className="mt-0.5 max-w-full truncate text-[11px] text-[#6B7280]">ID {currentUser.id}</p>
          <div className="mt-4 grid w-full grid-cols-2 gap-2">
            <button type="button" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white text-xs font-semibold text-[#374151] transition active:scale-[0.98]" onClick={shareQr}>
              <Share2 size={16}/> Bagikan
            </button>
            <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#16A34A] text-xs font-semibold text-white shadow-sm transition active:scale-[0.98]">
              <QrCode size={16}/> Scan QR
              <input className="sr-only" type="file" accept="image/*" capture="environment" onChange={scanQrFile}/>
            </label>
          </div>
        </div>
      </div>

      <div className="social-enter rounded-[20px] border border-[#E5E7EB] bg-white p-4 shadow-soft lg:rounded-lg">
        <SectionHeader title={`Permintaan pertemanan${incoming.length ? ` (${incoming.length})` : ""}`} caption="Tinjau orang yang ingin terhubung dengan Anda."/>
        {incoming.length === 0 ? (<div className="flex items-center gap-3 rounded-2xl bg-[#F8FAFC] p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-400"><UserPlus size={16}/></span>
            <p className="text-xs text-[#6B7280]">Tidak ada permintaan baru.</p>
          </div>) : (<div className="space-y-2">
            {incoming.map((friend) => (<div key={friend.id} className="flex items-center gap-2 rounded-2xl bg-[#F8FAFC] p-3">
                {friend.avatarUrl
                    ? <img src={friend.avatarUrl} className="h-10 w-10 rounded-xl object-cover" alt=""/>
                    : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#16A34A]"><UserRound size={17}/></span>}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#111827]">{friend.fullName}</p>
                  <p className="truncate text-xs text-[#6B7280]">@{friend.username}</p>
                </div>
                <button className="rounded-xl bg-[#16A34A] px-3 py-2 text-xs font-semibold text-white transition active:scale-95" onClick={() => runAction(() => request(`/social/friends/${friend.id}/respond`, { method: "PUT", body: JSON.stringify({ status: "accepted" }) }), "Pertemanan diterima")}>Terima</button>
                <button className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-semibold text-[#6B7280] transition active:scale-95" onClick={() => runAction(() => request(`/social/friends/${friend.id}/respond`, { method: "PUT", body: JSON.stringify({ status: "rejected" }) }), "Permintaan ditolak")}>Tolak</button>
              </div>))}
          </div>)}
      </div>

      <div className="social-enter grid grid-cols-4 gap-2">
        {[
            { label: "Teman", value: String(accepted.length), tone: "text-[#16A34A]" },
            { label: "Grup", value: String(groups.filter((group) => group.status === "accepted").length), tone: "text-sky-700" },
            { label: "Piutang", value: rupiah(summary?.totalReceivable ?? 0), tone: "text-[#16A34A]" },
            { label: "Utang", value: rupiah(summary?.totalPayable ?? 0), tone: "text-rose-600" }
        ].map((metric) => (<div key={metric.label} className="min-w-0 rounded-[18px] border border-[#E5E7EB] bg-white px-2 py-3 text-center shadow-soft">
            <p className="text-[10px] text-[#6B7280]">{metric.label}</p>
            <p className={`mt-1 truncate text-xs font-semibold ${metric.tone}`} title={metric.value}>{metric.value}</p>
          </div>))}
      </div>

      <div className="social-enter overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2">
          {[
            { label: "Split Bill", icon: Users, action: () => onOpenGroups() },
            { label: "Request Money", icon: CircleDollarSign, action: focusSearch },
            { label: "Transfer", icon: ArrowLeftRight, action: () => onNavigate("accounts") },
            { label: "Buat Grup", icon: UserPlus, action: () => onOpenGroups(true) }
        ].map((action) => {
            const Icon = action.icon;
            return (<button key={action.label} type="button" className="flex w-[108px] flex-col items-center gap-2 rounded-[18px] border border-[#E5E7EB] bg-white px-3 py-3 text-[11px] font-medium text-[#374151] shadow-soft transition active:scale-[0.97]" onClick={action.action}>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#16A34A]"><Icon size={17} strokeWidth={1.9}/></span>
                {action.label}
              </button>);
        })}
        </div>
      </div>

      <div className="social-enter rounded-[20px] border border-[#E5E7EB] bg-white p-4 shadow-soft lg:rounded-lg">
        <SectionHeader title="Teman" caption={`${accepted.length} teman${outgoing.length ? ` Ã¯Â¿Â½ ${outgoing.length} menunggu` : ""}`}/>
        {accepted.length === 0 ? (<div className="rounded-[18px] bg-[#F8FAFC] px-4 py-6 text-center">
            <div className="relative mx-auto h-20 w-28" aria-hidden="true">
              <span className="absolute left-3 top-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-[#16A34A]"><UserRound size={22}/></span>
              <span className="absolute right-3 top-2 flex h-12 w-12 items-center justify-center rounded-2xl border-4 border-[#F8FAFC] bg-white text-sky-600 shadow-sm"><UserPlus size={21}/></span>
            </div>
            <p className="mt-1 text-sm font-semibold text-[#111827]">Belum ada teman.</p>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-[#6B7280]">Mulai tambahkan teman untuk berbagi pengeluaran, split bill, dan utang piutang.</p>
            <button type="button" className="mt-4 rounded-xl bg-[#16A34A] px-4 py-2.5 text-xs font-semibold text-white" onClick={focusSearch}>Tambah teman</button>
          </div>) : (<div className="space-y-2">
            {accepted.map((friend) => (<div key={friend.id} className="rounded-[18px] border border-[#E5E7EB] p-3">
                <button type="button" className="flex w-full items-center gap-3 text-left" onClick={async () => setSelectedFriend({
                    ...await request<Record<string, unknown>>(`/social/friends/profile/${friend.userId}`),
                    friendshipId: friend.id,
                    userId: friend.userId
                })}>
                  {friend.avatarUrl
                    ? <img src={friend.avatarUrl} className="h-11 w-11 rounded-2xl object-cover" alt=""/>
                    : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#16A34A]"><UserRound size={18}/></span>}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#111827]">{friend.fullName}</p>
                    <p className="truncate text-xs text-[#6B7280]">@{friend.username}</p>
                    <p className="mt-1 text-[11px] text-slate-400">Lihat transaksi bersama</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300"/>
                </button>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#E5E7EB] pt-3">
                  <button type="button" className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-[#16A34A]" onClick={() => onOpenGroups()}>Split Bill</button>
                  <button type="button" className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-[#374151]" onClick={focusSearch}>Request</button>
                </div>
              </div>))}
          </div>)}
        {selectedFriend && (<div className="mt-3 rounded-[18px] bg-[#F8FAFC] p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-[#111827]">{selectedFriend.fullName}</p>
                <p className="text-xs text-[#6B7280]">@{selectedFriend.username} Ã¯Â¿Â½ {selectedFriend.commonGroups} grup bersama</p>
              </div>
              <button className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500" onClick={() => setSelectedFriend(null)}><X size={15}/></button>
            </div>
            <p className="mt-3 text-xs text-[#6B7280]">Posisi dengan Anda</p>
            <p className={`mt-0.5 text-lg font-semibold ${Number(selectedFriend.balance) >= 0 ? "text-[#16A34A]" : "text-rose-600"}`}>
              {Number(selectedFriend.balance) === 0 ? "Selesai" : rupiah(Math.abs(Number(selectedFriend.balance)))}
            </p>
            <div className="mt-3 space-y-2">
              {selectedFriend.sharedTransactions?.map((row: any) => (<div key={row.id} className="flex justify-between gap-3 border-t border-[#E5E7EB] pt-2 text-xs">
                  <span>{row.description} Ã¯Â¿Â½ {row.groupName}</span><span className="font-semibold">{rupiah(row.amount)}</span>
                </div>))}
            </div>
          </div>)}
      </div>

      <div className="social-enter min-h-[108px] rounded-[20px] bg-[#16A34A] p-4 text-white shadow-[0_14px_34px_rgba(22,163,74,0.16)] lg:rounded-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="rounded-full bg-white/10 px-2 py-1 text-[9px] font-semibold uppercase text-emerald-100">Keuangan sosial</span>
            <h3 className="mt-2 text-base font-semibold">Bayar bareng tanpa buka data pribadi</h3>
            <p className="mt-1 text-[11px] leading-4 text-emerald-50/80">Hanya transaksi yang melibatkan teman yang akan terlihat.</p>
          </div>
          <button type="button" className="shrink-0 rounded-xl bg-white px-3 py-2 text-[11px] font-semibold text-[#16A34A]" onClick={onOpenPrivacy}>Pelajari</button>
        </div>
      </div>
    </div>);
}

export function SocialHubView({ request, accounts, token, currentUser, summary, language, onChanged, onChildFrameStateChange }: {
    request: <T>(path: string, options?: RequestInit) => Promise<T>;
    accounts: Account[];
    token: string;
    currentUser: Session["user"];
    summary: SocialSummary | null;
    language: AppLanguage;
    onChanged: () => Promise<void>;
    onChildFrameStateChange?: (state: ChildFrameState) => void;
}) {
    const [tab, setTab] = useState<"friends" | "groups" | "wallets" | "activity" | "privacy" | null>(null);
    const [friends, setFriends] = useState<SocialFriend[]>([]);
    const [groups, setGroups] = useState<SocialGroup[]>([]);
    const [wallets, setWallets] = useState<SocialWallet[]>([]);
    const [activity, setActivity] = useState<SocialActivity[]>([]);
    const [activityLoadingMore, setActivityLoadingMore] = useState(false);
    const [activityHasMore, setActivityHasMore] = useState(true);
    const [privacy, setPrivacy] = useState({
        allowWalletInvites: true,
        allowGroupInvites: true,
        searchableBy: "username",
        hidePhone: true
    });
    const [selectedGroup, setSelectedGroup] = useState<GroupDetail | null>(null);
    const [selectedWallet, setSelectedWallet] = useState<WalletDetail | null>(null);
    const [walletReminders, setWalletReminders] = useState<WalletReminder[]>([]);
    const [showWalletReminderForm, setShowWalletReminderForm] = useState(false);
    const [showWalletEntryForm, setShowWalletEntryForm] = useState(false);
    const [showWalletEditModal, setShowWalletEditModal] = useState(false);
    const [showWalletMembersModal, setShowWalletMembersModal] = useState(false);
    const [walletEntryReceiptId, setWalletEntryReceiptId] = useState<string | null>(null);
    const [walletEntryAttachmentName, setWalletEntryAttachmentName] = useState("");
    const [walletEntryAttachmentMessage, setWalletEntryAttachmentMessage] = useState<string | null>(null);
    const [walletEntryDate, setWalletEntryDate] = useState(isoDateInput());
    const [walletEntryAttachmentLoading, setWalletEntryAttachmentLoading] = useState(false);
    const [walletStorageMode, setWalletStorageMode] = useState<"account" | "manual">("account");
    const [walletStorageAccountId, setWalletStorageAccountId] = useState("");
    const [walletAdminIds, setWalletAdminIds] = useState<Set<string>>(new Set());
    const [walletReminderInterval, setWalletReminderInterval] = useState<"daily" | "weekly" | "monthly">("daily");
    const [selectedFriend, setSelectedFriend] = useState<any>(null);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [friendSearchQuery, setFriendSearchQuery] = useState("");
    const [friendSearchLoading, setFriendSearchLoading] = useState(false);
    const [friendSearchAttempted, setFriendSearchAttempted] = useState(false);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [showCreateWallet, setShowCreateWallet] = useState(false);
    const [groupMemberIds, setGroupMemberIds] = useState<Set<string>>(new Set());
    const [walletMemberIds, setWalletMemberIds] = useState<Set<string>>(new Set());
    const [walletInviteActionId, setWalletInviteActionId] = useState<string | null>(null);
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [editingGroupExpense, setEditingGroupExpense] = useState<GroupDetail["expenses"][number] | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [qrDataUrl, setQrDataUrl] = useState("");
    const friendSearchRef = useRef<HTMLInputElement>(null);
    const activitySentinelRef = useRef<HTMLDivElement>(null);
    const walletEntryFormRef = useRef<HTMLFormElement>(null);
    const walletDeepLinkHandled = useRef(false);
    const toggleSelectedFriend = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, friendId: string) => {
        setter((current) => {
            const next = new Set(current);
            if (next.has(friendId))
                next.delete(friendId);
            else
                next.add(friendId);
            return next;
        });
    };
    const socialEnumLabel = (value: string) => {
        const labels: Record<string, {
            en: string;
            id: string;
        }> = {
            accepted: { en: "Accepted", id: "Diterima" },
            pending: { en: "Pending", id: "Menunggu" },
            rejected: { en: "Rejected", id: "Ditolak" },
            blocked: { en: "Blocked", id: "Diblokir" },
            approved: { en: "Approved", id: "Disetujui" },
            cancelled: { en: "Cancelled", id: "Dibatalkan" },
            owner: { en: "Owner", id: "Pemilik" },
            admin: { en: "Admin", id: "Admin" },
            member: { en: "Member", id: "Anggota" },
            viewer: { en: "Viewer", id: "Pengamat" }
        };
        return labels[value]?.[language] ?? value;
    };
    const pendingWallets = wallets.filter((wallet) => wallet.status === "pending");
    const activeWallets = wallets.filter((wallet) => wallet.status === "accepted");
    const activeWalletBalance = activeWallets.reduce((total, wallet) => total + Number(wallet.balance || 0), 0);
    const pendingWalletApprovals = activeWallets.reduce((total, wallet) => total + Number(wallet.pendingCount || 0), 0);
    useEffect(() => {
        if (!message)
            return;
        const timer = window.setTimeout(() => setMessage(null), 3600);
        return () => window.clearTimeout(timer);
    }, [message]);
    const refresh = async () => {
        setLoading(true);
        try {
            const [nextFriends, nextGroups, nextWallets, nextActivity, nextPrivacy] = await Promise.all([
                request<SocialFriend[]>("/social/friends"),
                request<SocialGroup[]>("/social/groups"),
                request<SocialWallet[]>("/social/wallets"),
                request<SocialActivity[]>("/social/activity?limit=20&offset=0"),
                request<typeof privacy>("/social/privacy")
            ]);
            setFriends(nextFriends);
            setGroups(nextGroups);
            setWallets(nextWallets);
            setActivity(nextActivity);
            setActivityHasMore(nextActivity.length === 20);
            setPrivacy(nextPrivacy);
        }
        catch {
            setMessage(null);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        refresh();
    }, []);
    useEffect(() => {
        const resetSocialState = () => {
            setSelectedGroup(null);
            setSelectedWallet(null);
            setSelectedFriend(null);
            setShowCreateGroup(false);
            setShowCreateWallet(false);
            setGroupMemberIds(new Set());
            setWalletMemberIds(new Set());
            setShowWalletReminderForm(false);
            setShowWalletEntryForm(false);
        };
        onChildFrameStateChange?.({
            active: tab !== null && !showWalletEditModal && !showWalletMembersModal,
            onBack: tab === null
                ? null
                : () => {
                    if (selectedGroup) {
                        setSelectedGroup(null);
                        return;
                    }
                    if (selectedWallet) {
                        setSelectedWallet(null);
                        setShowWalletReminderForm(false);
                        setShowWalletEntryForm(false);
                        return;
                    }
                    if (showCreateGroup) {
                        setShowCreateGroup(false);
                        setGroupMemberIds(new Set());
                        return;
                    }
                    if (showCreateWallet) {
                        setShowCreateWallet(false);
                        setWalletMemberIds(new Set());
                        return;
                    }
                    if (selectedFriend) {
                        setSelectedFriend(null);
                        return;
                    }
                    setTab(null);
                    resetSocialState();
                },
            onRefresh: refresh
        });
    }, [
        onChildFrameStateChange,
        selectedFriend,
        selectedGroup,
        selectedWallet,
        showCreateGroup,
        showCreateWallet,
        showWalletEditModal,
        showWalletMembersModal,
        tab
    ]);
    useEffect(() => {
        const query = friendSearchQuery.trim();
        if (tab !== "friends" || query.length < 2) {
            setSearchResults([]);
            setFriendSearchAttempted(false);
            setFriendSearchLoading(false);
            if (tab === "friends")
                setMessage(null);
            return;
        }
        let active = true;
        setMessage(null);
        const timer = window.setTimeout(async () => {
            setFriendSearchLoading(true);
            try {
                const results = await request<any[]>(`/social/people/search?q=${encodeURIComponent(query)}`);
                if (!active)
                    return;
                setSearchResults(results);
                setFriendSearchAttempted(true);
                if (results.length > 0)
                    setMessage(null);
            }
            catch {
                if (!active)
                    return;
                setSearchResults([]);
                setFriendSearchAttempted(true);
            }
            finally {
                if (active)
                    setFriendSearchLoading(false);
            }
        }, 320);
        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [friendSearchQuery, tab]);
    useEffect(() => {
        if (!currentUser.username)
            return;
        QRCode.toDataURL(`finance-ai:user:${currentUser.username}`, {
            width: 220,
            margin: 1,
            color: { dark: "#16A34A", light: "#ffffff" }
        }).then(setQrDataUrl).catch(() => setQrDataUrl(""));
    }, [currentUser.username]);
    const scanQrFile = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        try {
            const Detector = (window as any).BarcodeDetector;
            const bitmap = await createImageBitmap(file);
            let value = "";
            if (Detector) {
                const detector = new Detector({ formats: ["qr_code"] });
                const codes = await detector.detect(bitmap);
                value = String(codes[0]?.rawValue ?? "");
            }
            else {
                const maxSide = 1400;
                const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
                const canvas = document.createElement("canvas");
                canvas.width = Math.max(1, Math.round(bitmap.width * scale));
                canvas.height = Math.max(1, Math.round(bitmap.height * scale));
                const context = canvas.getContext("2d", { willReadFrequently: true });
                context?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
                const pixels = context?.getImageData(0, 0, canvas.width, canvas.height);
                value = pixels ? jsQR(pixels.data, pixels.width, pixels.height)?.data ?? "" : "";
            }
            bitmap.close();
            if (!value)
                throw new Error("QR code tidak terbaca");
            setSearchResults(await request<any[]>(`/social/people/search?q=${encodeURIComponent(value)}`));
            setMessage(null);
        }
        catch {
            setMessage(null);
        }
        finally {
            event.target.value = "";
        }
    };
    const runAction = async (work: () => Promise<unknown>, success: string) => {
        setMessage(null);
        try {
            await work();
            setMessage(success);
            await refresh();
            await onChanged();
        }
        catch {
            setMessage(null);
        }
    };
    const respondWalletInvitation = async (wallet: SocialWallet, status: "accepted" | "rejected") => {
        if (walletInviteActionId)
            return;
        setWalletInviteActionId(wallet.id);
        setMessage(null);
        try {
            await request(`/social/wallets/${wallet.id}/invite`, {
                method: "PUT",
                body: JSON.stringify({ status })
            });
            setMessage(status === "accepted" ? `Anda bergabung ke ${wallet.name}` : `Undangan ${wallet.name} ditolak`);
            await refresh();
            await onChanged();
        }
        catch {
            setMessage(null);
        }
        finally {
            setWalletInviteActionId(null);
        }
    };
    const searchPerson = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const query = friendSearchQuery.trim() || String(new FormData(event.currentTarget).get("query") || "").trim();
        if (query.length < 2)
            return;
        setFriendSearchLoading(true);
        try {
            const results = await request<any[]>(`/social/people/search?q=${encodeURIComponent(query)}`);
            setSearchResults(results);
            setFriendSearchAttempted(true);
            if (results.length > 0)
                setMessage(null);
        }
        catch {
            setMessage(null);
        }
        finally {
            setFriendSearchLoading(false);
        }
    };
    const shareAccountQr = async () => {
        const accountCode = `finance-ai:user:${currentUser.username ?? currentUser.id}`;
        try {
            if (navigator.share) {
                await navigator.share({
                    title: "Tambah saya di Finly AI",
                    text: `Temukan saya dengan username @${currentUser.username ?? currentUser.id}\n${accountCode}`
                });
            }
            else {
                await navigator.clipboard.writeText(accountCode);
                setMessage("Kode akun berhasil disalin");
            }
        }
        catch (error) {
            if (error instanceof DOMException && error.name === "AbortError")
                return;
            setMessage("Kode akun belum dapat dibagikan");
        }
    };
    const uploadWalletEntryAttachment = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        setWalletEntryAttachmentLoading(true);
        setWalletEntryAttachmentName(file.name);
        setWalletEntryAttachmentMessage("Mengunggah file...");
        try {
            const uploadForm = new FormData();
            uploadForm.set("receipt", file);
            try {
                const uploaded = await request<{
                    id: string;
                }>("/receipts/upload", {
                    method: "POST",
                    body: uploadForm
                });
                setWalletEntryReceiptId(uploaded.id);
            }
            catch (error) {
                const duplicateId = error instanceof ApiError && error.status === 409 && error.details && typeof error.details === "object"
                    ? String((error.details as {
                        receiptId?: unknown;
                    }).receiptId ?? "")
                    : "";
                if (!duplicateId)
                    throw error;
                setWalletEntryReceiptId(duplicateId);
            }
            setMessage("Attachment berhasil diunggah");
            setWalletEntryAttachmentMessage("File siap disimpan bersama transaksi dompet.");
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Attachment gagal diunggah";
            setWalletEntryAttachmentMessage(errorMessage);
            setMessage(errorMessage);
        }
        finally {
            setWalletEntryAttachmentLoading(false);
            event.target.value = "";
        }
    };
    const openWalletAttachment = async (receiptId: string) => {
        try {
            const response = await fetch(downloadUrl(`/receipts/${receiptId}/file`), {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok)
                throw new Error("Attachment tidak dapat dimuat");
            const blob = await response.blob();
            const signature = new TextDecoder("ascii").decode(await blob.slice(4, 16).arrayBuffer());
            const isHeic = /image\/hei[cf]/i.test(blob.type) || /ftyp(?:heic|heix|hevc|hevx|mif1|msf1)/i.test(signature);
            const previewBlob = isHeic
                ? (await heic2any({ blob, toType: "image/jpeg", quality: 0.9 }))
                : blob;
            const resolvedBlob = Array.isArray(previewBlob) ? previewBlob[0] : previewBlob;
            const url = URL.createObjectURL(resolvedBlob);
            window.open(url, "_blank", "noopener,noreferrer");
            window.setTimeout(() => URL.revokeObjectURL(url), 60000);
        }
        catch {
            setMessage(null);
        }
    };
    const openGroup = async (id: string) => {
        setSelectedGroup(await request<GroupDetail>(`/social/groups/${id}`));
        setGroupMemberIds(new Set());
        setShowExpenseForm(false);
    };
    const openWallet = async (id: string) => {
        const [wallet, reminders] = await Promise.all([
            request<WalletDetail>(`/social/wallets/${id}`),
            request<WalletReminder[]>(`/social/wallets/${id}/reminders`).catch(() => [])
        ]);
        setSelectedWallet(wallet);
        setShowWalletEditModal(false);
        setShowWalletMembersModal(false);
        setWalletMemberIds(new Set());
        setWalletReminders(reminders);
        setShowWalletEntryForm(false);
        setWalletEntryReceiptId(null);
        setWalletEntryAttachmentName("");
        setWalletEntryAttachmentMessage(null);
        setWalletEntryDate(isoDateInput());
    };
    useEffect(() => {
        if (loading || walletDeepLinkHandled.current)
            return;
        const params = new URLSearchParams(window.location.search);
        const walletId = params.get("walletId");
        if (!walletId)
            return;
        walletDeepLinkHandled.current = true;
        setTab("wallets");
        openWallet(walletId)
            .then(() => {
            if (params.get("walletAction") === "record") {
                setShowWalletEntryForm(true);
                window.setTimeout(() => walletEntryFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 180);
            }
        })
            .catch(() => setMessage("Dompet bersama tidak dapat dibuka"));
    }, [loading]);
    const loadMoreActivity = async () => {
        if (activityLoadingMore || !activityHasMore)
            return;
        setActivityLoadingMore(true);
        try {
            const rows = await request<SocialActivity[]>(`/social/activity?limit=20&offset=${activity.length}`);
            setActivity((current) => {
                const existingIds = new Set(current.map((item) => item.id));
                return [...current, ...rows.filter((item) => !existingIds.has(item.id))];
            });
            setActivityHasMore(rows.length === 20);
        }
        catch {
            setActivityHasMore(false);
        }
        finally {
            setActivityLoadingMore(false);
        }
    };
    useEffect(() => {
        if (tab !== "activity" || !activitySentinelRef.current || !activityHasMore)
            return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting)
                loadMoreActivity();
        }, { rootMargin: "180px 0px" });
        observer.observe(activitySentinelRef.current);
        return () => observer.disconnect();
    }, [tab, activity.length, activityHasMore, activityLoadingMore]);
    const tabs = [
        {
            id: "friends" as const,
            label: "Teman",
            icon: UserPlus,
            count: `${friends.filter((friend) => friend.status === "accepted").length} teman`,
            meta: friends.some((friend) => friend.incoming) ? `${friends.filter((friend) => friend.incoming).length} permintaan menunggu` : "Cari teman dan kelola transaksi bersama",
            tone: "bg-emerald-50 text-[#16A34A]"
        },
        {
            id: "groups" as const,
            label: "Grup",
            icon: Users,
            count: `${groups.length} grup`,
            meta: "Split bill dan pengeluaran bersama",
            tone: "bg-sky-50 text-sky-700"
        },
        {
            id: "wallets" as const,
            label: "Dompet bersama",
            icon: Wallet,
            count: `${wallets.length} dompet`,
            meta: "Kelola kas dan saldo bersama",
            tone: "bg-violet-50 text-violet-700"
        },
        {
            id: "activity" as const,
            label: "Aktivitas",
            icon: Bell,
            count: `${activity.filter((row) => !row.isRead).length} baru`,
            meta: "Permintaan dan perubahan yang melibatkan Anda",
            tone: "bg-amber-50 text-amber-700"
        },
        {
            id: "privacy" as const,
            label: "Privasi",
            icon: ShieldCheck,
            count: "Terlindungi",
            meta: "Atur pencarian dan izin undangan",
            tone: "bg-rose-50 text-rose-700"
        }
    ];
    const groupedActivity = activity.reduce<Array<{
        key: string;
        label: string;
        items: SocialActivity[];
    }>>((groups, item) => {
        const date = new Date(item.createdAt);
        const key = jakartaDateParts(date).value;
        const existing = groups.find((group) => group.key === key);
        if (existing) {
            existing.items.push(item);
            return groups;
        }
        groups.push({
            key,
            label: new Intl.DateTimeFormat(language === "en" ? "en-US" : "id-ID", {
                timeZone: APP_TIME_ZONE,
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }).format(date),
            items: [item]
        });
        return groups;
    }, []);
    const selectedWalletStorageAccount = accounts.find((account) => account.id === walletStorageAccountId);
    return (<section className="mx-auto max-w-6xl space-y-3">
      {tab === null ? (<>
          <div className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-soft lg:rounded-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase text-[#16A34A]">Social</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">Keuangan bersama</h2>
                <p className="mt-1 text-xs text-slate-500">Teman, grup, dan tagihan dalam satu tempat.</p>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#16A34A]">
                <Users size={21}/>
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              <SocialMetric label="Harus dibayar" value={rupiah(summary?.totalPayable ?? 0)} tone="expense" icon={<ArrowUpRight size={14}/>}/>
              <SocialMetric label="Harus diterima" value={rupiah(summary?.totalReceivable ?? 0)} tone="income" icon={<ArrowDownLeft size={14}/>}/>
              <SocialMetric label="Grup aktif" value={String(summary?.activeGroups ?? 0)} tone="neutral" icon={<Users size={14}/>}/>
              <SocialMetric label="Perlu konfirmasi" value={String(summary?.pendingConfirmations ?? 0)} tone="neutral" icon={<Bell size={14}/>}/>
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-100 bg-white p-3 shadow-soft lg:rounded-lg">
            <div className="grid grid-cols-1 gap-3">
              {tabs.filter((item) => item.id !== "activity").map((item) => {
                const Icon = item.icon;
                return (<button key={item.id} type="button" className="ripple-card flex min-h-[88px] items-center gap-3 rounded-[18px] border border-slate-100 bg-white p-3 text-left transition hover:border-emerald-100 hover:bg-slate-50 active:scale-[0.99] lg:rounded-md" onClick={() => {
                        setTab(item.id);
                        setSelectedGroup(null);
                        setSelectedWallet(null);
                        setSelectedFriend(null);
                        setShowCreateGroup(false);
                        setShowCreateWallet(false);
                        setGroupMemberIds(new Set());
                        setWalletMemberIds(new Set());
                    }}>
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${item.tone}`}>
                      <Icon size={23} strokeWidth={2}/>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-950">{item.label}</span>
                        <span className="max-w-[120px] shrink-0 truncate rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{item.count}</span>
                      </span>
                      <span className="mt-1 block truncate text-[11px] text-slate-500">{item.meta}</span>
                    </span>
                    <ChevronRight size={19} className="shrink-0 text-slate-300"/>
                  </button>);
            })}
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-soft lg:rounded-lg">
            <SectionHeader title="Aktivitas terbaru" caption="Pembaruan yang melibatkan Anda" action={activity.length > 0 ? (<button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-[#16A34A]" onClick={() => setTab("activity")}>
                  Lihat selengkapnya <ChevronRight size={14}/>
                </button>) : undefined}/>
            <div className="space-y-1">
              {loading && <SocialSkeleton />}
              {!loading && activity.length === 0 && <EmptyState text="Belum ada aktivitas sosial."/>}
              {!loading && activity.slice(0, 5).map((event) => (<button key={event.id} type="button" className="flex w-full items-start gap-3 rounded-2xl px-2 py-3 text-left transition hover:bg-slate-50" onClick={() => setTab("activity")}>
                  <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${event.isRead ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-[#16A34A]"}`}>
                    <Bell size={16}/>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-slate-900">{event.title}</span>
                      {!event.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-[#16A34A]"/>}
                    </span>
                    {event.body && <span className="mt-0.5 block truncate text-xs text-slate-500">{event.body}</span>}
                    <span className="mt-1 block text-[10px] text-slate-400">{localDate(event.createdAt)}</span>
                  </span>
                  <ChevronRight size={16} className="mt-2 shrink-0 text-slate-300"/>
                </button>))}
            </div>
          </div>
        </>) : !selectedGroup && !selectedWallet && !showCreateGroup && !showCreateWallet ? (<div className="flex items-center justify-between rounded-[20px] border border-slate-100 bg-white p-3 shadow-soft lg:rounded-lg">
          <button type="button" className="app-back-button" onClick={() => {
                setTab(null);
                setSelectedGroup(null);
                setSelectedWallet(null);
                setSelectedFriend(null);
                setShowCreateGroup(false);
                setShowCreateWallet(false);
                setGroupMemberIds(new Set());
                setWalletMemberIds(new Set());
            }}>
            <ArrowLeft size={14}/> Kembali
          </button>
          {(() => {
                const activeItem = tabs.find((item) => item.id === tab)!;
                const Icon = activeItem.icon;
                return (<div className="flex min-w-0 items-center gap-2">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${activeItem.tone}`}>
                  <Icon size={17}/>
                </span>
                <div className="min-w-0 text-right">
                  <p className="truncate text-sm font-semibold text-slate-950">{activeItem.label}</p>
                  <p className="text-[10px] text-slate-500">{activeItem.count}</p>
                </div>
              </div>);
            })()}
        </div>) : null}

      {message && (<div className="fixed left-4 right-4 top-20 z-50 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_18px_44px_rgba(15,23,42,0.16)] lg:left-auto lg:right-6 lg:w-96 lg:rounded-lg">
          {message}
        </div>)}
      {loading && tab !== null && <LoadingState />}

      {!loading && tab === "friends" && (<div className="grid gap-3 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-3">
            <form className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg" onSubmit={searchPerson}>
              <SectionHeader title="Tambah teman" caption="Cari lewat username, email, telepon, atau kode QR."/>
              <div className="relative">
                <div className="flex gap-2">
                  <input ref={friendSearchRef} className="input min-w-0 flex-1" name="query" value={friendSearchQuery} onChange={(event) => {
                setFriendSearchQuery(event.target.value);
                setMessage(null);
            }} placeholder="Cari username atau email..." autoComplete="off" required/>
                  <button className="btn-primary shrink-0" aria-label="Cari pengguna" disabled={friendSearchLoading}>
                    {friendSearchLoading ? <Loader2 className="animate-spin" size={16}/> : <Search size={16}/>}
                  </button>
                </div>
                {friendSearchQuery.trim().length >= 2 && (<div className="absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_44px_rgba(15,23,42,0.16)]">
                    {friendSearchLoading && searchResults.length === 0 ? (<div className="flex items-center gap-2 px-3 py-3 text-xs text-slate-500">
                        <Loader2 className="animate-spin text-[#16A34A]" size={15}/>
                        Mencari pengguna...
                      </div>) : searchResults.length > 0 ? searchResults.map((person) => {
                    const statusLabels: Record<string, string> = {
                        self: "Akun Anda",
                        pending: "Menunggu",
                        incoming: "Perlu respons",
                        accepted: "Teman",
                        rejected: "Tambah lagi",
                        none: "Tambah"
                    };
                    const canAdd = person.relationshipStatus === "none" || person.relationshipStatus === "rejected";
                    return (<div key={person.id} className="flex items-center gap-2 rounded-xl px-2.5 py-2 transition hover:bg-slate-50">
                          {person.avatarUrl
                            ? <img src={person.avatarUrl} className="h-9 w-9 shrink-0 rounded-xl object-cover" alt=""/>
                            : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#16A34A]"><UserRound size={16}/></span>}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-slate-900">{person.fullName}</p>
                            <p className="truncate text-[10px] text-slate-500">
                              @{person.username}{person.email ? ` - ${person.email}` : ""}
                            </p>
                          </div>
                          <button type="button" className={`shrink-0 rounded-xl px-3 py-2 text-[11px] font-semibold ${canAdd ? "bg-emerald-50 text-[#16A34A]" : "bg-slate-100 text-slate-400"}`} disabled={!canAdd} onClick={() => runAction(async () => {
                            await request("/social/friends/request", {
                                method: "POST",
                                body: JSON.stringify({
                                    identifier: person.username,
                                    targetUserId: person.id
                                })
                            });
                            setFriendSearchQuery("");
                            setSearchResults([]);
                            setFriendSearchAttempted(false);
                        }, "Permintaan pertemanan dikirim")}>
                            {statusLabels[person.relationshipStatus] ?? "Terhubung"}
                          </button>
                        </div>);
                }) : friendSearchAttempted ? (<div className="px-3 py-3 text-xs text-slate-500">
                        Pengguna tidak ditemukan atau tidak mengizinkan pencarian dengan data tersebut.
                      </div>) : null}
                  </div>)}
              </div>
              <div className="mt-4 rounded-2xl border border-slate-100 bg-[#F8FAFC] p-4 text-center">
                <div className="mx-auto w-fit rounded-2xl bg-white p-3 shadow-sm">
                  {qrDataUrl
                ? <img src={qrDataUrl} className="h-44 w-44 rounded-xl" alt="QR akun"/>
                : <span className="flex h-44 w-44 items-center justify-center rounded-xl bg-slate-50 text-[#16A34A]"><QrCode size={52}/></span>}
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">@{currentUser.username ?? "atur-username"}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700" onClick={shareAccountQr}>
                    <Share2 size={15}/> Bagikan QR
                  </button>
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-3 py-2.5 text-xs font-semibold text-white">
                    <QrCode size={15}/> Scan QR
                    <input className="sr-only" type="file" accept="image/*" capture="environment" onChange={scanQrFile}/>
                  </label>
                </div>
              </div>
            </form>
          </div>

          <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
            <SectionHeader title="Teman & permintaan" caption={`${friends.length} hubungan`}/>
            <div className="space-y-2">
              {friends.length === 0 && (<div className="rounded-2xl bg-[#F8FAFC] p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-[#16A34A]"><UserPlus size={20}/></span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Belum ada teman</p>
                      <p className="mt-0.5 text-xs text-slate-500">Mulai terhubung untuk mencatat transaksi bersama.</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-xs text-slate-600">
                    <button type="button" className="flex w-full items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-left" onClick={() => friendSearchRef.current?.focus()}>
                      <Search size={15} className="text-[#16A34A]"/> Cari username
                    </button>
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-left">
                      <QrCode size={15} className="text-[#16A34A]"/> Scan QR
                      <input className="sr-only" type="file" accept="image/*" capture="environment" onChange={scanQrFile}/>
                    </label>
                    <button type="button" className="flex w-full items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-left" onClick={shareAccountQr}>
                      <Share2 size={15} className="text-[#16A34A]"/> Undang teman
                    </button>
                  </div>
                  <button type="button" className="mt-3 w-full rounded-xl bg-[#16A34A] px-4 py-2.5 text-xs font-semibold text-white" onClick={() => {
                    friendSearchRef.current?.focus();
                    friendSearchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}>Tambah Teman</button>
                </div>)}
              {friends.map((friend) => (<div key={friend.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
                  {friend.avatarUrl
                    ? <img src={friend.avatarUrl} className="h-10 w-10 rounded-xl object-cover" alt=""/>
                    : <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-[#16A34A]"><UserRound size={17}/></span>}
                  <button type="button" className="min-w-0 flex-1 text-left" disabled={friend.status !== "accepted"} onClick={async () => setSelectedFriend({
                    ...await request<Record<string, unknown>>(`/social/friends/profile/${friend.userId}`),
                    friendshipId: friend.id,
                    userId: friend.userId
                })}>
                    <p className="truncate text-sm font-semibold">{friend.fullName}</p>
                    <p className="text-xs text-slate-500">@{friend.username} Ã¯Â¿Â½ {friend.incoming ? "Menunggu jawaban Anda" : socialEnumLabel(friend.status)}</p>
                  </button>
                  {friend.incoming ? (<div className="flex gap-1">
                      <button className="rounded-full bg-emerald-50 p-2 text-[#16A34A]" onClick={() => runAction(() => request(`/social/friends/${friend.id}/respond`, { method: "PUT", body: JSON.stringify({ status: "accepted" }) }), "Pertemanan diterima")}><CheckCircle2 size={15}/></button>
                      <button className="rounded-full bg-rose-50 p-2 text-rose-600" onClick={() => runAction(() => request(`/social/friends/${friend.id}/respond`, { method: "PUT", body: JSON.stringify({ status: "rejected" }) }), "Permintaan ditolak")}><X size={15}/></button>
                    </div>) : friend.status === "accepted" ? (<ChevronRight size={16} className="text-slate-300"/>) : null}
                </div>))}
            </div>
            {selectedFriend && (<div className="mt-3 rounded-2xl bg-slate-50 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{selectedFriend.fullName}</p>
                    <p className="text-xs text-slate-500">@{selectedFriend.username} Ã¯Â¿Â½ {selectedFriend.commonGroups} grup bersama</p>
                  </div>
                  <button onClick={() => setSelectedFriend(null)}><X size={15}/></button>
                </div>
                <p className="mt-3 text-xs text-slate-500">Utang/piutang dengan Anda</p>
                <p className={`text-lg font-semibold ${Number(selectedFriend.balance) >= 0 ? "text-[#16A34A]" : "text-rose-600"}`}>
                  {rupiah(Math.abs(Number(selectedFriend.balance)))}
                </p>
                <div className="mt-3 space-y-2">
                  {selectedFriend.sharedTransactions?.map((row: any) => (<div key={row.id} className="flex justify-between gap-3 border-t border-slate-200 pt-2 text-xs">
                      <span>{row.description} Ã¯Â¿Â½ {row.groupName}</span><span className="font-semibold">{rupiah(row.amount)}</span>
                    </div>))}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200 pt-3">
                  <button className="rounded-xl bg-white px-2 py-2 text-[11px] font-semibold text-slate-600" onClick={() => {
                    if (!window.confirm(`Hapus ${selectedFriend.fullName} dari daftar teman?`))
                        return;
                    runAction(() => request(`/social/friends/${selectedFriend.friendshipId}`, { method: "DELETE" }), "Teman berhasil dihapus").then(() => setSelectedFriend(null));
                }}>Hapus teman</button>
                  <button className="rounded-xl bg-rose-50 px-2 py-2 text-[11px] font-semibold text-rose-600" onClick={() => {
                    if (!window.confirm(`Blokir ${selectedFriend.fullName}?`))
                        return;
                    runAction(() => request(`/social/friends/${selectedFriend.friendshipId}/block`, { method: "POST" }), "Pengguna berhasil diblokir").then(() => setSelectedFriend(null));
                }}>Blokir</button>
                  <button className="rounded-xl bg-amber-50 px-2 py-2 text-[11px] font-semibold text-amber-700" onClick={() => {
                    const reason = window.prompt("Alasan melaporkan pengguna:");
                    if (!reason?.trim())
                        return;
                    runAction(() => request(`/social/people/${selectedFriend.userId}/report`, {
                        method: "POST",
                        body: JSON.stringify({ reason: reason.trim() })
                    }), "Laporan berhasil dikirim");
                }}>Laporkan</button>
                </div>
              </div>)}
          </div>
        </div>)}

      {!loading && tab === "groups" && !selectedGroup && (<div className="space-y-3">
          {!showCreateGroup && (<button className="btn-primary w-full" onClick={() => setShowCreateGroup(true)}><Plus size={16}/> Buat grup</button>)}
          {showCreateGroup && (<>
            <button type="button" className="app-back-button" onClick={() => {
                    setShowCreateGroup(false);
                    setGroupMemberIds(new Set());
                }}>
              <ArrowLeft size={14}/> Kembali
            </button>
            <form className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg" onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    runAction(() => request("/social/groups", {
                        method: "POST",
                        body: JSON.stringify({
                            name: String(form.get("name")),
                            description: String(form.get("description") || ""),
                            memberIds: [...groupMemberIds]
                        })
                    }), "Grup berhasil dibuat").then(() => {
                        setShowCreateGroup(false);
                        setGroupMemberIds(new Set());
                    });
                }}>
              <div className="mb-5 flex items-start gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700"><Users size={20}/></span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">Buat grup baru</h3>
                    <p className="mt-0.5 text-[11px] text-slate-500">Pilih teman yang akan berbagi pengeluaran.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <Field label="Nama grup">
                  <input className="input" name="name" placeholder="Contoh: Trip Bali" required/>
                </Field>
                <Field label="Deskripsi (opsional)">
                  <textarea className="input min-h-24 resize-none" name="description" placeholder="Tujuan atau catatan singkat grup"/>
                </Field>
                <SocialFriendPicker friends={friends} selectedIds={groupMemberIds} onToggle={(friendId) => toggleSelectedFriend(setGroupMemberIds, friendId)}/>
                <div className="rounded-2xl bg-slate-50 px-3 py-2.5 text-[11px] leading-4 text-slate-500">
                  Teman yang dipilih akan menerima undangan dan bergabung setelah menyetujuinya.
                </div>
                <button className="btn-primary w-full"><Users size={16}/> Buat grup</button>
              </div>
            </form>
            </>)}
          {!showCreateGroup && <div className="grid gap-2 md:grid-cols-2">
            {groups.length === 0 && <EmptyState text="Belum ada grup keuangan."/>}
            {groups.map((group) => (<div key={group.id} className="rounded-[22px] bg-white p-4 text-left shadow-soft lg:rounded-lg">
                <button className="w-full text-left" disabled={group.status === "pending"} onClick={() => openGroup(group.id)}>
                  <div className="flex justify-between gap-3"><p className="font-semibold">{group.name}</p>{group.status !== "pending" && <ChevronRight size={16} className="text-slate-300"/>}</div>
                  <p className="mt-1 text-xs text-slate-500">{group.status === "pending" ? "Undangan grup menunggu jawaban" : `${group.memberCount} anggota Ã¯Â¿Â½ ${socialEnumLabel(group.role)}`}</p>
                  {group.status !== "pending" && (<p className={`mt-3 text-sm font-semibold ${Number(group.myBalance) >= 0 ? "text-[#16A34A]" : "text-rose-600"}`}>
                      Posisi Anda {Number(group.myBalance) >= 0 ? "+" : "-"}{rupiah(Math.abs(Number(group.myBalance)))}
                    </p>)}
                </button>
                {group.status === "pending" && (<div className="mt-3 grid grid-cols-2 gap-2">
                    <button className="rounded-xl bg-[#16A34A] px-3 py-2 text-xs font-semibold text-white" onClick={() => runAction(() => request(`/social/groups/${group.id}/invite`, { method: "PUT", body: JSON.stringify({ status: "accepted" }) }), "Undangan grup diterima")}>Terima</button>
                    <button className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600" onClick={() => runAction(() => request(`/social/groups/${group.id}/invite`, { method: "PUT", body: JSON.stringify({ status: "rejected" }) }), "Undangan grup ditolak")}>Tolak</button>
                  </div>)}
              </div>))}
          </div>}
        </div>)}

      {!loading && tab === "groups" && selectedGroup && (<div className="space-y-3">
          <button type="button" className="app-back-button" onClick={() => setSelectedGroup(null)}><ArrowLeft size={14}/> Kembali</button>
          <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
            <SectionHeader title={selectedGroup.name} caption={`${selectedGroup.members.filter((item) => item.status === "accepted").length} anggota`}/>
            <div className="flex -space-x-2">
              {selectedGroup.members.filter((item) => item.status === "accepted").slice(0, 8).map((member) => (<span key={member.id} title={member.fullName} className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-emerald-50 text-[11px] font-semibold text-[#16A34A]">
                  {member.fullName.slice(0, 2).toUpperCase()}
                </span>))}
            </div>
            <form className="mt-4" onSubmit={(event) => {
                event.preventDefault();
                runAction(() => Promise.all([...groupMemberIds].map((userId) => request(`/social/groups/${selectedGroup.id}/members`, {
                    method: "POST",
                    body: JSON.stringify({ userId })
                }))), "Undangan anggota dikirim").then(() => {
                    setGroupMemberIds(new Set());
                    openGroup(selectedGroup.id);
                });
            }}>
              <SocialFriendPicker friends={friends} selectedIds={groupMemberIds} excludedIds={new Set(selectedGroup.members.map((member) => member.id))} title="Tambah teman ke grup" onToggle={(friendId) => toggleSelectedFriend(setGroupMemberIds, friendId)}/>
              <button className="btn-secondary mt-2 w-full" disabled={groupMemberIds.size === 0}>
                <UserPlus size={15}/> Undang {groupMemberIds.size || ""} teman
              </button>
            </form>
            <button className="btn-primary mt-3 w-full" onClick={() => {
                setEditingGroupExpense(null);
                setShowExpenseForm((value) => !value);
            }}><Plus size={16}/> Catat pengeluaran grup</button>
          </div>

          {showExpenseForm && (<form key={editingGroupExpense?.id ?? "new-group-expense"} className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg" onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    const participantIds = form.getAll("participantIds").map(String);
                    runAction(() => request(editingGroupExpense ? `/social/expenses/${editingGroupExpense.id}` : `/social/groups/${selectedGroup.id}/expenses`, {
                        method: editingGroupExpense ? "PUT" : "POST",
                        body: JSON.stringify({
                            description: String(form.get("description")),
                            amount: String(form.get("amount")),
                            paidBy: String(form.get("paidBy")),
                            participantIds
                        })
                    }), editingGroupExpense ? "Pengeluaran diubah dan meminta konfirmasi ulang" : "Pengeluaran grup berhasil ditambahkan").then(() => {
                        setEditingGroupExpense(null);
                        openGroup(selectedGroup.id);
                    });
                }}>
              <SectionHeader title={editingGroupExpense ? "Edit split bill" : "Split bill"} caption={editingGroupExpense ? "Perubahan nominal meminta konfirmasi ulang semua pihak terdampak." : "Bagian dibagi rata dan sisa pembulatan dibagikan otomatis."} action={editingGroupExpense ? <button type="button" onClick={() => { setEditingGroupExpense(null); setShowExpenseForm(false); }}><X size={15}/></button> : undefined}/>
              <div className="space-y-3">
                <input className="input" name="description" placeholder="Contoh: Makan malam" defaultValue={editingGroupExpense?.description ?? ""} required/>
                <input className="input" name="amount" inputMode="numeric" placeholder="Total nominal" defaultValue={editingGroupExpense ? moneyInputValue(editingGroupExpense.amount) : ""} onInput={handleMoneyInput} required/>
                <Field label="Dibayar oleh">
                  <select className="input" name="paidBy" defaultValue={editingGroupExpense?.paidBy ?? currentUser.id}>
                    {selectedGroup.members.filter((item) => item.status === "accepted").map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}
                  </select>
                </Field>
                <div>
                  <p className="mb-1 text-xs font-semibold text-slate-600">Yang ikut menikmati</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedGroup.members.filter((item) => item.status === "accepted").map((member) => (<label key={member.id} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2 text-xs">
                        <input type="checkbox" name="participantIds" value={member.id} defaultChecked={!editingGroupExpense || editingGroupExpense.participants.some((participant) => participant.userId === member.id)}/> {member.fullName}
                      </label>))}
                  </div>
                </div>
                <button className="btn-primary w-full">Simpan & split otomatis</button>
              </div>
            </form>)}

          <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
            <SectionHeader title="Penyelesaian minimum" caption="Simplify debt mengurangi jumlah transfer."/>
            <div className="space-y-2">
              {selectedGroup.simplifiedDebts.length === 0 && <EmptyState text="Semua anggota sudah seimbang."/>}
              {selectedGroup.simplifiedDebts.map((debt, index) => (<div key={`${debt.fromUserId}-${debt.toUserId}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 text-xs">
                  <span className="min-w-0"><strong>{debt.fromName}</strong> membayar <strong>{debt.toName}</strong></span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-semibold text-rose-600">{rupiah(debt.amount)}</span>
                    {debt.fromUserId === currentUser.id && (<button className="rounded-full bg-white px-2 py-1 font-semibold text-[#16A34A]" onClick={() => runAction(() => request(`/social/groups/${selectedGroup.id}/settlements`, {
                        method: "POST",
                        body: JSON.stringify({ toUserId: debt.toUserId, amount: debt.amount })
                    }), "Pembayaran menunggu konfirmasi penerima")}>Bayar</button>)}
                  </span>
                </div>))}
            </div>
          </div>

          <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
            <SectionHeader title="Riwayat grup" caption="Hanya transaksi anggota grup."/>
            <div className="space-y-2">
              {selectedGroup.expenses.map((expense) => (<div key={expense.id} className="rounded-2xl border border-slate-100 p-3">
                  <div className="flex justify-between gap-3"><p className="text-sm font-semibold">{expense.description}</p><p className="text-sm font-semibold">{rupiah(expense.amount)}</p></div>
                  <p className="mt-1 text-xs text-slate-500">Dibayar {expense.paidByName} Ã¯Â¿Â½ {localDate(expense.expenseDate)}</p>
                  {(expense.createdBy === currentUser.id || ["owner", "admin"].includes(selectedGroup.role)) && (<button className="mt-2 text-xs font-semibold text-[#16A34A]" onClick={() => {
                        setEditingGroupExpense(expense);
                        setShowExpenseForm(true);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                    }}>Edit transaksi</button>)}
                </div>))}
            </div>
            <form className="mt-3 flex gap-2" onSubmit={(event) => {
                event.preventDefault();
                const formElement = event.currentTarget;
                const messageValue = String(new FormData(formElement).get("message"));
                runAction(() => request(`/social/comments/group/${selectedGroup.id}`, { method: "POST", body: JSON.stringify({ message: messageValue }) }), "Komentar ditambahkan").then(() => {
                    formElement.reset();
                    openGroup(selectedGroup.id);
                });
            }}>
              <input className="input min-w-0 flex-1" name="message" placeholder="Komentar grup" required/>
              <button className="btn-secondary shrink-0"><MessageCircle size={15}/></button>
            </form>
          </div>
          <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
            <SectionHeader title="Audit history" caption="Perubahan transaksi tercatat dan dapat ditelusuri."/>
            <div className="space-y-2">
              {selectedGroup.auditHistory.length === 0 && <EmptyState text="Belum ada perubahan tercatat."/>}
              {selectedGroup.auditHistory.map((entry) => (<div key={entry.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 text-xs">
                  <span><strong>{entry.actorName ?? "Sistem"}</strong> Ã¯Â¿Â½ {entry.action === "CREATE" ? "membuat transaksi" : "mengubah transaksi dan meminta konfirmasi ulang"}</span>
                  <span className="shrink-0 text-slate-400">{localDate(entry.createdAt)}</span>
                </div>))}
            </div>
          </div>
        </div>)}

      {!loading && tab === "wallets" && !selectedWallet && (<div className="space-y-3">
          {showCreateWallet && (<>
            <button type="button" className="app-back-button" onClick={() => {
                    setShowCreateWallet(false);
                    setWalletMemberIds(new Set());
                }}>
              <ArrowLeft size={14}/> Kembali
            </button>
            <form className="rounded-[22px] bg-white p-4 shadow-soft" onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    runAction(() => request("/social/wallets", {
                        method: "POST",
                        body: JSON.stringify({
                            name: String(form.get("name")),
                            description: String(form.get("description") || ""),
                            spendingLimit: String(form.get("spendingLimit") || "") || undefined,
                            requireApproval: form.get("requireApproval") === "on",
                            memberIds: [...walletMemberIds],
                            adminIds: [...walletAdminIds],
                            storageAccountId: walletStorageMode === "account" ? String(form.get("storageAccountId") || "") || null : null,
                            storageType: walletStorageMode === "account" ? "bank" : String(form.get("storageType")),
                            storageProvider: String(form.get("storageProvider") || "") || undefined,
                            storageAccountNumber: String(form.get("storageAccountNumber") || "") || undefined
                        })
                    }), "Dompet bersama dibuat").then(() => {
                        setShowCreateWallet(false);
                        setWalletMemberIds(new Set());
                        setWalletAdminIds(new Set());
                        setWalletStorageAccountId("");
                    });
                }}>
              <div className="mb-5 flex items-start gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700"><Wallet size={20}/></span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">Buat dompet bersama</h3>
                    <p className="mt-0.5 text-[11px] text-slate-500">Saldo bersama tetap terpisah dari pocket pribadi.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <Field label="Nama dompet">
                  <input className="input" name="name" placeholder="Contoh: Kas rumah" required/>
                </Field>
                <Field label="Deskripsi (opsional)">
                  <textarea className="input min-h-20 resize-none" name="description" placeholder="Tujuan penggunaan dompet"/>
                </Field>
                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-700">Tempat dana</p>
                  <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
                    <button type="button" className={`rounded-xl px-3 py-2 text-xs font-semibold ${walletStorageMode === "account" ? "bg-white text-[#16A34A] shadow-sm" : "text-slate-500"}`} onClick={() => setWalletStorageMode("account")}>Pilih pocket</button>
                    <button type="button" className={`rounded-xl px-3 py-2 text-xs font-semibold ${walletStorageMode === "manual" ? "bg-white text-[#16A34A] shadow-sm" : "text-slate-500"}`} onClick={() => setWalletStorageMode("manual")}>Input manual</button>
                  </div>
                </div>
                {walletStorageMode === "account" ? (<Field label="Pocket penyimpanan">
                    <select className="input" name="storageAccountId" required={walletStorageMode === "account"} value={walletStorageAccountId} onChange={(event) => setWalletStorageAccountId(event.target.value)}>
                      <option value="" disabled>Pilih pocket Anda</option>
                      {accounts.filter((account) => account.isActive && !account.isSharedWalletAccount).map((account) => (<option key={account.id} value={account.id}>
                          {accountOptionLabel(account, { balance: true, language })}
                        </option>))}
                    </select>
                  </Field>) : (<>
                  <div className="grid grid-cols-2 gap-2">
                  <Field label="Jenis penyimpanan">
                    <select className="input" name="storageType" defaultValue="bank">
                      <option value="bank">Bank</option>
                      <option value="e_wallet">E-money / E-wallet</option>
                      <option value="cash">Tunai</option>
                      <option value="other">Lainnya</option>
                    </select>
                  </Field>
                  <Field label="Bank / penyedia">
                    <input className="input" name="storageProvider" placeholder="BCA, GoPay, DANA"/>
                  </Field>
                  </div>
                <Field label="Nomor rekening / e-money">
                  <input className="input" name="storageAccountNumber" inputMode="numeric" placeholder="Nomor tujuan penyimpanan dana"/>
                </Field>
                  </>)}
                {walletStorageMode === "account" && selectedWalletStorageAccount && (<>
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-[11px] leading-4 text-amber-800">
                      Pocket ini akan menjadi tempat dana dompet bersama dan tidak dapat digunakan untuk transaksi pribadi selama masih terhubung.
                    </div>
                    {selectedWalletStorageAccount.accountType !== "cash"
                        && (!selectedWalletStorageAccount.providerName || !selectedWalletStorageAccount.accountNumber) && (<div className="grid grid-cols-2 gap-2">
                        <Field label="Bank / penyedia">
                          <input className="input" name="storageProvider" placeholder="BCA, GoPay, DANA" defaultValue={selectedWalletStorageAccount.providerName ?? ""} required/>
                        </Field>
                        <Field label="Nomor rekening / e-money">
                          <input className="input" name="storageAccountNumber" placeholder="Nomor akun" defaultValue={selectedWalletStorageAccount.accountNumber ?? ""} required/>
                        </Field>
                      </div>)}
                  </>)}
                <Field label="Batas pengeluaran (opsional)">
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-semibold text-slate-400">Rp</span>
                    <input className="input pl-9" name="spendingLimit" inputMode="numeric" placeholder="0" onInput={handleMoneyInput}/>
                  </div>
                </Field>
                <SocialFriendPicker friends={friends} selectedIds={walletMemberIds} onToggle={(friendId) => toggleSelectedFriend(setWalletMemberIds, friendId)}/>
                {walletMemberIds.size > 0 && (<div>
                    <p className="mb-2 text-xs font-semibold text-slate-700">Pilih admin dompet</p>
                    <div className="flex flex-wrap gap-2">
                      {friends
                        .filter((friend) => walletMemberIds.has(friend.userId))
                        .map((friend) => {
                        const admin = walletAdminIds.has(friend.userId);
                        return (<button key={friend.userId} type="button" className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${admin ? "bg-[#16A34A] text-white" : "bg-slate-100 text-slate-600"}`} onClick={() => toggleSelectedFriend(setWalletAdminIds, friend.userId)}>
                              {friend.fullName}{admin ? " Ã¯Â¿Â½ Admin" : ""}
                            </button>);
                    })}
                    </div>
                  </div>)}
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <span>
                    <span className="block text-xs font-semibold text-slate-800">Persetujuan pengeluaran</span>
                    <span className="mt-0.5 block text-[10px] text-slate-500">Pengeluaran yang dicatat member perlu ditinjau owner atau admin sebelum mengurangi saldo.</span>
                  </span>
                  <input className="h-4 w-4 accent-[#16A34A]" type="checkbox" name="requireApproval" defaultChecked/>
                </label>
                <button className="btn-primary w-full"><Wallet size={16}/> Buat dompet bersama</button>
              </div>
            </form>
            </>)}
          {!showCreateWallet && (<div className="space-y-4">
              <section className="overflow-hidden rounded-[26px] bg-gradient-to-br from-emerald-600 via-[#16A34A] to-teal-700 p-5 text-white shadow-[0_18px_44px_rgba(22,163,74,0.22)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100">Keuangan kolaboratif</p>
                    <h2 className="mt-2 text-xl font-semibold">Dompet bersama</h2>
                    <p className="mt-1 max-w-xs text-xs leading-5 text-emerald-50/85">Kelola kas, tabungan, atau tujuan finansial bersama tanpa mencampur saldo pribadi.</p>
                  </div>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15"><Wallet size={21}/></span>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/15 pt-4">
                  <div><p className="text-[10px] text-emerald-100">Aktif</p><p className="mt-1 text-sm font-semibold">{activeWallets.length}</p></div>
                  <div><p className="text-[10px] text-emerald-100">Saldo dikelola</p><p className="mt-1 truncate text-sm font-semibold">{rupiah(activeWalletBalance)}</p></div>
                  <div><p className="text-[10px] text-emerald-100">Perlu ditinjau</p><p className="mt-1 text-sm font-semibold">{pendingWalletApprovals}</p></div>
                </div>
                <button type="button" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-semibold text-[#15803D] shadow-sm transition active:scale-[0.98]" onClick={() => setShowCreateWallet(true)}><Plus size={16}/> Buat dompet bersama</button>
              </section>

              {pendingWallets.length > 0 && (<section>
                  <SectionHeader title="Menunggu respons" caption={`${pendingWallets.length} undangan perlu Anda jawab`}/>
                  <div className="space-y-2">
                    {pendingWallets.map((wallet) => {
                        const responding = walletInviteActionId === wallet.id;
                        return (<div key={wallet.id} className="rounded-[22px] border border-amber-200 bg-amber-50/70 p-4 shadow-sm">
                          <div className="flex gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><Wallet size={19}/></span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-900">{wallet.name}</p>
                              <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-slate-600">{wallet.description || "Anda diundang untuk ikut mengelola dompet ini."}</p>
                              <span className="mt-2 inline-flex rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-amber-700">Peran: {socialEnumLabel(wallet.role)}</span>
                            </div>
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button type="button" disabled={responding} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-3 text-xs font-semibold text-white disabled:opacity-60" onClick={() => respondWalletInvitation(wallet, "accepted")}>{responding ? <Loader2 className="animate-spin" size={15}/> : <CheckCircle2 size={15}/>} Terima</button>
                            <button type="button" disabled={responding} className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 disabled:opacity-60" onClick={() => respondWalletInvitation(wallet, "rejected")}>Tolak</button>
                          </div>
                        </div>);
                    })}
                  </div>
                </section>)}

              <section>
                <SectionHeader title="Dompet Anda" caption={activeWallets.length ? "Pilih dompet untuk melihat transaksi dan anggota." : "Buat dompet pertama untuk mulai mengelola dana bersama."}/>
                {activeWallets.length === 0 ? (<div className="rounded-[22px] border border-dashed border-slate-200 bg-white px-5 py-8 text-center">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#16A34A]"><Wallet size={21}/></span>
                    <p className="mt-3 text-sm font-semibold text-slate-900">Belum ada dompet aktif</p>
                    <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-slate-500">Gunakan untuk kas rumah, tabungan liburan, atau pengeluaran bersama teman.</p>
                  </div>) : (<div className="grid gap-3 md:grid-cols-2">
                    {activeWallets.map((wallet) => (<button key={wallet.id} type="button" className="group rounded-[22px] border border-slate-100 bg-white p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]" onClick={() => openWallet(wallet.id)}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#16A34A]"><Wallet size={18}/></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{wallet.name}</p><p className="mt-0.5 truncate text-[11px] text-slate-500">{wallet.description || "Dompet bersama"}</p></div></div>
                          <ChevronRight size={17} className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#16A34A]"/>
                        </div>
                        <p className="mt-5 text-xl font-semibold tracking-tight text-slate-950">{rupiah(wallet.balance)}</p>
                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                          <span className="min-w-0 truncate text-[11px] text-slate-500">{wallet.storageAccountName || wallet.storageProvider || (wallet.storageType === "cash" ? "Penyimpanan tunai" : "Penyimpanan belum diatur")}</span>
                          <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${wallet.pendingCount > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-[#15803D]"}`}>{wallet.pendingCount > 0 ? `${wallet.pendingCount} perlu approval` : socialEnumLabel(wallet.role)}</span>
                        </div>
                      </button>))}
                  </div>)}
              </section>
            </div>)}
        </div>)}

      {!loading && tab === "wallets" && selectedWallet && (<div className="space-y-3">
          <button type="button" className="app-back-button" onClick={() => {
                setShowWalletEditModal(false);
                setShowWalletMembersModal(false);
                setSelectedWallet(null);
            }}><ArrowLeft size={14}/> Kembali</button>
          <div className="rounded-[22px] bg-[#16A34A] p-4 text-white shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-white/70">Saldo bersama Ã¯Â¿Â½ tidak termasuk saldo pribadi</p>
                <h3 className="mt-1 text-2xl font-semibold">{rupiah(selectedWallet.balance)}</h3>
                <p className="mt-1 text-xs text-white/70">
                  {selectedWallet.name} Ã¯Â¿Â½ {selectedWallet.members.filter((member) => member.status === "accepted").length} anggota
                </p>
              </div>
              {["owner", "admin"].includes(selectedWallet.role) && (<div className="flex flex-wrap gap-2">
                  <button type="button" className="inline-flex items-center gap-1 rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold text-white" onClick={() => setShowWalletEditModal(true)}>
                    <Settings size={14}/> Edit pocket
                  </button>
                  <button type="button" className="inline-flex items-center gap-1 rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold text-white" onClick={() => setShowWalletMembersModal(true)}>
                    <Users size={14}/> Edit anggota
                  </button>
                </div>)}
            </div>
            {selectedWallet.storageType === "gold" && (<div className="mt-3 rounded-2xl bg-white/10 px-3 py-3">
                <p className="text-[10px] font-medium uppercase text-white/60">Saldo Emas</p>
                <p className="mt-1 text-sm font-semibold">
                  {Number(selectedWallet.goldWeightGrams || 0).toLocaleString("id-ID", { minimumFractionDigits: 4, maximumFractionDigits: 4 })} gram
                </p>
                <p className="mt-1 text-xs text-white/75">
                  Nilai setara: {rupiah(selectedWallet.goldBalanceValue || selectedWallet.balance)}
                </p>
                {selectedWallet.goldPricePerGram && (<p className="mt-1 text-[11px] text-white/75">
                    Harga jual Pegadaian: Rp{Number(selectedWallet.goldPricePerGram).toLocaleString("id-ID")}/gram
                  </p>)}
                {selectedWallet.goldPriceFetchedAt && (<p className="mt-1 text-[11px] text-white/75">
                    Update terakhir: {localDate(selectedWallet.goldPriceFetchedAt)}
                  </p>)}
              </div>)}
            <div className="mt-3 grid grid-cols-3 divide-x divide-white/15 rounded-2xl bg-white/10 py-3">
              <div className="min-w-0 px-3">
                <p className="text-[9px] text-white/65">Setoran</p>
                <p className="mt-1 truncate text-xs font-semibold">{rupiah(selectedWallet.totalDeposit)}</p>
              </div>
              <div className="min-w-0 px-3">
                <p className="text-[9px] text-white/65">Pengeluaran</p>
                <p className="mt-1 truncate text-xs font-semibold">{rupiah(selectedWallet.totalExpense)}</p>
              </div>
              <div className="min-w-0 px-3">
                <p className="text-[9px] text-white/65">Saldo bersih</p>
                <p className="mt-1 truncate text-xs font-semibold">{rupiah(selectedWallet.balance)}</p>
              </div>
            </div>
            <div className="mt-3 rounded-2xl bg-white/10 px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase text-white/60">Dana disimpan di</p>
              <p className="mt-1 text-[10px] text-white/65">
                {selectedWallet.storageType === "gold"
                ? "Emas"
                : selectedWallet.storageType === "e_wallet"
                    ? "E-wallet / e-money"
                    : selectedWallet.storageType === "bank"
                        ? "Rekening bank"
                        : selectedWallet.storageType === "cash"
                            ? "Tunai"
                            : "Penyimpanan lainnya"}
              </p>
              <p className="mt-1 text-sm font-semibold">
                {selectedWallet.storageAccountName || selectedWallet.storageProvider || (selectedWallet.storageType === "cash" ? "Tunai" : selectedWallet.storageType)}
              </p>
              {selectedWallet.storageAccountNumber && <p className="mt-0.5 text-xs text-white/75">{selectedWallet.storageAccountNumber}</p>}
              <p className="mt-2 text-[11px] text-white/75">
                Split biaya: {selectedWallet.expenseSplitRule === "percentage" ? "Persentase" : selectedWallet.expenseSplitRule === "manual" ? "Manual" : "Merata"}
                {selectedWallet.activeUntil ? ` Ã¯Â¿Â½ Aktif sampai ${localDate(selectedWallet.activeUntil)}` : " Ã¯Â¿Â½ Aktif tanpa batas waktu"}
              </p>
            </div>
          </div>

          <section className="rounded-[22px] bg-white p-4 shadow-soft">
            <SectionHeader title="Anggota dompet" caption="Lihat anggota aktif, role, dan akses edit anggota dalam satu tempat." action={["owner", "admin"].includes(selectedWallet.role) ? (<button type="button" className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-[#16A34A]" onClick={() => setShowWalletMembersModal(true)}>
                  <UserPlus size={14}/> Kelola anggota
                </button>) : undefined}/>
            <div className="space-y-3">
              {selectedWallet.members.map((member) => (<div key={member.id} className="rounded-2xl border border-slate-100 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{member.displayName || member.fullName}</p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">@{member.username} Ã¯Â¿Â½ {socialEnumLabel(member.role)} Ã¯Â¿Â½ {socialEnumLabel(member.status)}</p>
                      {member.memberNote && <p className="mt-1 text-[11px] text-slate-500">{member.memberNote}</p>}
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${member.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                      {member.status === "pending" ? "Menunggu" : socialEnumLabel(member.role)}
                    </span>
                  </div>
                </div>))}
            </div>
          </section>

          {showWalletEditModal && ["owner", "admin"].includes(selectedWallet.role) && (<WalletAccountEditModal wallet={selectedWallet} accounts={accounts} request={request} onClose={() => setShowWalletEditModal(false)} onSaved={async (nextMessage) => {
                    setMessage(nextMessage);
                    setShowWalletEditModal(false);
                    await openWallet(selectedWallet.id);
                }}/>)}

          {showWalletMembersModal && ["owner", "admin"].includes(selectedWallet.role) && (<WalletMembersManageModal walletId={selectedWallet.id} walletName={selectedWallet.name} members={selectedWallet.members} friends={friends} request={request} onClose={() => setShowWalletMembersModal(false)} onSaved={async (nextMessage) => {
                    setMessage(nextMessage);
                    await openWallet(selectedWallet.id);
                }}/>)}

          <section className="rounded-[22px] bg-white p-4 shadow-soft">
            <SectionHeader title="Perubahan dompet" caption="Permintaan perubahan besar membutuhkan suara mayoritas anggota aktif."/>
            <div className="space-y-2">
              {selectedWallet.changeRequests.length === 0 && <p className="rounded-2xl bg-slate-50 px-3 py-3 text-xs text-slate-500">Belum ada permintaan perubahan dompet.</p>}
              {selectedWallet.changeRequests.map((item) => (<div key={item.id} className="rounded-2xl border border-slate-100 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {socialEnumLabel(item.status)} Ã¯Â¿Â½ {item.approvedCount}/{item.requiredApprovals} setuju Ã¯Â¿Â½ dibuat {localDate(item.createdAt)}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                      {item.payload.expenseSplitRule === "percentage" ? "Persentase" : item.payload.expenseSplitRule === "manual" ? "Manual" : "Merata"}
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-600">
                    {item.payload.name && <p>Nama: {item.payload.name}</p>}
                    {item.payload.activeUntil && <p>Aktif sampai: {localDate(item.payload.activeUntil)}</p>}
                  </div>
                  {item.status === "pending" && !item.hasReviewed && item.requestedBy !== currentUser.id && (<div className="mt-3 grid grid-cols-2 gap-2">
                      <button className="rounded-xl bg-[#16A34A] px-3 py-2 text-xs font-semibold text-white" onClick={() => runAction(() => request(`/social/wallets/${selectedWallet.id}/change-requests/${item.id}`, { method: "PUT", body: JSON.stringify({ decision: "approved" }) }), "Perubahan dompet disetujui").then(() => openWallet(selectedWallet.id))}>Setujui</button>
                      <button className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600" onClick={() => runAction(() => request(`/social/wallets/${selectedWallet.id}/change-requests/${item.id}`, { method: "PUT", body: JSON.stringify({ decision: "rejected" }) }), "Perubahan dompet ditolak").then(() => openWallet(selectedWallet.id))}>Tolak</button>
                    </div>)}
                </div>))}
            </div>
          </section>

          <section className="rounded-[22px] bg-white p-4 shadow-soft">
            <SectionHeader title="Pengingat dompet" caption={`${walletReminders.length} pengingat aktif`} action={["owner", "admin"].includes(selectedWallet.role) ? (<button type="button" className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-[#16A34A]" onClick={() => setShowWalletReminderForm((current) => !current)}>
                  <Plus size={14}/> Tambah
                </button>) : undefined}/>
            {showWalletReminderForm && (<form className="mb-3 space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3" onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    runAction(() => request(`/social/wallets/${selectedWallet.id}/reminders`, {
                        method: "POST",
                        body: JSON.stringify({
                            intervalType: walletReminderInterval,
                            reminderTime: String(form.get("reminderTime")),
                            dayOfWeek: walletReminderInterval === "weekly" ? Number(form.get("dayOfWeek")) : null,
                            dayOfMonth: walletReminderInterval === "monthly" ? Number(form.get("dayOfMonth")) : null,
                            entryType: String(form.get("entryType")),
                            message: String(form.get("message")),
                            targetUserId: String(form.get("targetUserId") || "") || null,
                            timezone: APP_TIME_ZONE
                        })
                    }), "Pengingat dompet berhasil dibuat").then(() => {
                        setShowWalletReminderForm(false);
                        openWallet(selectedWallet.id);
                    });
                }}>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Interval">
                    <select className="input" value={walletReminderInterval} onChange={(event) => setWalletReminderInterval(event.target.value as typeof walletReminderInterval)}>
                      <option value="daily">Setiap hari</option>
                      <option value="weekly">Setiap minggu</option>
                      <option value="monthly">Setiap bulan</option>
                    </select>
                  </Field>
                  <Field label="Waktu">
                    <input className="input" type="time" name="reminderTime" defaultValue="12:00" required/>
                  </Field>
                </div>
                {walletReminderInterval === "weekly" && (<Field label="Hari">
                    <select className="input" name="dayOfWeek" defaultValue="1">
                      {["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"].map((day, index) => <option key={day} value={index}>{day}</option>)}
                    </select>
                  </Field>)}
                {walletReminderInterval === "monthly" && (<Field label="Tanggal setiap bulan">
                    <input className="input" name="dayOfMonth" type="number" min="1" max="31" defaultValue="1" required/>
                  </Field>)}
                <Field label="Buka form">
                  <select className="input" name="entryType" defaultValue="deposit">
                    <option value="deposit">Deposit / setoran</option>
                    <option value="expense">Expense / pengeluaran</option>
                  </select>
                </Field>
                <Field label="Kirim pengingat kepada">
                  <select className="input" name="targetUserId" defaultValue="">
                    <option value="">Semua anggota</option>
                    {selectedWallet.members
                    .filter((member) => member.status === "accepted")
                    .map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}
                  </select>
                </Field>
                <Field label="Pesan notifikasi">
                  <input className="input" name="message" defaultValue="Jangan lupa nabung ya hari ini" maxLength={240} required/>
                </Field>
                <button className="btn-primary w-full"><Bell size={15}/> Simpan pengingat</button>
              </form>)}
            <div className="space-y-2">
              {walletReminders.length === 0 && <p className="rounded-2xl bg-slate-50 px-3 py-3 text-xs text-slate-500">Belum ada pengingat dompet.</p>}
              {walletReminders.map((reminder) => (<div key={reminder.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Bell size={16}/></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-800">{reminder.message}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {reminder.intervalType} Ã¯Â¿Â½ {reminder.reminderTime.slice(0, 5)} Ã¯Â¿Â½ {reminder.entryType} Ã¯Â¿Â½ {reminder.targetUserId
                    ? selectedWallet.members.find((member) => member.id === reminder.targetUserId)?.fullName ?? "Anggota"
                    : "Semua anggota"}
                    </p>
                  </div>
                </div>))}
            </div>
          </section>
          {!showWalletEntryForm && (<button type="button" className="btn-primary w-full" onClick={() => {
                    setShowWalletEntryForm(true);
                    setWalletEntryReceiptId(null);
                    setWalletEntryAttachmentName("");
                    setWalletEntryAttachmentMessage(null);
                    setWalletEntryDate(isoDateInput());
                    window.setTimeout(() => walletEntryFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
                }}>
              <Plus size={16}/> Tambah transaksi dompet
            </button>)}
          {showWalletEntryForm && <form ref={walletEntryFormRef} className="rounded-[22px] bg-white p-4 shadow-soft" onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    runAction(() => request(`/social/wallets/${selectedWallet.id}/entries`, {
                        method: "POST",
                        body: JSON.stringify({
                            entryType: String(form.get("entryType")),
                            amount: selectedWallet.storageType === "gold" ? undefined : String(form.get("amount")),
                            goldWeightGrams: selectedWallet.storageType === "gold" ? Number(form.get("goldWeightGrams")) : null,
                            description: String(form.get("description")),
                            transactionDate: String(form.get("transactionDate")),
                            receiptId: walletEntryReceiptId
                        })
                    }), "Transaksi dompet dicatat").then(() => {
                        setShowWalletEntryForm(false);
                        setWalletEntryReceiptId(null);
                        setWalletEntryAttachmentName("");
                        setWalletEntryAttachmentMessage(null);
                        openWallet(selectedWallet.id);
                    });
                }}>
            <SectionHeader title="Catat transaksi dompet" caption="Pengeluaran mengikuti aturan approval." action={<button type="button" onClick={() => { setShowWalletEntryForm(false); setWalletEntryReceiptId(null); setWalletEntryAttachmentName(""); setWalletEntryAttachmentMessage(null); }}><X size={15}/></button>}/>
            <div className="space-y-3">
              <select className="input" name="entryType" defaultValue={new URLSearchParams(window.location.search).get("entryType") === "expense" ? "expense" : "deposit"}><option value="deposit">Setoran</option><option value="expense">Pengeluaran</option></select>
              <Field label="Tanggal transaksi">
                <div>
                  <input type="hidden" name="transactionDate" value={walletEntryDate}/>
                  <DateFilterPicker label="Tanggal transaksi" value={walletEntryDate} onChange={setWalletEntryDate} language={language} showLabel={false} allowClear={false}/>
                </div>
              </Field>
              {selectedWallet.storageType === "gold" ? (<div className="space-y-2">
                  <input className="input" name="goldWeightGrams" type="number" step="0.0001" min="0.0001" placeholder="Berat emas (gram)" required/>
                  <p className="text-[11px] text-slate-500">
                    Nilai rupiah akan dihitung otomatis berdasarkan harga emas Pegadaian terkini
                  </p>
                </div>) : (<input className="input" name="amount" inputMode="numeric" placeholder="Nominal" onInput={handleMoneyInput} required/>)}
              <input className="input" name="description" placeholder="Keterangan" required/>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3">
                <span className="flex items-center gap-2 text-xs text-slate-600">
                  {walletEntryAttachmentLoading ? <Loader2 className="animate-spin" size={15}/> : <Upload size={15}/>}
                  {walletEntryAttachmentName || (walletEntryReceiptId ? "Attachment tersimpan" : "Tambah attachment")}
                </span>
                <span className="text-[10px] font-semibold text-[#16A34A]">{walletEntryReceiptId ? "Ganti file" : "Pilih file"}</span>
                <input className="sr-only" type="file" accept="image/*,video/*,.heic,.heif" onChange={uploadWalletEntryAttachment} disabled={walletEntryAttachmentLoading}/>
              </label>
              {(walletEntryAttachmentName || walletEntryReceiptId) && (<div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs lg:rounded-md ${walletEntryAttachmentLoading
                        ? "border-sky-100 bg-sky-50 text-sky-700"
                        : walletEntryAttachmentMessage && !walletEntryReceiptId
                            ? "border-rose-100 bg-rose-50 text-rose-700"
                            : "border-emerald-100 bg-emerald-50 text-emerald-800"}`}>
                  {walletEntryAttachmentName?.match(/\.(mp4|mov|webm|m4v)$/i)
                        ? <Film className="shrink-0" size={15}/>
                        : <ReceiptText className="shrink-0" size={15}/>}
                  <span className="min-w-0 flex-1 truncate">{walletEntryAttachmentName || "Attachment transaksi tersimpan"}</span>
                  {walletEntryAttachmentLoading
                        ? <Loader2 className="shrink-0 animate-spin" size={14}/>
                        : walletEntryReceiptId ? <CheckCircle2 className="shrink-0" size={14}/> : null}
                </div>)}
              {walletEntryAttachmentMessage && (<p className={`text-[11px] leading-4 ${walletEntryReceiptId ? "text-[#15803D]" : "text-rose-700"}`}>
                  {walletEntryAttachmentMessage}
                </p>)}
              <button className="btn-primary w-full" disabled={walletEntryAttachmentLoading}>Simpan transaksi</button>
            </div>
          </form>}
          <section className="rounded-[22px] bg-white p-4 shadow-soft">
            <SectionHeader title="Ringkasan anggota" caption="Kontribusi dari transaksi yang sudah disetujui."/>
            <div className="space-y-2">
              {selectedWallet.memberSummary.map((member) => (<div key={member.userId} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-2xl bg-slate-50 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-900">
                      {member.fullName}{["owner", "admin"].includes(member.role) ? " (admin)" : ""}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-500">Aktivitas dompet</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-slate-400">Deposit</p>
                    <p className="text-[11px] font-semibold text-[#16A34A]">{rupiah(member.deposit)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-slate-400">Pengeluaran</p>
                    <p className="text-[11px] font-semibold text-rose-600">{rupiah(member.expense)}</p>
                  </div>
                  {selectedWallet.storageType === "gold" && (<div className="col-span-3 flex items-center justify-between rounded-xl bg-white px-3 py-2 text-[11px] text-slate-600">
                      <span>{Number(member.goldBalanceGrams || 0).toLocaleString("id-ID", { minimumFractionDigits: 4, maximumFractionDigits: 4 })} gram</span>
                      <span className="font-semibold text-slate-800">{rupiah(member.goldBalanceValue || 0)}</span>
                    </div>)}
                </div>))}
            </div>
          </section>
          <section className="rounded-[22px] bg-white p-4 shadow-soft">
            <SectionHeader title="Audit dompet" caption="Riwayat perubahan untuk kebutuhan audit."/>
            <div className="space-y-2">
              {selectedWallet.auditHistory.length === 0 && <p className="rounded-2xl bg-slate-50 px-3 py-3 text-xs text-slate-500">Belum ada log audit dompet.</p>}
              {selectedWallet.auditHistory.map((item) => (<div key={item.id} className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-xs font-semibold text-slate-800">{item.action}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{localDate(item.createdAt)}</p>
                </div>))}
            </div>
          </section>
          <div className="rounded-[22px] bg-white p-4 shadow-soft">
            <SectionHeader title="Riwayat transaksi" caption="Dikelompokkan berdasarkan tanggal transaksi."/>
            <div className="space-y-4">
              {Object.entries(selectedWallet.entries.reduce<Record<string, WalletDetail["entries"]>>((groups, entry) => {
                const key = entry.transactionDate || entry.createdAt.slice(0, 10);
                (groups[key] ??= []).push(entry);
                return groups;
            }, {})).map(([date, entries]) => (<section key={date}>
                  <p className="mb-2 text-[11px] font-semibold text-slate-500">{localDate(`${date}T00:00:00+07:00`)}</p>
                  <div className="space-y-2">
                  {entries.map((entry) => (<div key={entry.id} className="rounded-2xl border border-slate-100 p-3">
                  <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{entry.description}</p>
                    <p className="text-xs text-slate-500">{entry.createdByName} Ã¯Â¿Â½ {socialEnumLabel(entry.status)}</p>
                  </div>
                  {entry.receiptId && (<button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition hover:bg-emerald-50 hover:text-[#16A34A]" onClick={() => openWalletAttachment(entry.receiptId!)} aria-label="Lihat attachment" title="Lihat attachment">
                      <Eye size={15}/>
                    </button>)}
                  <p className={`text-sm font-semibold ${entry.entryType === "deposit" ? "text-[#16A34A]" : "text-rose-600"}`}>{entry.entryType === "deposit" ? "+" : "-"}{rupiah(entry.amount)}</p>
                  </div>
                  {entry.status === "pending" && ["owner", "admin"].includes(selectedWallet.role) && (<div className="mt-2 grid grid-cols-2 gap-2">
                      <button className="rounded-xl bg-[#16A34A] px-3 py-2 text-xs font-semibold text-white" onClick={() => runAction(() => request(`/social/wallet-entries/${entry.id}/approve`, { method: "PUT", body: JSON.stringify({ status: "approved" }) }), "Transaksi disetujui").then(() => openWallet(selectedWallet.id))}>Setujui</button>
                      <button className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600" onClick={() => runAction(() => request(`/social/wallet-entries/${entry.id}/approve`, { method: "PUT", body: JSON.stringify({ status: "rejected" }) }), "Transaksi ditolak").then(() => openWallet(selectedWallet.id))}>Tolak</button>
                    </div>)}
                </div>))}
                  </div>
                </section>))}
              {selectedWallet.entries.length === 0 && <EmptyState text="Belum ada transaksi dompet."/>}
            </div>
          </div>
        </div>)}

      {!loading && tab === "activity" && (<div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
          <SectionHeader title="Aktivitas Anda" caption="Tidak ada feed publik; hanya aktivitas yang melibatkan Anda." action={<button className="text-xs font-semibold text-[#16A34A]" onClick={() => runAction(() => request("/social/activity/read", { method: "PUT", body: "{}" }), "Semua notifikasi ditandai dibaca")}>Tandai dibaca</button>}/>
          <div className="space-y-5">
            {activity.length === 0 && <EmptyState text="Belum ada aktivitas sosial."/>}
            {groupedActivity.map((group) => (<section key={group.key}>
                <div className="sticky top-16 z-10 mb-2 bg-white/95 py-1 backdrop-blur">
                  <p className="text-[11px] font-semibold uppercase text-slate-400">{group.label}</p>
                </div>
                <div className="space-y-2">
                  {group.items.map((event) => (<div key={event.id} className={`rounded-2xl p-3 ${event.isRead ? "bg-slate-50" : "border border-emerald-100 bg-emerald-50"}`}>
                      <div className="flex justify-between gap-3"><p className="text-sm font-semibold">{event.title}</p>{!event.isRead && <span className="h-2 w-2 rounded-full bg-[#16A34A]"/>}</div>
                      {event.body && <p className="mt-1 text-xs text-slate-600">{event.body}</p>}
                      <p className="mt-1 text-[11px] text-slate-400">
                        {new Intl.DateTimeFormat(language === "en" ? "en-US" : "id-ID", { timeZone: APP_TIME_ZONE, hour: "2-digit", minute: "2-digit" }).format(new Date(event.createdAt))}
                      </p>
                      {event.eventType === "payment_received" && event.entityId && (<div className="mt-2 grid grid-cols-2 gap-2">
                          <button className="rounded-xl bg-[#16A34A] px-3 py-2 text-xs font-semibold text-white" onClick={() => runAction(() => request(`/social/settlements/${event.entityId}/confirm`, { method: "PUT", body: JSON.stringify({ status: "confirmed" }) }), "Pembayaran dikonfirmasi")}>Sudah diterima</button>
                          <button className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-rose-600" onClick={() => runAction(() => request(`/social/settlements/${event.entityId}/confirm`, { method: "PUT", body: JSON.stringify({ status: "cancelled" }) }), "Pembayaran ditolak")}>Tolak</button>
                        </div>)}
                    </div>))}
                </div>
              </section>))}
            <div ref={activitySentinelRef} className="flex min-h-12 items-center justify-center">
              {activityLoadingMore && (<div className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 size={15} className="animate-spin"/> Memuat aktivitas...
                </div>)}
              {!activityHasMore && activity.length > 0 && <p className="text-[11px] text-slate-400">Semua aktivitas sudah ditampilkan.</p>}
            </div>
          </div>
        </div>)}

      {!loading && tab === "privacy" && (<form className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg" onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                runAction(() => request("/social/privacy", {
                    method: "PUT",
                    body: JSON.stringify({
                        allowWalletInvites: form.get("allowWalletInvites") === "on",
                        allowGroupInvites: form.get("allowGroupInvites") === "on",
                        searchableBy: String(form.get("searchableBy")),
                        hidePhone: form.get("hidePhone") === "on"
                    })
                }), "Pengaturan privasi disimpan");
            }}>
          <SectionHeader title="Kontrol privasi" caption="Saldo, rekening, budget, dan transaksi pribadi tidak pernah dibagikan otomatis."/>
          <div className="space-y-3">
            <label className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 text-sm"><span>Izinkan ditambahkan ke dompet bersama</span><input type="checkbox" name="allowWalletInvites" defaultChecked={privacy.allowWalletInvites}/></label>
            <label className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 text-sm"><span>Izinkan ditambahkan ke grup</span><input type="checkbox" name="allowGroupInvites" defaultChecked={privacy.allowGroupInvites}/></label>
            <label className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 text-sm"><span>Sembunyikan nomor telepon</span><input type="checkbox" name="hidePhone" defaultChecked={privacy.hidePhone}/></label>
            <Field label="Siapa yang dapat mencari akun">
              <select className="input" name="searchableBy" defaultValue={privacy.searchableBy}>
                <option value="everyone">Username, email, dan telepon</option>
                <option value="username">Hanya username</option>
                <option value="friends">Teman saja</option>
                <option value="nobody">Tidak seorang pun</option>
              </select>
            </Field>
            <button className="btn-primary w-full"><ShieldCheck size={16}/> Simpan privasi</button>
          </div>
        </form>)}
    </section>);
}

export function ProfileView({ session, request, onProfileUpdated, onInstall, showInstall, onLogout }: {
    session: Session;
    request: <T>(path: string, options?: RequestInit) => Promise<T>;
    onProfileUpdated: (user: Session["user"]) => void;
    onInstall: () => Promise<void>;
    showInstall: boolean;
    onLogout?: () => void;
}) {
    const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
    const [profileMessage, setProfileMessage] = useState<string | null>(null);
    const [avatarUrl, setAvatarUrl] = useState(session.user.avatarUrl ?? "");
    const [profileQrDataUrl, setProfileQrDataUrl] = useState("");
    const [isEditingProfile, setIsEditingProfile] = useState(false);
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
        }
        catch (err) {
            setPasswordMessage(err instanceof Error ? err.message : "Password gagal diubah");
        }
    };
    return (<div className="mx-auto grid max-w-5xl gap-3 xl:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-[26px] bg-[#16A34A] p-4 text-white shadow-[0_18px_42px_rgba(22,163,74,0.18)] lg:rounded-lg lg:p-5">
        <div className="flex items-start gap-3">
          {avatarUrl ? (<img className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-2 ring-white/20 lg:rounded-lg" src={avatarUrl} alt="Foto profil"/>) : (<span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-lg font-semibold lg:rounded-lg">{session.user.fullName.slice(0, 1).toUpperCase()}</span>)}
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase text-white/60">Profil</p>
            <h2 className="mt-1 truncate text-xl font-semibold">{session.user.nickname || session.user.fullName}</h2>
            {session.user.title && <p className="truncate text-xs text-emerald-100">{session.user.title}</p>}
            <p className="mt-0.5 truncate text-xs font-semibold text-white/70">{session.user.email}</p>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-2xl bg-white/12 px-3 py-2 lg:rounded-md"><dt className="font-bold text-white/60">Mata uang</dt><dd className="mt-1 font-semibold">IDR</dd></div>
          <div className="rounded-2xl bg-white/12 px-3 py-2 lg:rounded-md"><dt className="font-bold text-white/60">Akun</dt><dd className="mt-1 font-semibold">Aktif</dd></div>
        </dl>
        {showInstall && (<button type="button" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/15 lg:rounded-md" onClick={onInstall}>
            <Download size={15}/> Pasang aplikasi
          </button>)}
        {onLogout && (<button type="button" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#16A34A] transition hover:bg-emerald-50 lg:hidden" onClick={onLogout}>
            <LogOut size={16}/> Logout
          </button>)}
      </section>
      <div className="space-y-3">
        {!isEditingProfile ? (<section className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200">
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
            {profileMessage && <p className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-[#16A34A] lg:rounded-md">{profileMessage}</p>}
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
          </section>) : (<form className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200" onSubmit={saveProfile}>
            <SectionHeader title="Edit profil" caption="Atur identitas yang tampil di aplikasi."/>
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 lg:rounded-md">
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
              {profileMessage && <p className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600 lg:rounded-md">{profileMessage}</p>}
            </div>
          </form>)}

        <form className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200" onSubmit={submitPassword}>
          <SectionHeader title="Keamanan akun" caption="Ubah password secara berkala agar akun tetap aman."/>
          <div className="space-y-3">
            <Field label="Password saat ini"><input className="input" name="currentPassword" type="password" placeholder="Masukkan password lama" required/></Field>
            <Field label="Password baru"><input className="input" name="newPassword" type="password" placeholder="Minimal 8 karakter" minLength={8} required/></Field>
            <button className="btn-secondary w-full"><CheckCircle2 size={16}/> Simpan password</button>
            {passwordMessage && <p className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600 lg:rounded-md">{passwordMessage}</p>}
          </div>
        </form>
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
    return (<div className="overflow-hidden rounded-2xl border border-slate-100 bg-white lg:rounded-lg">
      {rows.map((row) => (<TransactionHistoryItem key={row.id} row={row} compact/>))}
    </div>);
}

export function LegacyTransactionList({ rows }: {
    rows: Transaction[];
}) {
    if (rows.length === 0)
        return <EmptyState text="Belum ada transaksi."/>;
    return (<div className="space-y-3">
      {rows.map((row) => (<div key={row.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3 lg:rounded-md">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${row.transactionType === "income" ? "bg-emerald-50 text-[#16A34A]" : "bg-rose-50 text-rose-600"}`}>
              {row.transactionType === "income" ? <ArrowDownLeft size={19}/> : <ArrowUpRight size={19}/>}
            </span>
            <div className="min-w-0">
              <p className="truncate font-bold">{row.merchantName ?? row.categoryName ?? "Transaksi"}</p>
              <p className="truncate text-xs text-slate-500">{row.categoryName ?? row.sourceType ?? "Manual"} Ã‚Â· {row.accountName}</p>
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



