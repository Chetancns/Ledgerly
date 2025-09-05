import api from "./api";
import {copyperviousDto, CreateBudget} from '../models/budget'
import { AxiosResponse } from "axios";
interface Budget {
  id?: string;
  categoryId: string;
  month: number; // 1-12
  year: number;
  amount: string;
}
export const getBudgets = (startDate: string, endDate: string,period: string) => {
  return api.get('/budgets', { params: { startDate, endDate,period } });
};

export const createOrUpdateBudget =(data:Partial<CreateBudget>) => api.post("/budgets",data);

export const deleteBudget = (id:string) => api.delete(`/budgets/${id}`);

export const copyPreviousBudgets = (data:Partial<copyperviousDto>) => {
  return api.post('/budgets/copyPrevious',data);
};

export const getBudgetUtilizations = (
  month:number,year:number,period:string) => api.get("/budgets/allutilization",{ params: { month, year,period } });