import { Body, Controller, Get, Patch, Post, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUser } from '../common/decorators/user.decorator';

export class CreateDebtReminderDto {
  @IsString() debtId: string;
  @IsString() title: string;
  @IsString() message: string;
}

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(
    @GetUser() user: { userId: string },
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.findByUser(
      user.userId,
      unreadOnly === 'true',
    );
  }

  @Get('unread-count')
  async getUnreadCount(@GetUser() user: { userId: string }) {
    const count = await this.notificationsService.getUnreadCount(user.userId);
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(
    @GetUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(id, user.userId);
  }

  @Patch('read-all')
  async markAllAsRead(@GetUser() user: { userId: string }) {
    return this.notificationsService.markAllAsRead(user.userId);
  }

  @Delete(':id')
  async delete(
    @GetUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.notificationsService.delete(id, user.userId);
  }

  @Post('debt-reminder')
  async createDebtReminder(
    @GetUser() user: { userId: string },
    @Body() body: CreateDebtReminderDto,
  ) {
    return this.notificationsService.createDebtReminderIfNotExists(
      user.userId,
      body.debtId,
      body.title,
      body.message,
    );
  }
}
