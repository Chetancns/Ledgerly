// debts/debt.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import dayjs from 'dayjs';
import { Debt } from './debt.entity';
import { DebtUpdate } from './debt-update.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Category } from 'src/categories/category.entity';
import { TransactionsService } from 'src/transactions/transaction.service';

@Injectable()
export class DebtService {
  constructor(
    private transactionService: TransactionsService,
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
  const tx = this.transactionService.create({
    userId: debt.userId,
    type: 'expense',
    accountId: debt.accountId,
    categoryId: await this.GetCategoryId(debt.userId),
    amount: debt.installmentAmount,
    transactionDate: new Date(dueDate).toISOString(),
    description: `${debt.name} Payment`,
  });

  const update = this.updateRepo.create({
    debtId: debt.id,
    updateDate: dueDate,
    transactionId: (await tx).id,
    status: 'paid',
  });
  await this.updateRepo.save(update);

  // reduce balance (but not principal)
  debt.currentBalance = (parseFloat(debt.currentBalance.toString()) - parseFloat(debt.installmentAmount.toString())).toFixed(2);

  // next due date
  debt.nextDueDate = this.getNextDueDate(debt.startDate, debt.frequency, dueDate).format('YYYY-MM-DD');

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
      order: { updateDate: 'DESC' },
    });
    if (lastUpdate) {
      nextDue = this.getNextDueDate(debt.startDate, debt.frequency, lastUpdate.updateDate);
    }

    // Loop until we reach today
    while (nextDue.isBefore(today, 'day')) {
      const dueStr = nextDue.format('YYYY-MM-DD');

      const alreadyApplied = await this.updateRepo.findOne({ where: { debtId: debt.id, updateDate: dueStr } });
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
      type: "expense"
    },
  });

  if (cat) {
    return cat.id;
  }

  // Create a new category if not found
  const newCat = this.cxRepo.create({
    name: "Debt Payment",
    userId: userId,
    type: "expense"
  });

  const savedCat = await this.cxRepo.save(newCat);
  return savedCat.id;
}
 async createDebts(userId: string, body: any) {
  const debt = this.debtRepo.create({
    userId,
    name: body.name,
    accountId: body.accountId,
    startDate: body.startDate,
    frequency: body.frequency,
    installmentAmount: body.installmentAmount,
    principal: body.principal, // 👈 original principal
    currentBalance: body.currentBalance ?? body.principal, // default = principal
    term: body.term ?? null,
    nextDueDate: body.startDate,
  });

  return this.debtRepo.save(debt);
}

 
 async getDebt(userId: string) {
  const debts = await this.debtRepo.find({
    where: { userId },
    relations: ['updates'],
  });

  return debts.map((d) => ({
    ...d,
    progress: d.principal > 0 ? ((d.principal -Number( d.currentBalance)) / d.principal) * 100 : 0,
  }));
}
 async getDebtUpdates(id:string){
  return this.updateRepo.find({
    where:{debtId:id},
    relations:['transaction'],
  });
 }
 async payEarly(debtId: string) {
  const debt = await this.debtRepo.findOne({ where: { id: debtId } });
  if (!debt) return null;

  const due = dayjs(debt.nextDueDate);
  const payDay = dayjs(new Date());

  // allow early payment only before next due
  if (payDay.isBefore(due, 'day')) {
    await this.applyDebtUpdate(debt, payDay.format('YYYY-MM-DD')); // convert back to native Date if needed
    return debt;
  }

  throw new Error("❌ Cannot use early payment on or after due date, use normal process.");
}

}
