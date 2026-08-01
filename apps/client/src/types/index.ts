// ============================================
// Type Definitions for Finance AI App
// Extracted from App.tsx for modular structure
// ============================================

// Core App Types
export type View =
  | 'dashboard'
  | 'manual'
  | 'history'
  | 'transactionDetail'
  | 'accounts'
  | 'categories'
  | 'budgets'
  | 'manage'
  | 'reports'
  | 'assistant'
  | 'profile';

export type AppLanguage = 'en' | 'id';

export type ChildFrameState = {
  active: boolean;
  onBack?: (() => void) | null;
  onRefresh?: (() => Promise<void> | void) | null;
};

export type NoticePayload = string | { message: string; type: 'success' | 'error' };

// Session & Auth Types (from lib/session)
export type StoredSession = {
  user: {
    id: string;
    email: string;
    fullName: string;
    username?: string | null;
    avatarUrl?: string | null;
  };
  accessToken: string;
  refreshToken: string;
  lastActivityAt: string;
};

export type Session = StoredSession;

// API Types
export type ApiError = {
  status: number;
  message: string;
};

// Core Domain Types
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
  canEdit?: boolean;
  collaboratorRole?: 'owner' | 'admin' | 'member' | 'viewer';
  collaborationStatus?: 'accepted' | 'pending' | 'rejected';
  allowNegative: boolean;
  isActive: boolean;
  targetBalance?: string | null;
  targetDate?: string | null;
  autoBudgetingEnabled?: boolean;
  logo?: string | null;
  background?: string | null;
};

export type Category = {
  id: string;
  name: string;
  categoryType: 'income' | 'expense';
  icon: string;
  isDefault: boolean;
};

export type Transaction = {
  id: string;
  transactionType: 'income' | 'expense';
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

export type TransactionDetail = Transaction & {
  accountId: string;
  categoryId?: string;
  receiptId?: string | null;
  canManage?: boolean;
  items?: Array<{ itemName: string; quantity: string; unitPrice: string; totalPrice: string }>;
};

export type Schedule = {
  id: string;
  title: string;
  scheduleType: 'transaction' | 'transfer' | 'topup';
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
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
  reminderStatus: 'overdue' | 'soon' | 'upcoming';
};

export type DashboardSummary = {
  balance: string;
  incomeThisMonth: string;
  expenseThisMonth: string;
  daily: Array<{ date: string; income: string; expense: string }>;
  expenseByCategory: Array<{ category: string; total: string }>;
  lastTransactions: Transaction[];
  budgetAlerts: Array<{ id: string; category: string; usagePercent: string }>;
  insight?: {
    currentWeekExpense: string;
    previousWeekExpense: string;
    weekChangePercent: number | null;
    scheduledUntilMonthEnd: string;
    availableUntilMonthEnd: string;
  };
};


export type AssistantContext = {
  contextType: 'personal' | 'goal' | 'budget' | 'investment';
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
  kind?: 'schedule' | 'pocket_invite' | 'server';
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
  transactionType: 'income' | 'expense';
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

export type AiTrackedField =
  | 'transactionType'
  | 'transactionDate'
  | 'amount'
  | 'feeAmount'
  | 'accountId'
  | 'categoryId'
  | 'merchantName'
  | 'paymentMethod'
  | 'notes';

export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

// Manage View Types
export type ManageTab = 'budgets' | 'accounts' | 'categories' | 'schedules';

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

// Reports Types
export type CashFlowReportRow = { date: string; income: string; expense: string; net: string };

export type CategoryReportRow = {
  category: string | null;
  transactionType: 'income' | 'expense';
  total: string;
};

export type MonthlyReportRow = { month: string; income: string; expense: string };

// Assistant Types
export type AssistantMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  contextType?: string;
  entityId?: string;
};


// UI Constants & Navigation Types
export type LucideIcon = import('lucide-react').LucideIcon;

export interface NavigationItem {
  id: View;
  label: string;
  icon: LucideIcon;
}

export interface LanguageOption {
  code: AppLanguage;
  label: string;
  nativeLabel: string;
  flag: string;
}

// Icon Mapping Types
export interface IconMap {
  [key: string]: LucideIcon;
}

export interface CategoryIconMap {
  [key: string]: LucideIcon;
}

// Utility Types
export type StoredStringSet = Set<string>;

// Component Props Types
export interface SectionHeaderProps {
  title: string;
  caption?: string;
  action?: React.ReactNode;
}

export interface LoadingStateProps {
  message?: string;
}

export interface DataErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export interface EmptyStateProps {
  text: string;
}

export interface QrScannerProps {
  onScan: (result: string | null) => void;
  onClose: () => void;
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  selectedPocketId: string;
}

// View Component Props
export interface DashboardViewProps {
  // Define props based on usage
  [key: string]: unknown;
}

// Additional types from App.tsx
export interface NotificationCenterProps {
  language: AppLanguage;
  items: HeaderNotification[];
  pushStatus: 'unsupported' | 'unavailable' | 'default' | 'granted' | 'denied';
  onClose: () => void;
  onEnablePush: () => void;
  onMarkAllRead: () => void;
  onOpen: (item: HeaderNotification) => void;
}

export interface SocialAvatarProps {
  src?: string | null;
  name: string;
  size?: number;
  tone?: 'emerald' | 'rose' | 'sky' | 'amber' | 'purple';
}




