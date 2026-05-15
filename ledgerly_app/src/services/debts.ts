// services/debts.ts
import { Debt, DebtAnalytics, DebtUpdate, PersonLedgerSummary } from "@/models/debt";
import api from "./api"; // your axios/fetch wrapper

export async function getUserDebts(debtType?: string): Promise<Debt[]> {
  const params = debtType ? { debtType } : {};
  const res = await api.get("/debts", { params });
  return res.data;
}

export async function createDebt(debt: Omit<Debt, "id"> & { createTransaction?: boolean; categoryId?: string }): Promise<Debt> {
  const res = await api.post("/debts", debt);
  return res.data;
}

export async function updateDebt(id: string, debt: Partial<Debt>): Promise<Debt> {
  const res = await api.patch(`/debts/${id}`, debt);
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

export async function payDebtEarly(id: string): Promise<Debt> {
  const res = await api.get(`/debts/${id}/pay-early`);
  return res.data;
}

export async function payInstallment(
  id: string,
  amount?: number,
  createTransaction?: boolean,
  categoryId?: string,
  settleInFull?: boolean,
  note?: string
): Promise<Debt> {
  const res = await api.post(`/debts/${id}/pay-installment`, {
    amount,
    createTransaction,
    categoryId,
    settleInFull,
    note,
  });
  return res.data;
}

export async function recordDebtUpdate(
  id: string,
  payload: {
    intent: "payment" | "promise" | "reminder" | "note";
    amount?: number;
    createTransaction?: boolean;
    categoryId?: string;
    note?: string;
    reminderDate?: string;
    settleInFull?: boolean;
  }
): Promise<Debt> {
  const res = await api.post(`/debts/${id}/updates`, payload);
  return res.data;
}

export async function getPersonNameSuggestions(search?: string): Promise<string[]> {
  const params = search ? { search } : {};
  const res = await api.get("/debts/person-names/suggestions", { params });
  return res.data;
}

export async function deleteDebtUpdate(updateId: string): Promise<{ success: boolean; message: string }> {
  const res = await api.delete(`/debts/updates/${updateId}`);
  return res.data;
}

export async function getPersonLedger(): Promise<PersonLedgerSummary[]> {
  const res = await api.get("/debts/person-ledger");
  return res.data;
}

export async function getDebtAnalytics(): Promise<DebtAnalytics> {
  const res = await api.get("/debts/analytics");
  return res.data;
}
