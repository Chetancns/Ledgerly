import api from './api';

export interface Settlement {
  id: string;
  userId: string;
  settlementGroupId?: string;
  counterpartyName?: string;
  amount: string;
  settlementDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSettlementDto {
  settlementGroupId?: string;
  counterpartyName?: string;
  amount: string;
  settlementDate: string;
  notes?: string;
}

export async function createSettlement(data: CreateSettlementDto): Promise<Settlement> {
  const res = await api.post('/settlements', data);
  return res.data;
}

export async function getUserSettlements(query?: {
  settlementGroupId?: string;
  counterpartyName?: string;
}): Promise<Settlement[]> {
  const res = await api.get('/settlements', { params: query });
  return res.data;
}

export async function getSettlement(id: string): Promise<Settlement> {
  const res = await api.get(`/settlements/${id}`);
  return res.data;
}

export async function deleteSettlement(id: string): Promise<void> {
  await api.delete(`/settlements/${id}`);
}

export async function getCounterparties(): Promise<string[]> {
  const res = await api.get('/settlements/counterparties');
  return res.data;
}

export async function getSettlementGroups(): Promise<string[]> {
  const res = await api.get('/settlements/groups');
  return res.data;
}
