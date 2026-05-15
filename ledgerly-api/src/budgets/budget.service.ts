import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Budget, BudgetPeriod } from './budget.entity';
import { Transaction } from '../transactions/transaction.entity';
import dayjs from 'dayjs';
import { BudgetCategory, CreateBudgetDto } from './dto/budgetdto';
import { Category } from '../categories/category.entity';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface AIBudgetSuggestion {
  categoryId: string;
  categoryName: string;
  amount: string;
  period: BudgetPeriod;
  reason: string;
}

const VALID_BUDGET_PERIODS: BudgetPeriod[] = ['monthly', 'weekly', 'bi-weekly', 'yearly'];

@Injectable()
export class BudgetsService {
  private openai: OpenAI;

  constructor(
    @InjectRepository(Budget) private budRepo: Repository<Budget>,
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
    @InjectRepository(Category) private catRepo: Repository<Category>,
    private config: ConfigService,
  ) {
    this.openai = new OpenAI({ apiKey: this.config.get('OPENAI_API_KEY') });
  }

  async utilization(userId: string, budgetId: string) {
    const b = await this.budRepo.findOne({ where: { id: budgetId, userId } });
    if (!b) return null;

    const now = dayjs();
    let from = now.startOf('month');
    let to = now.endOf('month');
    if (b.period === 'weekly') {
      from = now.startOf('week');
      to = now.endOf('week');
    }
    if (b.period === 'yearly') {
      from = now.startOf('year');
      to = now.endOf('year');
    }

    const where: { userId: string; transactionDate: ReturnType<typeof Between>; categoryId?: string } = {
      userId,
      transactionDate: Between(from.format('YYYY-MM-DD'), to.format('YYYY-MM-DD')),
    };
    if (b.categoryId) where.categoryId = b.categoryId;

    const txs = await this.txRepo.find({ where: where as any });
    const spent = txs.reduce((sum, t) => sum + Number(t.amount), 0);
    const pct = b.amount ? (spent / Number(b.amount)) * 100 : 0;

    return { budgetId: b.id, amount: Number(b.amount), spent: Number(spent.toFixed(2)), percent: Number(pct.toFixed(1)) };
  }

  async createOrUpdate(userId: string, dto: CreateBudgetDto) {
    let budget = await this.budRepo.findOne({
      where: { userId, categoryId: dto.categoryId, startDate: dto.startDate, endDate: dto.endDate },
    });

    if (budget) {
      budget.amount = dto.amount;
      return this.budRepo.save(budget);
    }

    budget = this.budRepo.create({ ...dto, userId });
    return this.budRepo.save(budget);
  }

  async getBudgets(userId: string, startDate: string, endDate: string, period: string) {
    return this.budRepo.find({
      where: {
        userId,
        period: period as BudgetPeriod,
        startDate,
        endDate,
      },
    });
  }

