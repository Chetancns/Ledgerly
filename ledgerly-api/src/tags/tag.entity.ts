import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToMany,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Transaction } from '../transactions/transaction.entity';

@Entity('dbo.tags')
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (u) => u.tags, { onDelete: 'CASCADE' })
  user: User;

  @Index()
  @Column('uuid')
  userId: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  normalizedName: string; // For case-insensitive search

  @Column({ type: 'varchar', length: 20, default: '#3B82F6' })
  color: string; // Hex color code for UI

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean; // Soft delete to preserve history

  @ManyToMany(() => Transaction, (transaction) => transaction.tags)
  transactions: Transaction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  constructor(partial: Partial<Tag>) {
    Object.assign(this, partial);
  }
}
