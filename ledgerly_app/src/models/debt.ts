import { Transaction } from "./Transaction";

// models/debt.ts
export const FREQUENCIES = ['weekly', 'biweekly', 'monthly'] as const;
export type Frequency = typeof FREQUENCIES[number];

export const DEBT_TYPES = ['institutional', 'borrowed', 'lent'] as const;
export type DebtType = typeof DEBT_TYPES[number];
export const DEBT_UPDATE_INTENTS = ['payment', 'promise', 'reminder', 'note'] as const;
export type DebtUpdateIntent = typeof DEBT_UPDATE_INTENTS[number];

export interface PersonLedgerSummary {
  personName: string;
  debtCount: number;
  totalOutstanding: number;
  totalPaid: number;
  totalBorrowedOutstanding: number;
  totalLentOutstanding: number;
  lastPaymentDate?: string;
  nextReminderDate?: string;
  overdueCount: number;
  lastActivityDate?: string;
  defaultAccountId?: string;
  preferredExpenseCategoryId?: string | null;
  preferredIncomeCategoryId?: string | null;
  debts: Array<{
    id: string;
    name: string;
    debtType: DebtType;
    status: 'active' | 'completed';
    currentBalance: number;
    principal: number;
    reminderDate?: string | null;
    overdue: boolean;
    overdueReason?: string;
    lastPaymentDate?: string;
  }>;
}

export interface DebtAnalytics {
  summary: {
    totalDebts: number;
    activeDebts: number;
    totalOutstanding: number;
    totalInstitutionalOutstanding: number;
    totalP2POutstanding: number;
    totalPaid: number;
    recoveryRate: number;
    overdueCount: number;
  };
  personExposure: Array<{
    personName: string;
    outstanding: number;
    totalPaid: number;
    overdueCount: number;
    debtCount: number;
  }>;
  agingBuckets: Array<{
    label: string;
    amount: number;
  }>;
  duplicateCandidates: Array<{
    personName: string;
    normalizedName: string;
    debts: string[];
    labels: string[];
    totalOutstanding: number;
  }>;
  overdueTrend: Array<{
    month: string;
    count: number;
  }>;
}

export interface Debt {
  id: string;
  userId?: string;
  name: string;
  accountId: string;
  // store amounts as numbers client-side to make UI math easy
  installmentAmount?: number; // Optional for P2P debts with flexible payments
  currentBalance: number;
  frequency?: Frequency; // Optional for P2P debts
  startDate: string; // ISO date (YYYY-MM-DD)
  nextDueDate?: string; // Optional for P2P debts
  createdAt?: string;
  principal: number;
  term?: number;
  debtType: DebtType;
  personName?: string;
  status: 'active' | 'completed';
  reminderDate?: string; // For P2P debts - when to remind about payment
  totalPaid?: number;
  lastPaymentDate?: string;
  lastActivityDate?: string;
  overdue?: boolean;
  overdueReason?: 'scheduled-payment' | 'follow-up' | 'payment-inactivity';
  overdueDays?: number;
  requiresAttention?: boolean;
}


// models/debtUpdate.ts
export interface DebtUpdate {
  id: string;
  debtId: string;
  updateDate: string;
  amount: number; // Amount paid in this update
  transactionId?: string | null;
  transaction?: Transaction;
  status: "paid" | "pending" | "skipped";
  intent: DebtUpdateIntent;
  note?: string;
  runningBalanceAfter?: number;
  balanceImpact?: boolean;
  requiresReconciliation?: boolean;
}
