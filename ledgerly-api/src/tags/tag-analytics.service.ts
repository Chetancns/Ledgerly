import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Tag } from '../tags/tag.entity';
import { Transaction } from '../transactions/transaction.entity';
import dayjs from 'dayjs';

@Injectable()
export class TagAnalyticsService {
  constructor(
    @InjectRepository(Tag)
    private tagRepo: Repository<Tag>,
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
  ) {}

  /**
   * Get spending by tag for a given period
   */
  async getSpendingByTag(
    userId: string,
    options?: {
      from?: string;
      to?: string;
      tagIds?: string[];
    },
  ) {
    const qb = this.transactionRepo
      .createQueryBuilder('transaction')
      .innerJoin('transaction.tags', 'tag')
      .where('transaction.userId = :userId', { userId })
      .andWhere('transaction.type = :type', { type: 'expense' });

    if (options?.from && options?.to) {
      qb.andWhere('transaction.transactionDate BETWEEN :from AND :to', {
        from: options.from,
        to: options.to,
      });
    }

    if (options?.tagIds && options.tagIds.length > 0) {
      qb.andWhere('tag.id IN (:...tagIds)', { tagIds: options.tagIds });
    }

    qb.select('tag.id', 'tagId')
      .addSelect('tag.name', 'tagName')
      .addSelect('tag.color', 'tagColor')
      .addSelect('COUNT(transaction.id)', 'transactionCount')
      .addSelect('SUM(CAST(transaction.amount AS DECIMAL))', 'totalSpent')
      .groupBy('tag.id')
      .addGroupBy('tag.name')
      .addGroupBy('tag.color')
      .orderBy('totalSpent', 'DESC');

    const results = await qb.getRawMany();

    return results.map((r) => ({
      tagId: r.tagId,
      tagName: r.tagName,
      tagColor: r.tagColor,
      transactionCount: parseInt(r.transactionCount, 10),
      totalSpent: parseFloat(r.totalSpent || 0),
    }));
  }

