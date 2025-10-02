import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Account } from '../accounts/account.entity';
import { Category } from '../categories/category.entity';
import { DebtUpdate } from 'src/debts/debt-update.entity';

export type TxType = 'expense' | 'income' | 'savings' | 'transfer';

@Entity('dbo.transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid') id: string;

  @ManyToOne(() => User, (u) => u.transactions, { onDelete: 'CASCADE' })
  user: User;

  @Index() @Column('uuid') userId: string;

  @ManyToOne(() => Account, { onDelete: 'SET NULL', nullable: true })
  account: Account;

  @Column({ type: 'uuid', nullable: true }) accountId: string | null;

  @ManyToOne(() => Category, { onDelete: 'SET NULL', nullable: true })
  category: Category;

  @Column({ type: 'uuid', nullable: true }) categoryId: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2 }) amount: string;

  @Column({ type: 'varchar', length: 20 }) type: TxType;

  @Column({ type: 'text', nullable: true }) description?: string;

  @Index() @Column({ type: 'date' }) transactionDate: string;

  @Column({ type:'uuid', nullable: true }) toAccountId: string | null;
  @CreateDateColumn() createdAt: Date;
  constructor(partial: Partial<Transaction>) {
    Object.assign(this, partial);
  }

  @OneToMany(() => DebtUpdate, (u) => u.debt, { cascade: true })
    updates: DebtUpdate[];
}
