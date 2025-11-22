import api from "./api";
import { BudgetReports } from "@/models/budget";

export const getBudgetReports = async (
  period: string,
  month: number,
  year: number
): Promise<BudgetReports> => {
  const res = await api.get("/reports/budget-vs-actual", { params: { month, year, period } });
  return res.data;
};

export const getCashflowTimeline = async (
  period: string,
  month: number,
  year: number
) => {
  const res = await api.get("/reports/cashflow", { params: { month, year, period } });
  return res.data;
};

export const getCategoryHeatmap = async (
  month: number,
  year: number
) => {
  const res = await api.get("/reports/category-heatmap", { params: { month, year } });
  return res.data;
};