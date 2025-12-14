import { Transaction } from "./Transaction";

// models/debt.ts
export const FREQUENCIES = ['weekly', 'biweekly', 'monthly'] as const;
export type Frequency = typeof FREQUENCIES[number];

export const DEBT_ROLES = ['lent', 'borrowed', 'institutional'] as const;
export type DebtRole = typeof DEBT_ROLES[number];

export const DEBT_STATUSES = ['open', 'settled', 'overdue'] as const;
export type DebtStatus = typeof DEBT_STATUSES[number];

export interface Debt {
  id: string;
  userId?: string;
  name: string;
  accountId?: string;
  
  // Core amounts
  principal: number;
  currentBalance: number;
  
  // Role-based fields
  role: DebtRole;
  counterpartyName?: string;
  paidAmount: number;
  adjustmentTotal: number;
  dueDate?: string;
  status: DebtStatus;
  notes?: string;
  settlementGroupId?: string;
  
  // Institutional debt fields (optional)
  installmentAmount?: number;
  frequency?: Frequency;
  startDate?: string;
  nextDueDate?: string;
  term?: number;
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
  
  // Computed fields (from backend)
  remaining?: string;
  progress?: string;
}

// models/debtUpdate.ts
export interface DebtUpdate {
  id: string;
  debtId: string;
  updateDate: string;
  transactionId: string;
  transaction: Transaction;
  status: "paid" | "pending" | "skipped";
}

// models/repayment.ts
export interface Repayment {
  id: string;
  debtId: string;
  amount: string;
  adjustmentAmount: string;
  date: string;
  notes?: string;
  accountId?: string;
  createdAt: string;
}

