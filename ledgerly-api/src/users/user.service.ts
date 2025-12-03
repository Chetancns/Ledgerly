import { Injectable, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UpdateUserDto } from './dto/UpdateUserDto';

@Injectable()
export class UserService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  async findByEmail(email: string): Promise<User | null> {
    
    return this.repo.findOne({ where: { email } });
  }

  async create(user: Partial<User>): Promise<User> {
    return this.repo.save(this.repo.create(user));
  }

  async findAll(): Promise<User[]> {
    return this.repo.find();
  }

  async findOne(id: string): Promise<User |null> {
    return this.repo.findOne({ where: { id } });
  }
  async getCurrency(id: string): Promise<string> {
    const user = await this.repo.findOne({
      where: { id },
      select: ['currency'], // only fetch currency column
    });
    if (!user) throw new Error('User not found');
    return user.currency;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User | null> {
    const user = await this.findOne(id);
    if (!user) throw new BadRequestException('User not found');

    // Handle email change: ensure uniqueness
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existing = await this.findByEmail(updateUserDto.email);
      if (existing && existing.id !== id) {
        throw new BadRequestException('Email is already in use');
      }
    }

    // Handle password change
    if (updateUserDto.password) {
      // Optionally verify current password if provided
      if (updateUserDto.currentPassword) {
        const ok = await bcrypt.compare(updateUserDto.currentPassword, user.passwordHash);
        if (!ok) {
          throw new BadRequestException('Current password is incorrect');
        }
        user.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
      } else {
        // If no currentPassword provided, still allow set (e.g., admin or first-time set)
        user.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
      }
    }

    user.name = updateUserDto.name ?? user.name;
    user.email = updateUserDto.email ?? user.email;
    user.currency = updateUserDto.currency ?? user.currency;
    user.updatedAt = new Date();

    await this.repo.save(user);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
