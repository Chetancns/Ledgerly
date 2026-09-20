// src/recurring/recurring.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecurringTransaction } from './recurring.entity';
import dayjs from 'dayjs';
import { TransactionsService } from 'src/transactions/transaction.service';
import { Tag } from 'src/tags/tag.entity';
import { Transaction } from 'src/transactions/transaction.entity';

interface CreateRecurringDto extends Partial<RecurringTransaction> {
  tagIds?: string[];
}

@Injectable()
export class RecurringService {
  constructor(
    @InjectRepository(RecurringTransaction)
    private recRepo: Repository<RecurringTransaction>,
    @InjectRepository(Tag)
    private tagRepo: Repository<Tag>,
    @InjectRepository(Transaction)
    private txRepo: Repository<Transaction>,
    private txService: TransactionsService
  ) {}

// 🧩 CREATE
  async create(data: CreateRecurringDto) {
    // Handle tags if provided
    let tags: Tag[] = [];
    if (data.tagIds && data.tagIds.length > 0) {
      tags = await this.tagRepo.find({
        where: data.tagIds.map(id => ({ id, userId: data.userId })),
      });
      if (tags.length !== data.tagIds.length) {
        throw new NotFoundException('One or more tags not found');
      }
    }

    // Convert empty strings to null for UUID fields
    const toAccountId = data.toAccountId === '' ? null : data.toAccountId;

    const { tagIds: _, ...recData } = data;
    const rec = this.recRepo.create({ ...recData, toAccountId, tags });
    return await this.recRepo.save(rec);
  }

  // 🔍 GET ALL by user
  async findAll(userId: string) {
    // Load recurring transactions with tags using QueryBuilder to avoid junction table alias issues
    const recurrings = await this.recRepo
      .createQueryBuilder('recurring')
      .leftJoinAndSelect('recurring.tags', 'tags')
      .where('recurring.userId = :userId', { userId })
      .orderBy('recurring.createdAt', 'DESC')
      .getMany();
    
    return recurrings;
  }

  // 🔍 GET ONE
  async findOne(id: string, userId: string) {
    const rec = await this.recRepo.findOne({ 
      where: { id, userId },
    });
    if (!rec) throw new NotFoundException('Recurring transaction not found');
    return rec;
  }

  // ✏️ UPDATE
  async update(id: string, userId: string, data: CreateRecurringDto) {
    const rec = await this.findOne(id, userId);
    
    // Handle tags update if provided
    if (data.tagIds !== undefined) {
      if (data.tagIds && data.tagIds.length > 0) {
        const tags = await this.tagRepo.find({
          where: data.tagIds.map(tagId => ({ id: tagId, userId })),
        });
        if (tags.length !== data.tagIds.length) {
          throw new NotFoundException('One or more tags not found');
        }
        rec.tags = tags;
      } else {
        rec.tags = [];
      }
    }
    
    // Convert empty strings to null for UUID fields
    const toAccountId = data.toAccountId === '' ? null : data.toAccountId;
    
    const { tagIds: _, ...recData } = data;
    Object.assign(rec, { ...recData, toAccountId });
    return await this.recRepo.save(rec);
  }

  // ❌ DELETE
  async delete(id: string, userId: string) {
    const rec = await this.findOne(id, userId);
    await this.recRepo.remove(rec);
    return { message: 'Recurring transaction deleted' };
  }

  // 🕑 PROCESS DUE (auto transactions)
  // Runs at 2:00 AM in the configured timezone (defaults to UTC).
  // Set env var CRON_TIMEZONE to your region, e.g., 'Asia/Kolkata' or 'America/Los_Angeles'.
  @Cron('0 2 * * *', { timeZone: process.env.CRON_TIMEZONE || 'UTC' }) // 2:00 AM daily
  async processDue() {
    console.log('Processing due recurring transactions...');
    const today = dayjs().format('YYYY-MM-DD');

    const due = await this.recRepo.find({
      where: { nextOccurrence: today, status: 'active' }, // ✅ skip paused
    });

    for (const r of due) {
      await this.createTransactionFromRecurring(r, today);
    }
    console.log(`Processed ${due.length} recurring transactions.`); 
  }

