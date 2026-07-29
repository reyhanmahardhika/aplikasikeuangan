/**
 * AI context chunk: Declarations not yet assigned to a feature
 * Generated from: App.tsx
 * Read-only snapshot. Do not import this file into the application.
 */
const categoryPalette = ["#16c784", "#f6a90b", "#60a5fa", "#2dd4bf", "#8b5cf6", "#ec4899"];


type ManageTab = "budgets" | "accounts" | "categories" | "schedules";

type BudgetRow = {
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


const pocketBankOptions = [
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


const pocketEWalletOptions = [
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


const pocketEMoneyOptions = [
  "Flazz BCA",
  "Mandiri e-money",
  "BNI TapCash",
  "BRI BRIZZI",
  "JakCard",
  "MegaCash",
  "KMT KAI Commuter",
  "Nobu e-money"
];


const pocketCardColors = ["#16A34A", "#0F766E", "#111827", "#2563EB", "#7C3AED", "#E11D48"];

const pocketVisualStorageKey = "finance-ai-pocket-visuals";


type PocketVisual = {
  logo: string;
  background: string;
};


type CashFlowReportRow = { date: string; income: string; expense: string; net: string };

type CategoryReportRow = { category: string | null; transactionType: "income" | "expense"; total: string; count: number };

type MonthlyReportRow = { month: string; income: string; expense: string };


type AssistantMessage = {
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
  actions?: Array<{ label: string; view: string }>;
};


type SocialFriend = {
  id: string;
  userId: string;
  fullName: string;
  username: string;
  avatarUrl?: string | null;
  status: string;
  incoming: boolean;
};


type SocialGroup = {
  id: string;
  name: string;
  description?: string | null;
  memberCount: number;
  myBalance: string;
  role: string;
  status: string;
};


type SocialWallet = {
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


type RelationshipFinanceListItem = {
  id: string;
  workspaceName: string;
  relationshipType: "partner" | "married_couple" | "family";
  status: "pending" | "active" | "cancelled" | "archived";
  acceptedAt?: string | null;
  createdAt: string;
  role: "owner" | "partner";
  partnerUserId?: string | null;
  partnerName?: string | null;
  partnerUsername?: string | null;
  partnerAvatarUrl?: string | null;
  invitationId?: string | null;
  invitationStatus?: "pending" | "accepted" | "declined" | "cancelled" | "expired" | null;
  incomingInvitation?: boolean;
};


type RelationshipGoal = {
  id: string;
  name: string;
  goalType: string;
  icon: string;
  targetAmount: string;
  currentAmount: string;
  deadline?: string | null;
  priority: "low" | "medium" | "high" | "critical";
  status: "active" | "completed" | "paused" | "cancelled";
  progress: string;
  remainingAmount: string;
  monthlyRequired?: string | null;
  trackingMode: "contribution" | "linked_account";
  linkedAccountId?: string | null;
  linkedAccountName?: string | null;
  linkedAccountOwnerName?: string | null;
  totalContributions?: number;
  lastContributionDate?: string | null;
  predictionStatus: "on_track" | "needs_attention" | "at_risk" | "completed" | "insufficient_data";
};


type RelationshipGoalContribution = {
  id: string;
  relationshipGoalId: string;
  contributorUserId?: string | null;
  contributorName?: string | null;
  amount: string;
  contributionDate: string;
  sourceType: "manual" | "transaction" | "linked_account" | "shared_wallet" | "scheduled" | "income_allocation" | "adjustment";
  accountId?: string | null;
  accountName?: string | null;
  transactionId?: string | null;
  sharedWalletEntryId?: string | null;
  notes?: string | null;
  status: "pending" | "completed" | "cancelled";
  adjustmentReason?: string | null;
  createdAt: string;
};


type RelationshipOverview = {
  relationship: RelationshipFinanceListItem & {
    members?: Array<{
      userId: string;
      fullName: string;
      username?: string | null;
      avatarUrl?: string | null;
      role: "owner" | "partner";
      status: string;
    }>;
  };
  summary: {
    period: string;
    combinedIncome: string;
    combinedExpense: string;
    combinedSaving: string;
    savingRate: string;
    combinedNetWorth: string;
    emergencyFundCoverage: string | null;
    debtToIncomeRatio: string;
  };
  goals: RelationshipGoal[];
  insights: Array<{
    type: string;
    severity: "positive" | "info" | "warning" | "critical";
    titleKey: string;
    descriptionKey: string;
    parameters: Record<string, unknown>;
  }>;
  timeline: Array<{
    id: string;
    eventType: string;
    entityType?: string | null;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
    createdAt: string;
    actorUserId?: string | null;
    actorName?: string | null;
  }>;
};


type WalletReminder = {
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


type SocialActivity = {
  id: string;
  eventType: string;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  isRead: boolean;
  createdAt: string;
};


type GroupDetail = SocialGroup & {
  members: Array<{ id: string; fullName: string; username: string; role: string; status: string }>;
  expenses: Array<{
    id: string;
    description: string;
    amount: string;
    paidByName: string;
    paidBy: string;
    createdBy: string;
    expenseDate: string;
    participants: Array<{ userId: string; name: string; shareAmount: string; status: string }>;
  }>;
  simplifiedDebts: Array<{ fromUserId: string; fromName: string; toUserId: string; toName: string; amount: string }>;
  comments: Array<{ id: string; authorName: string; message: string; createdAt: string }>;
  auditHistory: Array<{ id: string; action: string; actorName?: string; createdAt: string }>;
};


type WalletDetail = SocialWallet & {
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
  auditHistory: Array<{ id: string; action: string; createdAt: string }>;
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
