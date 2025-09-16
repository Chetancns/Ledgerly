// debts/debt-update.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Debt } from './debt.entity';

@Entity('dbo.debt_updates')
export class DebtUpdate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Debt, (d) => d.updates, { onDelete: 'CASCADE' })
  debt: Debt;

  @Column('uuid')
  debtId: string;

  @Column('date')
  dueDate: string; // The date this update corresponds to

  @Column('boolean', { default: false })
  applied: boolean;
}
