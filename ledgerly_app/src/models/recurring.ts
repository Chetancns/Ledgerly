export type Frequency = "daily" | "weekly" | "monthly" | "yearly";
export type RecurringStatus = "active" | "paused";
export type TxType = "expense" | "income" | "savings" | "transfer";

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
  toAccountId?: string | null; // for transfers/savings
  tags?: Array<{ id: string; name: string; color: string }>; // Tags associated
  tagIds?: string[]; // Tag IDs for creating/updating
  createdAt: string;
  updatedAt: string;
}
