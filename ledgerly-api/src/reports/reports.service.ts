// reports.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not } from 'typeorm';
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

  async budgetVsActual(userId: string, period: 'monthly' | 'weekly' | 'bi-weekly' | 'yearly', month?: string, year?: string) {
    // 1. Compute period window
  let from = dayjs().startOf('month');
  let to = dayjs().endOf('month');
  if (period === 'weekly') { from = dayjs().startOf('week'); to = dayjs().endOf('week'); }
  if (period === 'yearly') {
    from = dayjs(`${year || dayjs().year()}-01-01`);
    to = from.endOf('year');
  }
  if (period === 'monthly' && year && month) {
    const formattedMonth = month.padStart(2, '0');
    from = dayjs(`${year}-${formattedMonth}-01`);
    to = from.endOf('month');
  }

  // 2. Load budgets for this user
  const budgets = await this.budgetRepo.find({
    where: { userId, period,
        startDate:from.format('YYYY-MM-DD'),
        endDate:to.format('YYYY-MM-DD')
     },
    relations: ['category'],
  });
// const budgets = await this.budgetRepo
//   .createQueryBuilder('budget')
//   .leftJoinAndSelect('budget.category', 'category')
//   .where('budget.userId = :userId', { userId })
//   .andWhere('budget.period = :period', { period })
//   .andWhere('budget.startDate = :startDate', { startDate: from.format('YYYY-MM-DD') })
//   .andWhere('budget.endDate = :endDate', { endDate: to.format('YYYY-MM-DD') })
//   .andWhere('category.type != :type', { type: 'income' }) // 👈 exclude income categories
//   .getMany();

  // 3. Load all categories
  const categories = await this.catRepo.find({ where: { userId ,IsDeleted:false} });

  // 4. Load expenses in this window
  const txs = await this.txRepo.find({
    where: {
      userId,
      transactionDate: Between(from.format('YYYY-MM-DD'), to.format('YYYY-MM-DD')),
      type: Not('transfer'), // exclude transfers
    },
  });

  const actualMap: Record<string, number> = {};
  txs.forEach((t) => {
    const key = t.categoryId || 'uncategorized';
    actualMap[key] = (actualMap[key] || 0) + Number(t.amount);
  });

  // 5. Merge budgets + actuals
  const categoriesResult: any[] = [];
  let totalBudget = 0;
  let totalActual = 0;
  let unbudgeted = 0;

  for (const b of budgets) {
    const actual = actualMap[b.categoryId] || 0;
    const budget = Number(b.amount);

    totalBudget += budget;
    totalActual += actual;

    categoriesResult.push({
      categoryId: b.categoryId || 'uncategorized',
      categoryName: b.category?.name || 'Uncategorized',
      budget,
      actual,
      status: actual > budget ? 'overspent' : 'within_budget',
    });

    delete actualMap[b.categoryId];
  }

  // Categories with spending but no budget
  for (const [catId, amount] of Object.entries(actualMap)) {
    const cat = categories.find((c) => c.id === catId);
    categoriesResult.push({
      categoryId: catId,
      categoryName: cat?.name || 'Uncategorized',
      budget: 0,
      actual: amount,
      status: 'no_budget',
    });

    totalActual += amount;
    unbudgeted += amount;
  }

  const overspentAmount = categoriesResult.reduce((sum, cat) => {
    if (cat.status === 'overspent') {
      return sum + (cat.actual - cat.budget);
    }
    return sum;
  }, 0);



  return {
    categories: categoriesResult,
    totals: {
      totalBudget,
      totalActual,
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
        type: 'expense',
      transactionDate: Between(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')),
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

      if (t.type === 'expense') {
        grouped[t.categoryId].total += Number(t.amount);
      }
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
