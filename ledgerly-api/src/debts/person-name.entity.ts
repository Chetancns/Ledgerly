import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('dbo.person_names')
export class PersonName {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Index()
  @Column('uuid')
  userId: string;

  @Index()
  @Column()
  name: string;

  @CreateDateColumn()
  createdAt: Date;
}
