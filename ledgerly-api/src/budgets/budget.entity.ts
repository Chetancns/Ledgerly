import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Category } from '../categories/category.entity';

export type BudgetPeriod = 'monthly' | 'weekly' | 'yearly';

@Entity('budgets')
export class Budget {
  @PrimaryGeneratedColumn('uuid') id: string;

  @ManyToOne(() => User, (u) => u.budgets, { onDelete: 'CASCADE' })
  user: User;

  @Index() @Column('uuid') userId: string;

  @ManyToOne(() => Category, { onDelete: 'SET NULL', nullable: true })
  category: Category;

  @Column({ type: 'uuid', nullable: true }) categoryId: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2 }) amount: string;

  @Column({ type: 'varchar', length: 20 }) period: BudgetPeriod;

  @Column({ type: 'date', nullable: true }) startDate?: string;

  @Column({ type: 'date', nullable: true }) endDate?: string;

  @CreateDateColumn() createdAt: Date;
}
