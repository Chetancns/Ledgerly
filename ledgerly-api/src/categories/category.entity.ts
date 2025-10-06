import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';

export type CategoryType = 'expense' | 'income' | 'savings' ;

@Entity('dbo.categories')
export class Category {
  @PrimaryGeneratedColumn('uuid') id: string;

  @ManyToOne(() => User, (u) => u.categories, { onDelete: 'CASCADE' })
  user: User;

  @Index() @Column('uuid') userId: string;

  @Column({ length: 100 }) name: string;

  @Column({ type: 'varchar', length: 20 }) type: CategoryType;

  @Column({ length: 50, nullable: true }) icon?: string;

  @CreateDateColumn() createdAt: Date;

  @Column({ type: 'boolean', default: false}) IsDeleted: boolean;
}
