import { ReportsService } from './reports.service';
import { Budget } from '../budgets/budget.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Category } from '../categories/category.entity';

type MockRepo<T> = {
  find: jest.Mock<Promise<T[]>, [any]>;
  findOne: jest.Mock<Promise<T | null>, [any]>;
  count: jest.Mock<Promise<number>, [any]>;
};

describe('ReportsService', () => {
  let service: ReportsService;
  let budgetRepo: MockRepo<Budget>;
  let txRepo: MockRepo<Transaction>;
  let catRepo: MockRepo<Category>;
  let aiInsightRepo: MockRepo<any>;

  beforeEach(() => {
    budgetRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
    };
    txRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
    };
    catRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
    };
    aiInsightRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
    };

    service = new ReportsService(
      budgetRepo as never,
      txRepo as never,
      catRepo as never,
      aiInsightRepo as never,
      { get: jest.fn().mockReturnValue('test-key') } as never,
    );
  });

  it('calculates budget vs actual using transaction.type instead of category.type for direction', async () => {
    budgetRepo.find.mockResolvedValue([
      {
        id: 'budget-1',
        userId: 'user-1',
        categoryId: 'cat-exp',
        amount: '300.00',
        period: 'monthly',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        category: { id: 'cat-exp', name: 'Groceries', type: 'expense' },
      } as Budget,
      {
        id: 'budget-2',
        userId: 'user-1',
        categoryId: 'cat-inc',
        amount: '4000.00',
        period: 'monthly',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        category: { id: 'cat-inc', name: 'Salary', type: 'income' },
      } as Budget,
    ]);
    catRepo.find.mockResolvedValue([
      { id: 'cat-exp', userId: 'user-1', name: 'Groceries', type: 'expense', IsDeleted: false } as Category,
      { id: 'cat-inc', userId: 'user-1', name: 'Salary', type: 'income', IsDeleted: false } as Category,
    ]);
    txRepo.find.mockResolvedValue([
      { id: 'tx-1', userId: 'user-1', categoryId: 'cat-exp', amount: '125.00', type: 'expense', transactionDate: '2026-01-15' } as Transaction,
      { id: 'tx-2', userId: 'user-1', categoryId: 'cat-inc', amount: '4200.00', type: 'income', transactionDate: '2026-01-15' } as Transaction,
      { id: 'tx-3', userId: 'user-1', categoryId: 'cat-exp', amount: '25.00', type: 'transfer', transactionDate: '2026-01-15' } as Transaction,
      { id: 'tx-4', userId: 'user-1', categoryId: null, amount: '30.00', type: 'expense', transactionDate: '2026-01-15' } as Transaction,
    ]);

    const result = await service.budgetVsActual('user-1', 'monthly', '1', '2026');

    expect(result.totals.totalActualExpense).toBe(155);
    expect(result.totals.totalActualIncome).toBe(4200);
    expect(result.categories.find((category) => category.categoryId === 'cat-exp')?.actual).toBe(125);
    expect(result.categories.find((category) => category.categoryId === 'uncategorized')?.actual).toBe(30);
  });

  it('keeps transfers out of expense totals while preserving legacy savings reporting', async () => {
    txRepo.find
      .mockResolvedValueOnce([
        { id: 'tx-1', userId: 'user-1', categoryId: 'cat-exp', amount: '100.00', type: 'expense', transactionDate: '2026-01-10', category: { name: 'Food' } } as Transaction,
        { id: 'tx-2', userId: 'user-1', categoryId: null, amount: '50.00', type: 'income', transactionDate: '2026-01-11' } as Transaction,
        { id: 'tx-3', userId: 'user-1', categoryId: 'cat-exp', amount: '25.00', type: 'transfer', transactionDate: '2026-01-12' } as Transaction,
        { id: 'tx-4', userId: 'user-1', categoryId: null, amount: '10.00', type: 'savings', transactionDate: '2026-01-13' } as Transaction,
        { id: 'tx-5', userId: 'user-1', categoryId: null, amount: '20.00', type: 'expense', transactionDate: '2026-01-14' } as Transaction,
      ])
      .mockResolvedValueOnce([]);

    const result = await service.getSpendingInsights('user-1', {
      from: '2026-01-01',
      to: '2026-01-31',
      compareWithPrevious: true,
    });

    expect(result.summary.totalExpense).toBe(120);
    expect(result.summary.totalIncome).toBe(50);
    expect(result.summary.totalSavings).toBe(10);
    expect(result.summary.netCashflow).toBe(-70);
    expect(result.topCategories[0]).toMatchObject({ categoryName: 'Food', amount: 100 });
    expect(result.topCategories.find((category) => category.categoryName === 'Uncategorized')?.amount).toBe(20);
  });
});
