import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';

export type NotificationType = 'transaction_posted' | 'budget_alert' | 'recurring_created' | 'general';

@Entity('dbo.notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid') id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Index() @Column('uuid') userId: string;

  @Column({ type: 'varchar', length: 50 }) type: NotificationType;

  @Column({ type: 'varchar', length: 255 }) title: string;

  @Column({ type: 'text' }) message: string;

  @Column({ type: 'boolean', default: false }) isRead: boolean;

  @Column({ type: 'jsonb', nullable: true }) metadata?: any; // Store additional data like transaction ID, etc.

  @CreateDateColumn() createdAt: Date;

  constructor(partial: Partial<Notification>) {
    Object.assign(this, partial);
  }
}
