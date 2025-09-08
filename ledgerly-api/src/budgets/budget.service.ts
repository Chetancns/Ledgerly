import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Budget, BudgetPeriod } from './budget.entity';
import { Transaction } from '../transactions/transaction.entity';
import dayjs from 'dayjs';
import { BudgetCategory, CreateBudgetDto } from './dto/budgetdto';

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(Budget) private budRepo: Repository<Budget>,
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
  ) {}

  async utilization(userId: string, budgetId: string) {
    const b = await this.budRepo.findOne({ where: { id: budgetId, userId } });
    if (!b) return null;
    console.log(budgetId);
    // Compute date window based on period
    const now = dayjs();
    let from = now.startOf('month');
    let to = now.endOf('month');
    if (b.period === 'weekly') { from = now.startOf('week'); to = now.endOf('week'); }
    if (b.period === 'yearly') { from = now.startOf('year'); to = now.endOf('year'); }

    const where: any = {
      userId,
      type: 'expense',
      transactionDate: Between(from.format('YYYY-MM-DD'), to.format('YYYY-MM-DD')),
    };
    if (b.categoryId) where.categoryId = b.categoryId;
    console.log(where);
    const txs = await this.txRepo.find({ where });
    console.log(txs);
    const spent = txs.reduce((sum, t) => sum + Number(t.amount), 0);
    const pct = b.amount ? (spent / Number(b.amount)) * 100 : 0;

    return { budgetId: b.id, amount: Number(b.amount), spent: Number(spent.toFixed(2)), percent: Number(pct.toFixed(1)) };
  }
  async createOrUpdate(userId: string, dto: CreateBudgetDto) {
    console.log("budget called",dto);
    let budget = await this.budRepo.findOne({
      where: { userId, categoryId: dto.categoryId, startDate:dto.startDate,endDate:dto.endDate },
    });

    if (budget) {
      budget.amount = dto.amount;
      return this.budRepo.save(budget);
    }
    console.log(budget);
    budget = this.budRepo.create({ ...dto, userId });
    return this.budRepo.save(budget);
  }

  async getBudgets(userId: string, startDate: string, endDate: string,period :string) {
    console.log()
    return this.budRepo.find({
    where: {
      userId,
      period: period as BudgetPeriod, // 👈 cast to match entity type
      startDate: startDate,endDate: endDate
    },
  });
 }
  async carryOverBudgets(userId: string, periodStart: string, periodEnd: string) {
    // Fetch previous period budgets
    const prevBudgets = await this.budRepo.find({
      where: { userId, endDate: periodStart }, // last period budgets
    });

    for (const b of prevBudgets) {
      // Compute spent in previous period
      const txs = await this.txRepo.find({
  where: {
    userId,
    type: 'expense',
    categoryId: b.categoryId,
    ...(b.startDate && b.endDate && {
      transactionDate: Between(b.startDate, b.endDate),
    }),
  },
});


      const spent = txs.reduce((sum, t) => sum + Number(t.amount), 0);
      const remaining = Number(b.amount) - spent;

      if (remaining > 0) {
        await this.createOrUpdate(userId,{
          categoryId: b.categoryId,
          amount: remaining.toFixed(2),
          period: b.period,
          startDate: periodStart,
          endDate: periodEnd,
          carriedOver: true,
          sourceBudgetId: b.id,
        });
      }
    }
  }
  async copyPrevious(userId: string, period: string, startDate: string, endDate: string) {
    console.log(period,startDate,endDate)
  const lastBudget = await this.budRepo.findOne({
    where: { userId,period: period as BudgetPeriod },
    order: { createdAt: "DESC" },
  });
  if (!lastBudget) return [];
console.log(lastBudget);
  const prevBudgets = await this.budRepo.find({
    where: { userId, period: period as BudgetPeriod, startDate: lastBudget.startDate, endDate: lastBudget.endDate },
  });
console.log(prevBudgets);
  const newBudgets = prevBudgets.map((b) =>
    this.budRepo.create({
      userId,
      period: b.period,
      categoryId: b.categoryId,
      amount: b.amount,
      startDate,
      endDate,
      carriedOver: false,
    })
  );
console.log("new ",newBudgets);
  return this.budRepo.save(newBudgets);
}
async deletebugets(id:string){
  await this.budRepo.delete(id);
}
async allUtilizations(userId: string, period: 'monthly' | 'weekly' | 'bi-weekly' | 'yearly', date: string) {
  const dayjsDate = dayjs(date);
  //console.log(dayjsDate);
  if (!dayjsDate.isValid()) {
    throw new Error(`Invalid date: ${date}`);
  }
  // determine range
  let from = dayjsDate.startOf('month');
  let to = dayjsDate.endOf('month');
  console.log(from,to);
  if (period === 'weekly') { from = dayjsDate.startOf('week'); to = dayjsDate.endOf('week'); }
  if (period === 'yearly') { from = dayjsDate.startOf('year'); to = dayjsDate.endOf('year'); }
  if (period === 'bi-weekly') {
    const start = dayjsDate.startOf('week');
    from = dayjsDate.date() <= 15 ? dayjsDate.startOf('month') : dayjsDate.startOf('month').add(15, 'day');
    to = from.add(14, 'day');
  }

  const budgets = await this.budRepo.find({ where: { userId, period,startDate:from.format('YYYY-MM-DD'),endDate:to.format('YYYY-MM-DD') } });
  //console.log(budgets);
  const results :BudgetCategory[] = [];
  for (const b of budgets) {
    const where: any = {
      userId,
      type: 'expense',
      transactionDate: Between(from.format('YYYY-MM-DD'), to.format('YYYY-MM-DD')),
    };
    if (b.categoryId) where.categoryId = b.categoryId;
    const txs = await this.txRepo.find({ where });
    const spent = txs.reduce((sum, t) => sum + Number(t.amount), 0);
    const pct = b.amount ? (spent / Number(b.amount)) * 100 : 0;
    results.push({
      budgetId: b.id,
      categoryId: b.categoryId,
      amount: Number(b.amount),
      spent: Number(spent.toFixed(2)),
      percent: Number(pct.toFixed(1)),
    });
  }
  return results;
}

}
