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
  findAll(): Promise<Category[]> {
    return this.categoryService.findAll();
  }
  @Get('categoryuser')
  findAllByUser(@GetUser() user: { userId: string, email: string, name: string }): Promise<Category[] | null>{
    return this.categoryService.findAllByUser(user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Category | null> {
    return this.categoryService.findOne(id);
  }

  @Post()
  create(@GetUser() user: { userId: string, email: string, name: string },@Body() category: Partial<Category>): Promise<Category> {
    return this.categoryService.create(user.userId,category);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() category:Partial<Category>): Promise<Category |null> {
    //console.log(category,id)
    return this.categoryService.update(id, category);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.categoryService.remove(id);
  }
}
