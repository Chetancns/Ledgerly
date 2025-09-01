import api from "./api";
import { Transaction } from "@/models/Transaction";

export const getTransactions = () => api.get("/transactions");
export const createTransaction = (data: Partial<Transaction>) => api.post("/transactions", data);
