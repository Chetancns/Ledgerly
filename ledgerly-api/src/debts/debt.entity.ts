// debts/debt.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
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

  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  account: Account;

  @Column('uuid')
  accountId: string;

  @Column()
  name: string; // "Chase Credit Card" or "Car Loan"
  @Column('decimal', { precision: 12, scale: 2 })
  principal: number;
  @Column('numeric', { precision: 12, scale: 2, default: 0 })
  currentBalance: string;
  @Column({ type: 'int', nullable: true })
  term: number; 
  @Column('numeric', { precision: 12, scale: 2 })
  installmentAmount: string; // amount due each cycle

  @Column({ type: 'enum', enum: ['weekly', 'biweekly', 'monthly'] })
  frequency: 'weekly' | 'biweekly' | 'monthly';

  @Column('date')
  startDate: string; // when payments started

  @Column('date')
  nextDueDate: string; 

  @OneToMany(() => DebtUpdate, update => update.debt)
updates: DebtUpdate[];
}
