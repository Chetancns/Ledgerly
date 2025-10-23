import { Controller, Get, Post, Body, Delete, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUser } from '../common/decorators/user.decorator'
import { BudgetsService } from './budget.service';
import { CreateBudgetDto } from './dto/budgetdto';
import dayjs from 'dayjs';
import { CopyPreviousDto } from './dto/copyperviousDto';
@UseGuards(JwtAuthGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetService: BudgetsService) {}

  @Post()
  createOrUpdate(@GetUser() user: { userId: string },@Body() dto: CreateBudgetDto) {
    //console.log("dto",dto);
    return this.budgetService.createOrUpdate(user.userId,dto);
  }

  @Post('/carry-over')
  carryOver(@GetUser() user: { userId: string },@Body() body: { startDate: string; endDate: string }) {
    return this.budgetService.carryOverBudgets(user.userId, body.startDate, body.endDate);
  }

  @Get('/utilization/:id')
  utilization(@GetUser() user: { userId: string },@Param('id') id: string) {
    return this.budgetService.utilization(user.userId, id);
  }

  @Get()
getBudget(
  @GetUser() user: { userId: string },
    @Query('period') period:string,
  @Query('startDate') startDate: string,
  @Query('endDate') endDate: string,

) {

  return this.budgetService.getBudgets(user.userId, startDate, endDate,period);
}

 @Delete(':id')
 deleteBudget(
   @Param('id') id: string){
      //console.log(id);
      return this.budgetService.deletebugets(id);
    }
    @Post('/copyPrevious')
    copyPrevious(@GetUser() user: { userId: string },@Body() body:CopyPreviousDto){
      //console.log(body);
      return this.budgetService.copyPrevious(user.userId,body.period,body.startDate,body.endDate);
    }
  @Get('/allutilization')
  allUtilizations(
    @GetUser() user: { userId: string },
    @Query('month') month: string,
    @Query('year') year: string,
    @Query('period') period: 'monthly' | 'weekly' | 'bi-weekly' | 'yearly',
  ) {
    //console.log(month,year,period);
    const formattedMonth = month.padStart(2, '0'); 
    const date = `${year}-${formattedMonth}-01`;   // ✅ produces "2025-09-01"
    //console.log("Formatted date:", date);          // should log 2025-09-01

    return this.budgetService.allUtilizations(user.userId, period, date);
  }



}
