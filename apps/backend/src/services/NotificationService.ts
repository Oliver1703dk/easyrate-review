import mongoose from 'mongoose';
import type {
  CreateNotificationInput,
  Notification as NotificationType,
  NotificationStatus,
  NotificationStats,
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

export { NotificationStats };

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

  async getStats(businessId: string, dateRange?: { from: Date; to: Date }): Promise<NotificationStats> {
    const businessObjectId = new mongoose.Types.ObjectId(businessId);

    // Build date match condition
    const dateMatch: Record<string, unknown> = dateRange
      ? { createdAt: { $gte: dateRange.from, $lte: dateRange.to } }
      : {};

    // Aggregate by channel type
    const aggregation = await Notification.aggregate([
      { $match: { businessId: businessObjectId, ...dateMatch } },
      {
        $group: {
          _id: '$type',
          sent: {
            $sum: {
              $cond: [{ $in: ['$status', ['sent', 'delivered', 'opened', 'clicked']] }, 1, 0],
            },
          },
          delivered: {
            $sum: {
              $cond: [{ $in: ['$status', ['delivered', 'opened', 'clicked']] }, 1, 0],
            },
          },
          opened: {
            $sum: {
              $cond: [{ $in: ['$status', ['opened', 'clicked']] }, 1, 0],
            },
          },
          clicked: {
            $sum: { $cond: [{ $eq: ['$status', 'clicked'] }, 1, 0] },
          },
        },
      },
    ]);

    // Initialize default stats
    const stats: NotificationStats = {
      smsSent: 0,
      emailSent: 0,
      smsDelivered: 0,
      emailDelivered: 0,
      smsOpened: 0,
      emailOpened: 0,
      smsClicked: 0,
      emailClicked: 0,
    };

    // Map aggregation results to stats
    for (const item of aggregation) {
      if (item._id === 'sms') {
        stats.smsSent = item.sent;
        stats.smsDelivered = item.delivered;
        stats.smsOpened = item.opened;
        stats.smsClicked = item.clicked;
      } else if (item._id === 'email') {
        stats.emailSent = item.sent;
        stats.emailDelivered = item.delivered;
        stats.emailOpened = item.opened;
        stats.emailClicked = item.clicked;
      }
    }

    return stats;
  }

  async updateContent(
    id: string,
    data: { content: string; reviewLink: string; subject?: string }
  ): Promise<NotificationType> {
    const updateData: Record<string, string> = {
      content: data.content,
      reviewLink: data.reviewLink,
    };
    if (data.subject) {
      updateData.subject = data.subject;
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

  async findByIds(
    businessId: string,
    ids: string[]
  ): Promise<NotificationType[]> {
    const notifications = await Notification.find({
      businessId,
      _id: { $in: ids },
    });
    return notifications.map(toNotificationType);
  }
}

export const notificationService = new NotificationService();
