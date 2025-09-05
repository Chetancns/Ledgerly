import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecurringTransaction } from './recurring.entity';
import { Transaction } from '../transactions/transaction.entity';
import dayjs from 'dayjs';

@Injectable()
export class RecurringService {
  constructor(
    @InjectRepository(RecurringTransaction) private recRepo: Repository<RecurringTransaction>,
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
  ) {}

  @Cron('0 2 * * *') // 2:00 AM daily
  async processDue() {
    const today = dayjs().format('YYYY-MM-DD');
    const due = await this.recRepo.find({ where: { nextOccurrence: today } });

    for (const r of due) {
      await this.txRepo.save(this.txRepo.create({
        userId: r.userId,
        accountId: r.accountId,
        categoryId: r.categoryId,
        amount: r.amount,
        type: r.type,
        transactionDate: today,
        description: r.description,
      }));

      // bump nextOccurrence
      let next = dayjs(today);
      if (r.frequency === 'daily') next = next.add(1, 'day');
      if (r.frequency === 'weekly') next = next.add(1, 'week');
      if (r.frequency === 'monthly') next = next.add(1, 'month');
      if (r.frequency === 'yearly') next = next.add(1, 'year');

      await this.recRepo.update(r.id, { nextOccurrence: next.format('YYYY-MM-DD') });
    }
  }
}
