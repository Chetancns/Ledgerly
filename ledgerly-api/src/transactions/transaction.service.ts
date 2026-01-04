import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, DataSource, In, LessThanOrEqual } from 'typeorm';
import { Transaction } from './transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { Account } from '../accounts/account.entity';
import { Category } from '../categories/category.entity';
import { Tag } from '../tags/tag.entity';
import { withTransaction } from '../utils/transaction.util';
import { parseSafeAmount } from 'src/utils/number.util';
import { Cron } from '@nestjs/schedule';
import dayjs from 'dayjs';
import { NotificationsService } from '../notifications/notifications.service';
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

  // ✅ CREATE
  async create(dto: Partial<Transaction> & { tagIds?: string[] }) {
    return withTransaction(this.dataSource, async (manager) => {
      const txRepo = manager.withRepository(this.txRepo);
      const accRepo = manager.withRepository(this.accRepo);
      const catRepo = manager.withRepository(this.catRepo);
      const tagRepo = manager.withRepository(this.tagRepo);

      const amount = parseSafeAmount(dto.amount);
      if (!amount) throw new Error('Invalid amount');

      if (!dto.type && dto.categoryId) {
        const cat = await catRepo.findOne({ where: { id: dto.categoryId, userId: dto.userId } });
        if (!cat) throw new NotFoundException('Category not found');
        dto.type = cat.type;
      }

      // Set default status to 'posted' if not provided
      const status = dto.status || 'posted';

      // Only affect account balance if transaction is posted (not pending or cancelled)
      const shouldAffectBalance = status === 'posted';

      // handle transfers
      if (shouldAffectBalance && (dto.type === 'transfer' || dto.type === 'savings')) {
        const fromAcc = await accRepo.findOne({ where: { id: dto.accountId!, userId: dto.userId } });
        const toAcc = await accRepo.findOne({ where: { id: dto.toAccountId!, userId: dto.userId } });
        if (!fromAcc || !toAcc) throw new NotFoundException('Account not found');

          fromAcc.balance = (Number(fromAcc.balance) - Number(dto.amount)).toFixed(2);
          toAcc.balance = (Number(toAcc.balance) + Number(dto.amount)).toFixed(2);

        await accRepo.save([fromAcc, toAcc]);
      } else if (shouldAffectBalance && dto.accountId) {
        const acc = await accRepo.findOne({ where: { id: dto.accountId, userId: dto.userId } });
        if (!acc) throw new NotFoundException('Account not found');

        const sign = dto.type === 'income' ? 1 : -1;
        acc.balance = (Number(acc.balance) + sign * amount).toFixed(2);
        await accRepo.save(acc);
      }

      // Handle tags
      let tags: Tag[] = [];
      if (dto.tagIds && dto.tagIds.length > 0) {
        tags = await tagRepo.find({
          where: { id: In(dto.tagIds), userId: dto.userId, isDeleted: false },
        });
        if (tags.length !== dto.tagIds.length) {
          throw new NotFoundException('One or more tags not found');
        }
      }

      const tx = txRepo.create({ ...dto, amount: amount.toString(), status, tags });
      return txRepo.save(tx);
    });
  }
  
