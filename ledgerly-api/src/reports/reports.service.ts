// reports.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not, In, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import dayjs from 'dayjs';
import OpenAI from 'openai';
import { Budget } from '../budgets/budget.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Category } from '../categories/category.entity';
import { AiInsight } from './ai-insight.entity';

@Injectable()
export class ReportsService {
  private openai: OpenAI;

  constructor(
    @InjectRepository(Budget) private budgetRepo: Repository<Budget>,
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
    @InjectRepository(Category) private catRepo: Repository<Category>,
    @InjectRepository(AiInsight) private aiInsightRepo: Repository<AiInsight>,
    private config: ConfigService,
  ) {
    this.openai = new OpenAI({ apiKey: this.config.get('OPENAI_API_KEY') });
  }

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

  async exportTransactions(
    userId: string,
    options: { from?: string; to?: string; format: 'csv' | 'json' }
  ) {
    const where: any = { userId };
    
    if (options.from && options.to) {
      where.transactionDate = Between(options.from, options.to);
    }

    const transactions = await this.txRepo.find({
      where,
      relations: ['account', 'category'],
      order: { transactionDate: 'DESC' },
    });

    if (options.format === 'json') {
      return transactions;
    }

    // CSV format
    const csvHeaders = ['Date', 'Type', 'Category', 'From Account', 'Amount', 'Description','To Account'];
    const csvRows = transactions.map(tx => [
      tx.transactionDate,
      tx.type,
      tx.category?.name || 'N/A',
      tx.account?.name || 'N/A',
      tx.amount,
      (tx.description || '').replace(/,/g, ';'), // Escape commas
      tx.toAccountId || 'N/A',
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(',')),
    ].join('\n');

    return csvContent;
  }

