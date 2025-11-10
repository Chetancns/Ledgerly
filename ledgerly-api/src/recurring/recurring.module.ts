import { Category } from "src/categories/category.entity";
import { Transaction } from "../transactions/transaction.entity";
import { Budget } from "src/budgets/budget.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Module } from '@nestjs/common';
import { TransactionsModule } from "src/transactions/transaction.module";
import { AuthModule } from "src/auth/auth.module";
import { RecurringService } from "./recurring.service";
import { RecurringController } from "./recurring.controller";
import { RecurringTransaction } from "./recurring.entity";
import { Account } from "src/accounts/account.entity";
@Module({
  imports: [TypeOrmModule.forFeature([RecurringTransaction,Transaction,Account,Category]),
            TransactionsModule, AuthModule],
  providers: [RecurringService],
  controllers: [RecurringController],
})
export class RecurringModule {}