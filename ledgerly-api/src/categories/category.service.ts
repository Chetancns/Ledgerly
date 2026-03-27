import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';

@Injectable()
export class CategoryService {
  constructor(@InjectRepository(Category) private repo: Repository<Category>) {}

  async create(userId: string, category: Partial<Category>): Promise<Category> {
    const cat = this.repo.create({
      ...category,
      userId: userId,
      createdAt: new Date,
      icon: "",
      IsDeleted: false, // ensure not deleted
    });
    return this.repo.save(cat);
  }

  async findAll(): Promise<Category[]> {
    return this.repo.find({ where: { IsDeleted: false } });
  }
  async findAllByUser(userId: string): Promise<Category[] |null >{
    return this.repo.find({ where: { userId, IsDeleted: false } });
  }
  async findOne(userId: string, id: string): Promise<Category | null> {
    return this.repo.findOne({ where: { id, userId, IsDeleted: false } });
  }

  async update(userId: string, id: string, category: Partial<Category>): Promise<Category |null> {
    const existing = await this.repo.findOne({ where: { id, userId, IsDeleted: false } });
    if (!existing) return null;
    await this.repo.update(id, category);
    return this.repo.findOne({ where: { id, userId, IsDeleted: false } });
  }

  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.repo.findOne({ where: { id, userId, IsDeleted: false } });
    if (!existing) return;
    // Soft delete: set IsDeleted to true
    await this.repo.update(id, { IsDeleted: true });
  }
}
