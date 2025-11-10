// src/recurring/recurring.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Account } from '../accounts/account.entity';
import { Category } from '../categories/category.entity';
import type { TxType } from '../transactions/transaction.entity';

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type RecurringStatus = 'active' | 'paused';

@Entity('dbo.recurring_transactions')
export class RecurringTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (u) => u.recurring, { onDelete: 'CASCADE' })
  user: User;

  @Index()
  @Column('uuid')
  userId: string;

  @ManyToOne(() => Account, { onDelete: 'SET NULL', nullable: true })
  account: Account;

  @Column({ type: 'uuid', nullable: true })
  accountId: string | null;

  @ManyToOne(() => Category, { onDelete: 'SET NULL', nullable: true })
  category: Category;

  @Column({ type: 'uuid', nullable: true })
  categoryId: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 20 })
  type: TxType;

  @Column({ type: 'varchar', length: 20 })
  frequency: Frequency;

  @Column({ type: 'date' })
  nextOccurrence: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 10, default: 'active' })
  status: RecurringStatus; // ✅ new column

  @CreateDateColumn()
  createdAt: Date;
}
