import { Controller, Get, Post, Body, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transaction.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUser } from '../common/decorators/user.decorator'

@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {
    console.log("T is called")
  }

  @Post()
  create(@GetUser() user: { userId: string, email: string, name: string }, @Body() dto: Partial<CreateTransactionDto>) {
    console.log("Createis called ",user.userId,dto)
    dto.userId = user.userId;
    return this.service.create(dto);
  }

  @Get()
  list(
    @GetUser() user: { userId: string, email: string, name: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('categoryId') categoryId?: string,
    @Query('type') type?: 'expense' | 'income',
  ) {
    console.log(user);
    return this.service.findByUser(user.userId, { from, to, categoryId, type });
  }

  @Delete(':id')
  remove(@GetUser() user: { userId: string, email: string, name: string }, @Param('id') id: string) {
    return this.service.delete(user.userId, id);
  }
}
