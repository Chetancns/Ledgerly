
export class CreateBudget {

  categoryId?: string;


  amount?: string;


  period?: string;

  startDate?: string;



  endDate?: string;



  carriedOver?: boolean;


  sourceBudgetId?: string;
}

export class copyperviousDto{
  period?: string;

  startDate?: string;



  endDate?: string;

}

export type BudgetCategory = {
  categoryId: string;
  categoryName: string;
  budget: number;
  actual: number;
  status: 'overspent' | 'within_budget' | 'no_budget';
};

export type BudgetUtilization = {
  budgetId?: string;
  categoryId: string;
  amount: number; // budgeted amount
  spent: number; // actual spent
  percent: number; // percent used
};

export type BudgetTotals = {
  totalBudget: number;
  totalActual: number;
  totalBudgetIncome: number;
  totalBudgetExpense: number;
  totalActualIncome: number;
  totalActualExpense: number;
  unbudgeted: number;
};

export type BudgetReports = {
  totals: BudgetTotals;
  categories: BudgetCategory[];
};
