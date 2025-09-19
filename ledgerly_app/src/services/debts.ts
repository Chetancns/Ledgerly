// services/debts.ts
import { Debt, DebtUpdate } from "@/models/debt";
import api from "./api"; // your axios/fetch wrapper

export async function getUserDebts(): Promise<Debt[]> {
  const res = await api.get("/debts");
  return res.data;
}

export async function createDebt(debt: Omit<Debt, "id">): Promise<Debt> {
  const res = await api.post("/debts", debt);
  return res.data;
}

export async function updateDebt(id: string, debt: Partial<Debt>): Promise<Debt> {
  const res = await api.put(`/debts/${id}`, debt);
  return res.data;
}

export async function deleteDebt(id: string) {
  await api.delete(`/debts/${id}`);
}

export async function getDebtUpdates(id: string): Promise<DebtUpdate[]> {
  const res = await api.get(`/debts/${id}/updates`);
  return res.data;
}

export async function catchUpDebts(): Promise<{ message: string }> {
  const res = await api.post("/debts/catch-up");
  return res.data;
}

export async function payDebtEarly(id:string):Promise<Debt> {
  const res = await api.get(`/debts/${id}/pay-early`);
  return res.data;
}
