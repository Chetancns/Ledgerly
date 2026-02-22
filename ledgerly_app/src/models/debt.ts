import { Transaction } from "./Transaction";

// models/debt.ts
export const FREQUENCIES = ['weekly', 'biweekly', 'monthly'] as const;
export type Frequency = typeof FREQUENCIES[number];

export const DEBT_TYPES = ['institutional', 'borrowed', 'lent'] as const;
export type DebtType = typeof DEBT_TYPES[number];

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
}


// models/debtUpdate.ts
export interface DebtUpdate {
  id: string;
  debtId: string;
  updateDate: string;
  amount: number; // Amount paid in this update
  transactionId: string;
  transaction: Transaction;
  status: "paid" | "pending" | "skipped";
  notes?: string;
}
