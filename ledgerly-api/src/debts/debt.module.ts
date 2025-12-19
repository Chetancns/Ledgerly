import { Category } from "src/categories/category.entity";
import { Transaction } from "../transactions/transaction.entity";
import { DebtController } from "./debt.controller";
import { DebtService } from "./debt.service";
import { Budget } from "src/budgets/budget.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Module } from '@nestjs/common';
import { Debt } from "./debt.entity";
import { DebtUpdate } from "./debt-update.entity";
import { Repayment } from "./repayment.entity";
import { TransactionsModule } from "src/transactions/transaction.module";
import { AuthModule } from "src/auth/auth.module";
@Module({
  imports: [TypeOrmModule.forFeature([Debt, DebtUpdate, Repayment, Transaction, Budget, Category]),
            TransactionsModule, AuthModule],
  providers: [DebtService],
  controllers: [DebtController],
})
export class DebtModule {}