export type TransactionType = "income" | "expense" | "savings" | "transfer";

export interface Transaction {
    id: string;
    accountId: string;
    categoryId: string;
    amount: string;
    type?: TransactionType;
    description?: string;
    transactionDate: string;
    toAccountId?: string | null; // for transfers, the destination account
}