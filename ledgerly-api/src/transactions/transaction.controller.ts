import { Controller, Get, Post, Body, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transaction.service';
import { CreateTransactionDto ,TransferDto} from './dto/create-transaction.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUser } from '../common/decorators/user.decorator'

@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {
  }

  
@Post('/transfers')
async transfer(
  @GetUser() user: { userId: string },
  @Body() dto: TransferDto
) {
  const now = new Date().toISOString();

  // Debit bank account
  const debit = await this.service.create({
    userId: user.userId,
    accountId: dto.from,
    categoryId: dto.cat,
    type: 'expense',
    amount: dto.amount,
    description: `Amount debited for ${dto.amount}`,
    transactionDate: now,
  });

  // Credit credit card account
  const credit = await this.service.create({
    userId: user.userId,
    accountId: dto.to,
    categoryId: dto.cat,
    type: 'income',
    amount: dto.amount,
    description: `Amount credited with ${dto.amount}`,
    transactionDate: now,
  });

  return { message: 'Transfer successful', debit, credit };
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
    console.log("delete",id,user);
    return this.service.delete(user.userId, id);
  }
}
