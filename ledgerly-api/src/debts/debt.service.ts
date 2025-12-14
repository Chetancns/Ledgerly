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
import { CreateDebtDto, AddRepaymentDto, UpdateDebtDto, BatchRepaymentDto } from './dto/debt.dto';

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
      settlementGroupId: body.settlementGroupId || null,
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
    const savedDebt = await this.debtRepo.save(debt);

    // Create a transaction if explicitly requested OR if account is provided for lent/borrowed
    const shouldCreateTransaction = body.createTransaction === 'yes' || 
      ((body.role === 'lent' || body.role === 'borrowed') && body.accountId);

    if ((body.role === 'lent' || body.role === 'borrowed') && shouldCreateTransaction) {
      // Get category to determine transaction type
      const categoryId = body.categoryId || await this.GetCategoryId(userId);
      const category = await this.cxRepo.findOne({ where: { id: categoryId } });
      
      // For lent debts: always expense (money going out)
      // For borrowed debts: use category type (expense for items, income for cash)
      let transactionType: 'expense' | 'income';
      if (body.role === 'lent') {
        transactionType = 'expense';
      } else {
        // For borrowed, use category type
        transactionType = category?.type === 'income' ? 'income' : 'expense';
      }
      
      const description = body.role === 'lent' 
        ? `Lent to ${body.counterpartyName || 'someone'}: ${body.name}`
        : `Borrowed from ${body.counterpartyName || 'someone'}: ${body.name}`;

      await this.transactionService.create({
        userId,
        accountId: body.accountId || undefined,
        categoryId,
        amount: body.principal,
        type: transactionType,
        transactionDate: new Date().toISOString(),
        description,
      });
    }

    return savedDebt;
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
      transactionId: null, // Will be set if transaction is created
    });

    await this.repaymentRepo.save(repayment);

    // Update debt paidAmount and adjustmentTotal using string-based arithmetic for precision
    const currentPaidAmount = parseFloat(debt.paidAmount);
    const newPayment = parseFloat(dto.amount);
    debt.paidAmount = (currentPaidAmount + newPayment).toFixed(2);
    
    if (dto.adjustmentAmount) {
      const currentAdjustment = parseFloat(debt.adjustmentTotal);
      const newAdjustment = parseFloat(dto.adjustmentAmount);
      debt.adjustmentTotal = (currentAdjustment + newAdjustment).toFixed(2);
    }

    // Calculate remaining: principal - paidAmount + adjustmentTotal
    const principal = Number(debt.principal);
    const paidAmount = parseFloat(debt.paidAmount);
    const adjustmentTotal = parseFloat(debt.adjustmentTotal);
    const remaining = principal - paidAmount + adjustmentTotal;
    
    // Update status
    if (remaining <= 0) {
      debt.status = 'settled';
    } else if (debt.dueDate && dayjs(debt.dueDate).isBefore(dayjs(), 'day')) {
      debt.status = 'overdue';
    } else {
      debt.status = 'open';
    }

    // For personal debts, currentBalance represents the remaining amount
    debt.currentBalance = Math.max(0, remaining).toFixed(2);
    await this.debtRepo.save(debt);

    // Create a transaction if account is provided
    if (dto.accountId) {
      const transactionType = debt.role === 'lent' ? 'income' : 'expense';
      const description = debt.role === 'lent'
        ? `Repayment from ${debt.counterpartyName || 'someone'}: ${debt.name}`
        : `Repayment to ${debt.counterpartyName || 'someone'}: ${debt.name}`;

      const transaction = await this.transactionService.create({
        userId,
        accountId: dto.accountId,
        categoryId: await this.GetCategoryId(userId),
        amount: dto.amount,
        type: transactionType,
        transactionDate: dto.date,
        description,
      });

      // Store transaction ID in repayment
      repayment.transactionId = transaction.id;
      await this.repaymentRepo.save(repayment);
    }

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
        // currentBalance field stores the calculated remaining for display purposes
        const principal = Number(d.principal);
        const paidAmount = parseFloat(d.paidAmount);
        const adjustmentTotal = parseFloat(d.adjustmentTotal);
        remaining = principal - paidAmount + adjustmentTotal;
        progress = principal > 0 ? (paidAmount / principal) * 100 : 0;
      } else {
        // For institutional debts: currentBalance is actively maintained through catch-up
        // and represents the actual outstanding balance
        remaining = parseFloat(d.currentBalance);
        const principal = Number(d.principal);
        progress = principal > 0 ? ((principal - remaining) / principal) * 100 : 0;
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

  /**
   * Delete a debt - with proper reversal of transactions
   * NOTE: This should only be used for correcting errors, not for settling debts
   */
  async deleteDebt(userId: string, debtId: string) {
    const debt = await this.debtRepo.findOne({ 
      where: { id: debtId, userId },
      relations: ['updates']
    });
    
    if (!debt) {
      throw new NotFoundException('Debt not found');
    }

    // Get all repayments for this debt
    const repayments = await this.repaymentRepo.find({ where: { debtId } });

    // Delete all repayments first
    if (repayments.length > 0) {
      await this.repaymentRepo.remove(repayments);
    }

    // Delete all debt updates (for institutional debts)
    if (debt.updates && debt.updates.length > 0) {
      await this.updateRepo.remove(debt.updates);
    }

    // Note: Transactions created by debt/repayment are NOT automatically deleted
    // This is intentional to preserve financial history and account balances
    // Users should manually adjust transactions if needed

    // Delete the debt
    await this.debtRepo.remove(debt);

    return { message: 'Debt deleted successfully. Note: Associated transactions were not deleted.' };
  }

  /**
   * Get settlement groups for a user
   */
  async getSettlementGroups(userId: string) {
    const debts = await this.debtRepo.find({
      where: { userId },
      select: ['settlementGroupId'],
    });

    const uniqueGroups = [...new Set(
      debts
        .map(d => d.settlementGroupId)
        .filter(g => g && g.trim().length > 0)
    )];

    return uniqueGroups.map(group => ({
      id: group,
      name: group,
    }));
  }

  /**
   * Get debts by settlement group
   */
  async getDebtsBySettlementGroup(userId: string, settlementGroupId: string) {
    const debts = await this.debtRepo.find({
      where: { userId, settlementGroupId },
      relations: ['updates'],
    });

    return debts.map((d) => {
      let remaining = 0;
      let progress = 0;

      if (d.role === 'lent' || d.role === 'borrowed') {
        const principal = Number(d.principal);
        const paidAmount = parseFloat(d.paidAmount);
        const adjustmentTotal = parseFloat(d.adjustmentTotal);
        remaining = principal - paidAmount + adjustmentTotal;
        progress = principal > 0 ? (paidAmount / principal) * 100 : 0;
      } else {
        remaining = parseFloat(d.currentBalance);
        const principal = Number(d.principal);
        progress = principal > 0 ? ((principal - remaining) / principal) * 100 : 0;
      }

      return {
        ...d,
        remaining: Math.max(0, remaining).toFixed(2),
        progress: Math.min(100, Math.max(0, progress)).toFixed(2),
      };
    });
  }

  /**
   * Batch repayment - settle multiple debts at once
   */
  async batchRepayment(userId: string, dto: BatchRepaymentDto) {
    // Fetch all debts
    const debts = await this.debtRepo.find({
      where: { userId },
    });

    // Filter to only the requested debts
    const selectedDebts = debts.filter(d => dto.debtIds.includes(d.id));

    if (selectedDebts.length === 0) {
      throw new NotFoundException('No valid debts found');
    }

    // Calculate total remaining across all selected debts
    let totalRemaining = 0;
    const debtDetails = selectedDebts.map(d => {
      const principal = Number(d.principal);
      const paidAmount = parseFloat(d.paidAmount);
      const adjustmentTotal = parseFloat(d.adjustmentTotal);
      const remaining = principal - paidAmount + adjustmentTotal;
      totalRemaining += remaining;
      return {
        debt: d,
        remaining: Math.max(0, remaining),
      };
    });

    const paymentAmount = parseFloat(dto.amount);
    const adjustmentAmount = dto.adjustmentAmount ? parseFloat(dto.adjustmentAmount) : 0;

    // Distribute payment proportionally across debts
    let transactionCreated: Transaction | null = null;
    const settledDebts = [];

    for (const { debt, remaining } of debtDetails) {
      if (remaining <= 0) continue; // Skip already settled debts

      // Calculate this debt's share of the payment
      const proportion = totalRemaining > 0 ? remaining / totalRemaining : 0;
      const thisPayment = (paymentAmount * proportion).toFixed(2);
      const thisAdjustment = (adjustmentAmount * proportion).toFixed(2);

      // Create repayment record
      const repayment = this.repaymentRepo.create({
        debtId: debt.id,
        amount: thisPayment,
        adjustmentAmount: thisAdjustment,
        date: dto.date,
        notes: dto.notes || `Batch settlement (${selectedDebts.length} debts)`,
        transactionId: null, // Will be set if we create a transaction
      });

      // Update debt amounts
      debt.paidAmount = (parseFloat(debt.paidAmount) + parseFloat(thisPayment)).toFixed(2);
      debt.adjustmentTotal = (parseFloat(debt.adjustmentTotal) + parseFloat(thisAdjustment)).toFixed(2);

      // Recalculate remaining
      const principal = Number(debt.principal);
      const paidAmount = parseFloat(debt.paidAmount);
      const adjTotal = parseFloat(debt.adjustmentTotal);
      const newRemaining = principal - paidAmount + adjTotal;

      // Update status
      if (newRemaining <= 0) {
        debt.status = 'settled';
      } else if (debt.dueDate && dayjs(debt.dueDate).isBefore(dayjs(), 'day')) {
        debt.status = 'overdue';
      } else {
        debt.status = 'open';
      }

      debt.currentBalance = Math.max(0, newRemaining).toFixed(2);

      await this.repaymentRepo.save(repayment);
      await this.debtRepo.save(debt);

      // Only the first debt in batch creates the transaction (single transaction for all)
      if (!transactionCreated && dto.accountId && selectedDebts[0].id === debt.id) {
        // Determine transaction type based on first debt's role
        const transactionType = debt.role === 'lent' ? 'income' : 'expense';
        const description = `Batch settlement: ${selectedDebts.length} debts (${selectedDebts.map(d => d.name).join(', ')})`;

        transactionCreated = await this.transactionService.create({
          userId,
          accountId: dto.accountId,
          categoryId: await this.GetCategoryId(userId),
          amount: dto.amount, // Total amount, not distributed
          type: transactionType,
          transactionDate: dto.date,
          description,
        });

        // Store transaction ID in first repayment
        repayment.transactionId = transactionCreated.id;
        await this.repaymentRepo.save(repayment);
      }

      settledDebts.push({
        debtId: debt.id,
        debtName: debt.name,
        paymentApplied: thisPayment,
        adjustmentApplied: thisAdjustment,
        newStatus: debt.status,
        newRemaining: debt.currentBalance,
      });
    }

    return {
      message: `Successfully processed batch repayment for ${selectedDebts.length} debts`,
      totalAmount: dto.amount,
      adjustmentAmount: dto.adjustmentAmount || '0',
      transactionCreated: !!transactionCreated,
      transactionId: transactionCreated?.id,
      debts: settledDebts,
    };
  }

  /**
   * Delete a repayment - with proper reversal of debt and transaction
   */
  async deleteRepayment(userId: string, debtId: string, repaymentId: string) {
    const debt = await this.debtRepo.findOne({ where: { id: debtId, userId } });
    if (!debt) {
      throw new NotFoundException('Debt not found');
    }

    const repayment = await this.repaymentRepo.findOne({ where: { id: repaymentId, debtId } });
    if (!repayment) {
      throw new NotFoundException('Repayment not found');
    }

    // Reverse the debt calculations
    const repaymentAmount = parseFloat(repayment.amount);
    const adjustmentAmount = parseFloat(repayment.adjustmentAmount);

    debt.paidAmount = (parseFloat(debt.paidAmount) - repaymentAmount).toFixed(2);
    debt.adjustmentTotal = (parseFloat(debt.adjustmentTotal) - adjustmentAmount).toFixed(2);

    // Recalculate remaining
    const principal = Number(debt.principal);
    const paidAmount = parseFloat(debt.paidAmount);
    const adjustmentTotal = parseFloat(debt.adjustmentTotal);
    const remaining = principal - paidAmount + adjustmentTotal;

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

    // Delete associated transaction if one was created
    if (repayment.transactionId) {
      await this.txRepo.delete({ id: repayment.transactionId, userId });
    }

    // Delete the repayment
    await this.repaymentRepo.remove(repayment);

    return {
      message: 'Repayment deleted successfully',
      transactionDeleted: !!repayment.transactionId,
      debt: {
        id: debt.id,
        name: debt.name,
        paidAmount: debt.paidAmount,
        adjustmentTotal: debt.adjustmentTotal,
        currentBalance: debt.currentBalance,
        status: debt.status,
      },
    };
  }
}
