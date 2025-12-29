import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { TagAnalyticsService } from './tag-analytics.service';
import { Tag } from './tag.entity';
import { Transaction } from '../transactions/transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tag, Transaction])],
  controllers: [TagsController],
  providers: [TagsService, TagAnalyticsService],
  exports: [TagsService, TagAnalyticsService],
})
export class TagsModule {}
