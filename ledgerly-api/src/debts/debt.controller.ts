// debts/debt.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { DebtService } from './debt.service';
import { GetUser } from '../common/decorators/user.decorator'
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CreateDebtDto, PayInstallmentDto, RecordDebtUpdateDto, UpdateDebtDto } from './dto/debt.dto';

@UseGuards(JwtAuthGuard)
@Controller('debts')
export class DebtController {
  constructor(private readonly debtService: DebtService) {}

  @Post()
  async createDebt(@GetUser() user: { userId: string }, @Body() body: CreateDebtDto) {
    return this.debtService.createDebt(user.userId, body);
  }

  @Get()
  async getDebts(
    @GetUser() user: { userId: string },
    @Query('debtType') debtType?: string,
  ) {
    return this.debtService.getDebt(user.userId, debtType);
  }

  @Get('person-ledger')
  async getPersonLedger(@GetUser() user: { userId: string }) {
    return this.debtService.getPersonLedger(user.userId);
  }

  @Get('analytics')
  async getDebtAnalytics(@GetUser() user: { userId: string }) {
    return this.debtService.getDebtAnalytics(user.userId);
  }

  @Post(':id/catch-up')
  async catchUpOne(@GetUser() user: { userId: string }, @Param('id') id: string) {
    return this.debtService.catchUpDebt(id, user.userId);
  }

  @Get(':id/updates')
  async getDebtUpdates(@GetUser() user: { userId: string }, @Param('id') id: string) {
    return this.debtService.getDebtUpdates(id, user.userId);
  }

  @Post(':id/updates')
  async recordDebtUpdate(
    @Param('id') id: string,
    @GetUser() user: { userId: string },
    @Body() body: RecordDebtUpdateDto,
  ) {
    return this.debtService.recordDebtUpdate(id, user.userId, body);
  }

  @Delete('updates/:updateId')
  async deleteDebtUpdate(
    @Param('updateId') updateId: string,
    @GetUser() user: { userId: string },
  ) {
    return this.debtService.deleteDebtUpdate(updateId, user.userId);
  }

  @Delete(':id')
  async deleteDebt(@Param('id') id: string, @GetUser() user: { userId: string }) {
    return this.debtService.deleteDebt(id, user.userId);
  }

  @Patch(':id')
  async updateDebt(
    @Param('id') id: string,
    @GetUser() user: { userId: string },
    @Body() body: UpdateDebtDto,
  ) {
    return this.debtService.updateDebt(id, user.userId, body);
  }
  
  @Post('catch-up')
  async catchUpAll(@GetUser() user: { userId: string }) {
    return this.debtService.catchUpAllDebts(user.userId);
  }

  @Get(':id/pay-early')
  async payearly(@GetUser() user: { userId: string }, @Param('id') id: string) {
    return this.debtService.payEarly(id, user.userId);
  }

  @Post(':id/pay-installment')
  async payInstallment(
    @GetUser() user: { userId: string },
    @Param('id') id: string,
    @Body() body: PayInstallmentDto,
  ) {
    return this.debtService.payInstallment(
      id,
      user.userId,
      body.amount,
      body.createTransaction !== false,
      body.categoryId,
      body.settleInFull,
      body.note,
    );
  }

  @Get('person-names/suggestions')
  async getPersonNames(
    @GetUser() user: { userId: string },
    @Query('search') search?: string,
  ) {
    return this.debtService.getPersonNames(user.userId, search);
  }

  @Post('updates/:updateId/delete')
  async deleteDebtUpdateLegacy(
    @Param('updateId') updateId: string,
    @GetUser() user: { userId: string },
  ) {
    // Legacy route kept for backward compatibility; prefer DELETE /debts/updates/:updateId.
    return this.debtService.deleteDebtUpdate(updateId, user.userId);
  }

  @Post(':id/delete')
  async deleteDebtLegacy(@Param('id') id: string, @GetUser() user: { userId: string }) {
    // Legacy route kept for backward compatibility; prefer DELETE /debts/:id.
    return this.debtService.deleteDebt(id, user.userId);
  }
}
