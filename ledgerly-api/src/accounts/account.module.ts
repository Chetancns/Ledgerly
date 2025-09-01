import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './account.entity';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { UserModule } from '../users/user.module'

@Module({
  imports: [TypeOrmModule.forFeature([Account]),UserModule],
  providers: [AccountService],
  controllers: [AccountController],
})
export class AccountModule {}
