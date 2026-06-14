import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './notification.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
  ) {}

  // Create a notification
  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: any,
  ): Promise<Notification> {
    try {
      const notification = this.notificationRepo.create({
        userId,
        type,
        title,
        message,
        metadata,
        isRead: false,
      });
      const saved = await this.notificationRepo.save(notification);
      this.logger.log(`Notification created for user ${userId}: ${title}`);
      return saved;
    } catch (error) {
      this.logger.error(`Failed to create notification: ${error.message}`);
      throw error;
    }
  }

  // Get all notifications for a user
  async findByUser(userId: string, unreadOnly = false) {
    const where: any = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }
    return this.notificationRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  // Mark notification as read
  async markAsRead(id: string, userId: string) {
    const notification = await this.notificationRepo.findOne({
      where: { id, userId },
    });
    if (!notification) {
      throw new Error('Notification not found');
    }
    notification.isRead = true;
    return this.notificationRepo.save(notification);
  }

  // Mark all as read for a user
  async markAllAsRead(userId: string) {
    await this.notificationRepo.update(
      { userId, isRead: false },
      { isRead: true },
    );
    return { updated: true };
  }

  // Delete a notification
  async delete(id: string, userId: string) {
    const notification = await this.notificationRepo.findOne({
      where: { id, userId },
    });
    if (!notification) {
      throw new Error('Notification not found');
    }
    await this.notificationRepo.remove(notification);
    return { deleted: true };
  }

  // Get unread count
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepo.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Create a debt-reminder notification only if one doesn't already exist for
   * this debt (matched by metadata.debtId). Returns the notification and a
   * flag indicating whether it was newly created.
   */
  async createDebtReminderIfNotExists(
    userId: string,
    debtId: string,
    title: string,
    message: string,
  ): Promise<{ created: boolean; notification: Notification }> {
    // Check for an existing notification for this specific debt
    const existing = await this.notificationRepo
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId })
      .andWhere("n.type = 'debt_reminder'")
      .andWhere("n.metadata->>'debtId' = :debtId", { debtId })
      .getOne();

    if (existing) {
      return { created: false, notification: existing };
    }

    const notification = await this.create(userId, 'debt_reminder', title, message, {
      debtId,
      actionUrl: '/debts',
    });
    return { created: true, notification };
  }
}
