import api from "./api";
import { Transaction } from "@/models/Transaction";

export const getTransactions = () => api.get("/transactions");
export const createTransaction = (data: Partial<Transaction>) => api.post("/transactions", data);
export const onDelete = (id:string) => api.delete(`/transactions/${id}`);
export const transfer = (par:{
        from: string,
        to: string, 
        cat: string,
        amount: string,
      }) => api.post("/transactions/transfers",par);