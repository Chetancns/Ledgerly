import api from "./api";
import { RecurringTransaction } from "../models/recurring";

export async function getRecurringTransactions() {
  const res = await api.get<RecurringTransaction[]>("/recurring");
  return res.data;
}

export async function createRecurring(data: Partial<RecurringTransaction>) {
  const res = await api.post("/recurring", data);
  return res.data;
}

export async function updateRecurring(id: string, data: Partial<RecurringTransaction>) {
  const res = await api.put(`/recurring/${id}`, data);
  return res.data;
}

export async function deleteRecurring(id: string) {
  const res = await api.delete(`/recurring/${id}`);
  return res.data;
}
