// debts/debt.controller.ts
import { Body, Controller, Get, Param, Post ,Req,UseGuards} from '@nestjs/common';
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

    return this.debtService.createDebts(userId,body);
  }

  /** 📋 List all debts + progress */
  @Get()
  async getDebts(@GetUser() user: { userId: string }) {
    const userId = user.userId;
    return this.debtService.getDebt(userId);
  }

  /** 🔄 Run catch-up for one debt */
  @Post(':id/catch-up')
  async catchUpOne(@Param('id') id: string) {
    return this.debtService.catchUpDebt(id);
  }

  /** 🔄 Run catch-up for all debts */
  @Post('catch-up')
  async catchUpAll(@GetUser() user: { userId: string }) {
    const userId = user.userId;
    return this.debtService.catchUpAllDebts(userId);
  }
}
