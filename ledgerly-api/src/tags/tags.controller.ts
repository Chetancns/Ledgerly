import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { TagsService } from './tags.service';
import { TagAnalyticsService } from './tag-analytics.service';
import { CreateTagDto, UpdateTagDto, MergeTagsDto, BulkDeleteTagsDto } from './dto/tag.dto';
import { GetUser } from 'src/common/decorators/user.decorator';

@Controller('tags')
@UseGuards(JwtAuthGuard)
export class TagsController {
  constructor(
    private readonly tagsService: TagsService,
    private readonly analyticsService: TagAnalyticsService,
  ) {}

  /**
   * Create a new tag
   * POST /tags
   */
  @Post()
  async create(@GetUser() user: { userId: string }, @Body() createTagDto: CreateTagDto) {
    return this.tagsService.create(user.userId, createTagDto);
  }

  /**
   * Get all tags for the current user
   * GET /tags?includeDeleted=false
   */
  @Get()
  async findAll(@GetUser() user: { userId: string }, @Query('includeDeleted') includeDeleted?: string) {
    const includeDeletedBool = includeDeleted === 'true';
    return this.tagsService.findAll(user.userId, includeDeletedBool);
  }

  /**
   * Get tags with usage statistics
   * GET /tags/with-usage
   */
  @Get('with-usage')
  async getTagsWithUsage(@GetUser() user: { userId: string }, @Request() req) {
    return this.tagsService.getTagsWithUsage(user.userId);
  }

  /**
   * Search tags by name
   * GET /tags/search?q=vacation
   */
  @Get('search')
  async search(@GetUser() user: { userId: string }, @Query('q') query: string) {
    if (!query || query.trim().length === 0) {
      return [];
    }
    return this.tagsService.searchTags(user.userId, query);
  }

  /**
   * Get a single tag by ID
   * GET /tags/:id
   */
  @Get(':id')
  async findOne(@GetUser() user: { userId: string }, @Param('id') id: string) {
    return this.tagsService.findOne(user.userId, id);
  }

  /**
   * Get tag statistics
   * GET /tags/:id/stats
   */
  @Get(':id/stats')
  async getStats(@GetUser() user: { userId: string }, @Param('id') id: string) {
    return this.tagsService.getTagStats(user.userId, id);
  }

  /**
   * Update a tag
   * PUT /tags/:id
   */
  @Put(':id')
  async update(
    @GetUser() user: { userId: string },
    @Param('id') id: string,
    @Body() updateTagDto: UpdateTagDto,
  ) {
    return this.tagsService.update(user.userId, id, updateTagDto);
  }

  /**
   * Restore a soft-deleted tag
   * PUT /tags/:id/restore
   */
  @Put(':id/restore')
  async restore(@GetUser() user: { userId: string }, @Param('id') id: string) {
    return this.tagsService.restore(user.userId, id);
  }

  /**
   * Soft delete a tag
   * DELETE /tags/:id
   */
  @Delete(':id')
  async remove(@GetUser() user: { userId: string }, @Param('id') id: string) {
    await this.tagsService.remove(user.userId, id);
    return { message: 'Tag deleted successfully' };
  }

  /**
   * Hard delete a tag (permanent)
   * DELETE /tags/:id/hard
   */
  @Delete(':id/hard')
  async hardDelete(@GetUser() user: { userId: string }, @Param('id') id: string) {
    await this.tagsService.hardDelete(user.userId, id);
    return { message: 'Tag permanently deleted' };
  }

  /**
   * Merge multiple tags into one
   * POST /tags/merge
   */
  @Post('merge')
  async merge(@GetUser() user: { userId: string }, @Body() mergeTagsDto: MergeTagsDto) {
    return this.tagsService.mergeTags(user.userId, mergeTagsDto);
  }

  /**
   * Bulk delete multiple tags
   * POST /tags/bulk-delete
   */
  @Post('bulk-delete')
  async bulkDelete(@GetUser() user: { userId: string }, @Body() bulkDeleteDto: BulkDeleteTagsDto) {
    return this.tagsService.bulkDelete(user.userId, bulkDeleteDto.tagIds);
  }

  /**
   * Get spending analytics by tag
   * GET /tags/analytics/spending?from=2024-01-01&to=2024-12-31
   */
  @Get('analytics/spending')
  async getSpendingAnalytics(
    @GetUser() user: { userId: string } ,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('tagIds') tagIds?: string,
  ) {
    const tagIdsArray = tagIds ? tagIds.split(',').filter(id => id.trim()) : undefined;
    return this.analyticsService.getSpendingByTag(user.userId, { from, to, tagIds: tagIdsArray });
  }

  /**
   * Get tag trends over time
   * GET /tags/analytics/trends/:id?months=6
   */
  @Get('analytics/trends/:id')
  async getTagTrends(
    @GetUser() user: { userId: string },
    @Param('id') id: string,
    @Query('months') months?: string,
  ) {
    const monthsNum = months ? parseInt(months, 10) : 6;
    return this.analyticsService.getTagTrends(user.userId, id, { months: monthsNum });
  }

  /**
   * Get category breakdown for a tag
   * GET /tags/analytics/category-breakdown/:id?from=2024-01-01&to=2024-12-31
   */
  @Get('analytics/category-breakdown/:id')
  async getCategoryBreakdown(
    @GetUser() user: { userId: string },
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getCategoryBreakdownByTag(user.userId, id, { from, to });
  }

  /**
   * Compare multiple tags
   * GET /tags/analytics/compare?tagIds=id1,id2,id3&from=2024-01-01&to=2024-12-31
   */
  @Get('analytics/compare')
  async compareTagSpending(
    @GetUser() user: { userId: string },
    @Query('tagIds') tagIds: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const tagIdsArray = tagIds.split(',').filter(id => id.trim());
    if (tagIdsArray.length === 0) {
      return [];
    }
    return this.analyticsService.compareTagSpending(user.userId, tagIdsArray, { from, to });
  }

  /**
   * Get tag insights summary
   * GET /tags/analytics/summary?from=2024-01-01&to=2024-12-31
   */
  @Get('analytics/summary')
  async getInsightsSummary(
    @GetUser() user: { userId: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getTagInsightsSummary(user.userId, { from, to });
  }
}
