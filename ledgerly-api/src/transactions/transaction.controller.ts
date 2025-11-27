import { Controller, Get, Post, Body, Delete, Param, Query, UseGuards, Put } from '@nestjs/common';
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

   // Create a single transfer transaction
  return this.service.create({
    userId: user.userId,
    accountId: dto.from,
    toAccountId: dto.to, // Add this field to your entity/DTO
    categoryId: dto.cat,
    type: 'transfer',
    amount: dto.amount,
    description: dto.description,
    transactionDate: dto.date,
  });
}
  @Post()
  create(@GetUser() user: { userId: string, email: string, name: string }, @Body() dto: Partial<CreateTransactionDto>) {
    //console.log("Create is called ",user.userId,dto)
    dto.userId = user.userId;
    return this.service.create(dto);
  }

  @Put(':id')
update(
  @GetUser() user: { userId: string, email: string, name: string },
  @Param('id') id: string,
  @Body() dto: Partial<CreateTransactionDto>
) {
  return this.service.update(user.userId, id, dto);
}
  @Get('summary')
  async getSummary(
    @GetUser() user: { userId: string, email: string, name: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('categoryId') categoryId?: string,
    @Query('accountId') accountId?: string,
    @Query('type') type?: 'expense' | 'income' | 'savings' | 'transfer',
  ) {
    return this.service.getSummary(user.userId, { from, to, categoryId, accountId, type });
  }

  @Get()
  list(
    @GetUser() user: { userId: string, email: string, name: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('categoryId') categoryId?: string,
    @Query('accountId') accountId?:string,
    @Query('type') type?: 'expense' | 'income' | 'savings'|'transfer',
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : undefined;
    const takeNum = take ? parseInt(take, 10) : undefined;
    return this.service.findByUser(user.userId, { from, to, categoryId, accountId, type, skip: skipNum, take: takeNum });
  }

  @Delete(':id')
  remove(@GetUser() user: { userId: string, email: string, name: string }, @Param('id') id: string) {
    //console.log("delete",id,user);
    return this.service.delete(user.userId, id);
  }
}
