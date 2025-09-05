import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BudgetsService } from './budget.service';
import { BudgetsController } from './budget.controller';
import { Budget } from './budget.entity';
import { Transaction } from 'src/transactions/transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Budget, Transaction])],
  providers: [BudgetsService],
  controllers: [BudgetsController],
})
export class BudgetModule {}
