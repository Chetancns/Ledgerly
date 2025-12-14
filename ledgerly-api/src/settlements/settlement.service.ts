import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Settlement } from './settlement.entity';
import { Transaction } from '../transactions/transaction.entity';
import { CreateSettlementDto, SettlementQueryDto } from './dto/settlement.dto';

@Injectable()
export class SettlementService {
  constructor(
    @InjectRepository(Settlement)
    private settlementRepo: Repository<Settlement>,
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
  ) {}

  /**
   * Create a settlement and update related transactions
   */
  async createSettlement(userId: string, dto: CreateSettlementDto) {
    // Get all reimbursable transactions for this group/counterparty
    const query: any = {
      userId,
      isReimbursable: true,
    };

    if (dto.settlementGroupId) {
      query.settlementGroupId = dto.settlementGroupId;
    }

    if (dto.counterpartyName) {
      query.counterpartyName = dto.counterpartyName;
    }

    const transactions = await this.transactionRepo.find({ where: query });

    if (transactions.length === 0) {
      throw new BadRequestException('No reimbursable transactions found for these criteria');
    }

    // Calculate total pending
    const totalPending = transactions.reduce((sum, tx) => {
      const txAmount = parseFloat(tx.amount);
      const reimbursed = parseFloat(tx.reimbursedAmount || '0');
      return sum + (txAmount - reimbursed);
    }, 0);

    const settlementAmount = parseFloat(dto.amount);

    if (settlementAmount > totalPending) {
      throw new BadRequestException(`Settlement amount (${settlementAmount}) exceeds total pending (${totalPending.toFixed(2)})`);
    }

    // Create settlement record
    const settlement = this.settlementRepo.create({
      userId,
      settlementGroupId: dto.settlementGroupId,
      counterpartyName: dto.counterpartyName,
      amount: dto.amount,
      settlementDate: dto.settlementDate,
      notes: dto.notes,
    });

    const savedSettlement = await this.settlementRepo.save(settlement);

    // Distribute settlement amount proportionally across transactions
    let remainingAmount = settlementAmount;

    for (const tx of transactions) {
      const txAmount = parseFloat(tx.amount);
      const alreadyReimbursed = parseFloat(tx.reimbursedAmount || '0');
      const txPending = txAmount - alreadyReimbursed;

      if (txPending <= 0 || remainingAmount <= 0) continue;

      // Calculate proportion of this transaction
      const proportion = txPending / totalPending;
      const amountForThisTx = Math.min(settlementAmount * proportion, txPending, remainingAmount);

      tx.reimbursedAmount = (alreadyReimbursed + amountForThisTx).toFixed(2);
      remainingAmount -= amountForThisTx;

      await this.transactionRepo.save(tx);
    }

    return savedSettlement;
  }

  /**
   * Get all settlements for a user
   */
  async getUserSettlements(userId: string, query?: SettlementQueryDto) {
    const where: any = { userId };

    if (query?.settlementGroupId) {
      where.settlementGroupId = query.settlementGroupId;
    }

    if (query?.counterpartyName) {
      where.counterpartyName = query.counterpartyName;
    }

    return this.settlementRepo.find({
      where,
      order: { settlementDate: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Get a single settlement
   */
  async getSettlement(userId: string, id: string) {
    const settlement = await this.settlementRepo.findOne({
      where: { id, userId },
    });

    if (!settlement) {
      throw new NotFoundException('Settlement not found');
    }

    return settlement;
  }

  /**
   * Delete a settlement (and optionally rollback transaction updates)
   */
  async deleteSettlement(userId: string, id: string) {
    const settlement = await this.getSettlement(userId, id);
    await this.settlementRepo.remove(settlement);
    return { message: 'Settlement deleted successfully' };
  }

  /**
   * Get unique counterparties from reimbursable transactions
   */
  async getCounterparties(userId: string) {
    const transactions = await this.transactionRepo
      .createQueryBuilder('transaction')
      .select('DISTINCT transaction.counterpartyName', 'counterpartyName')
      .where('transaction.userId = :userId', { userId })
      .andWhere('transaction.isReimbursable = :isReimbursable', { isReimbursable: true })
      .andWhere('transaction.counterpartyName IS NOT NULL')
      .getRawMany();

    return transactions.map(t => t.counterpartyName).filter(Boolean).sort();
  }

  /**
   * Get unique settlement groups from reimbursable transactions
   */
  async getSettlementGroups(userId: string) {
    const transactions = await this.transactionRepo
      .createQueryBuilder('transaction')
      .select('DISTINCT transaction.settlementGroupId', 'settlementGroupId')
      .where('transaction.userId = :userId', { userId })
      .andWhere('transaction.isReimbursable = :isReimbursable', { isReimbursable: true })
      .andWhere('transaction.settlementGroupId IS NOT NULL')
      .getRawMany();

    return transactions.map(t => t.settlementGroupId).filter(Boolean).sort();
  }
}
