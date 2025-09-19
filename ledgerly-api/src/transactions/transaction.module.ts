import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './transaction.entity';
import { TransactionsService } from './transaction.service';
import { TransactionsController } from './transaction.controller';
import { Account } from '../accounts/account.entity';
import { Category } from 'src/categories/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, Account,Category])],
  providers: [TransactionsService],
  controllers: [TransactionsController],
  exports:[TransactionsService]
})
export class TransactionsModule {}