  async carryOverBudgets(userId: string, periodStart: string, periodEnd: string) {
    const prevBudgets = await this.budRepo.find({ where: { userId, endDate: periodStart } });

    for (const b of prevBudgets) {
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
        await this.createOrUpdate(userId, {
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
    const lastBudget = await this.budRepo.findOne({
      where: { userId, period: period as BudgetPeriod },
      order: { createdAt: 'DESC' },
    });
    if (!lastBudget) return [];

    const prevBudgets = await this.budRepo.find({
      where: { userId, period: period as BudgetPeriod, startDate: lastBudget.startDate, endDate: lastBudget.endDate },
    });

    const newBudgets = prevBudgets.map((b) =>
      this.budRepo.create({
        userId,
        period: b.period,
        categoryId: b.categoryId,
        amount: b.amount,
        startDate,
        endDate,
        carriedOver: false,
      }),
    );

    return this.budRepo.save(newBudgets);
  }

  async deleteBudgets(userId: string, id: string) {
    const budget = await this.budRepo.findOne({ where: { id, userId } });
    if (!budget) return;
    await this.budRepo.delete(id);
  }

  async allUtilizations(userId: string, period: 'monthly' | 'weekly' | 'bi-weekly' | 'yearly', date: string) {
    const dayjsDate = dayjs(date);
    if (!dayjsDate.isValid()) {
      throw new Error(`Invalid date: ${date}`);
    }

    let from = dayjsDate.startOf('month');
    let to = dayjsDate.endOf('month');

    if (period === 'weekly') {
      from = dayjsDate.startOf('week');
      to = dayjsDate.endOf('week');
    }
    if (period === 'yearly') {
      from = dayjsDate.startOf('year');
      to = dayjsDate.endOf('year');
    }
    if (period === 'bi-weekly') {
      from = dayjsDate.date() <= 15 ? dayjsDate.startOf('month') : dayjsDate.startOf('month').add(15, 'day');
      to = from.add(14, 'day');
    }

    const budgets = await this.budRepo.find({
      where: { userId, period, startDate: from.format('YYYY-MM-DD'), endDate: to.format('YYYY-MM-DD') },
    });

    const results: BudgetCategory[] = [];
    for (const b of budgets) {
      const where: { userId: string; transactionDate: ReturnType<typeof Between>; categoryId?: string } = {
        userId,
        transactionDate: Between(from.format('YYYY-MM-DD'), to.format('YYYY-MM-DD')),
      };
      if (b.categoryId) where.categoryId = b.categoryId;
      const txs = await this.txRepo.find({ where: where as any });
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

  private parseSuggestionJSON(raw: string): AIBudgetSuggestion[] {
    const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    const start = Math.min(...[cleaned.indexOf('['), cleaned.indexOf('{')].filter((i) => i >= 0));
    const end = Math.max(cleaned.lastIndexOf(']'), cleaned.lastIndexOf('}'));
    const json = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
    const parsed = JSON.parse(json) as unknown;
    const arr = Array.isArray(parsed) ? parsed : [parsed];

    return arr
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item) => {
        const period =
          typeof item.period === 'string' && VALID_BUDGET_PERIODS.includes(item.period as BudgetPeriod)
            ? (item.period as BudgetPeriod)
            : ('monthly' as BudgetPeriod);

        return {
          categoryId: typeof item.categoryId === 'string' ? item.categoryId : '',
          categoryName: typeof item.categoryName === 'string' ? item.categoryName : '',
          amount: Number(item.amount ?? 0).toFixed(2),
          period,
          reason: typeof item.reason === 'string' ? item.reason : 'Based on recent spending trend.',
        };
      })
      .filter((item) => item.categoryId && Number(item.amount) > 0);
  }

  private fallbackSuggestions(
    categories: Category[],
    totals: Map<string, number>,
    months: number,
  ): AIBudgetSuggestion[] {
    return categories
      .map((cat) => {
        const total = totals.get(cat.id) || 0;
        const monthlyAvg = total / months;
        const recommended = monthlyAvg > 0 ? monthlyAvg * 1.1 : 0;
        return {
          categoryId: cat.id,
          categoryName: cat.name,
          amount: recommended.toFixed(2),
          period: 'monthly' as BudgetPeriod,
          reason: 'Estimated from your recent average monthly spending with a 10% buffer.',
        };
      })
      .filter((s) => Number(s.amount) > 0)
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, 8);
  }

  async getAISuggestions(userId: string, months = 3) {
    const lookback = Math.max(1, Math.min(3, Number(months) || 3));
    const from = dayjs().subtract(lookback, 'month').startOf('month').format('YYYY-MM-DD');
    const to = dayjs().endOf('day').format('YYYY-MM-DD');

    const [categories, txs] = await Promise.all([
      this.catRepo.find({ where: { userId, type: 'expense', IsDeleted: false } }),
      this.txRepo.find({
        where: {
          userId,
          type: 'expense',
          transactionDate: Between(from, to),
        },
        relations: ['category'],
      }),
    ]);

    const totals = new Map<string, number>();
    for (const tx of txs) {
      if (!tx.categoryId) continue;
      totals.set(tx.categoryId, (totals.get(tx.categoryId) || 0) + Number(tx.amount || 0));
    }

    const fallback = this.fallbackSuggestions(categories, totals, lookback);
    if (!this.config.get('OPENAI_API_KEY') || fallback.length === 0) {
      return fallback;
    }

    try {
      const categoryContext = categories
        .map((c) => `${c.id} | ${c.name} | spent=${(totals.get(c.id) || 0).toFixed(2)}`)
        .join('\n');

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You suggest practical monthly category budgets from user spending history. Return only JSON array with categoryId, categoryName, amount, reason.',
          },
          {
            role: 'user',
            content: `Lookback months: ${lookback}\nCategory spending:\n${categoryContext}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 700,
      });

      const raw = completion.choices[0]?.message?.content || '[]';
      const parsed = this.parseSuggestionJSON(raw);

      if (parsed.length === 0) return fallback;
      return parsed
        .filter((s) => categories.some((c) => c.id === s.categoryId))
        .slice(0, 10);
    } catch {
      return fallback;
    }
  }
}
