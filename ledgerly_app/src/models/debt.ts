import { Transaction } from "./Transaction";

// models/debt.ts
export const FREQUENCIES = ['weekly', 'biweekly', 'monthly'] as const;
export type Frequency = typeof FREQUENCIES[number];
export interface Debt {
  id: string;
  userId?: string;
  name: string;
  accountId: string;
  // store amounts as numbers client-side to make UI math easy
  installmentAmount: number;
  currentBalance: number;
  frequency: Frequency;
  startDate: string; // ISO date (YYYY-MM-DD)
  nextDueDate:string;
  createdAt?: string;
  principal:number;
  term:number;
}


// models/debtUpdate.ts
export interface DebtUpdate {
  id: string;
  debtId: string;
  updateDate: string;
  transactionId: string;
  transaction:Transaction,
  status: "paid" | "pending" | "skipped";
}
