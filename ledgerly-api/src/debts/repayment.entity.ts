// debts/repayment.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Debt } from './debt.entity';

@Entity('dbo.repayments')
export class Repayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  debtId: string;

  @ManyToOne(() => Debt, debt => debt.updates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'debtId' })
  debt: Debt;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  adjustmentAmount: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;
}
