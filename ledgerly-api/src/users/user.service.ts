import { Injectable } from '@nestjs/common';
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
    // Log just for debugging
    //console.log(`Updating user ${id} with data:`, updateUserDto);
    await this.repo.update(id, {
    ...updateUserDto,
    updatedAt: new Date(),
  });
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
