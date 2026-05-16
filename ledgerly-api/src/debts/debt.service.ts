import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import dayjs from 'dayjs';
import { Debt, DEBT_TYPES, DebtType } from './debt.entity';
import { DEBT_UPDATE_INTENTS, DebtUpdate, DebtUpdateIntent } from './debt-update.entity';
import { PersonName } from './person-name.entity';
import { Category } from 'src/categories/category.entity';
import { TransactionsService } from 'src/transactions/transaction.service';
import {
  CreateDebtDto,
  RecordDebtUpdateDto,
  UpdateDebtDto,
} from './dto/debt.dto';

type DebtWithUpdates = Debt & { updates: DebtUpdate[] };

type PersonLedgerDebtItem = {
  id: string;
  name: string;
  debtType: DebtType;
  status: Debt['status'];
  currentBalance: number;
  principal: number;
  reminderDate?: string | null;
  overdue: boolean;
  overdueReason?: string;
  lastPaymentDate?: string;
};

type PersonLedgerGroup = {
  personName: string;
  debtCount: number;
  totalOutstanding: number;
  totalPaid: number;
  totalBorrowedOutstanding: number;
  totalLentOutstanding: number;
  lastPaymentDate?: string;
  nextReminderDate?: string;
  overdueCount: number;
  lastActivityDate?: string;
  defaultAccountId?: string;
  preferredExpenseCategoryId?: string | null;
  preferredIncomeCategoryId?: string | null;
  debts: PersonLedgerDebtItem[];
};

type DuplicateCandidateGroup = {
  personName: string;
  normalizedName: string;
  debts: string[];
  labels: string[];
  totalOutstanding: number;
};

// Allow a one-cent tolerance so serialized currency values do not fail repayment checks because of rounding drift.
const PAYMENT_TOLERANCE = 0.01;

@Injectable()
export class DebtService {
  constructor(
    private readonly transactionService: TransactionsService,
    @InjectRepository(Debt) private readonly debtRepo: Repository<Debt>,
    @InjectRepository(DebtUpdate) private readonly updateRepo: Repository<DebtUpdate>,
    @InjectRepository(PersonName) private readonly personNameRepo: Repository<PersonName>,
    @InjectRepository(Category) private readonly categoryRepo: Repository<Category>,
  ) {}

  private toNumber(value: string | number | null | undefined): number {
    if (value === null || value === undefined || value === '') return 0;
    return Number(value);
  }

  private toMoney(value: string | number | null | undefined): string {
    return this.toNumber(value).toFixed(2);
  }

  private isInstitutional(debtType: DebtType): boolean {
    return debtType === 'institutional';
  }

  private isP2P(debtType: DebtType): boolean {
    return debtType === 'borrowed' || debtType === 'lent';
  }

