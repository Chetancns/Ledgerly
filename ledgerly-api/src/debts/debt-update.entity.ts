// debts/debt-update.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Debt } from './debt.entity';
import { Transaction } from '../transactions/transaction.entity';

@Entity('dbo.debt_updates')
export class DebtUpdate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  debtId: string;

  @ManyToOne(() => Debt, debt => debt.updates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'debtId' })
  debt: Debt;

  @Column({ type: 'date' })
  updateDate: string;

  @Column({ nullable: true })
  transactionId: string;

  @ManyToOne(() => Transaction, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'transactionId' })
  transaction?: Transaction;

  @Column({ type: 'enum', enum: ['paid', 'pending', 'skipped'], default: 'pending' })
  status: 'paid' | 'pending' | 'skipped';
}
