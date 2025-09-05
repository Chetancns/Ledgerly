export type TransactionType = "income" | "expense" | "savings";

export interface Transaction {
    id: string;
    accountId: string;
    categoryId: string;
    amount: string;
    type?: TransactionType;
    description?: string;
    transactionDate: string;
}