import api from './api';
import { copyperviousDto, CreateBudget, BudgetUtilization } from '../models/budget';

export const getBudgets = async (startDate: string, endDate: string, period: string) => {
  const res = await api.get('/budgets', { params: { startDate, endDate, period } });
  return res.data;
};

export const createOrUpdateBudget = (data: Partial<CreateBudget>) => api.post('/budgets', data);

export const deleteBudget = (id: string) => api.delete(`/budgets/${id}`);

export const copyPreviousBudgets = (data: Partial<copyperviousDto>) => {
  return api.post('/budgets/copyPrevious', data);
};

export const getBudgetUtilizations = async (
  month: number,
  year: number,
  period: string,
): Promise<BudgetUtilization[]> => {
  const res = await api.get('/budgets/allutilization', { params: { month, year, period } });
  return res.data;
};

export type AIBudgetSuggestion = {
  categoryId: string;
  categoryName: string;
  amount: string;
  period: 'monthly' | 'weekly' | 'bi-weekly' | 'yearly';
  reason: string;
};

export const getAIBudgetSuggestions = async (months = 3): Promise<AIBudgetSuggestion[]> => {
  const res = await api.get('/budgets/ai-suggestions', { params: { months } });
  return res.data;
};
