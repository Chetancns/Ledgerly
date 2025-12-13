import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, DataSource } from 'typeorm';
import { Transaction } from './transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { Account } from '../accounts/account.entity';
import { Category } from '../categories/category.entity';
import { withTransaction } from '../utils/transaction.util';
import { parseSafeAmount } from 'src/utils/number.util';
@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
    @InjectRepository(Account) private accRepo: Repository<Account>,
    @InjectRepository(Category) private catRepo: Repository<Category>,
    @InjectDataSource() private dataSource: DataSource,
  ) {}

 // ✅ CREATE
  async create(dto: Partial<Transaction>) {
    return withTransaction(this.dataSource, async (manager) => {
      const txRepo = manager.withRepository(this.txRepo);
      const accRepo = manager.withRepository(this.accRepo);
      const catRepo = manager.withRepository(this.catRepo);

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

      const tx = txRepo.create({ ...dto, amount: amount.toString() });
      return txRepo.save(tx);
    });
  }
  
// ✅ UPDATE
  async update(userId: string, id: string, dto: Partial<Transaction>) {
    return withTransaction(this.dataSource, async (manager) => {
      const txRepo = manager.withRepository(this.txRepo);
      const accRepo = manager.withRepository(this.accRepo);
      const catRepo = manager.withRepository(this.catRepo);

      const tx = await txRepo.findOne({ where: { id, userId } });
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
      isReimbursable?: boolean;
      settlementGroupId?: string;
      counterpartyName?: string;
      skip?: number;
      take?: number;
    }
  ) {
    const where:  Partial<Record<keyof Transaction, any>> = { userId };
    if (filters?.from && filters?.to) where.transactionDate = Between(filters.from, filters.to);
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.accountId) where.accountId = filters.accountId;
    if (filters?.type) where.type = filters.type;
    if (filters?.isReimbursable !== undefined) where.isReimbursable = filters.isReimbursable;
    if (filters?.settlementGroupId) where.settlementGroupId = filters.settlementGroupId;
    if (filters?.counterpartyName) where.counterpartyName = filters.counterpartyName;
    
    const order = { transactionDate: 'DESC' as const, createdAt: 'DESC' as const };
    
    // If pagination is requested, return paginated results with total count
    if (filters?.skip !== undefined || filters?.take !== undefined) {
      const [data, total] = await this.txRepo.findAndCount({
        where,
        order,
        skip: filters.skip,
        take: filters.take || 50, // Default page size of 50
      });
      return { data, total, skip: filters.skip || 0, take: filters.take || 50 };
    }
    
    // Otherwise return all results (backward compatibility)
    return this.txRepo.find({ where, order });
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

  /**
   * Create a settlement for a group of reimbursable transactions
   */
  async createSettlement(userId: string, settlementGroupId: string, settlementAmount: string, settlementDate: string, notes?: string) {
    // Find all transactions in this settlement group
    const transactions = await this.txRepo.find({
      where: {
        userId,
        settlementGroupId,
        isReimbursable: true,
      },
    });

    if (transactions.length === 0) {
      throw new NotFoundException('No reimbursable transactions found for this settlement group');
    }

    const amount = parseSafeAmount(settlementAmount);
    if (!amount) throw new BadRequestException('Invalid settlement amount');

    // Calculate total pending reimbursement
    const totalPending = transactions.reduce((sum, tx) => {
      const txAmount = Number(tx.amount);
      const reimbursed = Number(tx.reimbursedAmount);
      return sum + (txAmount - reimbursed);
    }, 0);

    if (amount > totalPending) {
      throw new BadRequestException('Settlement amount exceeds pending reimbursement total');
    }

    // Distribute settlement proportionally across transactions and collect updates
    const updatedTransactions: Transaction[] = [];
    let remainingAmount = amount;
    
    for (const tx of transactions) {
      const txAmount = Number(tx.amount);
      const alreadyReimbursed = Number(tx.reimbursedAmount);
      const pending = txAmount - alreadyReimbursed;

      if (pending > 0 && remainingAmount > 0) {
        const toReimburse = Math.min(pending, remainingAmount);
        tx.reimbursedAmount = (alreadyReimbursed + toReimburse).toFixed(2);
        remainingAmount -= toReimburse;
        updatedTransactions.push(tx);
      }
    }

    // Batch save all updated transactions
    if (updatedTransactions.length > 0) {
      await this.txRepo.save(updatedTransactions);
    }

    return {
      settlementGroupId,
      settledAmount: amount.toFixed(2),
      settledDate: settlementDate,
      transactionsUpdated: updatedTransactions.length,
      notes,
    };
  }

  /**
   * Mark a transaction as reimbursable
   */
  async markReimbursable(userId: string, id: string, counterpartyName: string, settlementGroupId?: string) {
    const tx = await this.txRepo.findOne({ where: { id, userId } });
    if (!tx) throw new NotFoundException('Transaction not found');

    tx.isReimbursable = true;
    tx.counterpartyName = counterpartyName;
    tx.settlementGroupId = settlementGroupId || null;
    tx.reimbursedAmount = '0';

    return this.txRepo.save(tx);
  }

}