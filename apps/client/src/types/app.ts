/*
 * Generated from App.tsx by refactor-app-types.cjs.
 * Review this file before committing.
 */

export type View = "dashboard" | "manual" | "history" | "transactionDetail" | "accounts" | "categories" | "budgets" | "manage" | "reports" | "assistant" | "profile" | "notifications";

export type AppLanguage = "en" | "id";

export type ChildFrameState = {
    active: boolean;
    onBack?: (() => void) | null;
    onRefresh?: (() => Promise<void> | void) | null;
};

export type NoticePayload = string | {
    message: string;
    type: "success" | "error";
};

export type Account = {
    id: string;
    name: string;
    accountType: string;
    currentBalance: string;
    initialBalance: string;
    currency: string;
    providerName?: string | null;
    accountNumber?: string | null;
    accountHolderName?: string | null;
    isSharedWalletAccount?: boolean;
    ownerUserId?: string | null;
    ownerName?: string | null;
    ownerAvatarUrl?: string | null;
    canEdit?: boolean;
    collaboratorRole?: "owner" | "admin" | "member" | "viewer";
    collaborationStatus?: "accepted" | "pending" | "rejected";
    allowNegative: boolean;
    isActive: boolean;
    targetBalance?: string | null;
    targetDate?: string | null;
    autoBudgetingEnabled?: boolean;
    logo?: string | null;
    background?: string | null;
    displayOrder?: number;
};

export type Category = {
    id: string;
    name: string;
    categoryType: "income" | "expense";
    icon: string;
    isDefault: boolean;
};

export type Transaction = {
    id: string;
    transactionType: "income" | "expense";
    transactionDate: string;
    amount: string;
    feeAmount?: string;
    categoryName?: string;
    accountName?: string;
    merchantName?: string;
    paymentMethod?: string;
    notes?: string;
    sourceType?: string;
    userId?: string;
    userFullName?: string;
    canManage?: boolean;
};

export type Schedule = {
    id: string;
    title: string;
    scheduleType: "transaction" | "transfer" | "topup";
    frequency: "daily" | "weekly" | "monthly" | "yearly";
    expiryDate?: string | null;
    dueDay: number;
    nextDueDate: string;
    amount?: string | null;
    accountId?: string | null;
    destinationAccountId?: string | null;
    categoryId?: string | null;
    paymentMethod?: string | null;
    notes?: string | null;
    accountName?: string | null;
    destinationAccountName?: string | null;
    categoryName?: string | null;
    daysUntilDue: number;
    reminderStatus: "overdue" | "soon" | "upcoming";
};

export type TransactionDetail = Transaction & {
    accountId: string;
    categoryId?: string;
    receiptId?: string | null;
    canManage?: boolean;
    items?: Array<{
        itemName: string;
        quantity: string;
        unitPrice: string;
        totalPrice: string;
    }>;
};

export type DashboardSummary = {
    balance: string;
    incomeThisMonth: string;
    expenseThisMonth: string;
    daily: Array<{
        date: string;
        income: string;
        expense: string;
    }>;
    expenseByCategory: Array<{
        category: string;
        total: string;
    }>;
    lastTransactions: Transaction[];
    budgetAlerts: Array<{
        id: string;
        category: string;
        usagePercent: string;
    }>;
    insight?: {
        currentWeekExpense: string;
        previousWeekExpense: string;
        weekChangePercent: number | null;
        scheduledUntilMonthEnd: string;
        availableUntilMonthEnd: string;
    };
};


export type AssistantContext = {
    contextType: "personal" | "goal" | "budget" | "investment";
    entityType?: string;
    entityId?: string;
    sourcePage?: string;
};

export type HeaderNotification = {
    id: string;
    eventType: string;
    title: string;
    body?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    isRead: boolean;
    createdAt: string;
    kind?: "schedule" | "pocket_invite";
};

export type ManualDraft = {
    accountId: string;
    transactionDate: string;
    amount: string;
    feeAmount: string;
    categoryId: string;
    merchantName: string;
    paymentMethod: string;
    notes: string;
};

export type ParsedManualTransaction = {
    transactionType: "income" | "expense";
    transactionDate: string;
    amount: string;
    feeAmount: string;
    categoryId: string | null;
    categoryName: string | null;
    accountId: string | null;
    accountName: string | null;
    merchantName: string | null;
    paymentMethod: string | null;
    notes: string;
    confidenceScore: number;
    reviewFields: string[];
    interpretedText: string;
};

export type AiTrackedField = "transactionType" | "transactionDate" | "amount" | "feeAmount" | "accountId" | "categoryId" | "merchantName" | "paymentMethod" | "notes";

export type InstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{
        outcome: "accepted" | "dismissed";
    }>;
};

export type ManageTab = "budgets" | "accounts" | "categories" | "schedules";

export type BudgetRow = {
    id: string;
    categoryId: string;
    category: string;
    month: number;
    year: number;
    budgetAmount: string;
    used: string;
    remaining: string;
    usagePercent: string;
    status: string;
};

export type PocketVisual = {
    logo: string;
    background: string;
};

export type CashFlowReportRow = {
    date: string;
    income: string;
    expense: string;
    net: string;
};

export type CategoryReportRow = {
    category: string | null;
    transactionType: "income" | "expense";
    total: string;
    count: number;
};

export type MonthlyReportRow = {
    month: string;
    income: string;
    expense: string;
};

export type AssistantMessage = {
    role: "user" | "assistant";
    text: string;
    disclaimer?: string | null;
    suggestions?: string[];
    tone?: "positive" | "warning" | "danger" | "neutral";
    highlights?: Array<{
        label: string;
        value: string;
        tone: "positive" | "warning" | "danger" | "neutral";
    }>;
    actions?: Array<{
        label: string;
        view: string;
    }>;
};

