import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, In, LessThanOrEqual, Repository } from 'typeorm';
import dayjs from 'dayjs';
import { Cron } from '@nestjs/schedule';
import { Transaction, TxStatus, TxType } from './transaction.entity';
import { Account } from '../accounts/account.entity';
import { Category } from '../categories/category.entity';
import { Tag } from '../tags/tag.entity';
import { withTransaction } from '../utils/transaction.util';
import { parseSafeAmount } from '../utils/number.util';
import { NotificationsService } from '../notifications/notifications.service';

type TransactionInput = Partial<Transaction> & { tagIds?: string[] };

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
    @InjectRepository(Account) private accRepo: Repository<Account>,
    @InjectRepository(Category) private catRepo: Repository<Category>,
    @InjectRepository(Tag) private tagRepo: Repository<Tag>,
    @InjectDataSource() private dataSource: DataSource,
    private notificationsService: NotificationsService,
  ) {}

  private isTransferLike(type?: string | null): boolean {
    return type === 'transfer' || type === 'savings';
  }

  private normalizeType(type?: TxType, toAccountId?: string | null): TxType | undefined {
    if (type === 'savings' && toAccountId) {
      return 'transfer';
    }
    return type;
  }

  private async getCategoryOrThrow(
    categoryRepo: Repository<Category>,
    userId: string,
    categoryId: string,
  ): Promise<Category> {
    const category = await categoryRepo.findOne({ where: { id: categoryId, userId, IsDeleted: false } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  private async resolveType(
    input: TransactionInput,
    userId: string,
    categoryRepo: Repository<Category>,
    fallbackType?: TxType,
  ): Promise<TxType> {
    const explicitType = this.normalizeType(input.type, input.toAccountId);
    if (explicitType) {
      return explicitType;
    }

    if (fallbackType) {
      return this.normalizeType(fallbackType, input.toAccountId) || fallbackType;
    }

    if (input.categoryId) {
      const category = await this.getCategoryOrThrow(categoryRepo, userId, input.categoryId);
      return this.normalizeType(category.type as TxType, input.toAccountId) || 'expense';
    }

    throw new BadRequestException('Transaction type is required');
  }

  private async loadTags(tagRepo: Repository<Tag>, userId: string, tagIds?: string[]) {
    if (!tagIds || tagIds.length === 0) {
      return [];
    }

    const tags = await tagRepo.find({
      where: { id: In(tagIds), userId, isDeleted: false },
    });

    if (tags.length !== tagIds.length) {
      throw new NotFoundException('One or more tags not found');
    }

    return tags;
  }

  private async validateAndNormalizeInput(
    input: TransactionInput,
    userId: string,
    categoryRepo: Repository<Category>,
    current?: Transaction,
  ) {
    const amountValue = parseSafeAmount(input.amount ?? current?.amount);
    if (!amountValue || amountValue <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const accountId = (input.accountId ?? current?.accountId ?? null) || null;
    const rawToAccountId =
      input.toAccountId !== undefined ? input.toAccountId : (current?.toAccountId ?? null);
    const toAccountId = rawToAccountId || null;
    const type = await this.resolveType(
      { ...input, toAccountId },
      userId,
      categoryRepo,
      current?.type,
    );

    if (!accountId) {
      throw new BadRequestException('Account is required');
    }

    let categoryId =
      input.categoryId !== undefined ? input.categoryId || null : (current?.categoryId ?? null);

    if (this.isTransferLike(type)) {
      if (!toAccountId) {
        throw new BadRequestException('Destination account is required for transfers');
      }
      if (accountId === toAccountId) {
        throw new BadRequestException('Source and destination accounts must be different');
      }
      categoryId = null;
    } else if (toAccountId) {
      throw new BadRequestException('Destination account is only allowed for transfers');
    }

    if (categoryId) {
      await this.getCategoryOrThrow(categoryRepo, userId, categoryId);
    }

    const status = (input.status ?? current?.status ?? 'posted');

    return {
      amountValue,
      amount: amountValue.toFixed(2),
      type,
      accountId,
      categoryId,
      toAccountId: this.isTransferLike(type) ? toAccountId : null,
      status,
    };
  }

  private async getAccountOrThrow(accountRepo: Repository<Account>, userId: string, accountId: string) {
    const account = await accountRepo.findOne({ where: { id: accountId, userId, IsDeleted: false } });
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    return account;
  }

  private async applyBalanceEffect(
    accountRepo: Repository<Account>,
    userId: string,
    tx: Pick<Transaction, 'type' | 'status' | 'accountId' | 'toAccountId' | 'amount'>,
  ) {
    if ((tx.status || 'posted') !== 'posted') {
      return;
    }

    const amount = parseSafeAmount(tx.amount);
    if (!amount) {
      throw new BadRequestException('Invalid amount');
    }

    if (this.isTransferLike(tx.type)) {
      if (!tx.accountId || !tx.toAccountId) {
        throw new BadRequestException('Transfers require source and destination accounts');
      }

      const [fromAccount, toAccount] = await Promise.all([
        this.getAccountOrThrow(accountRepo, userId, tx.accountId),
        this.getAccountOrThrow(accountRepo, userId, tx.toAccountId),
      ]);

      fromAccount.balance = (Number(fromAccount.balance) - amount).toFixed(2);
      toAccount.balance = (Number(toAccount.balance) + amount).toFixed(2);
      await accountRepo.save([fromAccount, toAccount]);
      return;
    }

    if (!tx.accountId) {
      throw new BadRequestException('Account is required');
    }

    const account = await this.getAccountOrThrow(accountRepo, userId, tx.accountId);
    const direction = tx.type === 'income' ? 1 : -1;
    account.balance = (Number(account.balance) + direction * amount).toFixed(2);
    await accountRepo.save(account);
  }

  private async reverseBalanceEffect(
    accountRepo: Repository<Account>,
    userId: string,
    tx: Pick<Transaction, 'type' | 'status' | 'accountId' | 'toAccountId' | 'amount'>,
  ) {
    if ((tx.status || 'posted') !== 'posted') {
      return;
    }

    const amount = parseSafeAmount(tx.amount);
    if (!amount) {
      throw new BadRequestException('Invalid amount');
    }

    if (this.isTransferLike(tx.type)) {
      if (!tx.accountId || !tx.toAccountId) {
        return;
      }

      const [fromAccount, toAccount] = await Promise.all([
        this.getAccountOrThrow(accountRepo, userId, tx.accountId),
        this.getAccountOrThrow(accountRepo, userId, tx.toAccountId),
      ]);

      fromAccount.balance = (Number(fromAccount.balance) + amount).toFixed(2);
      toAccount.balance = (Number(toAccount.balance) - amount).toFixed(2);
      await accountRepo.save([fromAccount, toAccount]);
      return;
    }

    if (!tx.accountId) {
      return;
    }

    const account = await this.getAccountOrThrow(accountRepo, userId, tx.accountId);
    const direction = tx.type === 'income' ? -1 : 1;
    account.balance = (Number(account.balance) + direction * amount).toFixed(2);
    await accountRepo.save(account);
  }

  async create(dto: TransactionInput) {
    return withTransaction(this.dataSource, async (manager) => {
      const txRepo = manager.withRepository(this.txRepo);
      const accRepo = manager.withRepository(this.accRepo);
      const catRepo = manager.withRepository(this.catRepo);
      const tagRepo = manager.withRepository(this.tagRepo);

      if (!dto.userId) {
        throw new BadRequestException('User is required');
      }

      const normalized = await this.validateAndNormalizeInput(dto, dto.userId, catRepo);
      const tags = await this.loadTags(tagRepo, dto.userId, dto.tagIds);

      await this.applyBalanceEffect(accRepo, dto.userId, {
        type: normalized.type,
        status: normalized.status,
        accountId: normalized.accountId,
        toAccountId: normalized.toAccountId,
        amount: normalized.amount,
      });

      const transaction = txRepo.create({
        ...dto,
        amount: normalized.amount,
        type: normalized.type,
        status: normalized.status,
        accountId: normalized.accountId,
        categoryId: normalized.categoryId,
        toAccountId: normalized.toAccountId,
        tags,
      });

      return txRepo.save(transaction);
    });
  }

  async update(userId: string, id: string, dto: TransactionInput) {
    return withTransaction(this.dataSource, async (manager) => {
      const txRepo = manager.withRepository(this.txRepo);
      const accRepo = manager.withRepository(this.accRepo);
      const catRepo = manager.withRepository(this.catRepo);
      const tagRepo = manager.withRepository(this.tagRepo);

      const transaction = await txRepo.findOne({ where: { id, userId }, relations: ['tags'] });
      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      await this.reverseBalanceEffect(accRepo, userId, transaction);

      const normalized = await this.validateAndNormalizeInput(dto, userId, catRepo, transaction);

      if (dto.tagIds !== undefined) {
        transaction.tags = await this.loadTags(tagRepo, userId, dto.tagIds);
      }

      Object.assign(transaction, dto, {
        amount: normalized.amount,
        type: normalized.type,
        status: normalized.status,
        accountId: normalized.accountId,
        categoryId: normalized.categoryId,
        toAccountId: normalized.toAccountId,
      });

      await this.applyBalanceEffect(accRepo, userId, transaction);
      return txRepo.save(transaction);
    });
  }

  async findByUser(
    userId: string,
    filters?: {
      from?: string;
      to?: string;
      categoryId?: string;
      accountId?: string;
      type?: 'expense' | 'income' | 'savings' | 'transfer';
      status?: 'pending' | 'posted' | 'cancelled';
      tagIds?: string[];
      skip?: number;
      take?: number;
    },
  ) {
    const qb = this.txRepo.createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.tags', 'tag')
      .leftJoinAndSelect('transaction.account', 'account')
      .leftJoinAndSelect('transaction.category', 'category')
      .where('transaction.userId = :userId', { userId });

    if (filters?.from && filters?.to) {
      qb.andWhere('transaction.transactionDate BETWEEN :from AND :to', {
        from: filters.from,
        to: filters.to,
      });
    }
    if (filters?.categoryId) {
      qb.andWhere('transaction.categoryId = :categoryId', { categoryId: filters.categoryId });
    }
    if (filters?.accountId) {
      qb.andWhere('transaction.accountId = :accountId', { accountId: filters.accountId });
    }
    if (filters?.type) {
      qb.andWhere('transaction.type = :type', { type: filters.type });
    }
    if (filters?.status) {
      qb.andWhere('transaction.status = :status', { status: filters.status });
    }
    if (filters?.tagIds && filters.tagIds.length > 0) {
      qb.andWhere('tag.id IN (:...tagIds)', { tagIds: filters.tagIds });
    }

    qb.orderBy('transaction.transactionDate', 'DESC')
      .addOrderBy('transaction.createdAt', 'DESC');

    if (filters?.skip !== undefined || filters?.take !== undefined) {
      qb.skip(filters.skip || 0).take(filters.take || 50);
      const [data, total] = await qb.getManyAndCount();
      return { data, total, skip: filters.skip || 0, take: filters.take || 50 };
    }

    return qb.getMany();
  }

  async getSummary(
    userId: string,
    filters?: {
      from?: string;
      to?: string;
      categoryId?: string;
      accountId?: string;
      type?: 'expense' | 'income' | 'savings' | 'transfer';
    },
  ) {
    const where: Partial<Record<keyof Transaction, any>> = { userId };
    if (filters?.from && filters?.to) where.transactionDate = Between(filters.from, filters.to);
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.accountId) where.accountId = filters.accountId;
    if (filters?.type) where.type = filters.type;

    const transactions = await this.txRepo.find({ where });
    return transactions.reduce((summary, tx) => {
      const amount = Number(tx.amount) || 0;
      summary[tx.type] = (summary[tx.type] || 0) + amount;
      return summary;
    }, {} as Record<string, number>);
  }

  async delete(userId: string, id: string) {
    return this.dataSource.transaction(async (manager) => {
      const txRepo = manager.withRepository(this.txRepo);
      const accRepo = manager.withRepository(this.accRepo);

      const transaction = await txRepo.findOne({ where: { id, userId } });
      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      const debtUpdateCheck = await manager.query(
        `SELECT COUNT(*) as count FROM dbo.debt_updates WHERE "transactionId" = $1`,
        [id],
      );

      if (Number(debtUpdateCheck[0]?.count || 0) > 0) {
        throw new BadRequestException(
          'Cannot delete transaction that is linked to debt payment updates. Please delete the debt payment update first.',
        );
      }

      await this.reverseBalanceEffect(accRepo, userId, transaction);
      await txRepo.delete(id);
      return { deleted: true };
    });
  }

  async getPendingTransactions(userId: string) {
    return this.txRepo.find({
      where: { userId, status: 'pending' },
      relations: ['account', 'category', 'tags'],
      order: { expectedPostDate: 'ASC', transactionDate: 'ASC' },
    });
  }

  async updateStatus(userId: string, id: string, newStatus: 'pending' | 'posted' | 'cancelled') {
    return this.update(userId, id, { status: newStatus });
  }

  async bulkUpdateStatus(userId: string, ids: string[], newStatus: 'pending' | 'posted' | 'cancelled') {
    const updatePromises = ids.map(async (id) => {
      try {
        const result = await this.updateStatus(userId, id, newStatus);
        return { id, success: true, transaction: result };
      } catch (error) {
        return { id, success: false, error: error.message };
      }
    });

    return Promise.allSettled(updatePromises).then((results) =>
      results.map((result) => (result.status === 'fulfilled' ? result.value : result.reason)),
    );
  }

  @Cron('0 3 * * *', { timeZone: process.env.CRON_TIMEZONE || 'UTC' })
  async autoPostPendingTransactions() {
    this.logger.log('Starting auto-post of pending transactions...');
    const today = dayjs().format('YYYY-MM-DD');

    try {
      const dueTransactions = await this.txRepo.find({
        where: [{ status: 'pending', expectedPostDate: LessThanOrEqual(today) }],
        relations: ['user', 'account', 'category'],
      });

      if (dueTransactions.length === 0) {
        this.logger.log('No pending transactions due for posting.');
        return { posted: 0, errors: [] };
      }

      const results = {
        posted: 0,
        errors: [] as Array<{ id: string; error: string }>,
      };

      for (const transaction of dueTransactions) {
        try {
          await this.updateStatus(transaction.userId, transaction.id, 'posted');
          results.posted++;

          const accountName = transaction.account?.name || 'Unknown Account';
          const categoryName = transaction.category?.name || 'Uncategorized';
          const amount = parseFloat(transaction.amount).toFixed(2);

          await this.notificationsService.create(
            transaction.userId,
            'transaction_posted',
            'Pending Transaction Posted',
            `Your pending transaction of $${amount} (${categoryName} - ${accountName}) has been automatically posted.`,
            {
              transactionId: transaction.id,
              amount: transaction.amount,
              accountId: transaction.accountId,
              categoryId: transaction.categoryId,
              expectedPostDate: transaction.expectedPostDate,
              actualPostDate: today,
            },
          );
        } catch (error) {
          results.errors.push({ id: transaction.id, error: error.message || 'Unknown error' });
          this.logger.error(`Failed to post transaction ${transaction.id}: ${error.message}`);
        }
      }

      return results;
    } catch (error) {
      this.logger.error('Error in auto-post cron job:', error);
      throw error;
    }
  }
}
