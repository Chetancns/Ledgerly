import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { BudgetsService } from './budget.service';
import { BudgetsController } from './budget.controller';
import { Budget } from './budget.entity';
import { Transaction } from 'src/transactions/transaction.entity';
import { AuthModule } from 'src/auth/auth.module';
import { Category } from 'src/categories/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Budget, Transaction, Category]), AuthModule, ConfigModule],
  providers: [BudgetsService],
  controllers: [BudgetsController],
})
export class BudgetModule {}
