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
    if (dto.type === 'transfer' || dto.type === 'savings') {
  const fromAcc = await this.accRepo.findOne({ where: { id: dto.accountId, userId: dto.userId } });
  const toAcc = await this.accRepo.findOne({ where: { id: dto.toAccountId!, userId: dto.userId } });
  const toPart = toAcc?.name ? `to ${toAcc.name}` : '';
  const descPart = dto.description ? `for ${dto.description}` : '';
  dto.description = ['Transfer', toPart, descPart].filter(Boolean).join(' ').trim();
  if (!fromAcc || !toAcc) throw new NotFoundException('Account not found');
  // Optionally: check if toAcc.type === 'savings' when dto.type === 'savings'
  fromAcc.balance = (Number(fromAcc.balance) - Number(dto.amount)).toFixed(2);
  toAcc.balance = (Number(toAcc.balance) + Number(dto.amount)).toFixed(2);
  await this.accRepo.save([fromAcc, toAcc]);
  const tx = this.txRepo.create({ ...dto });
  return this.txRepo.save(tx);
}
    if (dto.accountId) {
      account = await this.accRepo.findOne({ where: { id: dto.accountId, userId: dto.userId } });
      if (!account) throw new NotFoundException('Account not found');
      const sign = dto.type === 'income' ? 1 : -1;
      const newBal = (Number(account.balance) + sign * Number(dto.amount)).toFixed(2);
      await this.accRepo.update(account.id, { balance: newBal });
    }

    const tx = this.txRepo.create({ ...dto });
    return this.txRepo.save(tx);
  }
  
  async update(userId: string, id: string, dto: Partial<CreateTransactionDto>) {
    //console.log("Update is called in service",userId,id,dto); 
    const tx = await this.txRepo.findOne({ where: { id, userId } });
  if (!tx) throw new NotFoundException('Transaction not found');

  // Handle transfer/savings: reverse old balances on both accounts
  if (tx.type === 'transfer' || tx.type === 'savings') {
    const oldFromAcc = tx.accountId
      ? await this.accRepo.findOne({ where: { id: tx.accountId, userId } })
      : null;
    const oldToAcc = tx.toAccountId
      ? await this.accRepo.findOne({ where: { id: tx.toAccountId, userId } })
      : null;
    if (oldFromAcc) {
      oldFromAcc.balance = (Number(oldFromAcc.balance) + Number(tx.amount)).toFixed(2);
      await this.accRepo.save(oldFromAcc);
    }
    if (oldToAcc) {
      oldToAcc.balance = (Number(oldToAcc.balance) - Number(tx.amount)).toFixed(2);
      await this.accRepo.save(oldToAcc);
    }
  } else if (tx.accountId) {
    // Reverse old balance for normal expense/income
    const oldAcc = await this.accRepo.findOne({ where: { id: tx.accountId, userId } });
    if (oldAcc) {
      const oldSign = tx.type === 'income' ? 1 : -1;
      const revertedBalance = (Number(oldAcc.balance) - oldSign * Number(tx.amount)).toFixed(2);
      await this.accRepo.update(oldAcc.id, { balance: revertedBalance });
    }
  }

  // If category changes and type not provided, infer type from category
  if (!dto.type && dto.categoryId) {
    const category = await this.catRepo.findOne({ where: { id: dto.categoryId, userId } });
    if (!category) throw new NotFoundException('Category not found');
    dto.type = category.type;
  }

  // Apply new balances for transfer/savings
  if (dto.type === 'transfer' || dto.type === 'savings') {
    const newFromAcc = dto.accountId
      ? await this.accRepo.findOne({ where: { id: dto.accountId, userId } })
      : null;
    const newToAcc = dto.toAccountId
      ? await this.accRepo.findOne({ where: { id: dto.toAccountId, userId } })
      : null;
    if (!newFromAcc || !newToAcc) throw new NotFoundException('Account not found');
    newFromAcc.balance = (Number(newFromAcc.balance) - Number(dto.amount)).toFixed(2);
    newToAcc.balance = (Number(newToAcc.balance) + Number(dto.amount)).toFixed(2);
    await this.accRepo.save([newFromAcc, newToAcc]);
  } else if (dto.accountId) {
    // Apply new balance for normal expense/income
    const newAcc = await this.accRepo.findOne({ where: { id: dto.accountId, userId } });
    if (!newAcc) throw new NotFoundException('Account not found');
    const newSign = dto.type === 'income'  ? 1 : -1;
    const newBalance = (Number(newAcc.balance) + newSign * Number(dto.amount)).toFixed(2);
    await this.accRepo.update(newAcc.id, { balance: newBalance });
  }

  // Update transaction itself
  Object.assign(tx, dto);
  return this.txRepo.save(tx);
}

  async findByUser(userId: string, filters?: { from?: string; to?: string; categoryId?: string; accountId?:string;type?: 'expense'|'income' | 'savings'|'transfer' }) {
    const where:  Partial<Record<keyof Transaction, any>> = { userId };
    if (filters?.from && filters?.to) where.transactionDate = Between(filters.from, filters.to);
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.accountId) where.accountId = filters.accountId;
    if (filters?.type) where.type = filters.type;
    //console.log(where);
    return this.txRepo.find({ where, order: { transactionDate: 'DESC', createdAt: 'DESC' } });
  }

  async delete(userId: string, id: string) {
  const tx = await this.txRepo.findOne({ where: { id, userId } });
  if (!tx) throw new NotFoundException('Transaction not found');

  if (tx.type === 'transfer' || tx.type === 'savings') {
    // Reverse both accounts for transfer/savings
    const fromAcc = tx.accountId
      ? await this.accRepo.findOne({ where: { id: tx.accountId, userId } })
      : null;
    const toAcc = tx.toAccountId
      ? await this.accRepo.findOne({ where: { id: tx.toAccountId, userId } })
      : null;
    if (fromAcc) {
      fromAcc.balance = (Number(fromAcc.balance) + Number(tx.amount)).toFixed(2);
      await this.accRepo.save(fromAcc);
    }
    if (toAcc) {
      toAcc.balance = (Number(toAcc.balance) - Number(tx.amount)).toFixed(2);
      await this.accRepo.save(toAcc);
    }
  } else if (tx.accountId) {
    // Reverse balance impact if an account is attached (normal expense/income)
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
