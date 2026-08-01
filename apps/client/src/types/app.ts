/*
 * Generated from App.tsx by refactor-app-types.cjs.
 * Review this file before committing.
 */

export type View = "dashboard" | "manual" | "history" | "transactionDetail" | "accounts" | "categories" | "budgets" | "manage" | "reports" | "assistant" | "social" | "profile" | "notifications";

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
    visibility?: "private" | "selected_friends" | "group_members" | "everyone_involved";
    viewerIds?: string[];
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

export type SocialSummary = {
    totalPayable: string;
    totalReceivable: string;
    activeGroups: number;
    pendingConfirmations: number;
    unreadNotifications: number;
};

export type AssistantContext = {
    contextType: "personal" | "shared_wallet" | "goal" | "budget" | "investment";
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
    kind?: "social" | "schedule" | "pocket_invite";
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

export type SocialFriend = {
    id: string;
    userId: string;
    fullName: string;
    username: string;
    avatarUrl?: string | null;
    status: string;
    incoming: boolean;
};

export type SocialGroup = {
    id: string;
    name: string;
    description?: string | null;
    memberCount: number;
    myBalance: string;
    role: string;
    status: string;
};

export type SocialWallet = {
    id: string;
    name: string;
    description?: string | null;
    balance: string;
    spendingLimit?: string | null;
    requireApproval?: boolean;
    pendingCount: number;
    role: string;
    status: string;
    storageType: "cash" | "bank" | "e_wallet" | "other" | "gold";
    storageAccountId?: string | null;
    storageAccountName?: string | null;
    storageProvider?: string | null;
    storageAccountNumber?: string | null;
    expenseSplitRule?: "equal" | "percentage" | "manual";
    activeUntil?: string | null;
    goldWeightGrams?: string | null;
    goldPricePerGram?: number | null;
    goldPriceFetchedAt?: string | null;
};

export type WalletReminder = {
    id: string;
    intervalType: "daily" | "weekly" | "monthly";
    reminderTime: string;
    dayOfWeek?: number | null;
    dayOfMonth?: number | null;
    entryType: "deposit" | "expense";
    message: string;
    timezone: string;
    isActive: boolean;
    targetUserId?: string | null;
};

export type SocialActivity = {
    id: string;
    eventType: string;
    title: string;
    body?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    isRead: boolean;
    createdAt: string;
};

export type GroupDetail = SocialGroup & {
    members: Array<{
        id: string;
        fullName: string;
        username: string;
        role: string;
        status: string;
    }>;
    expenses: Array<{
        id: string;
        description: string;
        amount: string;
        paidByName: string;
        paidBy: string;
        createdBy: string;
        expenseDate: string;
        participants: Array<{
            userId: string;
            name: string;
            shareAmount: string;
            status: string;
        }>;
    }>;
    simplifiedDebts: Array<{
        fromUserId: string;
        fromName: string;
        toUserId: string;
        toName: string;
        amount: string;
    }>;
    comments: Array<{
        id: string;
        authorName: string;
        message: string;
        createdAt: string;
    }>;
    auditHistory: Array<{
        id: string;
        action: string;
        actorName?: string;
        createdAt: string;
    }>;
};

export type WalletDetail = SocialWallet & {
    totalDeposit: string;
    totalExpense: string;
    goldBalanceValue?: string | null;
    storageAccountId?: string | null;
    storageAccountName?: string | null;
    members: Array<{
        id: string;
        fullName: string;
        username: string;
        role: "owner" | "admin" | "member" | "viewer";
        status: "accepted" | "pending" | "rejected";
        displayName?: string | null;
        memberNote?: string | null;
    }>;
    memberSummary: Array<{
        userId: string;
        fullName: string;
        role: string;
        deposit: string;
        expense: string;
        goldDepositGrams?: string;
        goldExpenseGrams?: string;
        goldBalanceGrams?: string;
        goldBalanceValue?: string;
    }>;
    entries: Array<{
        id: string;
        entryType: "deposit" | "expense";
        amount: string;
        description: string;
        status: string;
        createdByName: string;
        createdAt: string;
        transactionDate: string;
        receiptId?: string | null;
        goldWeightGrams?: string | null;
        goldPricePerGram?: number | null;
        goldPriceFetchedAt?: string | null;
    }>;
    auditHistory: Array<{
        id: string;
        action: string;
        createdAt: string;
    }>;
    changeRequests: Array<{
        id: string;
        title: string;
        status: string;
        requestedBy: string;
        requiredApprovals: number;
        approvedCount: number;
        rejectedCount: number;
        payload: {
            name?: string;
            description?: string | null;
            spendingLimit?: string | number | null;
            requireApproval?: boolean;
            expenseSplitRule?: "equal" | "percentage" | "manual";
            activeUntil?: string | null;
        };
        createdAt: string;
        appliedAt?: string | null;
        hasReviewed?: boolean;
    }>;
};
