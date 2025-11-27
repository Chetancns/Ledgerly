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

export const getSpendingInsights = async ({
  from,
  to,
  compareWithPrevious = true,
}: {
  from?: string;
  to?: string;
  compareWithPrevious?: boolean;
}) => {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  if (compareWithPrevious) params.compareWithPrevious = 'true';
  
  const res = await api.get('/reports/spending-insights', { params });
  return res.data;
};

export const getAIInsights = async ({
  from,
  to,
  compareWithPrevious = true,
  forceNew = false,
}: {
  from?: string;
  to?: string;
  compareWithPrevious?: boolean;
  forceNew?: boolean;
}) => {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  if (compareWithPrevious) params.compareWithPrevious = 'true';
  if (forceNew) params.forceNew = 'true';
  
  const res = await api.get('/reports/ai-insights', { params });
  return res.data;
};

export const getAIUsage = async (month: number, year: number) => {
  const res = await api.get('/reports/ai-usage', { 
    params: { month: month.toString(), year: year.toString() } 
  });
  return res.data;
};

export const getAIInsightsHistory = async (month: number, year: number) => {
  const res = await api.get('/reports/ai-insights/history', {
    params: { month: month.toString(), year: year.toString() }
  });
  return res.data as Array<{ id: string; periodStart: string; periodEnd: string; createdAt: string }>;
};

export const getAIInsightById = async (id: string) => {
  const res = await api.get('/reports/ai-insights/by-id', { params: { id } });
  return res.data;
};