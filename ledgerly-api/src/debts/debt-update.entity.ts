// debts/debt-update.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Debt } from './debt.entity';
import { Transaction } from '../transactions/transaction.entity';

export type DebtUpdateIntent = 'payment' | 'promise' | 'reminder' | 'note';
export const DEBT_UPDATE_INTENTS: DebtUpdateIntent[] = ['payment', 'promise', 'reminder', 'note'];

@Entity('dbo.debt_updates')
export class DebtUpdate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  debtId: string;

  @ManyToOne(() => Debt, debt => debt.updates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'debtId' })
  debt: Debt;

  @Column({ type: 'date' })
  updateDate: string;

  @Column('numeric', { precision: 12, scale: 2 })
  amount: string; // Amount paid in this update

  @Column({ nullable: true })
  transactionId: string;

  @ManyToOne(() => Transaction, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'transactionId' })
  transaction?: Transaction;

  @Column({ type: 'enum', enum: DEBT_UPDATE_INTENTS, default: 'payment' })
  intent: DebtUpdateIntent;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'enum', enum: ['paid', 'pending', 'skipped'], default: 'pending' })
  status: 'paid' | 'pending' | 'skipped';
}