  // 🎯 MANUAL TRIGGER - Process a recurring transaction immediately
  async triggerRecurring(id: string, userId: string) {
    const rec = await this.findOne(id, userId);
    
    if (rec.status !== 'active') {
      throw new NotFoundException('Cannot trigger a paused recurring transaction');
    }

    const today = dayjs().format('YYYY-MM-DD');
    const duplicateThisMonth = await this.txRepo
      .createQueryBuilder('tx')
      .where('tx.userId = :userId', { userId })
      .andWhere('tx.accountId IS NOT DISTINCT FROM :accountId', { accountId: rec.accountId ?? null })
      .andWhere('tx.categoryId IS NOT DISTINCT FROM :categoryId', { categoryId: rec.categoryId ?? null })
      .andWhere('tx.toAccountId IS NOT DISTINCT FROM :toAccountId', { toAccountId: rec.toAccountId ?? null })
      .andWhere('tx.type = :type', { type: rec.type })
      .andWhere('tx.amount = :amount', { amount: rec.amount })
      .andWhere('COALESCE(tx.description, \'\') = :description', { description: rec.description ?? '' })
      .andWhere('tx.transactionDate >= :startOfMonth', { startOfMonth: dayjs(today).startOf('month').format('YYYY-MM-DD') })
      .andWhere('tx.transactionDate <= :endOfMonth', { endOfMonth: dayjs(today).endOf('month').format('YYYY-MM-DD') })
      .getOne();

    if (duplicateThisMonth) {
      throw new BadRequestException('This recurring transaction was already triggered this month.');
    }

    await this.createTransactionFromRecurring(rec, today, true); // Pass true for manual trigger
    
    return { message: 'Recurring transaction triggered successfully' };
  }

  // 🔧 HELPER - Create a transaction from recurring settings
  private async createTransactionFromRecurring(r: RecurringTransaction, date: string, isManualTrigger = false) {
    // Load tags separately to avoid junction table query issues in findAll
    const recWithTags = await this.recRepo.findOne({
      where: { id: r.id },
      relations: ['tags'],
    });
    
    const tagIds = recWithTags?.tags?.map(t => t.id) || [];

    await this.txService.create({
      userId: r.userId,
      accountId: r.accountId,
      categoryId: r.categoryId,
      amount: r.amount,
      type: r.type,
      transactionDate: date,
      description: r.description,
      toAccountId: r.toAccountId, // for transfers/savings
      tagIds: tagIds.length > 0 ? tagIds : undefined,
    });

    // bump nextOccurrence
    // For manual triggers, use the scheduled nextOccurrence to preserve the regular schedule
    // For automatic processing, use the transaction date (which is the nextOccurrence date)
    const baseDate = isManualTrigger ? r.nextOccurrence : date;
    let next = dayjs(baseDate);
    if (r.frequency === 'daily') next = next.add(1, 'day');
    if (r.frequency === 'weekly') next = next.add(1, 'week');
    if (r.frequency === 'biweekly') next = next.add(2, 'week');
    if (r.frequency === 'monthly') next = next.add(1, 'month');
    if (r.frequency === 'yearly') next = next.add(1, 'year');

    await this.recRepo.update(r.id, {
      nextOccurrence: next.format('YYYY-MM-DD'),
    });
  }

  async revertLastManualTrigger(id: string, userId: string) {
    const rec = await this.findOne(id, userId);
    const frequencyUnit = rec.frequency === 'daily'
      ? 'day'
      : rec.frequency === 'weekly'
      ? 'week'
      : rec.frequency === 'biweekly'
      ? 'week'
      : rec.frequency === 'monthly'
      ? 'month'
      : 'year';
    const frequencyStep = rec.frequency === 'biweekly' ? 2 : 1;
    const previousOccurrence = dayjs(rec.nextOccurrence).subtract(frequencyStep, frequencyUnit as dayjs.ManipulateType).format('YYYY-MM-DD');

    const txToDelete = await this.txRepo
      .createQueryBuilder('tx')
      .where('tx.userId = :userId', { userId })
      .andWhere('tx.accountId IS NOT DISTINCT FROM :accountId', { accountId: rec.accountId ?? null })
      .andWhere('tx.categoryId IS NOT DISTINCT FROM :categoryId', { categoryId: rec.categoryId ?? null })
      .andWhere('tx.toAccountId IS NOT DISTINCT FROM :toAccountId', { toAccountId: rec.toAccountId ?? null })
      .andWhere('tx.type = :type', { type: rec.type })
      .andWhere('tx.amount = :amount', { amount: rec.amount })
      .andWhere('COALESCE(tx.description, \'\') = :description', { description: rec.description ?? '' })
      .andWhere('tx.transactionDate = :txDate', { txDate: dayjs().format('YYYY-MM-DD') })
      .orderBy('tx.createdAt', 'DESC')
      .getOne();

    if (!txToDelete) {
      throw new NotFoundException('No recent trigger found to revert for this recurring transaction.');
    }

    await this.txService.delete(userId, txToDelete.id);
    await this.recRepo.update(rec.id, { nextOccurrence: previousOccurrence });
    return { message: 'Last recurring trigger reverted successfully' };
  }
}
