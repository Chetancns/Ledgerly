export type Frequency = "daily" | "weekly" | "monthly" | "yearly";
export type RecurringStatus = "active" | "paused";
export type TxType = "expense" | "income";

export interface RecurringTransaction {
  id: string;
  userId: string;
  accountId?: string | null;
  categoryId?: string | null;
  amount: string;
  type: TxType;
  frequency: Frequency;
  nextOccurrence: string;
  description?: string;
  status: RecurringStatus;
  createdAt: string;
  updatedAt: string;
}
