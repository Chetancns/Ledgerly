/* eslint-disable prettier/prettier */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Account } from '../accounts/account.entity';
import { Category } from '../categories/category.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Budget } from '../budgets/budget.entity';
import { RecurringTransaction } from '../recurring/recurring.entity';
import { Debt } from '../debts/debt.entity';
import { Tag } from '../tags/tag.entity';

@Entity('dbo.users')
export class User {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ length: 100, nullable: true }) name?: string;

  @Index({ unique: true })
  @Column({ length: 150 })
  email: string;

  @Column('text') passwordHash: string;

  @Column({ type: 'text', nullable: true })
  refreshTokenHash?: string;

  @Column({ length: 10, default: 'USD' }) currency: string;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;

  @OneToMany(() => Account, (a) => a.user) accounts: Account[];
  @OneToMany(() => Category, (c) => c.user) categories: Category[];
  @OneToMany(() => Transaction, (t) => t.user) transactions: Transaction[];
  @OneToMany(() => Budget, (b) => b.user) budgets: Budget[];
  @OneToMany(()=> Debt,(d)=>d.user) debts:Debt[];
  @OneToMany(() => RecurringTransaction, (r) => r.user)
  recurring: RecurringTransaction[];
  @OneToMany(() => Tag, (tag) => tag.user) tags: Tag[];
}
