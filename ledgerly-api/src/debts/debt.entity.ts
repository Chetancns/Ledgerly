// debts/debt.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { User } from '../users/user.entity';
import { Account } from '../accounts/account.entity';
import { DebtUpdate } from './debt-update.entity';

export type DebtType = 'institutional' | 'borrowed' | 'lent';
export const DEBT_TYPES: DebtType[] = ['institutional', 'borrowed', 'lent'];

@Entity('dbo.debts')
export class Debt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (u) => u.debts, { onDelete: 'CASCADE' })
  user: User;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  account: Account;

  @Column('uuid')
  accountId: string;

  @Column({ type: 'enum', enum: DEBT_TYPES, default: 'institutional' })
  debtType: DebtType;

  @Column({ nullable: true })
  personName?: string; // For borrowed/lent debts: person's name

  @Column()
  name: string; // "Chase Credit Card" or "Car Loan" or description
  @Column('decimal', { precision: 12, scale: 2 })
  principal: number;
  @Column('numeric', { precision: 12, scale: 2, default: 0 })
  currentBalance: string;
  @Column({ type: 'int', nullable: true })
  term: number; 
  @Column('numeric', { precision: 12, scale: 2, nullable: true })
  installmentAmount: string; // amount due each cycle (optional for P2P debts)

  @Column({ type: 'enum', enum: ['weekly', 'biweekly', 'monthly'], nullable: true })
  frequency: 'weekly' | 'biweekly' | 'monthly';

  @Column('date')
  startDate: string; // when payments started

  @Column('date', { nullable: true })
  nextDueDate: string; 

  @OneToMany(() => DebtUpdate, update => update.debt)
updates: DebtUpdate[];
}