  /**
   * Get tag trends over time (monthly breakdown)
   */
  async getTagTrends(
    userId: string,
    tagId: string,
    options?: {
      months?: number; // Number of months to look back (default: 6)
    },
  ) {
    const monthsBack = options?.months || 6;
    const startDate = dayjs().subtract(monthsBack, 'month').startOf('month').format('YYYY-MM-DD');
    const endDate = dayjs().endOf('month').format('YYYY-MM-DD');

    const transactions = await this.transactionRepo
      .createQueryBuilder('transaction')
      .innerJoin('transaction.tags', 'tag')
      .where('transaction.userId = :userId', { userId })
      .andWhere('tag.id = :tagId', { tagId })
      .andWhere('transaction.transactionDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .orderBy('transaction.transactionDate', 'ASC')
      .getMany();

    // Group by month
    const monthlyData: Record<
      string,
      { expense: number; income: number; count: number }
    > = {};

    transactions.forEach((tx) => {
      const month = dayjs(tx.transactionDate).format('YYYY-MM');
      if (!monthlyData[month]) {
        monthlyData[month] = { expense: 0, income: 0, count: 0 };
      }

      const amount = parseFloat(tx.amount);
      if (tx.type === 'expense') {
        monthlyData[month].expense += amount;
      } else if (tx.type === 'income') {
        monthlyData[month].income += amount;
      }
      monthlyData[month].count += 1;
    });

    // Fill in missing months with zeros
    const trends: Array<{
      month: string;
      expense: number;
      income: number;
      transactionCount: number;
      netFlow: number;
    }> = [];
    for (let i = 0; i < monthsBack; i++) {
      const month = dayjs().subtract(i, 'month').format('YYYY-MM');
      trends.unshift({
        month,
        expense: monthlyData[month]?.expense || 0,
        income: monthlyData[month]?.income || 0,
        transactionCount: monthlyData[month]?.count || 0,
        netFlow: (monthlyData[month]?.income || 0) - (monthlyData[month]?.expense || 0),
      });
    }

    return trends;
  }

  /**
   * Get category breakdown for a specific tag
   */
  async getCategoryBreakdownByTag(
    userId: string,
    tagId: string,
    options?: {
      from?: string;
      to?: string;
    },
  ) {
    const qb = this.transactionRepo
      .createQueryBuilder('transaction')
      .innerJoin('transaction.tags', 'tag')
      .leftJoin('transaction.category', 'category')
      .where('transaction.userId = :userId', { userId })
      .andWhere('tag.id = :tagId', { tagId });

    if (options?.from && options?.to) {
      qb.andWhere('transaction.transactionDate BETWEEN :from AND :to', {
        from: options.from,
        to: options.to,
      });
    }

    qb.select('category.id', 'categoryId')
      .addSelect('category.name', 'categoryName')
      .addSelect('category.type', 'categoryType')
      .addSelect('COUNT(transaction.id)', 'transactionCount')
      .addSelect('SUM(CAST(transaction.amount AS DECIMAL))', 'totalAmount')
      .groupBy('category.id')
      .addGroupBy('category.name')
      .addGroupBy('category.type')
      .orderBy('totalAmount', 'DESC');

    const results = await qb.getRawMany();

    return results.map((r) => ({
      categoryId: r.categoryId || 'uncategorized',
      categoryName: r.categoryName || 'Uncategorized',
      categoryType: r.categoryType || 'expense',
      transactionCount: parseInt(r.transactionCount, 10),
      totalAmount: parseFloat(r.totalAmount || 0),
    }));
  }

  /**
   * Get tag comparison (compare multiple tags)
   */
  async compareTagSpending(
    userId: string,
    tagIds: string[],
    options?: {
      from?: string;
      to?: string;
    },
  ) {
    const results: Array<{
      tagId: string;
      tagName: string;
      tagColor: string;
      transactionCount: number;
      totalSpent: number;
    }> = [];

    for (const tagId of tagIds) {
      const tag = await this.tagRepo.findOne({
        where: { id: tagId, userId, isDeleted: false },
      });

      if (!tag) continue;

      const qb = this.transactionRepo
        .createQueryBuilder('transaction')
        .innerJoin('transaction.tags', 'tag')
        .where('transaction.userId = :userId', { userId })
        .andWhere('tag.id = :tagId', { tagId })
        .andWhere('transaction.type = :type', { type: 'expense' });

      if (options?.from && options?.to) {
        qb.andWhere('transaction.transactionDate BETWEEN :from AND :to', {
          from: options.from,
          to: options.to,
        });
      }

      qb.select('COUNT(transaction.id)', 'count')
        .addSelect('SUM(CAST(transaction.amount AS DECIMAL))', 'total');

      const result = await qb.getRawOne();

      results.push({
        tagId: tag.id,
        tagName: tag.name,
        tagColor: tag.color,
        transactionCount: parseInt(result?.count || 0, 10),
        totalSpent: parseFloat(result?.total || 0),
      });
    }

    return results.sort((a, b) => b.totalSpent - a.totalSpent);
  }

  /**
   * Get tag insights summary
   */
  async getTagInsightsSummary(
    userId: string,
    options?: {
      from?: string;
      to?: string;
    },
  ) {
    const start = options?.from || dayjs().startOf('month').format('YYYY-MM-DD');
    const end = options?.to || dayjs().endOf('month').format('YYYY-MM-DD');

    // Get all tags with spending data
    const spendingByTag = await this.getSpendingByTag(userId, { from: start, to: end });

    // Calculate totals
    const totalTransactions = spendingByTag.reduce((sum, tag) => sum + tag.transactionCount, 0);
    const totalSpent = spendingByTag.reduce((sum, tag) => sum + tag.totalSpent, 0);

    // Find top tag
    const topTag = spendingByTag.length > 0 ? spendingByTag[0] : null;

    // Get tags with no transactions in this period
    const allTags = await this.tagRepo.find({
      where: { userId, isDeleted: false },
    });

    const usedTagIds = new Set(spendingByTag.map((t) => t.tagId));
    const unusedTags = allTags.filter((tag) => !usedTagIds.has(tag.id));

    return {
      period: { start, end },
      summary: {
        totalTags: allTags.length,
        usedTags: spendingByTag.length,
        unusedTags: unusedTags.length,
        totalTransactions,
        totalSpent,
      },
      topTag,
      spendingByTag: spendingByTag.slice(0, 10), // Top 10 tags
      unusedTags: unusedTags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
      })),
    };
  }
}
