import { Controller, Get, Post, Body, Delete, Param, Query, UseGuards, Put, Patch } from '@nestjs/common';
import { TransactionsService } from './transaction.service';
import { CreateTransactionDto, TransferDto, SettlementDto } from './dto/create-transaction.dto';
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

  /** Mark a transaction as reimbursable */
  @Patch(':id/reimbursable')
  markReimbursable(
    @GetUser() user: { userId: string },
    @Param('id') id: string,
    @Body() body: { counterpartyName: string; settlementGroupId?: string }
  ) {
    return this.service.markReimbursable(user.userId, id, body.counterpartyName, body.settlementGroupId);
  }

  /** Create a settlement for a group of transactions */
  @Post('/settlements')
  createSettlement(
    @GetUser() user: { userId: string },
    @Body() dto: SettlementDto
  ) {
    return this.service.createSettlement(user.userId, dto.settlementGroupId, dto.amount, dto.date, dto.notes);
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
    @Query('isReimbursable') isReimbursable?: string,
    @Query('settlementGroupId') settlementGroupId?: string,
    @Query('counterpartyName') counterpartyName?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : undefined;
    const takeNum = take ? parseInt(take, 10) : undefined;
    const isReimbursableBool = isReimbursable === 'true' ? true : isReimbursable === 'false' ? false : undefined;
    return this.service.findByUser(user.userId, { 
      from, 
      to, 
      categoryId, 
      accountId, 
      type, 
      isReimbursable: isReimbursableBool,
      settlementGroupId,
      counterpartyName,
      skip: skipNum, 
      take: takeNum 
    });
  }

  @Delete(':id')
  remove(@GetUser() user: { userId: string, email: string, name: string }, @Param('id') id: string) {
    //console.log("delete",id,user);
    return this.service.delete(user.userId, id);
  }

  /** Get unique counterparties */
  @Get('counterparties')
  getCounterparties(@GetUser() user: { userId: string }) {
    return this.service.getCounterparties(user.userId);
  }

  /** Get unique settlement groups */
  @Get('settlement-groups')
  getSettlementGroups(@GetUser() user: { userId: string }) {
    return this.service.getSettlementGroups(user.userId);
  }
}
