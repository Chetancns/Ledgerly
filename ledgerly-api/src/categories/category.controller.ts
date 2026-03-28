import { Controller, Get, Post, Body, Param, Put, Delete,UseGuards } from '@nestjs/common';
import { CategoryService } from './category.service';
import { Category } from './category.entity';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUser } from '../common/decorators/user.decorator';
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  findAll(@GetUser() user: { userId: string }): Promise<Category[] | null> {
    return this.categoryService.findAllByUser(user.userId);
  }

  @Get(':id')
  findOne(@GetUser() user: { userId: string }, @Param('id') id: string): Promise<Category | null> {
    return this.categoryService.findOne(user.userId, id);
  }

  @Post()
  create(@GetUser() user: { userId: string, email: string, name: string },@Body() category: Partial<Category>): Promise<Category> {
    return this.categoryService.create(user.userId,category);
  }

  @Put(':id')
  update(@GetUser() user: { userId: string }, @Param('id') id: string, @Body() category:Partial<Category>): Promise<Category |null> {
    return this.categoryService.update(user.userId, id, category);
  }

  @Delete(':id')
  remove(@GetUser() user: { userId: string }, @Param('id') id: string): Promise<void> {
    return this.categoryService.remove(user.userId, id);
  }
}
