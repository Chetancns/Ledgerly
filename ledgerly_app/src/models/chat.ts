export interface ChartDataPoint {
  date: string;
  income: number;
  expense: number;
  creditCardExpense: number; // added this
}


export interface CategorySpending {
  name: string;
  value: number;
}

export interface DailyTotals {
  [date: string]: { income: number; expense: number; creditCardExpense: number; };
}