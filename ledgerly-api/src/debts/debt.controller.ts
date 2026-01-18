// debts/debt.controller.ts
import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { DebtService } from './debt.service';
import { GetUser } from '../common/decorators/user.decorator'
import { JwtAuthGuard } from '../auth/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('debts')
export class DebtController {
  constructor(private readonly debtService: DebtService) {}

  /** ➕ Create a new debt */
  @Post()
  async createDebt(@GetUser() user: { userId: string }, @Body() body: any) {
    const userId = user.userId;

    return this.debtService.createDebts(userId, body);
  }

  /** 📋 List all debts + progress (with optional filter) */
  @Get()
  async getDebts(
    @GetUser() user: { userId: string },
    @Query('debtType') debtType?: string,
  ) {
    const userId = user.userId;
    return this.debtService.getDebt(userId, debtType);
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

  /** 🗑️ Delete a debt update (payment) */
  @Post('updates/:updateId/delete')
  async deleteDebtUpdate(
    @Param('updateId') updateId: string,
    @GetUser() user: { userId: string },
  ) {
    const userId = user.userId;
    return this.debtService.deleteDebtUpdate(updateId, userId);
  }

  /** 🗑️ Delete a debt */
  @Post(':id/delete')
  async deleteDebt(
    @Param('id') id: string,
    @GetUser() user: { userId: string },
  ) {
    const userId = user.userId;
    return this.debtService.deleteDebt(id, userId);
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

  /** 💰 Pay installment (optionally create transaction) */
  @Post(':id/pay-installment')
  async payInstallment(
    @Param('id') id: string,
    @Body() body: { amount?: number; createTransaction?: boolean; categoryId?: string },
  ) {
    return this.debtService.payInstallment(
      id,
      body.amount,
      body.createTransaction !== false,
      body.categoryId,
    );
  }

  /** 👤 Get person name suggestions */
  @Get('person-names/suggestions')
  async getPersonNames(
    @GetUser() user: { userId: string },
    @Query('search') search?: string,
  ) {
    const userId = user.userId;
    return this.debtService.getPersonNames(userId, search);
  }
}
