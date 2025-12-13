// debts/debt.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Account } from '../accounts/account.entity';
import { DebtUpdate } from './debt-update.entity';

@Entity('dbo.debts')
export class Debt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (u) => u.debts, { onDelete: 'CASCADE' })
  user: User;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => Account, { onDelete: 'CASCADE', nullable: true })
  account: Account;

  @Column({ type: 'uuid', nullable: true })
  accountId: string;

  @Column()
  name: string; // "Chase Credit Card" or "Car Loan"
  
  @Column('decimal', { precision: 12, scale: 2 })
  principal: number;
  
  @Column('numeric', { precision: 12, scale: 2, default: 0 })
  currentBalance: string;
  
  @Column({ type: 'int', nullable: true })
  term: number; 
  
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  installmentAmount: string; // amount due each cycle

  @Column({ type: 'enum', enum: ['weekly', 'biweekly', 'monthly'], nullable: true })
  frequency: 'weekly' | 'biweekly' | 'monthly';

  @Column({ type: 'date', nullable: true })
  startDate: string; // when payments started

  @Column({ type: 'date', nullable: true })
  nextDueDate: string;

  // New fields for lending/borrowing
  @Column({ type: 'enum', enum: ['lent', 'borrowed', 'institutional'], default: 'institutional' })
  role: 'lent' | 'borrowed' | 'institutional';
  
  @Column({ type: 'varchar', length: 200, nullable: true })
  counterpartyName?: string;
  
  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  paidAmount: string;
  
  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  adjustmentTotal: string;
  
  @Column({ type: 'date', nullable: true })
  dueDate?: string;
  
  @Column({ type: 'enum', enum: ['open', 'settled', 'overdue'], default: 'open' })
  status: 'open' | 'settled' | 'overdue';
  
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => DebtUpdate, update => update.debt)
  updates: DebtUpdate[];
}
