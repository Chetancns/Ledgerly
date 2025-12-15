// services/debts.ts
import { Debt, DebtUpdate, Repayment } from "@/models/debt";
import api from "./api"; // your axios/fetch wrapper

export async function getUserDebts(filters?: {
  role?: string;
  status?: string;
  counterpartyName?: string;
}): Promise<Debt[]> {
  const res = await api.get("/debts", { params: filters });
  return res.data;
}

export async function createDebt(debt: Partial<Debt>): Promise<Debt> {
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

export async function payDebtEarly(id: string): Promise<Debt> {
  const res = await api.get(`/debts/${id}/pay-early`);
  return res.data;
}

// New repayment functions
export async function addRepayment(
  debtId: string,
  data: {
    amount: string;
    adjustmentAmount?: string;
    date: string;
    notes?: string;
    accountId?: string;
  }
): Promise<Debt> {
  const res = await api.post(`/debts/${debtId}/repayments`, data);
  return res.data;
}

export async function getRepayments(debtId: string): Promise<Repayment[]> {
  const res = await api.get(`/debts/${debtId}/repayments`);
  return res.data;
}

// Filtered debt queries
export async function getLentDebts(): Promise<Debt[]> {
  return getUserDebts({ role: 'lent' });
}

export async function getBorrowedDebts(): Promise<Debt[]> {
  return getUserDebts({ role: 'borrowed' });
}

export async function getInstitutionalDebts(): Promise<Debt[]> {
  return getUserDebts({ role: 'institutional' });
}

// Settlement group functions
export async function getSettlementGroups(): Promise<{ id: string; name: string }[]> {
  const res = await api.get('/debts/settlement-groups/list');
  return res.data;
}

export async function getDebtsBySettlementGroup(groupId: string): Promise<Debt[]> {
  const res = await api.get(`/debts/settlement-groups/${groupId}`);
  return res.data;
}

// Batch repayment function
export async function batchRepayment(data: {
  debtIds: string[];
  amount: string;
  adjustmentAmount?: string;
  date: string;
  notes?: string;
  accountId?: string;
}): Promise<{
  message: string;
  totalAmount: string;
  adjustmentAmount: string;
  transactionCreated: boolean;
  transactionId?: string;
  debts: Array<{
    debtId: string;
    debtName: string;
    paymentApplied: string;
    adjustmentApplied: string;
    newStatus: string;
    newRemaining: string;
  }>;
}> {
  const res = await api.post('/debts/batch-repayment', data);
  return res.data;
}

// Delete repayment function
export async function deleteRepayment(
  debtId: string,
  repaymentId: string
): Promise<{
  message: string;
  transactionDeleted: boolean;
  debt: Debt;
}> {
  const res = await api.delete(`/debts/${debtId}/repayments/${repaymentId}`);
  return res.data;
}
