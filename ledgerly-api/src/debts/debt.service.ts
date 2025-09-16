// debts/debt.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import dayjs from 'dayjs';
import { Debt } from './debt.entity';
import { DebtUpdate } from './debt-update.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Category } from 'src/categories/category.entity';

@Injectable()
export class DebtService {
  constructor(
    @InjectRepository(Debt) private debtRepo: Repository<Debt>,
    @InjectRepository(DebtUpdate) private updateRepo: Repository<DebtUpdate>,
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
    @InjectRepository(Category) private cxRepo: Repository<Category>,
  ) {}

  /** Generate the next due date based on frequency */
  private getNextDueDate(start: string, frequency: string, last?: string) {
    let base = last ? dayjs(last) : dayjs(start);

    switch (frequency) {
      case 'weekly':
        return base.add(1, 'week');
      case 'biweekly':
        return base.add(2, 'week');
      case 'monthly':
        return base.add(1, 'month');
      default:
        return base;
    }
  }

  /** Apply a debt update (create transaction + reduce balance) */
  private async applyDebtUpdate(debt: Debt, dueDate: string) {
    const update = this.updateRepo.create({
      debtId: debt.id,
      dueDate,
      applied: true,
    });
    await this.updateRepo.save(update);
    const cat = this.GetCategoryId(debt.userId);
    //Insert transaction
    const tx = this.txRepo.create({
      userId:debt.userId,
      type: 'expense',
      accountId:debt.accountId,
      categoryId:await cat,
      amount: debt.installmentAmount,
      transactionDate: new Date(dueDate).toISOString(),
      description: `${debt.name} Payment`,
    });
    await this.txRepo.save(tx);
 
    //Update balance
    const newBalance = parseFloat(debt.currentBalance) - parseFloat(debt.installmentAmount);
    debt.currentBalance = newBalance.toFixed(2);
    await this.debtRepo.save(debt);
  }

  /** Catch-up process: find missed due dates and apply them */
  async catchUpDebt(debtId: string) {
    const debt = await this.debtRepo.findOne({ where: { id: debtId } });
    if (!debt) return null;

    let nextDue = dayjs(debt.startDate);
    const today = dayjs();

    // Find last applied update
    const lastUpdate = await this.updateRepo.findOne({
      where: { debtId: debt.id },
      order: { dueDate: 'DESC' },
    });
    if (lastUpdate) {
      nextDue = this.getNextDueDate(debt.startDate, debt.frequency, lastUpdate.dueDate);
    }

    // Loop until we reach today
    while (nextDue.isBefore(today, 'day')) {
      const dueStr = nextDue.format('YYYY-MM-DD');

      const alreadyApplied = await this.updateRepo.findOne({ where: { debtId: debt.id, dueDate: dueStr } });
      if (!alreadyApplied) {
        await this.applyDebtUpdate(debt, dueStr);
      }

      nextDue = this.getNextDueDate(debt.startDate, debt.frequency, dueStr);
    }

    return this.debtRepo.findOne({ where: { id: debt.id }, relations: ['updates'] });
  }

  /** Catch-up all debts for a user */
  async catchUpAllDebts(userId: string) {
    const debts = await this.debtRepo.find({ where: { userId } });
    for (const debt of debts) {
      await this.catchUpDebt(debt.id);
    }
    return this.debtRepo.find({ where: { userId }, relations: ['updates'] });
  }

  async GetCategoryId(userId: string): Promise<string> {
  // Try to find the category
  const cat = await this.cxRepo.findOne({
    where: {
      userId: userId,
      name: "Debt Payment",
    },
  });

  if (cat) {
    return cat.id;
  }

  // Create a new category if not found
  const newCat = this.cxRepo.create({
    name: "Debt Payment",
    userId: userId,
  });

  const savedCat = await this.cxRepo.save(newCat);
  return savedCat.id;
}
 async createDebts(userId:string,body:any){
  const debt = this.debtRepo.create({
        userId,
        name: body.name,
        accountId: body.accountId,
        startDate: body.startDate,
        frequency: body.frequency, // 'weekly' | 'biweekly' | 'monthly'
        installmentAmount: body.installmentAmount,
        currentBalance: body.currentBalance,
      });
  
      return this.debtRepo.save(debt);
 }
 async getDebt(userId:string){
  return this.debtRepo.find({
      where: { userId },
      relations: ['updates'],
    });
 }
}
