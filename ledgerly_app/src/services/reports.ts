import api from "./api";

export const getBudgetReports =(
  period:string,month:number,year:number) => api.get("/reports/budget-vs-actual",{ params: { month, year,period } });

export const getCashflowTimeline=(
period:string,month:number,year:number) => api.get("/reports/cashflow",{ params: { month, year,period } });

export const getCategoryHeatmap=(
month:number,year:number) => api.get("/reports/category-heatmap",{ params: { month, year } });