import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Transaction } from './transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { Account } from '../accounts/account.entity';
import { Category } from '../categories/category.entity';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
    @InjectRepository(Account) private accRepo: Repository<Account>,
    @InjectRepository(Category) private catRepo: Repository<Category>,
  ) {}

  async create(dto: Partial<CreateTransactionDto>) {
    // Update account balance atomically-ish (simple approach)
    let category: Category|null = null;
    if (!dto.type) {
      category = await this.catRepo.findOne({ where: { id: dto.categoryId, userId: dto.userId } });
      if (!category) throw new NotFoundException('Category not found');
      dto.type = category.type;
    }
    let account: Account | null = null;
    if (dto.accountId) {
      account = await this.accRepo.findOne({ where: { id: dto.accountId, userId: dto.userId } });
      if (!account) throw new NotFoundException('Account not found');
      const sign = dto.type === 'income' || dto.type === 'savings' ? 1 : -1;
      const newBal = (Number(account.balance) + sign * Number(dto.amount)).toFixed(2);
      await this.accRepo.update(account.id, { balance: newBal });
    }

    const tx = this.txRepo.create({ ...dto });
    return this.txRepo.save(tx);
  }

  async findByUser(userId: string, filters?: { from?: string; to?: string; categoryId?: string; type?: 'expense'|'income' }) {
    const where:  Partial<Record<keyof Transaction, any>> = { userId };
    if (filters?.from && filters?.to) where.transactionDate = Between(filters.from, filters.to);
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.type) where.type = filters.type;
    return this.txRepo.find({ where, order: { transactionDate: 'DESC', createdAt: 'DESC' } });
  }

  async delete(userId: string, id: string) {
    const tx = await this.txRepo.findOne({ where: { id, userId } });
    console.log(tx);
    if (!tx) throw new NotFoundException('Transaction not found');

    // Reverse balance impact if an account is attached
    if (tx.accountId) {
      console.log("delete account called");
      const acc = await this.accRepo.findOne({ where: { id: tx.accountId, userId } });
      if (acc) {
        const sign = tx.type === 'income' ? -1 : 1;
        const newBal = (Number(acc.balance) + sign * Number(tx.amount)).toFixed(2);
        await this.accRepo.update(acc.id, { balance: newBal });
      }
    }
    await this.txRepo.delete(id);
    return { deleted: true };
  }
}