// ✅ UPDATE
  async update(userId: string, id: string, dto: Partial<Transaction> & { tagIds?: string[] }) {
    return withTransaction(this.dataSource, async (manager) => {
      const txRepo = manager.withRepository(this.txRepo);
      const accRepo = manager.withRepository(this.accRepo);
      const catRepo = manager.withRepository(this.catRepo);
      const tagRepo = manager.withRepository(this.tagRepo);

      const tx = await txRepo.findOne({ where: { id, userId }, relations: ['tags'] });
      if (!tx) throw new NotFoundException('Transaction not found');

      const oldAmount = parseSafeAmount(tx.amount);
      const newAmount = parseSafeAmount(dto.amount ?? tx.amount);
      const oldStatus = tx.status || 'posted';
      const newStatus = dto.status ?? oldStatus;

      // Determine if we need to update balance based on status transition
      const wasPosted = oldStatus === 'posted';
      const willBePosted = newStatus === 'posted';

      // Reverse old effect only if it was posted
      if (wasPosted) {
        if (tx.type === 'transfer' || tx.type === 'savings') {
          // Reverse transfer/savings
          const fromAcc = tx.accountId ? await accRepo.findOne({ where: { id: tx.accountId, userId } }) : null;
          const toAcc = tx.toAccountId ? await accRepo.findOne({ where: { id: tx.toAccountId, userId } }) : null;
          
          if (fromAcc) {
            fromAcc.balance = (Number(fromAcc.balance) + oldAmount).toFixed(2);
            await accRepo.save(fromAcc);
          }
          if (toAcc) {
            toAcc.balance = (Number(toAcc.balance) - oldAmount).toFixed(2);
            await accRepo.save(toAcc);
          }
        } else if (tx.accountId) {
          // Reverse regular transaction
          const acc = await accRepo.findOne({ where: { id: tx.accountId, userId } });
          if (acc) {
            const sign = tx.type === 'income' ? -1 : 1;
            acc.balance = (Number(acc.balance) + sign * oldAmount).toFixed(2);
            await accRepo.save(acc);
          }
        }
      }

      // Determine transaction type for new effect
      if (!dto.type && dto.categoryId) {
        const cat = await catRepo.findOne({ where: { id: dto.categoryId, userId } });
        if (!cat) throw new NotFoundException('Category not found');
        dto.type = cat.type;
      }

      const transactionType = dto.type || tx.type;
      const accountIdToUpdate = dto.accountId ?? tx.accountId;
      const toAccountIdToUpdate = dto.toAccountId ?? tx.toAccountId;

      // Apply new effect if it will be posted
      if (willBePosted) {
        if (transactionType === 'transfer' || transactionType === 'savings') {
          // Apply transfer/savings
          const fromAcc = accountIdToUpdate ? await accRepo.findOne({ where: { id: accountIdToUpdate, userId } }) : null;
          const toAcc = toAccountIdToUpdate ? await accRepo.findOne({ where: { id: toAccountIdToUpdate, userId } }) : null;
          
          if (!fromAcc || !toAcc) throw new NotFoundException('Account not found for transfer');
          
          fromAcc.balance = (Number(fromAcc.balance) - newAmount).toFixed(2);
          toAcc.balance = (Number(toAcc.balance) + newAmount).toFixed(2);
          await accRepo.save([fromAcc, toAcc]);
        } else if (accountIdToUpdate) {
          // Apply regular transaction
          const acc = await accRepo.findOne({ where: { id: accountIdToUpdate, userId } });
          if (!acc) throw new NotFoundException('Account not found');
          const sign = transactionType === 'income' ? 1 : -1;
          acc.balance = (Number(acc.balance) + sign * newAmount).toFixed(2);
          await accRepo.save(acc);
        }
      }

      // Handle tags update
      if (dto.tagIds !== undefined) {
        if (dto.tagIds.length > 0) {
          const tags = await tagRepo.find({
            where: { id: In(dto.tagIds), userId, isDeleted: false },
          });
          if (tags.length !== dto.tagIds.length) {
            throw new NotFoundException('One or more tags not found');
          }
          tx.tags = tags;
        } else {
          tx.tags = [];
        }
      }

      Object.assign(tx, dto, { amount: newAmount });
      return txRepo.save(tx);
    });
  }


  async findByUser(
    userId: string, 
    filters?: { 
      from?: string; 
      to?: string; 
      categoryId?: string; 
      accountId?: string;
      type?: 'expense'|'income' | 'savings'|'transfer';
      status?: 'pending' | 'posted' | 'cancelled';
      tagIds?: string[];
      skip?: number;
      take?: number;
    }
  ) {
    const qb = this.txRepo.createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.tags', 'tag')
      .leftJoinAndSelect('transaction.account', 'account')
      .leftJoinAndSelect('transaction.category', 'category')
      .where('transaction.userId = :userId', { userId });

    if (filters?.from && filters?.to) {
      qb.andWhere('transaction.transactionDate BETWEEN :from AND :to', { 
        from: filters.from, 
        to: filters.to 
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
    
    // If pagination is requested, return paginated results with total count
    if (filters?.skip !== undefined || filters?.take !== undefined) {
      qb.skip(filters.skip || 0)
        .take(filters.take || 50);
      
      const [data, total] = await qb.getManyAndCount();
      return { data, total, skip: filters.skip || 0, take: filters.take || 50 };
    }
    
    // Otherwise return all results (backward compatibility)
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
    }
  ) {
    const where: Partial<Record<keyof Transaction, any>> = { userId };
    if (filters?.from && filters?.to) where.transactionDate = Between(filters.from, filters.to);
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.accountId) where.accountId = filters.accountId;
    if (filters?.type) where.type = filters.type;

    const transactions = await this.txRepo.find({ where });
    
    const summary = transactions.reduce((acc, tx) => {
      const amt = Number(tx.amount) || 0;
      acc[tx.type] = (acc[tx.type] || 0) + amt;
      return acc;
    }, {} as Record<string, number>);

    return summary;
  }

  async delete(userId: string, id: string) {
    return this.dataSource.transaction(async (manager) => {
      const txRepo = manager.withRepository(this.txRepo);
      const accRepo = manager.withRepository(this.accRepo);

      const tx = await txRepo.findOne({ where: { id, userId } });
      if (!tx) throw new NotFoundException('Transaction not found');

      const amount = Number(tx.amount);
      if (isNaN(amount)) throw new Error('Invalid amount in transaction');

      // Only reverse balance if transaction was posted
      const wasPosted = (tx.status || 'posted') === 'posted';

      if (wasPosted) {
        // Case 1️⃣ — Transfer or Savings: reverse both accounts
        if (tx.type === 'transfer' || tx.type === 'savings') {
          const fromAcc = tx.accountId
            ? await accRepo.findOne({ where: { id: tx.accountId, userId } })
            : null;
          const toAcc = tx.toAccountId
            ? await accRepo.findOne({ where: { id: tx.toAccountId, userId } })
            : null;

          if (fromAcc) {
            fromAcc.balance = (Number(fromAcc.balance) + amount).toFixed(2);
            await accRepo.save(fromAcc);
          }
          if (toAcc) {
            toAcc.balance = (Number(toAcc.balance) - amount).toFixed(2);
            await accRepo.save(toAcc);
          }
        }

        // Case 2️⃣ — Regular income/expense
        else if (tx.accountId) {
          const acc = await accRepo.findOne({ where: { id: tx.accountId, userId } });
          if (acc) {
            const sign = tx.type === 'income' ? -1 : 1;
            acc.balance = (Number(acc.balance) + sign * amount).toFixed(2);
            await accRepo.save(acc);
          }
        }
      }

      // Case 3️⃣ — Delete transaction itself
      await txRepo.delete(id);

      // ✅ If anything above fails, TypeORM rolls back automatically
      return { deleted: true };
    });
  }

  // ✅ Get pending transactions that need to be posted
  async getPendingTransactions(userId: string) {
    return this.txRepo.find({
      where: { userId, status: 'pending' },
      relations: ['account', 'category', 'tags'],
      order: { expectedPostDate: 'ASC', transactionDate: 'ASC' },
    });
  }

  // ✅ Transition transaction status (e.g., pending -> posted)
  async updateStatus(userId: string, id: string, newStatus: 'pending' | 'posted' | 'cancelled') {
    return this.update(userId, id, { status: newStatus });
  }

  // ✅ Bulk update status for multiple transactions (parallel processing)
  async bulkUpdateStatus(userId: string, ids: string[], newStatus: 'pending' | 'posted' | 'cancelled') {
    const updatePromises = ids.map(async (id) => {
      try {
        const result = await this.updateStatus(userId, id, newStatus);
        return { id, success: true, transaction: result };
      } catch (error) {
        return { id, success: false, error: error.message };
      }
    });

    return Promise.allSettled(updatePromises).then(results =>
      results.map(result => result.status === 'fulfilled' ? result.value : result.reason)
    );
  }

  // 🕑 AUTO-POST PENDING TRANSACTIONS (Cron Job)
  // Runs at 3:00 AM daily to automatically post pending transactions that have reached their expected post date
  // Set env var CRON_TIMEZONE to your region, e.g., 'Asia/Kolkata' or 'America/Los_Angeles'.
  @Cron('0 3 * * *', { timeZone: process.env.CRON_TIMEZONE || 'UTC' }) // 3:00 AM daily
  async autoPostPendingTransactions() {
    this.logger.log('Starting auto-post of pending transactions...');
    const today = dayjs().format('YYYY-MM-DD');

    try {
      // Find pending transactions where expectedPostDate is today or earlier
      const dueTransactions = await this.txRepo.find({
        where: [
          { status: 'pending', expectedPostDate: LessThanOrEqual(today) },
        ],
        relations: ['user', 'account', 'category'],
      });

      if (dueTransactions.length === 0) {
        this.logger.log('No pending transactions due for posting.');
        return { posted: 0, errors: [] };
      }

      this.logger.log(`Found ${dueTransactions.length} pending transaction(s) to post.`);

      const results = {
        posted: 0,
        errors: [] as Array<{ id: string; error: string }>,
      };

      // Process each transaction
      for (const tx of dueTransactions) {
        try {
          await this.updateStatus(tx.userId, tx.id, 'posted');
          results.posted++;
          this.logger.log(`Posted transaction ${tx.id} for user ${tx.userId}`);

          // Create notification for user
          const accountName = tx.account?.name || 'Unknown Account';
          const categoryName = tx.category?.name || 'Unknown Category';
          const amount = parseFloat(tx.amount).toFixed(2);
          
          await this.notificationsService.create(
            tx.userId,
            'transaction_posted',
            'Pending Transaction Posted',
            `Your pending transaction of $${amount} (${categoryName} - ${accountName}) has been automatically posted.`,
            {
              transactionId: tx.id,
              amount: tx.amount,
              accountId: tx.accountId,
              categoryId: tx.categoryId,
              expectedPostDate: tx.expectedPostDate,
              actualPostDate: today,
            },
          );
        } catch (error) {
          const errorMsg = error.message || 'Unknown error';
          results.errors.push({ id: tx.id, error: errorMsg });
          this.logger.error(`Failed to post transaction ${tx.id}: ${errorMsg}`);
        }
      }

      this.logger.log(`Auto-post completed: ${results.posted} posted, ${results.errors.length} errors.`);
      return results;
    } catch (error) {
      this.logger.error('Error in auto-post cron job:', error);
      throw error;
    }
  }

}