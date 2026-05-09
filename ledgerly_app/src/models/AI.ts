import { Transaction } from './Transaction';

export interface AIParseRequest {
  input: string;
}

export interface AIDraftTransaction {
  accountId?: string;
  categoryId?: string;
  transactionDate: string;
  amount: string;
  type: 'expense' | 'income' | 'savings' | 'transfer';
  description?: string;
  confidence: number;
  needsReview: boolean;
  reviewReason?: string;
}

export interface AIParseResponse {
  success: boolean;
  recoverable: boolean;
  message?: string;
  transactions: AIDraftTransaction[];
  savedTransactions?: Transaction[];
  rawResponse?: string;
}

export interface AISaveResponse {
  saved: Transaction[];
  skipped: AIDraftTransaction[];
  message: string;
}

export interface AIChatResponse {
  question: string;
  answer: string;
}
