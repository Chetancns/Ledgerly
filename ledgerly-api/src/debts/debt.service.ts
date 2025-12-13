// debts/debt.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import dayjs from 'dayjs';
import { Debt } from './debt.entity';
import { DebtUpdate } from './debt-update.entity';
import { Repayment } from './repayment.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Category } from 'src/categories/category.entity';
import { TransactionsService } from 'src/transactions/transaction.service';
import { CreateDebtDto, AddRepaymentDto, UpdateDebtDto } from './dto/debt.dto';

@Injectable()
export class DebtService {
  constructor(
    private transactionService: TransactionsService,
    @InjectRepository(Debt) private debtRepo: Repository<Debt>,
    @InjectRepository(DebtUpdate) private updateRepo: Repository<DebtUpdate>,
    @InjectRepository(Repayment) private repaymentRepo: Repository<Repayment>,
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

  /**
   * Create a new debt - supports both institutional and personal (lent/borrowed)
   */
  async createDebts(userId: string, body: CreateDebtDto) {
    const debtData: any = {
      userId,
      name: body.name,
      accountId: body.accountId || null,
      principal: parseFloat(body.principal),
      currentBalance: body.principal,
      role: body.role || 'institutional',
      counterpartyName: body.counterpartyName || null,
      dueDate: body.dueDate || null,
      notes: body.notes || null,
      paidAmount: '0',
      adjustmentTotal: '0',
      status: 'open',
    };

    // For institutional debts, include installment fields
    if (body.role === 'institutional' || !body.role) {
      debtData.installmentAmount = body.installmentAmount || '0';
      debtData.frequency = body.frequency || null;
      debtData.startDate = body.startDate || null;
      debtData.nextDueDate = body.startDate || null;
      debtData.term = body.term || null;
    }

    const debt = this.debtRepo.create(debtData);
    return this.debtRepo.save(debt);
  }

  /**
   * Add a repayment to a debt (for lent/borrowed debts)
   */
  async addRepayment(userId: string, debtId: string, dto: AddRepaymentDto) {
    const debt = await this.debtRepo.findOne({ where: { id: debtId, userId } });
    if (!debt) {
      throw new NotFoundException('Debt not found');
    }

    if (debt.role !== 'lent' && debt.role !== 'borrowed') {
      throw new BadRequestException('Repayments are only for lent/borrowed debts. Use catch-up for institutional debts.');
    }

    const repayment = this.repaymentRepo.create({
      debtId,
      amount: dto.amount,
      adjustmentAmount: dto.adjustmentAmount || '0',
      date: dto.date,
      notes: dto.notes,
    });

    await this.repaymentRepo.save(repayment);

    // Update debt paidAmount and adjustmentTotal
    debt.paidAmount = (parseFloat(debt.paidAmount) + parseFloat(dto.amount)).toFixed(2);
    if (dto.adjustmentAmount) {
      debt.adjustmentTotal = (parseFloat(debt.adjustmentTotal) + parseFloat(dto.adjustmentAmount)).toFixed(2);
    }

    // Calculate remaining: principal - paidAmount + adjustmentTotal
    const remaining = parseFloat(debt.principal.toString()) - parseFloat(debt.paidAmount) + parseFloat(debt.adjustmentTotal);
    
    // Update status
    if (remaining <= 0) {
      debt.status = 'settled';
    } else if (debt.dueDate && dayjs(debt.dueDate).isBefore(dayjs(), 'day')) {
      debt.status = 'overdue';
    } else {
      debt.status = 'open';
    }

    debt.currentBalance = Math.max(0, remaining).toFixed(2);
    await this.debtRepo.save(debt);

    return debt;
  }

  /**
   * Get all debts with calculated remaining amounts
   */
  async getDebt(userId: string, filters?: { role?: string; status?: string; counterpartyName?: string }) {
    const where: any = { userId };
    
    if (filters?.role) {
      where.role = filters.role;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.counterpartyName) {
      where.counterpartyName = filters.counterpartyName;
    }

    const debts = await this.debtRepo.find({
      where,
      relations: ['updates'],
    });

    return debts.map((d) => {
      let remaining = 0;
      let progress = 0;

      if (d.role === 'lent' || d.role === 'borrowed') {
        // For personal debts: remaining = principal - paidAmount + adjustmentTotal
        remaining = parseFloat(d.principal.toString()) - parseFloat(d.paidAmount) + parseFloat(d.adjustmentTotal);
        progress = d.principal > 0 ? (parseFloat(d.paidAmount) / d.principal) * 100 : 0;
      } else {
        // For institutional debts: use existing logic
        remaining = parseFloat(d.currentBalance);
        progress = d.principal > 0 ? ((d.principal - remaining) / d.principal) * 100 : 0;
      }

      return {
        ...d,
        remaining: Math.max(0, remaining).toFixed(2),
        progress: Math.min(100, Math.max(0, progress)).toFixed(2),
      };
    });
  }

  /**
   * Get repayments for a specific debt
   */
  async getRepayments(debtId: string) {
    return this.repaymentRepo.find({
      where: { debtId },
      order: { date: 'DESC' },
    });
  }

  async getDebtUpdates(id: string) {
    return this.updateRepo.find({
      where: { debtId: id },
      relations: ['transaction'],
    });
  }

  /**
   * Update debt details
   */
  async updateDebt(userId: string, debtId: string, dto: UpdateDebtDto) {
    const debt = await this.debtRepo.findOne({ where: { id: debtId, userId } });
    if (!debt) {
      throw new NotFoundException('Debt not found');
    }

    Object.assign(debt, dto);
    return this.debtRepo.save(debt);
  }

  async payEarly(debtId: string) {
    const debt = await this.debtRepo.findOne({ where: { id: debtId } });
    if (!debt) return null;

    const due = dayjs(debt.nextDueDate);
    const payDay = dayjs(new Date());

    // allow early payment only before next due
    if (payDay.isBefore(due, 'day')) {
      await this.applyDebtUpdate(debt, payDay.format('YYYY-MM-DD'));
      return debt;
    }

    throw new Error("❌ Cannot use early payment on or after due date, use normal process.");
  }
}
