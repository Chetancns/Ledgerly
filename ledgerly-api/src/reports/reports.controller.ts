// reports.controller.ts
import { Controller, Get, Query ,UseGuards} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUser } from '../common/decorators/user.decorator'

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('budget-vs-actual')
  async budgetVsActual(
    @GetUser() user: { userId: string },
    @Query('period') period:'monthly' | 'weekly' | 'bi-weekly' | 'yearly',
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.reportsService.budgetVsActual(user.userId, period, month, year);
  }

   @Get('cashflow')
  async getCashflow(
    @GetUser() user: { userId: string },
    @Query('period') period:'daily'|'monthly' | 'weekly' | 'bi-weekly' | 'yearly',
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.reportsService.getCashflowTimeline(user.userId,period, month, year);
  }
  @Get('category-heatmap')
  async getCategoryHeatmap(
    @GetUser() user: { userId: string },
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.reportsService.getCategoryHeatmap(user.userId,month, year);
  }

}
