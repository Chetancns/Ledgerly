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
  type
}: {
  from?: string;
  to?: string;
  categoryId?: string;
  accountId?: string;
  type?: string;
},options?:AxiosRequestConfig) => {
  const params: Record<string, string> = {};

  if (from) params.from = from;
  if (to) params.to = to;
  if (categoryId) params.categoryId = categoryId;
  if (accountId) params.accountId = accountId;
  if (type) params.type = type;
  //console.log(params);
  return api.get("/transactions", { params , ...options });
};

export const updateTransaction = (id:string, data:Partial<Transaction>)=> api.put(`/transactions/${id}`,data);
