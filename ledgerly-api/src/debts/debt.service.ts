// debts/debt.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import dayjs from 'dayjs';
import { Debt } from './debt.entity';
import { DebtUpdate } from './debt-update.entity';
import { PersonName } from './person-name.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Category } from 'src/categories/category.entity';
import { TransactionsService } from 'src/transactions/transaction.service';

@Injectable()
export class DebtService {
  constructor(
    private transactionService: TransactionsService,
    @InjectRepository(Debt) private debtRepo: Repository<Debt>,
    @InjectRepository(DebtUpdate) private updateRepo: Repository<DebtUpdate>,
    @InjectRepository(PersonName) private personNameRepo: Repository<PersonName>,
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
    @InjectRepository(Category) private cxRepo: Repository<Category>,
  ) {}

  /** Generate the next due date based on frequency */
  private getNextDueDate(start: string, frequency: string, last?: string) {
    const base = last ? dayjs(last) : dayjs(start);

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
 private async applyDebtUpdate(debt: Debt, dueDate: string, amount: string, createTransaction = true, categoryId?: string) {
  let transactionId: string | null = null;

  if (createTransaction) {
    const txType = debt.debtType === 'lent' ? 'income' : 'expense';
    const txCategoryId = categoryId || await this.GetCategoryId(debt.userId, debt.debtType);
    
    const tx = this.transactionService.create({
      userId: debt.userId,
      type: txType,
      accountId: debt.accountId,
      categoryId: txCategoryId,
      amount: amount,
      transactionDate: new Date(dueDate).toISOString(),
      description: `${debt.name} Payment${debt.personName ? ` - ${debt.personName}` : ''}`,
    });

    transactionId = (await tx).id;
  }

  const update = this.updateRepo.create({
    debtId: debt.id,
    updateDate: dueDate,
    amount: amount,
    transactionId: transactionId || undefined,
    status: createTransaction ? 'paid' : 'pending',
  });
  await this.updateRepo.save(update);

  // reduce balance (but not principal)
  debt.currentBalance = (parseFloat(debt.currentBalance.toString()) - parseFloat(amount.toString())).toFixed(2);

  // Update next due date only for institutional debts with fixed frequency
  if (debt.debtType === 'institutional' && debt.frequency && debt.nextDueDate) {
    debt.nextDueDate = this.getNextDueDate(debt.startDate, debt.frequency, dueDate).format('YYYY-MM-DD');
  }

  await this.debtRepo.save(debt);
}
  /** Catch-up process: find missed due dates and apply them (only for institutional debts with fixed installments) */
  async catchUpDebt(debtId: string) {
    const debt = await this.debtRepo.findOne({ where: { id: debtId } });
    if (!debt) return null;

    // Catch-up only makes sense for institutional debts with fixed installments
    if (debt.debtType !== 'institutional' || !debt.frequency || !debt.installmentAmount) {
      return debt;
    }

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
        await this.applyDebtUpdate(debt, dueStr, debt.installmentAmount);
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

  async GetCategoryId(userId: string, debtType?: string): Promise<string> {
  // Try to find the category
  const categoryName = debtType === 'lent' ? 'Debt Collection' : 'Debt Payment';
  const categoryType = debtType === 'lent' ? 'income' : 'expense';
  
  const cat = await this.cxRepo.findOne({
    where: {
      userId: userId,
      name: categoryName,
      type: categoryType
    },
  });

  if (cat) {
    return cat.id;
  }

  // Create a new category if not found
  const newCat = this.cxRepo.create({
    name: categoryName,
    userId: userId,
    type: categoryType
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
    frequency: body.frequency || null,
    installmentAmount: body.installmentAmount || null,
    principal: body.principal,
    currentBalance: body.currentBalance ?? body.principal,
    term: body.term ?? null,
    nextDueDate: body.nextDueDate || body.startDate || null,
    debtType: body.debtType || 'institutional',
    personName: body.personName || null,
  });

  const savedDebt = await this.debtRepo.save(debt);

  // Save person name if provided for borrowed/lent debts
  if (body.personName && (body.debtType === 'borrowed' || body.debtType === 'lent')) {
    await this.savePersonName(userId, body.personName);
  }

  // Create initial transaction if requested
  if (body.createTransaction && body.categoryId) {
    // Transaction type logic:
    // - borrowed debt creation: expense (money going out to repay someone)
    // - lent debt creation: expense (money going out when lending to someone)
    // Note: Payments on lent debts will be income (when they pay you back)
    const txType = 'expense'; // Initial transaction is always expense (money going out)
    await this.transactionService.create({
      userId,
      type: txType,
      accountId: body.accountId,
      categoryId: body.categoryId,
      amount: body.principal,
      transactionDate: new Date(body.startDate).toISOString(),
      description: `${body.name}${body.personName ? ` - ${body.personName}` : ''}`,
    });
  }

  return savedDebt;
}

 
 async getDebt(userId: string, debtType?: string) {
  const where: any = { userId };
  if (debtType) {
    where.debtType = debtType;
  }
  
  const debts = await this.debtRepo.find({
    where,
    relations: ['updates'],
    order: { nextDueDate: 'ASC' },
  });

  return debts.map((d) => ({
    ...d,
    progress: d.principal > 0 ? ((d.principal - Number(d.currentBalance)) / d.principal) * 100 : 0,
  }));
}

  async savePersonName(userId: string, name: string) {
    // Check if name already exists for this user
    const existing = await this.personNameRepo.findOne({
      where: { userId, name },
    });

    if (existing) {
      return existing;
    }

    const personName = this.personNameRepo.create({ userId, name });
    return this.personNameRepo.save(personName);
  }

  async getPersonNames(userId: string, search?: string) {
    const where: any = { userId };
    if (search) {
      where.name = ILike(`%${search}%`);
    }

    const names = await this.personNameRepo.find({
      where,
      order: { name: 'ASC' },
    });

    return names.map(n => n.name);
  }

  async payInstallment(debtId: string, amount?: number, createTransaction = true, categoryId?: string) {
    const debt = await this.debtRepo.findOne({ where: { id: debtId } });
    if (!debt) return null;

    // For institutional debts, use the fixed installment amount if not provided
    const paymentAmount = amount 
      ? amount.toString() 
      : (debt.installmentAmount || debt.currentBalance);

    const today = dayjs().format('YYYY-MM-DD');
    await this.applyDebtUpdate(debt, today, paymentAmount, createTransaction, categoryId);
    
    return this.debtRepo.findOne({ where: { id: debtId }, relations: ['updates'] });
  }

 async getDebtUpdates(id:string){
  return this.updateRepo.find({
    where:{debtId:id},
    relations:['transaction'],
    order: { updateDate: 'DESC' },
  });
 }

 async deleteDebtUpdate(updateId: string, userId: string) {
  // Find the update with its debt
  const update = await this.updateRepo.findOne({
    where: { id: updateId },
    relations: ['debt'],
  });

  if (!update) {
    throw new Error("Debt update not found");
  }

  // Verify the debt belongs to the user
  const debt = await this.debtRepo.findOne({
    where: { id: update.debtId, userId },
  });

  if (!debt) {
    throw new Error("Unauthorized or debt not found");
  }

  // Save transaction ID for deletion after removing the debt_update
  const transactionIdToDelete = update.transactionId;

  // Restore the balance (add back the payment amount)
  debt.currentBalance = (
    parseFloat(debt.currentBalance.toString()) + 
    parseFloat(update.amount.toString())
  ).toFixed(2);

  await this.debtRepo.save(debt);

  // Delete the update first (to remove the foreign key reference)
  await this.updateRepo.delete({ id: updateId });

  // Now delete the transaction if it exists
  if (transactionIdToDelete) {
    try {
      await this.txRepo.delete({ id: transactionIdToDelete });
    } catch (err) {
      console.error("Error deleting transaction:", err);
      // Transaction deletion failed, but debt_update is already deleted
      // This is acceptable as the main operation succeeded
    }
  }

  return { success: true, message: "Payment update deleted successfully" };
 }

 async payEarly(debtId: string) {
  const debt = await this.debtRepo.findOne({ where: { id: debtId } });
  if (!debt) return null;

  // Only institutional debts with fixed schedules support early payment
  if (debt.debtType !== 'institutional' || !debt.nextDueDate || !debt.installmentAmount) {
    throw new Error("❌ Early payment only applies to institutional debts with fixed schedules.");
  }

  const due = dayjs(debt.nextDueDate);
  const payDay = dayjs(new Date());

  // allow early payment only before next due
  if (payDay.isBefore(due, 'day')) {
    await this.applyDebtUpdate(debt, payDay.format('YYYY-MM-DD'), debt.installmentAmount);
    return debt;
  }

  throw new Error("❌ Cannot use early payment on or after due date, use normal process.");
}

 async deleteDebt(debtId: string, userId: string) {
  // Find the debt
  const debt = await this.debtRepo.findOne({
    where: { id: debtId, userId },
  });

  if (!debt) {
    throw new Error("Debt not found or unauthorized");
  }

  // Check if there are any payment updates
  const updates = await this.updateRepo.find({
    where: { debtId: debtId },
  });

  if (updates.length > 0) {
    throw new Error("Cannot delete debt with existing payment updates. Please delete all payment updates first.");
  }

  // Delete the debt
  await this.debtRepo.delete({ id: debtId });

  return { success: true, message: "Debt deleted successfully" };
 }

}
