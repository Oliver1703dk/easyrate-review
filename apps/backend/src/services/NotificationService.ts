import mongoose from 'mongoose';
import type {
  CreateNotificationInput,
  Notification as NotificationType,
  NotificationStatus,
} from '@easyrate/shared';
import { Notification, NotificationDocument } from '../models/Notification.js';
import { NotFoundError } from '../utils/errors.js';
import { calculatePagination, PaginationMeta } from '../utils/response.js';

function toNotificationType(doc: NotificationDocument): NotificationType {
  return doc.toJSON() as unknown as NotificationType;
}

export interface NotificationFilters {
  type?: 'sms' | 'email';
  status?: NotificationStatus;
  fromDate?: string;
  toDate?: string;
}

export interface NotificationStats {
  totalCount: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  openedCount: number;
  clickedCount: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
}

export interface PaginatedNotifications {
  data: NotificationType[];
  pagination: PaginationMeta;
}

export class NotificationService {
  async create(
    businessId: string,
    input: Omit<CreateNotificationInput, 'businessId'>
  ): Promise<NotificationType> {
    const notification = new Notification({
      businessId,
      type: input.type,
      status: 'pending',
      recipient: input.recipient,
      subject: input.subject,
      content: input.content,
      reviewLink: input.reviewLink,
      orderId: input.orderId,
    });

    await notification.save();
    return toNotificationType(notification);
  }

  async findById(
    businessId: string,
    id: string
  ): Promise<NotificationType | null> {
    const notification = await Notification.findOne({ _id: id, businessId });
    return notification ? toNotificationType(notification) : null;
  }

  async findByIdOrThrow(
    businessId: string,
    id: string
  ): Promise<NotificationType> {
    const notification = await this.findById(businessId, id);
    if (!notification) {
      throw new NotFoundError('Notifikation ikke fundet');
    }
    return notification;
  }

  async findByExternalMessageId(
    externalMessageId: string
  ): Promise<NotificationType | null> {
    const notification = await Notification.findOne({ externalMessageId });
    return notification ? toNotificationType(notification) : null;
  }

  async list(
    businessId: string,
    filters: NotificationFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedNotifications> {
    const query: Record<string, unknown> = { businessId };

    if (filters.type) {
      query.type = filters.type;
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.fromDate || filters.toDate) {
      query.createdAt = {};
      if (filters.fromDate) {
        (query.createdAt as Record<string, Date>).$gte = new Date(filters.fromDate);
      }
      if (filters.toDate) {
        (query.createdAt as Record<string, Date>).$lte = new Date(filters.toDate);
      }
    }

    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(query),
    ]);

    return {
      data: notifications.map(toNotificationType),
      pagination: calculatePagination(page, limit, total),
    };
  }

  async updateStatus(
    id: string,
    status: NotificationStatus,
    options?: {
      externalMessageId?: string;
      errorMessage?: string;
    }
  ): Promise<NotificationType> {
    const updateData: Record<string, unknown> = { status };

    // Set appropriate timestamp based on status
    const now = new Date();
    switch (status) {
      case 'sent':
        updateData.sentAt = now;
        break;
      case 'delivered':
        updateData.deliveredAt = now;
        break;
      case 'opened':
        updateData.openedAt = now;
        break;
      case 'clicked':
        updateData.clickedAt = now;
        break;
    }

    if (options?.externalMessageId) {
      updateData.externalMessageId = options.externalMessageId;
    }
    if (options?.errorMessage) {
      updateData.errorMessage = options.errorMessage;
    }

    const notification = await Notification.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!notification) {
      throw new NotFoundError('Notifikation ikke fundet');
    }

    return toNotificationType(notification);
  }

  async getStats(businessId: string): Promise<NotificationStats> {
    const [aggregation] = await Notification.aggregate([
      { $match: { businessId: new mongoose.Types.ObjectId(businessId) } },
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          sentCount: {
            $sum: {
              $cond: [{ $in: ['$status', ['sent', 'delivered', 'opened', 'clicked']] }, 1, 0],
            },
          },
          deliveredCount: {
            $sum: {
              $cond: [{ $in: ['$status', ['delivered', 'opened', 'clicked']] }, 1, 0],
            },
          },
          failedCount: {
            $sum: {
              $cond: [{ $in: ['$status', ['failed', 'bounced']] }, 1, 0],
            },
          },
          openedCount: {
            $sum: {
              $cond: [{ $in: ['$status', ['opened', 'clicked']] }, 1, 0],
            },
          },
          clickedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'clicked'] }, 1, 0] },
          },
        },
      },
    ]);

    if (!aggregation) {
      return {
        totalCount: 0,
        sentCount: 0,
        deliveredCount: 0,
        failedCount: 0,
        openedCount: 0,
        clickedCount: 0,
        deliveryRate: 0,
        openRate: 0,
        clickRate: 0,
      };
    }

    const { totalCount, sentCount, deliveredCount, failedCount, openedCount, clickedCount } =
      aggregation;

    return {
      totalCount,
      sentCount,
      deliveredCount,
      failedCount,
      openedCount,
      clickedCount,
      deliveryRate: sentCount > 0 ? Math.round((deliveredCount / sentCount) * 100) : 0,
      openRate: deliveredCount > 0 ? Math.round((openedCount / deliveredCount) * 100) : 0,
      clickRate: openedCount > 0 ? Math.round((clickedCount / openedCount) * 100) : 0,
    };
  }
}

export const notificationService = new NotificationService();
