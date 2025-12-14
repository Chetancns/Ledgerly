import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUser } from '../common/decorators/user.decorator';
import { SettlementService } from './settlement.service';
import { CreateSettlementDto, SettlementQueryDto } from './dto/settlement.dto';

@Controller('settlements')
@UseGuards(JwtAuthGuard)
export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  @Post()
  async createSettlement(@GetUser() user: { userId: string }, @Body() dto: CreateSettlementDto) {
    return this.settlementService.createSettlement(user.userId, dto);
  }

  @Get()
  async getUserSettlements(@GetUser() user: { userId: string }, @Query() query: SettlementQueryDto) {
    return this.settlementService.getUserSettlements(user.userId, query);
  }

  @Get('counterparties')
  async getCounterparties(@GetUser() user: { userId: string }) {
    return this.settlementService.getCounterparties(user.userId);
  }

  @Get('groups')
  async getSettlementGroups(@GetUser() user: { userId: string }) {
    return this.settlementService.getSettlementGroups(user.userId);
  }

  @Get(':id')
  async getSettlement(@GetUser() user: { userId: string }, @Param('id') id: string) {
    return this.settlementService.getSettlement(user.userId, id);
  }

  @Delete(':id')
  async deleteSettlement(@GetUser() user: { userId: string }, @Param('id') id: string) {
    return this.settlementService.deleteSettlement(user.userId, id);
  }
}
