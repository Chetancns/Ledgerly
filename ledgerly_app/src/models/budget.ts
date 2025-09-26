
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
