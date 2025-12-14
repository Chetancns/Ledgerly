// debts/debt.controller.ts
import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { DebtService } from './debt.service';
import { GetUser } from '../common/decorators/user.decorator'
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CreateDebtDto, AddRepaymentDto, UpdateDebtDto } from './dto/debt.dto';

@UseGuards(JwtAuthGuard)
@Controller('debts')
export class DebtController {
  constructor(private readonly debtService: DebtService) {}

  /** ➕ Create a new debt */
  @Post()
  async createDebt(@GetUser() user: { userId: string }, @Body() body: CreateDebtDto) {
    const userId = user.userId;
    return this.debtService.createDebts(userId, body);
  }

  /** 📋 List all debts + progress */
  @Get()
  async getDebts(
    @GetUser() user: { userId: string },
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('counterpartyName') counterpartyName?: string
  ) {
    const userId = user.userId;
    return this.debtService.getDebt(userId, { role, status, counterpartyName });
  }

  /** ✏️ Update debt details */
  @Put(':id')
  async updateDebt(
    @GetUser() user: { userId: string },
    @Param('id') id: string,
    @Body() body: UpdateDebtDto
  ) {
    const userId = user.userId;
    return this.debtService.updateDebt(userId, id, body);
  }

  /** 🗑️ Delete debt */
  @Delete(':id')
  async deleteDebt(
    @GetUser() user: { userId: string },
    @Param('id') id: string
  ) {
    const userId = user.userId;
    return this.debtService.deleteDebt(userId, id);
  }

  /** 💰 Add repayment to a debt */
  @Post(':id/repayments')
  async addRepayment(
    @GetUser() user: { userId: string },
    @Param('id') id: string,
    @Body() body: AddRepaymentDto
  ) {
    const userId = user.userId;
    return this.debtService.addRepayment(userId, id, body);
  }

  /** 📜 Get repayments for a debt */
  @Get(':id/repayments')
  async getRepayments(@Param('id') id: string) {
    return this.debtService.getRepayments(id);
  }

  /** 🔄 Run catch-up for one debt */
  @Post(':id/catch-up')
  async catchUpOne(@Param('id') id: string) {
    return this.debtService.catchUpDebt(id);
  }

  @Get(':id/updates')
  async getDebtUpdates(@Param('id') id: string) {
    return this.debtService.getDebtUpdates(id);
  }
  
  /** 🔄 Run catch-up for all debts */
  @Post('catch-up')
  async catchUpAll(@GetUser() user: { userId: string }) {
    const userId = user.userId;
    return this.debtService.catchUpAllDebts(userId);
  }

  @Get(':id/pay-early')
  async payearly(@Param('id') id: string) {
    return this.debtService.payEarly(id);
  }

  /** 📊 Get settlement groups */
  @Get('settlement-groups/list')
  async getSettlementGroups(@GetUser() user: { userId: string }) {
    const userId = user.userId;
    return this.debtService.getSettlementGroups(userId);
  }

  /** 📋 Get debts by settlement group */
  @Get('settlement-groups/:groupId')
  async getDebtsByGroup(
    @GetUser() user: { userId: string },
    @Param('groupId') groupId: string
  ) {
    const userId = user.userId;
    return this.debtService.getDebtsBySettlementGroup(userId, groupId);
  }
}
