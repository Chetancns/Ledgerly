import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './users/user.entity';
import { Account } from './accounts/account.entity';
import { Category } from './categories/category.entity';
import { Transaction } from './transactions/transaction.entity';
import { Budget } from './budgets/budget.entity';
import { RecurringTransaction } from './recurring/recurring.entity';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './users/user.module';
 import { AccountModule } from './accounts/account.module';
 import { CategoryModule } from './categories/category.module';
import { TransactionsModule } from './transactions/transaction.module';
import { BudgetModule } from './budgets/budget.module';
import { RecurringModule } from './recurring/recurring.module';
import {ReportsModule} from './reports/reports.module'
import { AIModule } from './AIChat/AIChat.module';
import { Debt } from './debts/debt.entity';
import { DebtUpdate } from './debts/debt-update.entity';
import { DebtModule } from './debts/debt.module';
import { AiInsight } from './reports/ai-insight.entity';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60, limit: 100 }]),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        username: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        entities: [
          User,
          Account,
          Category,
          Transaction,
          Budget,
          RecurringTransaction,
          Debt,
          DebtUpdate,
          AiInsight,
        ],
        synchronize: false, // true for dev only; use migrations instead
        ssl: process.env.DB_SSL === 'true',
      }),
    }),
    AuthModule,
     UserModule,
     AccountModule,
     CategoryModule,
     TransactionsModule,
     BudgetModule,
     AIModule,
     ReportsModule,
     DebtModule,
     RecurringModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
