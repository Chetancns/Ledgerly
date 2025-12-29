import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, DataSource, In } from 'typeorm';
import { Transaction } from './transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { Account } from '../accounts/account.entity';
import { Category } from '../categories/category.entity';
import { Tag } from '../tags/tag.entity';
import { withTransaction } from '../utils/transaction.util';
import { parseSafeAmount } from 'src/utils/number.util';
@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
    @InjectRepository(Account) private accRepo: Repository<Account>,
    @InjectRepository(Category) private catRepo: Repository<Category>,
    @InjectRepository(Tag) private tagRepo: Repository<Tag>,
    @InjectDataSource() private dataSource: DataSource,
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

      // handle transfers
      if (dto.type === 'transfer' || dto.type === 'savings') {
        const fromAcc = await accRepo.findOne({ where: { id: dto.accountId!, userId: dto.userId } });
        const toAcc = await accRepo.findOne({ where: { id: dto.toAccountId!, userId: dto.userId } });
        if (!fromAcc || !toAcc) throw new NotFoundException('Account not found');

          fromAcc.balance = (Number(fromAcc.balance) - Number(dto.amount)).toFixed(2);
          toAcc.balance = (Number(toAcc.balance) + Number(dto.amount)).toFixed(2);

        await accRepo.save([fromAcc, toAcc]);
      } else if (dto.accountId) {
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

      const tx = txRepo.create({ ...dto, amount: amount.toString(), tags });
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

      // reverse old effect
      if (tx.accountId) {
        const acc = await accRepo.findOne({ where: { id: tx.accountId, userId } });
        if (acc) {
          const sign = tx.type === 'income' ? -1 : 1;
          acc.balance = (Number(acc.balance) + sign * oldAmount).toFixed(2);
          await accRepo.save(acc);
        }
      }

      // apply new effect
      if (!dto.type && dto.categoryId) {
        const cat = await catRepo.findOne({ where: { id: dto.categoryId, userId } });
        if (!cat) throw new NotFoundException('Category not found');
        dto.type = cat.type;
      }

      if (dto.accountId) {
        const acc = await accRepo.findOne({ where: { id: dto.accountId, userId } });
        if (!acc) throw new NotFoundException('Account not found');
        const sign = dto.type === 'income' ? 1 : -1;
        acc.balance = (Number(acc.balance) + sign * newAmount).toFixed(2);
        await accRepo.save(acc);
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

      // Case 3️⃣ — Delete transaction itself
      await txRepo.delete(id);

      // ✅ If anything above fails, TypeORM rolls back automatically
      return { deleted: true };
    });
  }

}