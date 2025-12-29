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
import { CreateTagDto, UpdateTagDto, MergeTagsDto, BulkDeleteTagsDto } from './dto/tag.dto';

@Controller('tags')
@UseGuards(JwtAuthGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  /**
   * Create a new tag
   * POST /tags
   */
  @Post()
  async create(@Request() req, @Body() createTagDto: CreateTagDto) {
    return this.tagsService.create(req.user.userId, createTagDto);
  }

  /**
   * Get all tags for the current user
   * GET /tags?includeDeleted=false
   */
  @Get()
  async findAll(@Request() req, @Query('includeDeleted') includeDeleted?: string) {
    const includeDeletedBool = includeDeleted === 'true';
    return this.tagsService.findAll(req.user.userId, includeDeletedBool);
  }

  /**
   * Get tags with usage statistics
   * GET /tags/with-usage
   */
  @Get('with-usage')
  async getTagsWithUsage(@Request() req) {
    return this.tagsService.getTagsWithUsage(req.user.userId);
  }

  /**
   * Search tags by name
   * GET /tags/search?q=vacation
   */
  @Get('search')
  async search(@Request() req, @Query('q') query: string) {
    if (!query || query.trim().length === 0) {
      return [];
    }
    return this.tagsService.searchTags(req.user.userId, query);
  }

  /**
   * Get a single tag by ID
   * GET /tags/:id
   */
  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    return this.tagsService.findOne(req.user.userId, id);
  }

  /**
   * Get tag statistics
   * GET /tags/:id/stats
   */
  @Get(':id/stats')
  async getStats(@Request() req, @Param('id') id: string) {
    return this.tagsService.getTagStats(req.user.userId, id);
  }

  /**
   * Update a tag
   * PUT /tags/:id
   */
  @Put(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateTagDto: UpdateTagDto,
  ) {
    return this.tagsService.update(req.user.userId, id, updateTagDto);
  }

  /**
   * Restore a soft-deleted tag
   * PUT /tags/:id/restore
   */
  @Put(':id/restore')
  async restore(@Request() req, @Param('id') id: string) {
    return this.tagsService.restore(req.user.userId, id);
  }

  /**
   * Soft delete a tag
   * DELETE /tags/:id
   */
  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    await this.tagsService.remove(req.user.userId, id);
    return { message: 'Tag deleted successfully' };
  }

  /**
   * Hard delete a tag (permanent)
   * DELETE /tags/:id/hard
   */
  @Delete(':id/hard')
  async hardDelete(@Request() req, @Param('id') id: string) {
    await this.tagsService.hardDelete(req.user.userId, id);
    return { message: 'Tag permanently deleted' };
  }

  /**
   * Merge multiple tags into one
   * POST /tags/merge
   */
  @Post('merge')
  async merge(@Request() req, @Body() mergeTagsDto: MergeTagsDto) {
    return this.tagsService.mergeTags(req.user.userId, mergeTagsDto);
  }

  /**
   * Bulk delete multiple tags
   * POST /tags/bulk-delete
   */
  @Post('bulk-delete')
  async bulkDelete(@Request() req, @Body() bulkDeleteDto: BulkDeleteTagsDto) {
    return this.tagsService.bulkDelete(req.user.userId, bulkDeleteDto.tagIds);
  }
}
