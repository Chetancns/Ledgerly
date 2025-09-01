import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';

export type AccountType = 'bank' | 'cash' | 'credit_card' | 'wallet' | 'savings';

@Entity('dbo.accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid') id: string;

  @ManyToOne(() => User, (u) => u.accounts, { onDelete: 'CASCADE' })
  user: User;

  @Index()
  @Column('uuid')
  userId: string;

  @Column({ length: 100 }) name: string;

  @Column({ type: 'varchar', length: 30 }) type: AccountType;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  balance: string;

  @Column({ length: 10, default: 'USD' }) currency: string;

  @CreateDateColumn() createdAt: Date;
}
