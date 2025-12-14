import { AxiosRequestConfig } from "axios";
import api from "./api";
import { Transaction } from "@/models/Transaction";

export const getTransactions = async () => {
  const res = await api.get("/transactions");
  return res.data;
};
export const createTransaction = (data: Partial<Transaction>) => api.post("/transactions", data);
export const onDelete = (id:string) => api.delete(`/transactions/${id}`);
export const transfer = (par:{
        from: string,
        to: string, 
        cat: string,
        amount: string,
        date:string,
        description:string,
        type?: 'transfer' | 'savings'
      }) => api.post("/transactions/transfers",par);
export const getFilterTransactions = ({
  from,
  to,
  categoryId,
  accountId,
  type,
  isReimbursable,
  settlementGroupId,
  counterpartyName,
  skip,
  take
}: {
  from?: string;
  to?: string;
  categoryId?: string;
  accountId?: string;
  type?: string;
  isReimbursable?: boolean;
  settlementGroupId?: string;
  counterpartyName?: string;
  skip?: number;
  take?: number;
},options?:AxiosRequestConfig) => {
  const params: Record<string, string | number | boolean> = {};

  if (from) params.from = from;
  if (to) params.to = to;
  if (categoryId) params.categoryId = categoryId;
  if (accountId) params.accountId = accountId;
  if (type) params.type = type;
  if (isReimbursable !== undefined) params.isReimbursable = isReimbursable;
  if (settlementGroupId) params.settlementGroupId = settlementGroupId;
  if (counterpartyName) params.counterpartyName = counterpartyName;
  if (skip !== undefined) params.skip = skip;
  if (take !== undefined) params.take = take;
  //console.log(params);
  return api.get("/transactions", { params , ...options });
};

export const getTransactionsWithPagination = async ({
  skip = 0,
  take = 50,
  ...filters
}: {
  from?: string;
  to?: string;
  categoryId?: string;
  accountId?: string;
  type?: string;
  isReimbursable?: boolean;
  settlementGroupId?: string;
  counterpartyName?: string;
  skip?: number;
  take?: number;
}) => {
  const res = await getFilterTransactions({ ...filters, skip, take });
  return res.data;
};

export const getTransactionSummary = ({
  from,
  to,
  categoryId,
  accountId,
  type
}: {
  from?: string;
  to?: string;
  categoryId?: string;
  accountId?: string;
  type?: string;
}) => {
  const params: Record<string, string> = {};

  if (from) params.from = from;
  if (to) params.to = to;
  if (categoryId) params.categoryId = categoryId;
  if (accountId) params.accountId = accountId;
  if (type) params.type = type;

  return api.get("/transactions/summary", { params });
};

export const updateTransaction = (id:string, data:Partial<Transaction>)=> api.put(`/transactions/${id}`,data);

// Reimbursement functions
export const markReimbursable = (id: string, data: { counterpartyName: string; settlementGroupId?: string }) =>
  api.patch(`/transactions/${id}/reimbursable`, data);

export const createSettlement = (data: {
  settlementGroupId: string;
  amount: string;
  date: string;
  notes?: string;
}) => api.post("/transactions/settlements", data);

export const listReimbursables = (filters?: {
  settlementGroupId?: string;
  counterpartyName?: string;
}) => getFilterTransactions({ isReimbursable: true, ...filters });

// Get dropdown options for reimbursement fields
export const getTransactionCounterparties = async (): Promise<string[]> => {
  const res = await api.get('/transactions/counterparties');
  return res.data;
};

export const getTransactionSettlementGroups = async (): Promise<string[]> => {
  const res = await api.get('/transactions/settlement-groups');
  return res.data;
};

