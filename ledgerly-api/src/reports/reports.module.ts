import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { Budget } from 'src/budgets/budget.entity';
import { Category } from '../categories/category.entity';
import { AiInsight } from './ai-insight.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, Budget, Category, AiInsight]), AuthModule],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}
