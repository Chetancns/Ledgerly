import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { Budget } from 'src/budgets/budget.entity';
import { Category } from '../categories/category.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, Budget,Category])],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}
