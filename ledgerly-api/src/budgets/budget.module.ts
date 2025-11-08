import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BudgetsService } from './budget.service';
import { BudgetsController } from './budget.controller';
import { Budget } from './budget.entity';
import { Transaction } from 'src/transactions/transaction.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Budget, Transaction]), AuthModule],
  providers: [BudgetsService],
  controllers: [BudgetsController],
})
export class BudgetModule {}
