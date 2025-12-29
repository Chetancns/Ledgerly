export type TransactionType = "income" | "expense" | "savings" | "transfer";

export interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface Transaction {
    id: string;
    accountId: string;
    categoryId: string;
    amount: string;
    type?: TransactionType;
    description?: string;
    transactionDate: string;
    toAccountId?: string | null; // for transfers, the destination account
    tags?: Tag[]; // Tags associated with this transaction
    tagIds?: string[]; // Tag IDs for creating/updating
}