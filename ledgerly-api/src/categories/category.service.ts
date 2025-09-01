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
      icon:"",
    });
    return this.repo.save(cat);
  }

  async findAll(): Promise<Category[]> {
    return this.repo.find();
  }
  async findAllByUser(userId: string): Promise<Category[] |null >{
    return this.repo.find({ where: { userId } });
  }
  async findOne(id: string): Promise<Category | null> {
    return this.repo.findOne({ where: { id } });
  }

  async update(id: string, category: Partial<Category>): Promise<Category |null> {
    await this.repo.update(id, category);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
