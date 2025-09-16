import { Category } from "src/categories/category.entity";
import { Transaction } from "../transactions/transaction.entity";
import { DebtController } from "./debt.controller";
import { DebtService } from "./debt.service";
import { Budget } from "src/budgets/budget.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Module } from '@nestjs/common';
import { Debt } from "./debt.entity";
import { DebtUpdate } from "./debt-update.entity";
@Module({
  imports: [TypeOrmModule.forFeature([Debt,DebtUpdate,Transaction, Budget,Category])],
  providers: [DebtService],
  controllers: [DebtController],
})
export class DebtModule {}