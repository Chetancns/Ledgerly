// src/recurring/recurring.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecurringTransaction } from './recurring.entity';
import dayjs from 'dayjs';
import { TransactionsService } from 'src/transactions/transaction.service';

@Injectable()
export class RecurringService {
  constructor(
    @InjectRepository(RecurringTransaction)
    private recRepo: Repository<RecurringTransaction>,
    private txService: TransactionsService
  ) {}

  // 🧩 CREATE
  async create(data: Partial<RecurringTransaction>) {
    const rec = this.recRepo.create(data);
    return await this.recRepo.save(rec);
  }

  // 🔍 GET ALL by user
  async findAll(userId: string) {
    return await this.recRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  // 🔍 GET ONE
  async findOne(id: string, userId: string) {
    const rec = await this.recRepo.findOne({ where: { id, userId } });
    if (!rec) throw new NotFoundException('Recurring transaction not found');
    return rec;
  }

  // ✏️ UPDATE
  async update(id: string, userId: string, data: Partial<RecurringTransaction>) {
    const rec = await this.findOne(id, userId);
    Object.assign(rec, data);
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
      await this.txService.create({
        userId: r.userId,
        accountId: r.accountId,
        categoryId: r.categoryId,
        amount: r.amount,
        type: r.type,
        transactionDate: today,
        description: r.description,
      });

      // bump nextOccurrence
      let next = dayjs(today);
      if (r.frequency === 'daily') next = next.add(1, 'day');
      if (r.frequency === 'weekly') next = next.add(1, 'week');
      if (r.frequency === 'monthly') next = next.add(1, 'month');
      if (r.frequency === 'yearly') next = next.add(1, 'year');

      await this.recRepo.update(r.id, {
        nextOccurrence: next.format('YYYY-MM-DD'),
      });
    }
    console.log(`Processed ${due.length} recurring transactions.`); 
  }
}
