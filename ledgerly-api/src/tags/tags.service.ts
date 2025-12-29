import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Tag } from './tag.entity';
import { Transaction } from '../transactions/transaction.entity';
import { CreateTagDto, UpdateTagDto, MergeTagsDto } from './dto/tag.dto';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private tagRepo: Repository<Tag>,
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
  ) {}

  /**
   * Create a new tag for a user
   */
  async create(userId: string, dto: CreateTagDto): Promise<Tag> {
    const normalizedName = dto.name.toLowerCase().trim();

    // Check for duplicate tag name (case-insensitive)
    const existing = await this.tagRepo.findOne({
      where: { userId, normalizedName, isDeleted: false },
    });

    if (existing) {
      throw new ConflictException(`Tag with name "${dto.name}" already exists`);
    }

    const tag = this.tagRepo.create({
      userId,
      name: dto.name.trim(),
      normalizedName,
      color: dto.color || '#3B82F6',
      description: dto.description,
    });

    return this.tagRepo.save(tag);
  }

  /**
   * Get all tags for a user (excluding soft-deleted)
   */
  async findAll(userId: string, includeDeleted = false): Promise<Tag[]> {
    const where: Partial<Record<keyof Tag, any>> = { userId };
    if (!includeDeleted) {
      where.isDeleted = false;
    }

    return this.tagRepo.find({
      where,
      order: { name: 'ASC' },
    });
  }

  /**
   * Get a single tag by ID
   */
  async findOne(userId: string, tagId: string): Promise<Tag> {
    // Load without relations to avoid unnecessary joins when updating
    const tag = await this.tagRepo.findOne({
      where: { id: tagId, userId, isDeleted: false },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    return tag;
  }

  /**
   * Get tag usage statistics
   */
  async getTagStats(userId: string, tagId: string) {
    const tag = await this.findOne(userId, tagId);

    // Count transactions with this tag
    const transactionCount = await this.transactionRepo
      .createQueryBuilder('transaction')
      .innerJoin('transaction.tags', 'tag')
      .where('tag.id = :tagId', { tagId })
      .andWhere('transaction.userId = :userId', { userId })
      .getCount();

    // Get spending by tag
    const spending = await this.transactionRepo
      .createQueryBuilder('transaction')
      .select('SUM(CAST(transaction.amount AS DECIMAL))', 'total')
      .innerJoin('transaction.tags', 'tag')
      .where('tag.id = :tagId', { tagId })
      .andWhere('transaction.userId = :userId', { userId })
      .andWhere('transaction.type = :type', { type: 'expense' })
      .getRawOne();

    return {
      tag,
      transactionCount,
      totalSpending: Number(spending?.total || 0),
    };
  }

  /**
   * Update a tag
   */
  async update(userId: string, tagId: string, dto: UpdateTagDto): Promise<Tag> {
    const tag = await this.findOne(userId, tagId);

    if (dto.name) {
      const normalizedName = dto.name.toLowerCase().trim();
      
      // Check for duplicate name
      const existing = await this.tagRepo.findOne({
        where: { userId, normalizedName, isDeleted: false },
      });

      if (existing && existing.id !== tagId) {
        throw new ConflictException(`Tag with name "${dto.name}" already exists`);
      }

      tag.name = dto.name.trim();
      tag.normalizedName = normalizedName;
    }

    if (dto.color) {
      tag.color = dto.color;
    }

    if (dto.description !== undefined) {
      tag.description = dto.description;
    }

    return this.tagRepo.save(tag);
  }

  /**
   * Soft delete a tag
   */
  async remove(userId: string, tagId: string): Promise<void> {
    const tag = await this.findOne(userId, tagId);
    tag.isDeleted = true;
    await this.tagRepo.save(tag);
  }

  /**
   * Hard delete a tag (removes from all transactions)
   */
  async hardDelete(userId: string, tagId: string): Promise<void> {
    const tag = await this.tagRepo.findOne({
      where: { id: tagId, userId },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    await this.tagRepo.remove(tag);
  }

  /**
   * Restore a soft-deleted tag
   */
  async restore(userId: string, tagId: string): Promise<Tag> {
    const tag = await this.tagRepo.findOne({
      where: { id: tagId, userId, isDeleted: true },
    });

    if (!tag) {
      throw new NotFoundException('Deleted tag not found');
    }

    tag.isDeleted = false;
    return this.tagRepo.save(tag);
  }

  /**
   * Merge multiple tags into one
   * All transactions with source tags will be updated to use the target tag
   */
  async mergeTags(userId: string, dto: MergeTagsDto): Promise<Tag> {
    const { sourceTagIds, targetTagId } = dto;

    // Validate target tag
    const targetTag = await this.findOne(userId, targetTagId);

    // Validate source tags
    const sourceTags = await this.tagRepo.find({
      where: { id: In(sourceTagIds), userId, isDeleted: false },
    });

    if (sourceTags.length !== sourceTagIds.length) {
      throw new BadRequestException('One or more source tags not found');
    }

    // Ensure target is not in source list
    if (sourceTagIds.includes(targetTagId)) {
      throw new BadRequestException('Target tag cannot be in the source tags list');
    }

    // Get all transactions with source tags
    const transactions = await this.transactionRepo
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.tags', 'tag')
      .where('transaction.userId = :userId', { userId })
      .andWhere('tag.id IN (:...sourceTagIds)', { sourceTagIds })
      .getMany();

    // Update transactions: remove source tags and add target tag if not present
    for (const transaction of transactions) {
      // Remove source tags
      transaction.tags = transaction.tags.filter(
        (tag) => !sourceTagIds.includes(tag.id),
      );

      // Add target tag if not already present
      if (!transaction.tags.some((tag) => tag.id === targetTagId)) {
        transaction.tags.push(targetTag);
      }

      await this.transactionRepo.save(transaction);
    }

    // Soft delete source tags
    for (const sourceTag of sourceTags) {
      sourceTag.isDeleted = true;
      await this.tagRepo.save(sourceTag);
    }

    return targetTag;
  }

  /**
   * Bulk delete multiple tags
   */
  async bulkDelete(userId: string, tagIds: string[]): Promise<{ deleted: number }> {
    const tags = await this.tagRepo.find({
      where: { id: In(tagIds), userId, isDeleted: false },
    });

    for (const tag of tags) {
      tag.isDeleted = true;
    }

    await this.tagRepo.save(tags);

    return { deleted: tags.length };
  }

  /**
   * Get tags with usage count
   */
  async getTagsWithUsage(userId: string) {
    const tags = await this.tagRepo
      .createQueryBuilder('tag')
      .leftJoin('tag.transactions', 'transaction')
      .where('tag.userId = :userId', { userId })
      .andWhere('tag.isDeleted = :isDeleted', { isDeleted: false })
      .select([
        'tag.id',
        'tag.name',
        'tag.color',
        'tag.description',
        'tag.createdAt',
      ])
      .addSelect('COUNT(transaction.id)', 'usageCount')
      .groupBy('tag.id')
      .orderBy('COUNT(transaction.id)', 'DESC')
      .addOrderBy('tag.name', 'ASC')
      .getRawMany();

    return tags.map((tag) => ({
      id: tag.tag_id,
      name: tag.tag_name,
      color: tag.tag_color,
      description: tag.tag_description,
      createdAt: tag.tag_createdAt,
      usageCount: parseInt(tag.usageCount, 10),
    }));
  }

  /**
   * Search tags by name
   */
  async searchTags(userId: string, query: string): Promise<Tag[]> {
    const normalizedQuery = query.toLowerCase().trim();

    return this.tagRepo
      .createQueryBuilder('tag')
      .where('tag.userId = :userId', { userId })
      .andWhere('tag.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('tag.normalizedName LIKE :query', { query: `%${normalizedQuery}%` })
      .orderBy('tag.name', 'ASC')
      .getMany();
  }
}
