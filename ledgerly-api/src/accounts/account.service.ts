import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from './account.entity';
import { CreateAccountDto } from './dto/CreateAccountDto';
import { UserService } from '../users/user.service';

@Injectable()
export class AccountService {
    constructor(@InjectRepository(Account) private repo: Repository<Account>,private userService: UserService) { }

  async create(id: string,account: Partial<CreateAccountDto>): Promise<Account> {
    const cur = this.userService.getCurrency(id);
    const acc = this.repo.create({
      ...account,
      userId:id,
      currency: (await cur).toString() || "USD",
      createdAt: new Date(),
      IsDeleted: false, // ensure not deleted
    });
    //console.log(acc);

    return this.repo.save(acc);
  }

  async findAll(): Promise<Account[]> {
    return this.repo.find({ where: { IsDeleted: false } });
  }

  async findOne(userId: string, id: string): Promise<Account | null> {
    return this.repo.findOne({ where: { id, userId, IsDeleted: false } });
  }

  async update(userId: string, id: string, account: Partial<Account>): Promise<Account | null> {
    const existing = await this.repo.findOne({ where: { id, userId, IsDeleted: false } });
    if (!existing) return null;
    await this.repo.update(id, account);
    return this.repo.findOne({ where: { id, userId, IsDeleted: false } });
  }

  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.repo.findOne({ where: { id, userId, IsDeleted: false } });
    if (!existing) return;
    // Soft delete: set IsDeleted to true
    await this.repo.update(id, { IsDeleted: true });
  }

  async findAllByUser(userId: string): Promise<Account[] | null>{
    //console.log(userId)
    return this.repo.find({ where: { userId:userId, IsDeleted: false } });
  }
}
