import api from "./api";
import { copyperviousDto, CreateBudget, BudgetUtilization } from '../models/budget'
export const getBudgets = async (startDate: string, endDate: string, period: string) => {
  const res = await api.get('/budgets', { params: { startDate, endDate, period } });
  return res.data;
};

export const createOrUpdateBudget =(data:Partial<CreateBudget>) => api.post("/budgets",data);

export const deleteBudget = (id:string) => api.delete(`/budgets/${id}`);

export const copyPreviousBudgets = (data:Partial<copyperviousDto>) => {
  return api.post('/budgets/copyPrevious',data);
};

export const getBudgetUtilizations = async (
  month: number,
  year: number,
  period: string
): Promise<BudgetUtilization[]> => {
  const res = await api.get("/budgets/allutilization", { params: { month, year, period } });
  return res.data;
};