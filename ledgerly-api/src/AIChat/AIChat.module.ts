import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { TransactionsService } from '../transactions/transaction.service';
import {AiService} from './AIChat.service'
import { AiController } from './AIChat.controller';
import { Account } from '../accounts/account.entity';
import { Category } from '../categories/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, Account,Category])],
  providers: [AiService,TransactionsService],
  controllers: [AiController],
})

export class AIModule{}