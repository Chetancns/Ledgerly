// reports.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not, In } from 'typeorm';
import dayjs from 'dayjs';
import { Budget } from '../budgets/budget.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Category } from '../categories/category.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Budget) private budgetRepo: Repository<Budget>,
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
    @InjectRepository(Category) private catRepo: Repository<Category>,
  ) {}

  async budgetVsActual(
    userId: string,
    period: 'monthly' | 'weekly' | 'bi-weekly' | 'yearly',
    month?: string,
    year?: string
  ) {
    // 1️⃣ Compute period window
    let from = dayjs().startOf('month');
    let to = dayjs().endOf('month');

    if (period === 'weekly') {
      from = dayjs().startOf('week');
      to = dayjs().endOf('week');
    } else if (period === 'yearly') {
      from = dayjs(`${year || dayjs().year()}-01-01`);
      to = from.endOf('year');
    } else if (period === 'monthly' && year && month) {
      const formattedMonth = month.padStart(2, '0');
      from = dayjs(`${year}-${formattedMonth}-01`);
      to = from.endOf('month');
    }

    // 2️⃣ Load budgets (for this user + period)
    const budgets = await this.budgetRepo.find({
      where: {
        userId,
        period,
        startDate: from.format('YYYY-MM-DD'),
        endDate: to.format('YYYY-MM-DD'),
      },
      relations: ['category'],
    });

    // 3️⃣ Load categories
    const categories = await this.catRepo.find({
      where: { userId, IsDeleted: false },
    });

    // 4️⃣ Load transactions in this window
    const txs = await this.txRepo.find({
      where: {
        userId,
        transactionDate: Between(from.format('YYYY-MM-DD'), to.format('YYYY-MM-DD')),
      },
    });

    // 🧮 Compute actual spending per category
    const actualMap: Record<string, number> = {};
    txs.forEach((t) => {
      const key = t.categoryId || 'uncategorized';
      actualMap[key] = (actualMap[key] || 0) + Number(t.amount);
    });

    // 5️⃣ Merge budgets + actuals + compute totals
    const categoriesResult: any[] = [];

    let totalBudget = 0;
    let totalActual = 0;
    let totalBudgetIncome = 0;
    let totalBudgetExpense = 0;
    let totalActualIncome = 0;
    let totalActualExpense = 0;
    let unbudgeted = 0;

    for (const b of budgets) {
      const actual = actualMap[b.categoryId] || 0;
      const budget = Number(b.amount);
      const type = b.category?.type || 'expense'; // default to expense

      totalBudget += budget;
      totalActual += actual;

      if (type === 'income') {
        totalBudgetIncome += budget;
        totalActualIncome += actual;
      } else {
        totalBudgetExpense += budget;
        totalActualExpense += actual;
      }

      categoriesResult.push({
        categoryId: b.categoryId || 'uncategorized',
        categoryName: b.category?.name || 'Uncategorized',
        type,
        budget,
        actual,
        status: actual > budget ? 'overspent' : 'within_budget',
      });

      delete actualMap[b.categoryId];
    }

    // 6️⃣ Handle categories with actuals but no budget
    for (const [catId, amount] of Object.entries(actualMap)) {
      const cat = categories.find((c) => c.id === catId);
      const type = cat?.type || 'expense';

      if (type === 'income') totalActualIncome += amount;
      else totalActualExpense += amount;

      categoriesResult.push({
        categoryId: catId,
        categoryName: cat?.name || 'Uncategorized',
        type,
        budget: 0,
        actual: amount,
        status: 'no_budget',
      });

      totalActual += amount;
      unbudgeted += amount;
    }

    // 7️⃣ Compute overspent
    const overspentAmount = categoriesResult.reduce((sum, cat) => {
      if (cat.status === 'overspent' && cat.type !== 'income') {
        return sum + (cat.actual - cat.budget);
      }
      return sum;
    }, 0);

    // ✅ Final return
    return {
      categories: categoriesResult,
      totals: {
        totalBudget,
        totalActual,
        totalBudgetIncome,
        totalBudgetExpense,
        totalActualIncome,
        totalActualExpense,
        overspentAmount,
        unbudgeted,
      },
    };
  }


  async getCashflowTimeline(userId: string,
    interval:'daily'| 'monthly' | 'weekly' | 'bi-weekly' | 'yearly',
    month?: string,
    year?: string,
  ) {
    let start =  dayjs().startOf('month');
    let end = dayjs().endOf('month');
    if ( year && month) {
    const formattedMonth = month.padStart(2, '0');
    start = dayjs(`${year}-${formattedMonth}-01`);
    end = start.endOf('month');
  }
    const transactions = await this.txRepo.find({
      where:{
        userId,
      transactionDate: Between(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')),
      },
    relations: ['account'],
    });

    // Group by chosen interval
    const grouped: Record<string, any> = {};
    transactions.forEach((t) => {
      if (t.type === 'transfer') return; // Exclude transfers
      let bucket: string;
      if (interval === 'daily') {
        bucket = dayjs(t.transactionDate).format('YYYY-MM-DD');
      } else if (interval === 'weekly') {
        bucket = dayjs(t.transactionDate).startOf('week').format('YYYY-[W]WW');
      } else {
        bucket = dayjs(t.transactionDate).format('YYYY-MM');
      }

      if (!grouped[bucket]) {
        grouped[bucket] = {
          income: 0,
          expense: 0,
          savings: 0,
        };
      }
      const isCreditCard = t.account?.type === 'credit_card';
      if (t.type === 'income' )  grouped[bucket].income += Number(t.amount);
      if (t.type === 'expense') {
        grouped[bucket].expense += Number(t.amount);}
      if (t.type === 'savings') grouped[bucket].savings += Number(t.amount);
    });

    // Build timeline
    const timeline = Object.entries(grouped).map(([bucket, vals]) => ({
      date: bucket,
      ...vals,
      netChange:
        vals.income + vals.savings - (vals.expense),
    }));

    // Totals
    const totals = timeline.reduce(
      (acc, row) => {
        acc.income += row.income;
        acc.expense += row.expense;
        acc.savings += row.savings;
        acc.netChange += row.netChange;
        return acc;
      },
      { income: 0, expense: 0, savings: 0, netChange: 0 },
    );
    timeline.sort((a, b) => dayjs(a.date).isBefore(dayjs(b.date)) ? -1 : 1);
    return { interval, start, end, timeline, totals };
  }

  async getCategoryHeatmap(userId: string,month?: string, year?: string) {
    
    let start =  dayjs().startOf('month');
    let end = dayjs().endOf('month');
    if ( year && month) {
    const formattedMonth = month.padStart(2, '0');
    start = dayjs(`${year}-${formattedMonth}-01`);
    end = start.endOf('month');
  }

    const transactions = await this.txRepo.find({
      where:{
        userId,
      transactionDate: Between(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')),
      type: In(['expense','savings','transfer']),
      },
    relations: ['category'],
    });
    const grouped: Record<
      string,
      { categoryName: string; total: number }
    > = {};

    transactions.forEach((t) => {
      if (!t.categoryId) return;

      if (!grouped[t.categoryId]) {
        grouped[t.categoryId] = {
          categoryName: t.category?.name ?? 'Unknown',
          total: 0,
        };
      }

        grouped[t.categoryId].total += Number(t.amount);
      
    });

    const categories = Object.entries(grouped).map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.categoryName,
      total: data.total,
    }));

    const totals = {
      allCategories: categories.reduce((sum, c) => sum + c.total, 0),
    };

    return { start, end, categories, totals };
  }
}