  private getNextDueDate(start: string, frequency: Debt['frequency'], last?: string) {
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

  private normalizeDebtName(name?: string | null): string {
    return (name || '')
      .toLowerCase()
      .replace(/\d+/g, '')
      .replace(/[^a-z]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  private normalizePersonName(name?: string | null): string {
    return (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private buildDebtView(debt: DebtWithUpdates) {
    const updates = [...(debt.updates || [])].sort((a, b) => a.updateDate.localeCompare(b.updateDate));
    const paymentUpdates = updates.filter((update) => update.intent === 'payment');
    const totalPaid = paymentUpdates.reduce((sum, update) => sum + this.toNumber(update.amount), 0);
    const principal = this.toNumber(debt.principal);
    const currentBalance = this.toNumber(debt.currentBalance);
    const installmentAmount = debt.installmentAmount ? this.toNumber(debt.installmentAmount) : undefined;
    const lastPaymentDate = paymentUpdates.length > 0 ? paymentUpdates[paymentUpdates.length - 1].updateDate : undefined;
    const lastUpdateDate = updates.length > 0 ? updates[updates.length - 1].updateDate : undefined;
    const today = dayjs().startOf('day');
    let overdue = false;
    let overdueReason: 'scheduled-payment' | 'follow-up' | 'payment-inactivity' | undefined;
    let overdueDays = 0;

    if (debt.status === 'active') {
      if (this.isInstitutional(debt.debtType) && debt.nextDueDate) {
        const dueDate = dayjs(debt.nextDueDate);
        if (dueDate.isBefore(today, 'day')) {
          overdue = true;
          overdueReason = 'scheduled-payment';
          overdueDays = today.diff(dueDate, 'day');
        }
      }

      if (this.isP2P(debt.debtType)) {
        if (debt.reminderDate && dayjs(debt.reminderDate).isBefore(today, 'day')) {
          overdue = true;
          overdueReason = 'follow-up';
          overdueDays = today.diff(dayjs(debt.reminderDate), 'day');
        } else if (currentBalance > 0 && lastPaymentDate) {
          const inactivityDays = today.diff(dayjs(lastPaymentDate), 'day');
          if (inactivityDays >= 30) {
            overdue = true;
            overdueReason = 'payment-inactivity';
            overdueDays = inactivityDays;
          }
        }
      }
    }

    return {
      ...debt,
      principal,
      currentBalance,
      installmentAmount,
      progress: principal > 0 ? ((principal - currentBalance) / principal) * 100 : 0,
      totalPaid,
      lastPaymentDate,
      lastActivityDate: lastUpdateDate || debt.reminderDate || debt.nextDueDate || debt.startDate,
      overdue,
      overdueReason,
      overdueDays,
      requiresAttention: overdue || (debt.status === 'active' && currentBalance > 0 && this.isP2P(debt.debtType) && !debt.reminderDate),
      updates: updates.map((update) => ({
        ...update,
        amount: this.toNumber(update.amount),
      })),
    };
  }

  private ensureDebtType(value?: string): DebtType {
    if (!value) return 'institutional';
    if (!DEBT_TYPES.includes(value as DebtType)) {
      throw new BadRequestException(
        `Invalid debt type '${value}'. Must be one of: ${DEBT_TYPES.join(', ')}`,
      );
    }
    return value as DebtType;
  }

  private async getDebtOrThrow(debtId: string, userId: string) {
    const debt = await this.debtRepo.findOne({
      where: { id: debtId, userId },
      relations: ['updates', 'updates.transaction'],
    });

    if (!debt) {
      throw new NotFoundException('Debt not found');
    }

    return debt as DebtWithUpdates;
  }

  private validateCreateDebt(dto: CreateDebtDto) {
    const debtType = dto.debtType ?? 'institutional';

    if (!dto.name?.trim()) {
      throw new BadRequestException('Debt name is required');
    }

    if (this.isInstitutional(debtType)) {
      if (!dto.frequency) {
        throw new BadRequestException('Frequency is required for institutional debts');
      }
      if (!dto.installmentAmount || dto.installmentAmount <= 0) {
        throw new BadRequestException('Installment amount is required for institutional debts');
      }
    }

    if (this.isP2P(debtType) && !dto.personName?.trim()) {
      throw new BadRequestException('Person name is required for borrowed and lent debts');
    }

    if (dto.currentBalance !== undefined && dto.currentBalance < 0) {
      throw new BadRequestException('Current balance cannot be negative');
    }
  }

  private validateUpdatedDebtState(debt: Debt) {
    const currentBalance = this.toNumber(debt.currentBalance);

    if (debt.status === 'completed' && currentBalance > 0) {
      throw new BadRequestException('Completed debts cannot keep a positive balance');
    }

    if (debt.status === 'active' && currentBalance <= 0) {
      debt.status = 'completed';
      debt.currentBalance = '0.00';
    }

    if (this.isP2P(debt.debtType) && !debt.personName?.trim()) {
      throw new BadRequestException('Person name is required for borrowed and lent debts');
    }

    if (this.isInstitutional(debt.debtType)) {
      if (!debt.frequency) {
        throw new BadRequestException('Frequency is required for institutional debts');
      }
      if (!this.toNumber(debt.installmentAmount)) {
        throw new BadRequestException('Installment amount is required for institutional debts');
      }
      if (!debt.nextDueDate) {
        debt.nextDueDate = debt.startDate;
      }
    } else {
      debt.frequency = null;
      debt.installmentAmount = null;
      debt.nextDueDate = null;
    }
  }

  private async getCategoryId(userId: string, debtType?: string): Promise<string> {
    const categoryName = debtType === 'lent' ? 'Debt Collection' : 'Debt Payment';
    const categoryType = debtType === 'lent' ? 'income' : 'expense';

    const category = await this.categoryRepo.findOne({
      where: { userId, name: categoryName, type: categoryType },
    });

    if (category) {
      return category.id;
    }

    const newCategory = this.categoryRepo.create({
      name: categoryName,
      userId,
      type: categoryType,
    });

    const savedCategory = await this.categoryRepo.save(newCategory);
    return savedCategory.id;
  }

  private async savePersonName(userId: string, name: string) {
    const existing = await this.personNameRepo.findOne({ where: { userId, name } });
    if (existing) {
      return existing;
    }

    const personName = this.personNameRepo.create({ userId, name });
    return this.personNameRepo.save(personName);
  }

  private async persistGenericUpdate(
    debt: DebtWithUpdates,
    intent: Exclude<DebtUpdateIntent, 'payment'>,
    payload: RecordDebtUpdateDto,
  ) {
    if (this.isInstitutional(debt.debtType) && intent !== 'note') {
      throw new BadRequestException('Reminder and promise updates only apply to person-to-person debts');
    }

    const updateDate = payload.updateDate || dayjs().format('YYYY-MM-DD');
    const reminderDate = payload.reminderDate || (intent === 'reminder' ? updateDate : undefined);

    const update = this.updateRepo.create({
      debtId: debt.id,
      updateDate,
      amount: this.toMoney(payload.amount),
      status: 'pending',
      intent,
      note: payload.note,
    });

    await this.updateRepo.save(update);

    if (reminderDate) {
      debt.reminderDate = reminderDate;
      await this.debtRepo.update({ id: debt.id }, { reminderDate });
    }

    return this.getDebtDetails(debt.id, debt.userId);
  }

  private async applyPaymentUpdate(
    debt: DebtWithUpdates,
    input: {
      amount?: number;
      createTransaction?: boolean;
      categoryId?: string;
      updateDate?: string;
      settleInFull?: boolean;
      note?: string;
      scheduledDate?: string;
    },
  ) {
    const currentBalance = this.toNumber(debt.currentBalance);
    if (currentBalance <= 0) {
      throw new BadRequestException('Debt is already settled');
    }

    const fallbackAmount = this.isInstitutional(debt.debtType)
      ? this.toNumber(debt.installmentAmount) || currentBalance
      : currentBalance;
    const requestedAmount = input.settleInFull ? currentBalance : input.amount ?? fallbackAmount;

    if (!requestedAmount || requestedAmount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    if (requestedAmount > currentBalance + PAYMENT_TOLERANCE) {
      throw new BadRequestException(
        'Payment amount exceeds current balance. Set settleInFull=true to settle the remaining balance or reduce the payment amount.',
      );
    }
    const normalizedRequestedAmount = Math.min(requestedAmount, currentBalance);

    let transactionId: string | null = null;
    const shouldCreateTransaction = input.createTransaction !== false;
    const updateDate = input.updateDate || dayjs().format('YYYY-MM-DD');

    if (shouldCreateTransaction) {
      const txType = debt.debtType === 'lent' ? 'income' : 'expense';
      const txCategoryId = input.categoryId || (await this.getCategoryId(debt.userId, debt.debtType));
      const transaction = await this.transactionService.create({
        userId: debt.userId,
        type: txType,
        accountId: debt.accountId,
        categoryId: txCategoryId,
        amount: this.toMoney(normalizedRequestedAmount),
        transactionDate: new Date(updateDate).toISOString(),
        description: `${debt.name} Payment${debt.personName ? ` - ${debt.personName}` : ''}`,
      });
      transactionId = transaction.id;
    }

    const update = this.updateRepo.create({
      debtId: debt.id,
      updateDate,
      amount: this.toMoney(normalizedRequestedAmount),
      transactionId: transactionId || undefined,
      status: 'paid',
      intent: 'payment',
      note: input.note,
    });
    await this.updateRepo.save(update);

    const remainingBalance = Math.max(0, currentBalance - normalizedRequestedAmount);
    debt.currentBalance = this.toMoney(remainingBalance);
    debt.status = remainingBalance <= 0 ? 'completed' : 'active';

    if (this.isInstitutional(debt.debtType) && debt.frequency) {
      const scheduleAnchor = input.scheduledDate || (debt.nextDueDate && dayjs(updateDate).isBefore(dayjs(debt.nextDueDate), 'day')
        ? debt.nextDueDate
        : updateDate);
      debt.nextDueDate = this.getNextDueDate(debt.startDate, debt.frequency, scheduleAnchor).format('YYYY-MM-DD');
    }

    if (remainingBalance <= 0 && this.isP2P(debt.debtType)) {
      debt.reminderDate = null;
    }

    await this.debtRepo.update(
      { id: debt.id },
      {
        currentBalance: debt.currentBalance,
        status: debt.status,
        nextDueDate: debt.nextDueDate,
        reminderDate: debt.reminderDate,
      },
    );
    return this.getDebtDetails(debt.id, debt.userId);
  }

  private async getAllDebtsWithUpdates(userId: string) {
    const debts = await this.debtRepo.find({
      where: { userId },
      relations: ['updates', 'updates.transaction'],
      order: { nextDueDate: 'ASC' },
    });

    return debts as DebtWithUpdates[];
  }

  private async getDebtDetails(debtId: string, userId: string) {
    const debt = await this.getDebtOrThrow(debtId, userId);
    return this.buildDebtView(debt);
  }

  async createDebt(userId: string, body: CreateDebtDto) {
    const debtType = this.ensureDebtType(body.debtType);
    const payload = { ...body, debtType };
    this.validateCreateDebt(payload);

    const debt = this.debtRepo.create({
      userId,
      name: body.name.trim(),
      accountId: body.accountId,
      startDate: body.startDate,
      frequency: this.isInstitutional(debtType) ? body.frequency : null,
      installmentAmount: this.isInstitutional(debtType) ? this.toMoney(body.installmentAmount) : null,
      principal: body.principal,
      currentBalance: this.toMoney(body.currentBalance ?? body.principal),
      term: this.isInstitutional(debtType) ? body.term ?? null : null,
      nextDueDate: this.isInstitutional(debtType) ? body.nextDueDate || body.startDate : null,
      debtType,
      personName: this.isP2P(debtType) ? body.personName?.trim() || null : null,
      status: (body.currentBalance ?? body.principal) > 0 ? 'active' : 'completed',
      reminderDate: this.isP2P(debtType) ? body.reminderDate || null : null,
    });

    this.validateUpdatedDebtState(debt);
    const savedDebt = await this.debtRepo.save(debt);

    if (savedDebt.personName) {
      await this.savePersonName(userId, savedDebt.personName);
    }

    if (body.createTransaction) {
      await this.transactionService.create({
        userId,
        type: 'expense',
        accountId: body.accountId,
        categoryId: body.categoryId,
        amount: this.toMoney(body.principal),
        transactionDate: new Date(body.startDate).toISOString(),
        description: `${body.name}${savedDebt.personName ? ` - ${savedDebt.personName}` : ''}`,
      });
    }

    return this.getDebtDetails(savedDebt.id, userId);
  }

  async getDebt(userId: string, debtType?: string) {
    const typedDebtType = debtType ? this.ensureDebtType(debtType) : undefined;
    const debts = await this.getAllDebtsWithUpdates(userId);

    return debts
      .filter((debt) => !typedDebtType || debt.debtType === typedDebtType)
      .map((debt) => this.buildDebtView(debt))
      .sort((left, right) => {
        if (left.overdue !== right.overdue) return left.overdue ? -1 : 1;
        const leftDate = left.lastActivityDate || left.startDate;
        const rightDate = right.lastActivityDate || right.startDate;
        return leftDate.localeCompare(rightDate);
      });
  }

  async getPersonLedger(userId: string) {
    const debts = (await this.getAllDebtsWithUpdates(userId))
      .filter((debt) => this.isP2P(debt.debtType) && debt.personName);
    const debtViews = debts.map((debt) => this.buildDebtView(debt));
    const groups = new Map<string, PersonLedgerGroup>();

    for (const debt of debtViews) {
      const key = this.normalizePersonName(debt.personName);
      if (!key) continue;
      const existing: PersonLedgerGroup = groups.get(key) ?? {
        personName: debt.personName || 'Unknown',
        debtCount: 0,
        totalOutstanding: 0,
        totalPaid: 0,
        totalBorrowedOutstanding: 0,
        totalLentOutstanding: 0,
        lastPaymentDate: undefined,
        nextReminderDate: undefined,
        overdueCount: 0,
        lastActivityDate: undefined,
        defaultAccountId: undefined,
        preferredExpenseCategoryId: undefined,
        preferredIncomeCategoryId: undefined,
        debts: [],
      };

      existing.debtCount += 1;
      existing.totalOutstanding += debt.status === 'active' ? debt.currentBalance : 0;
      existing.totalPaid += debt.totalPaid;
      if (debt.debtType === 'borrowed') {
        existing.totalBorrowedOutstanding += debt.status === 'active' ? debt.currentBalance : 0;
      }
      if (debt.debtType === 'lent') {
        existing.totalLentOutstanding += debt.status === 'active' ? debt.currentBalance : 0;
      }
      if (debt.overdue) {
        existing.overdueCount += 1;
      }
      if (!existing.lastPaymentDate || (debt.lastPaymentDate && debt.lastPaymentDate > existing.lastPaymentDate)) {
        existing.lastPaymentDate = debt.lastPaymentDate;
      }
      if (debt.reminderDate && (!existing.nextReminderDate || debt.reminderDate < existing.nextReminderDate)) {
        existing.nextReminderDate = debt.reminderDate;
      }
      if (!existing.lastActivityDate || debt.lastActivityDate > existing.lastActivityDate) {
        existing.lastActivityDate = debt.lastActivityDate;
        existing.defaultAccountId = debt.accountId;
        const latestTransaction = [...debt.updates]
          .filter((update) => update.transaction?.categoryId)
          .sort((a, b) => b.updateDate.localeCompare(a.updateDate))[0]?.transaction;
        existing.preferredExpenseCategoryId = latestTransaction?.type === 'expense' ? latestTransaction.categoryId : existing.preferredExpenseCategoryId;
        existing.preferredIncomeCategoryId = latestTransaction?.type === 'income' ? latestTransaction.categoryId : existing.preferredIncomeCategoryId;
      }

      existing.debts.push({
        id: debt.id,
        name: debt.name,
        debtType: debt.debtType,
        status: debt.status,
        currentBalance: debt.currentBalance,
        principal: debt.principal,
        reminderDate: debt.reminderDate,
        overdue: debt.overdue,
        overdueReason: debt.overdueReason,
        lastPaymentDate: debt.lastPaymentDate,
      });

      groups.set(key, existing);
    }

    return [...groups.values()]
      .map((group) => ({
        ...group,
        totalOutstanding: Number(group.totalOutstanding.toFixed(2)),
        totalPaid: Number(group.totalPaid.toFixed(2)),
        totalBorrowedOutstanding: Number(group.totalBorrowedOutstanding.toFixed(2)),
        totalLentOutstanding: Number(group.totalLentOutstanding.toFixed(2)),
        debts: group.debts.sort((left, right) => right.currentBalance - left.currentBalance),
      }))
      .sort((left, right) => right.totalOutstanding - left.totalOutstanding);
  }

  async getDebtAnalytics(userId: string) {
    const debts = await this.getDebt(userId);
    const personLedger = await this.getPersonLedger(userId);
    const activeDebts = debts.filter((debt) => debt.status === 'active');
    const totalOutstanding = activeDebts.reduce((sum, debt) => sum + debt.currentBalance, 0);
    const totalPaid = debts.reduce((sum, debt) => sum + debt.totalPaid, 0);
    const totalPrincipal = debts.reduce((sum, debt) => sum + debt.principal, 0);

    const agingBuckets = [
      { label: 'Current', amount: 0 },
      { label: '1-7 days', amount: 0 },
      { label: '8-30 days', amount: 0 },
      { label: '31+ days', amount: 0 },
    ];

    for (const debt of activeDebts) {
      if (!debt.overdue) {
        agingBuckets[0].amount += debt.currentBalance;
      } else if (debt.overdueDays <= 7) {
        agingBuckets[1].amount += debt.currentBalance;
      } else if (debt.overdueDays <= 30) {
        agingBuckets[2].amount += debt.currentBalance;
      } else {
        agingBuckets[3].amount += debt.currentBalance;
      }
    }

    const duplicateMap = new Map<string, DuplicateCandidateGroup>();
    for (const debt of activeDebts.filter((item) => this.isP2P(item.debtType) && item.personName)) {
      const duplicateKey = `${this.normalizePersonName(debt.personName)}::${this.normalizeDebtName(debt.name)}`;
      const normalizedName = this.normalizeDebtName(debt.name);
      if (!normalizedName) continue;
      const existing: DuplicateCandidateGroup = duplicateMap.get(duplicateKey) ?? {
        personName: debt.personName || 'Unknown',
        normalizedName,
        debts: [],
        labels: [],
        totalOutstanding: 0,
      };
      existing.debts.push(debt.id);
      existing.labels.push(debt.name);
      existing.totalOutstanding += debt.currentBalance;
      duplicateMap.set(duplicateKey, existing);
    }

    const overdueTrendMap = new Map<string, number>();
    for (const debt of activeDebts.filter((item) => item.overdue)) {
      const sourceDate = debt.debtType === 'institutional' ? debt.nextDueDate : debt.reminderDate || debt.lastPaymentDate || debt.startDate;
      const monthKey = dayjs(sourceDate).format('YYYY-MM');
      overdueTrendMap.set(monthKey, (overdueTrendMap.get(monthKey) || 0) + 1);
    }

    return {
      summary: {
        totalDebts: debts.length,
        activeDebts: activeDebts.length,
        totalOutstanding: Number(totalOutstanding.toFixed(2)),
        totalInstitutionalOutstanding: Number(activeDebts.filter((debt) => debt.debtType === 'institutional').reduce((sum, debt) => sum + debt.currentBalance, 0).toFixed(2)),
        totalP2POutstanding: Number(activeDebts.filter((debt) => this.isP2P(debt.debtType)).reduce((sum, debt) => sum + debt.currentBalance, 0).toFixed(2)),
        totalPaid: Number(totalPaid.toFixed(2)),
        recoveryRate: totalPrincipal > 0 ? Number(((totalPaid / totalPrincipal) * 100).toFixed(2)) : 0,
        overdueCount: activeDebts.filter((debt) => debt.overdue).length,
      },
      personExposure: personLedger.map((person) => ({
        personName: person.personName,
        outstanding: person.totalOutstanding,
        totalBorrowedOutstanding: person.totalBorrowedOutstanding,
        totalLentOutstanding: person.totalLentOutstanding,
        netPosition: Number((person.totalLentOutstanding - person.totalBorrowedOutstanding).toFixed(2)),
        totalPaid: person.totalPaid,
        overdueCount: person.overdueCount,
        debtCount: person.debtCount,
      })),
      agingBuckets: agingBuckets.map((bucket) => ({ ...bucket, amount: Number(bucket.amount.toFixed(2)) })),
      duplicateCandidates: [...duplicateMap.values()]
        .filter((candidate) => candidate.debts.length > 1)
        .map((candidate) => ({
          ...candidate,
          totalOutstanding: Number(candidate.totalOutstanding.toFixed(2)),
        }))
        .sort((left, right) => right.totalOutstanding - left.totalOutstanding),
      overdueTrend: [...overdueTrendMap.entries()]
        .map(([month, count]) => ({ month, count }))
        .sort((left, right) => left.month.localeCompare(right.month)),
    };
  }

  async getPersonNames(userId: string, search?: string) {
    const where = search
      ? { userId, name: ILike(`%${search}%`) }
      : { userId };

    const names = await this.personNameRepo.find({
      where,
      order: { name: 'ASC' },
    });

    return names.map((name) => name.name);
  }

  async recordDebtUpdate(debtId: string, userId: string, payload: RecordDebtUpdateDto) {
    const debt = await this.getDebtOrThrow(debtId, userId);
    const intent = payload.intent ?? 'payment';

    if (!DEBT_UPDATE_INTENTS.includes(intent)) {
      throw new BadRequestException('Unsupported debt update intent');
    }

    if (intent === 'payment') {
      return this.applyPaymentUpdate(debt, {
        amount: payload.amount,
        createTransaction: payload.createTransaction,
        categoryId: payload.categoryId,
        updateDate: payload.updateDate,
        settleInFull: payload.settleInFull,
        note: payload.note,
      });
    }

    return this.persistGenericUpdate(debt, intent, payload);
  }

  async payInstallment(
    debtId: string,
    userId: string,
    amount?: number,
    createTransaction = true,
    categoryId?: string,
    settleInFull?: boolean,
    note?: string,
  ) {
    const debt = await this.getDebtOrThrow(debtId, userId);
    return this.applyPaymentUpdate(debt, { amount, createTransaction, categoryId, settleInFull, note });
  }

  async getDebtUpdates(debtId: string, userId: string) {
    const debt = await this.getDebtOrThrow(debtId, userId);
    const updates = [...debt.updates].sort((left, right) => left.updateDate.localeCompare(right.updateDate));
    // Reconstruct the opening balance by adding balance-affecting payment updates back to the current balance.
    // This assumes payment-intent updates were applied to the debt balance when they were created, then walks
    // the timeline forward so each entry can expose its post-update running balance.
    const openingBalance = this.toNumber(debt.currentBalance)
      + updates
        .filter((update) => update.intent === 'payment')
        .reduce((sum, update) => sum + this.toNumber(update.amount), 0);

    let runningBalance = openingBalance;

    return updates
      .map((update) => {
        const amount = this.toNumber(update.amount);
        const balanceImpact = update.intent === 'payment';
        if (balanceImpact) {
          runningBalance = Math.max(0, runningBalance - amount);
        }

        return {
          ...update,
          debtId: update.debtId || debt.id,
          amount,
          runningBalanceAfter: Number(runningBalance.toFixed(2)),
          balanceImpact,
          requiresReconciliation: balanceImpact && !update.transactionId,
        };
      })
      .reverse();
  }

  async catchUpDebt(debtId: string, userId: string) {
    const debt = await this.getDebtOrThrow(debtId, userId);

    if (!this.isInstitutional(debt.debtType) || !debt.frequency || !debt.installmentAmount) {
      return this.buildDebtView(debt);
    }

    let nextDue = dayjs(debt.nextDueDate || debt.startDate);
    const today = dayjs();
    const appliedDates = new Set(
      debt.updates
        .filter((update) => update.intent === 'payment')
        .map((update) => update.updateDate),
    );

    while (nextDue.isBefore(today, 'day') && this.toNumber(debt.currentBalance) > 0) {
      const dueStr = nextDue.format('YYYY-MM-DD');
      if (!appliedDates.has(dueStr)) {
        const updatedDebt = await this.applyPaymentUpdate(debt, {
          amount: this.toNumber(debt.installmentAmount),
          updateDate: dueStr,
          scheduledDate: dueStr,
        });
        debt.currentBalance = this.toMoney(updatedDebt.currentBalance);
        debt.status = updatedDebt.status;
        debt.nextDueDate = updatedDebt.nextDueDate;
        appliedDates.add(dueStr);
      }
      nextDue = this.getNextDueDate(debt.startDate, debt.frequency, dueStr);
    }

    return this.getDebtDetails(debt.id, userId);
  }

  async catchUpAllDebts(userId: string) {
    const debts = await this.debtRepo.find({ where: { userId } });
    for (const debt of debts) {
      await this.catchUpDebt(debt.id, userId);
    }
    return this.getDebt(userId);
  }

  async payEarly(debtId: string, userId: string) {
    const debt = await this.getDebtOrThrow(debtId, userId);

    if (!this.isInstitutional(debt.debtType) || !debt.nextDueDate || !debt.installmentAmount) {
      throw new BadRequestException('Early payment only applies to institutional debts with a fixed schedule');
    }

    const dueDate = dayjs(debt.nextDueDate);
    const today = dayjs();
    if (!today.isBefore(dueDate, 'day')) {
      throw new BadRequestException('Early payment is only available before the next due date');
    }

    return this.applyPaymentUpdate(debt, {
      amount: this.toNumber(debt.installmentAmount),
      updateDate: today.format('YYYY-MM-DD'),
      scheduledDate: debt.nextDueDate,
    });
  }

  async deleteDebtUpdate(updateId: string, userId: string) {
    const update = await this.updateRepo.findOne({
      where: { id: updateId },
      relations: ['debt'],
    });

    if (!update || !update.debt || update.debt.userId !== userId) {
      throw new NotFoundException('Debt update not found');
    }

    const debt = await this.getDebtOrThrow(update.debtId, userId);
    if (update.intent === 'payment') {
      debt.currentBalance = this.toMoney(this.toNumber(debt.currentBalance) + this.toNumber(update.amount));
      if (this.toNumber(debt.currentBalance) > 0) {
        debt.status = 'active';
      }
      await this.debtRepo.update(
        { id: debt.id },
        { currentBalance: debt.currentBalance, status: debt.status },
      );
    }

    await this.updateRepo.delete({ id: updateId });

    if (update.transactionId) {
      await this.transactionService.delete(userId, update.transactionId);
    }

    return { success: true, message: 'Debt update deleted successfully' };
  }

  async deleteDebt(debtId: string, userId: string) {
    const debt = await this.debtRepo.findOne({ where: { id: debtId, userId } });
    if (!debt) {
      throw new NotFoundException('Debt not found');
    }

    const updates = await this.updateRepo.find({ where: { debtId } });
    if (updates.length > 0) {
      throw new BadRequestException('Cannot delete debt with existing updates. Delete the update history first.');
    }

    await this.debtRepo.delete({ id: debtId });
    return { success: true, message: 'Debt deleted successfully' };
  }

  async updateDebt(debtId: string, userId: string, updates: UpdateDebtDto) {
    const debt = await this.debtRepo.findOne({ where: { id: debtId, userId } });
    if (!debt) {
      throw new NotFoundException('Debt not found');
    }

    if (updates.name !== undefined) debt.name = updates.name.trim();
    if (updates.accountId !== undefined) debt.accountId = updates.accountId;
    if (updates.principal !== undefined) debt.principal = updates.principal;
    if (updates.currentBalance !== undefined) debt.currentBalance = this.toMoney(updates.currentBalance);
    if (updates.installmentAmount !== undefined) debt.installmentAmount = this.toMoney(updates.installmentAmount);
    if (updates.frequency !== undefined) debt.frequency = updates.frequency;
    if (updates.term !== undefined) debt.term = updates.term;
    if (updates.startDate !== undefined) debt.startDate = updates.startDate;
    if (updates.nextDueDate !== undefined) debt.nextDueDate = updates.nextDueDate;
    if (updates.reminderDate !== undefined) debt.reminderDate = updates.reminderDate;
    if (updates.status !== undefined) debt.status = updates.status;
    if (updates.personName !== undefined) {
      const trimmedPersonName = updates.personName.trim();
      if (this.isP2P(debt.debtType) && !trimmedPersonName) {
        throw new BadRequestException('Person name is required for borrowed and lent debts');
      }
      debt.personName = trimmedPersonName;
    }

    this.validateUpdatedDebtState(debt);
    const savedDebt = await this.debtRepo.save(debt);

    if (savedDebt.personName && this.isP2P(savedDebt.debtType)) {
      await this.savePersonName(userId, savedDebt.personName);
    }

    return this.getDebtDetails(savedDebt.id, userId);
  }
}