  async getSpendingInsights(
    userId: string,
    options?: {
      from?: string;
      to?: string;
      compareWithPrevious?: boolean;
    }
  ) {
    // Default to current month
    const end = options?.to ? dayjs(options.to) : dayjs().endOf('month');
    const start = options?.from ? dayjs(options.from) : dayjs().startOf('month');
    
    // Get transactions for current period
    const currentTransactions = await this.txRepo.find({
      where: {
        userId,
        transactionDate: Between(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')),
        type: In(['expense', 'income', 'savings']),
      },
      relations: ['category'],
      order: { transactionDate: 'ASC' },
    });

    // Get previous period for comparison (if requested)
    let previousTransactions: Transaction[] = [];
    let comparisonPeriod: { start: string; end: string } | null = null;
    
    if (options?.compareWithPrevious) {
      const periodLength = end.diff(start, 'day') + 1;
      const prevEnd = start.subtract(1, 'day');
      const prevStart = prevEnd.subtract(periodLength - 1, 'day');
      
      comparisonPeriod = {
        start: prevStart.format('YYYY-MM-DD'),
        end: prevEnd.format('YYYY-MM-DD'),
      };
      
      previousTransactions = await this.txRepo.find({
        where: {
          userId,
          transactionDate: Between(prevStart.format('YYYY-MM-DD'), prevEnd.format('YYYY-MM-DD')),
          type: In(['expense', 'income', 'savings']),
        },
        relations: ['category'],
      });
    }

    // Calculate current period metrics
    const currentMetrics = this.calculatePeriodMetrics(currentTransactions, start, end);
    const previousMetrics = options?.compareWithPrevious 
      ? this.calculatePeriodMetrics(previousTransactions, dayjs(comparisonPeriod!.start), dayjs(comparisonPeriod!.end))
      : null;

    // Calculate trends and comparisons
    const trends = previousMetrics ? {
      expenseChange: currentMetrics.totalExpense - previousMetrics.totalExpense,
      expenseChangePercent: previousMetrics.totalExpense > 0 
        ? ((currentMetrics.totalExpense - previousMetrics.totalExpense) / previousMetrics.totalExpense) * 100 
        : 0,
      incomeChange: currentMetrics.totalIncome - previousMetrics.totalIncome,
      incomeChangePercent: previousMetrics.totalIncome > 0
        ? ((currentMetrics.totalIncome - previousMetrics.totalIncome) / previousMetrics.totalIncome) * 100
        : 0,
      savingsChange: currentMetrics.totalSavings - previousMetrics.totalSavings,
      avgDailyExpenseChange: currentMetrics.avgDailyExpense - previousMetrics.avgDailyExpense,
    } : null;

    // Top spending categories
    const topCategories = Object.entries(currentMetrics.categoryBreakdown)
      .map(([categoryId, data]: [string, any]) => ({
        categoryId,
        categoryName: data.name,
        amount: data.amount,
        count: data.count,
        percentage: (data.amount / currentMetrics.totalExpense) * 100,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // Get sample descriptions for AI context
    const sampleDescriptions = currentTransactions
      .filter(tx => tx.description && tx.description.trim())
      .slice(0, 20)
      .map(tx => ({
        description: tx.description,
        amount: tx.amount,
        category: tx.category?.name || 'Uncategorized',
        type: tx.type,
      }));

    // Spending by day of week
    const dayOfWeekSpending = this.analyzeDayOfWeekPatterns(currentTransactions);

    // Detect anomalies (spending significantly higher than average)
    const anomalies = this.detectSpendingAnomalies(currentTransactions, currentMetrics.avgDailyExpense);

    // Weekly trend within the period
    const weeklyTrend = this.calculateWeeklyTrend(currentTransactions, start, end);

    return {
      period: {
        start: start.format('YYYY-MM-DD'),
        end: end.format('YYYY-MM-DD'),
        days: end.diff(start, 'day') + 1,
      },
      comparisonPeriod,
      summary: {
        totalExpense: currentMetrics.totalExpense,
        totalIncome: currentMetrics.totalIncome,
        totalSavings: currentMetrics.totalSavings,
        netCashflow: currentMetrics.totalIncome - currentMetrics.totalExpense,
        avgDailyExpense: currentMetrics.avgDailyExpense,
        avgTransactionSize: currentMetrics.avgTransactionSize,
        transactionCount: currentMetrics.transactionCount,
      },
      trends,
      topCategories,
      sampleDescriptions,
      dayOfWeekSpending,
      weeklyTrend,
      anomalies,
      categoryComparison: previousMetrics ? this.compareCategorySpending(
        currentMetrics.categoryBreakdown,
        previousMetrics.categoryBreakdown
      ) : null,
    };
  }

  private calculatePeriodMetrics(transactions: Transaction[], start: dayjs.Dayjs, end: dayjs.Dayjs) {
    const metrics = {
      totalExpense: 0,
      totalIncome: 0,
      totalSavings: 0,
      transactionCount: transactions.length,
      avgDailyExpense: 0,
      avgTransactionSize: 0,
      categoryBreakdown: {} as Record<string, { name: string; amount: number; count: number }>,
    };

    transactions.forEach(tx => {
      const amount = Number(tx.amount) || 0;
      
      if (tx.type === 'expense') {
        metrics.totalExpense += amount;
        
        const catId = tx.categoryId || 'uncategorized';
        if (!metrics.categoryBreakdown[catId]) {
          metrics.categoryBreakdown[catId] = {
            name: tx.category?.name || 'Uncategorized',
            amount: 0,
            count: 0,
          };
        }
        metrics.categoryBreakdown[catId].amount += amount;
        metrics.categoryBreakdown[catId].count += 1;
      } else if (tx.type === 'income') {
        metrics.totalIncome += amount;
      } else if (tx.type === 'savings') {
        metrics.totalSavings += amount;
      }
    });

    const days = end.diff(start, 'day') + 1;
    metrics.avgDailyExpense = metrics.totalExpense / days;
    metrics.avgTransactionSize = transactions.length > 0 ? metrics.totalExpense / transactions.filter(t => t.type === 'expense').length : 0;

    return metrics;
  }

  private analyzeDayOfWeekPatterns(transactions: Transaction[]) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayData: Record<number, { expense: number; count: number }> = {};

    transactions.forEach(tx => {
      if (tx.type !== 'expense') return;
      
      const day = dayjs(tx.transactionDate).day();
      if (!dayData[day]) {
        dayData[day] = { expense: 0, count: 0 };
      }
      dayData[day].expense += Number(tx.amount);
      dayData[day].count += 1;
    });

    return dayNames.map((name, index) => ({
      day: name,
      totalExpense: dayData[index]?.expense || 0,
      transactionCount: dayData[index]?.count || 0,
      avgExpense: dayData[index] ? dayData[index].expense / dayData[index].count : 0,
    }));
  }

  private detectSpendingAnomalies(transactions: Transaction[], avgDailyExpense: number) {
    const threshold = avgDailyExpense * 2; // Anomaly if 2x average
    const anomalies: any[] = [];

    // Group by date
    const dailySpending: Record<string, { amount: number; transactions: Transaction[] }> = {};
    
    transactions.forEach(tx => {
      if (tx.type !== 'expense') return;
      
      const date = tx.transactionDate;
      if (!dailySpending[date]) {
        dailySpending[date] = { amount: 0, transactions: [] };
      }
      dailySpending[date].amount += Number(tx.amount);
      dailySpending[date].transactions.push(tx);
    });

    Object.entries(dailySpending).forEach(([date, data]) => {
      if (data.amount > threshold) {
        anomalies.push({
          date,
          amount: data.amount,
          avgDailyExpense,
          deviation: ((data.amount - avgDailyExpense) / avgDailyExpense) * 100,
          transactionCount: data.transactions.length,
          topTransactions: data.transactions
            .sort((a, b) => Number(b.amount) - Number(a.amount))
            .slice(0, 3)
            .map(t => ({
              amount: t.amount,
              category: t.category?.name || 'Uncategorized',
              description: t.description,
            })),
        });
      }
    });

    return anomalies.sort((a, b) => b.amount - a.amount);
  }

  private calculateWeeklyTrend(transactions: Transaction[], start: dayjs.Dayjs, end: dayjs.Dayjs) {
    const weeks: Record<string, { expense: number; income: number; savings: number; count: number }> = {};

    transactions.forEach(tx => {
      const weekStart = dayjs(tx.transactionDate).startOf('week').format('YYYY-MM-DD');
      
      if (!weeks[weekStart]) {
        weeks[weekStart] = { expense: 0, income: 0, savings: 0, count: 0 };
      }

      const amount = Number(tx.amount);
      if (tx.type === 'expense') weeks[weekStart].expense += amount;
      else if (tx.type === 'income') weeks[weekStart].income += amount;
      else if (tx.type === 'savings') weeks[weekStart].savings += amount;
      
      weeks[weekStart].count += 1;
    });

    return Object.entries(weeks)
      .map(([weekStart, data]) => ({
        weekStart,
        weekEnd: dayjs(weekStart).endOf('week').format('YYYY-MM-DD'),
        ...data,
        netCashflow: data.income - data.expense,
      }))
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  }

  private compareCategorySpending(
    current: Record<string, { name: string; amount: number; count: number }>,
    previous: Record<string, { name: string; amount: number; count: number }>
  ) {
    const comparison: any[] = [];

    // Check all current categories
    Object.entries(current).forEach(([catId, currData]) => {
      const prevData = previous[catId];
      
      if (prevData) {
        const change = currData.amount - prevData.amount;
        const changePercent = (change / prevData.amount) * 100;
        
        comparison.push({
          categoryId: catId,
          categoryName: currData.name,
          currentAmount: currData.amount,
          previousAmount: prevData.amount,
          change,
          changePercent,
          trend: change > 0 ? 'increased' : change < 0 ? 'decreased' : 'stable',
        });
      } else {
        comparison.push({
          categoryId: catId,
          categoryName: currData.name,
          currentAmount: currData.amount,
          previousAmount: 0,
          change: currData.amount,
          changePercent: 100,
          trend: 'new',
        });
      }
    });

    // Check for categories that disappeared
    Object.entries(previous).forEach(([catId, prevData]) => {
      if (!current[catId]) {
        comparison.push({
          categoryId: catId,
          categoryName: prevData.name,
          currentAmount: 0,
          previousAmount: prevData.amount,
          change: -prevData.amount,
          changePercent: -100,
          trend: 'stopped',
        });
      }
    });

    return comparison.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  }

  async generateAIInsights(userId: string, insightsData: any, forceNew = false) {
    const periodStart = insightsData.period.start;
    const periodEnd = insightsData.period.end;

    // Check if we already have insights for this period
    if (!forceNew) {
      const existingInsight = await this.aiInsightRepo.findOne({
        where: {
          userId,
          periodStart,
          periodEnd,
        },
        order: { createdAt: 'DESC' },
      });

      if (existingInsight) {
        return {
          fullAnalysis: existingInsight.fullAnalysis,
          sections: existingInsight.sections,
          generatedAt: existingInsight.createdAt.toISOString(),
          cached: true,
        };
      }
    }

    // Check monthly limit (2 generations per month)
    const monthStart = dayjs(periodStart).startOf('month').format('YYYY-MM-DD');
    const monthEnd = dayjs(periodStart).endOf('month').format('YYYY-MM-DD');
    
    const monthlyCount = await this.aiInsightRepo.count({
      where: {
        userId,
        periodStart: Between(monthStart, monthEnd),
      },
    });

    if (monthlyCount >= 2 && forceNew) {
      throw new Error('Monthly limit reached. You can generate up to 2 AI insights per month. View existing insights or wait until next month.');
    }

    try {
      // Include sample descriptions in the prompt for better context
      const descriptionsContext = insightsData.sampleDescriptions && insightsData.sampleDescriptions.length > 0
        ? `\n**Sample Transactions:**\n${insightsData.sampleDescriptions.map((tx: any) => 
            `- ${tx.category}: ₹${tx.amount} - "${tx.description}"`
          ).join('\n')}\n`
        : '';

      const prompt = `You are a personal finance advisor AI inside a budgeting application(Ledgerly). 
Your job is to analyze the provided spending data and generate useful, 
accurate, and actionable insights based only on this data. Use a friendly, concise tone. Avoid jargon. Focus on what the user can 
do immediately to improve their finances.
===DATA===
**Period:** ${insightsData.period.start} to ${insightsData.period.end} (${insightsData.period.days} days)

**Summary:**
- Total Expense: ₹${insightsData.summary.totalExpense.toFixed(2)}
- Total Income: ₹${insightsData.summary.totalIncome.toFixed(2)}
- Net Cashflow: ₹${insightsData.summary.netCashflow.toFixed(2)}
- Average Daily Expense: ₹${insightsData.summary.avgDailyExpense.toFixed(2)}
- Transaction Count: ${insightsData.summary.transactionCount}

**Top Spending Categories:**
${insightsData.topCategories.slice(0, 5).map((cat: any, idx: number) => 
  `${idx + 1}. ${cat.categoryName}: ₹${cat.amount.toFixed(2)} (${cat.percentage.toFixed(1)}% of total)`
).join('\n')}
${descriptionsContext}
${insightsData.trends ? `**Trends (vs Previous Period):**
- Expense Change: ${insightsData.trends.expenseChangePercent > 0 ? '+' : ''}${insightsData.trends.expenseChangePercent.toFixed(1)}% (₹${insightsData.trends.expenseChange.toFixed(2)})
- Income Change: ${insightsData.trends.incomeChangePercent > 0 ? '+' : ''}${insightsData.trends.incomeChangePercent.toFixed(1)}% (₹${insightsData.trends.incomeChange.toFixed(2)})
- Avg Daily Expense Change: ₹${insightsData.trends.avgDailyExpenseChange.toFixed(2)}
` : ''}

${insightsData.anomalies.length > 0 ? `**Unusual Spending Days:**
${insightsData.anomalies.slice(0, 3).map((a: any) => 
  `- ${a.date}: ₹${a.amount.toFixed(2)} (${a.deviation.toFixed(1)}% above average)`
).join('\n')}
` : ''}

${insightsData.categoryComparison && insightsData.categoryComparison.length > 0 ? `**Biggest Category Changes:**
${insightsData.categoryComparison.slice(0, 5).map((cat: any) => 
  `- ${cat.categoryName}: ${cat.trend === 'increased' ? '↑' : cat.trend === 'decreased' ? '↓' : ''} ${cat.changePercent > 0 ? '+' : ''}${cat.changePercent.toFixed(1)}%`
).join('\n')}
` : ''}

Based on this data, provide:
1. **Overall Financial Health Assessment** (2-3 sentences)
2. **Key Observations** (3-4 bullet points about spending patterns, trends, or concerns)
3. **Actionable Recommendations** (4-5 specific, practical suggestions to improve financial health)
4. **Budget Suggestions** (specific categories where the user should set or adjust budgets)
5. **Predictions** (what might happen next month if current trends continue)
`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful personal finance advisor who provides clear, actionable advice based on spending data.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const aiResponse = completion.choices[0]?.message?.content || 'Unable to generate insights at this time.';

      // Parse the response into structured sections
      const sections = this.parseAIResponse(aiResponse);

      // Save to database
      const insight = this.aiInsightRepo.create({
        userId,
        periodStart,
        periodEnd,
        fullAnalysis: aiResponse,
        sections,
        insightsSnapshot: insightsData,
      });

      await this.aiInsightRepo.save(insight);

      return {
        fullAnalysis: aiResponse,
        sections,
        generatedAt: insight.createdAt.toISOString(),
        cached: false,
      };
    } catch (error) {
      console.error('Error generating AI insights:', error);
      throw new Error('Failed to generate AI insights. Please try again later.');
    }
  }

  async getStoredAIInsights(userId: string, periodStart: string, periodEnd: string) {
    const insight = await this.aiInsightRepo.findOne({
      where: {
        userId,
        periodStart,
        periodEnd,
      },
      order: { createdAt: 'DESC' },
    });

    if (!insight) {
      return null;
    }

    return {
      fullAnalysis: insight.fullAnalysis,
      sections: insight.sections,
      generatedAt: insight.createdAt.toISOString(),
      cached: true,
    };
  }

  async getMonthlyAIUsage(userId: string, month: string, year: string) {
    const monthStart = dayjs(`${year}-${month}-01`).startOf('month').format('YYYY-MM-DD');
    const monthEnd = dayjs(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD');
    
    const count = await this.aiInsightRepo.count({
      where: {
        userId,
        periodStart: Between(monthStart, monthEnd),
      },
    });

    return {
      used: count,
      limit: 2,
      remaining: Math.max(0, 2 - count),
    };
  }

  async listStoredAIInsights(userId: string, month: string, year: string) {
    const monthStart = dayjs(`${year}-${month}-01`).startOf('month').format('YYYY-MM-DD');
    const monthEnd = dayjs(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD');

    const insights = await this.aiInsightRepo.find({
      where: {
        userId,
        periodStart: Between(monthStart, monthEnd),
      },
      order: { createdAt: 'DESC' },
      select: ['id', 'periodStart', 'periodEnd', 'createdAt'],
    });

    return insights.map(i => ({
      id: i.id,
      periodStart: i.periodStart,
      periodEnd: i.periodEnd,
      createdAt: i.createdAt,
    }));
  }

  async getAIInsightById(userId: string, id: string) {
    const insight = await this.aiInsightRepo.findOne({ where: { id, userId } });
    if (!insight) return null;
    return {
      fullAnalysis: insight.fullAnalysis,
      sections: insight.sections,
      generatedAt: insight.createdAt.toISOString(),
      cached: true,
    };
  }

  private parseAIResponse(response: string) {
    const sections: any = {
      healthAssessment: '',
      keyObservations: [],
      recommendations: [],
      budgetSuggestions: [],
      predictions: '',
    };

    // Simple parsing logic - can be enhanced with more sophisticated regex
    const lines = response.split('\n').filter(line => line.trim());
    let currentSection = '';

    lines.forEach(line => {
      const lower = line.toLowerCase();
      
      if (lower.includes('financial health') || lower.includes('assessment')) {
        currentSection = 'healthAssessment';
      } else if (lower.includes('key observation') || lower.includes('observations')) {
        currentSection = 'keyObservations';
      } else if (lower.includes('recommendation') || lower.includes('suggestions') && !lower.includes('budget')) {
        currentSection = 'recommendations';
      } else if (lower.includes('budget')) {
        currentSection = 'budgetSuggestions';
      } else if (lower.includes('prediction') || lower.includes('forecast')) {
        currentSection = 'predictions';
      } else if (line.trim()) {
        // Add content to current section
        if (currentSection === 'healthAssessment' && !sections.healthAssessment) {
          sections.healthAssessment = line.trim();
        } else if (currentSection === 'healthAssessment') {
          sections.healthAssessment += ' ' + line.trim();
        } else if (currentSection === 'predictions' && !sections.predictions) {
          sections.predictions = line.trim();
        } else if (currentSection === 'predictions') {
          sections.predictions += ' ' + line.trim();
        } else if (line.trim().startsWith('-') || line.trim().startsWith('•') || /^\d+\./.test(line.trim())) {
          const cleanLine = line.replace(/^[-•\d.]\s*/, '').trim();
          if (currentSection === 'keyObservations') {
            sections.keyObservations.push(cleanLine);
          } else if (currentSection === 'recommendations') {
            sections.recommendations.push(cleanLine);
          } else if (currentSection === 'budgetSuggestions') {
            sections.budgetSuggestions.push(cleanLine);
          }
        }
      }
    });

    return sections;
  }
}
