import mongoose from 'mongoose';
import type { OrderData } from '@easyrate/shared';
import { OrderQueue, type OrderQueueDocument } from '../models/OrderQueue.js';
import { NotFoundError } from '../utils/errors.js';

export interface QueuedOrder {
  id: string;
  businessId: string;
  orderId: string;
  platform: 'dully' | 'easytable';
  orderData: OrderData;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  scheduledFor: Date;
  processedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

function toQueuedOrder(doc: OrderQueueDocument): QueuedOrder {
  return doc.toJSON() as unknown as QueuedOrder;
}

export class OrderQueueService {
  async enqueue(
    businessId: string,
    orderData: OrderData,
    delayMinutes: number
  ): Promise<QueuedOrder> {
    const scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000);

    try {
      const queueItem = new OrderQueue({
        businessId,
        orderId: orderData.orderId,
        platform: orderData.platform,
        orderData,
        status: 'pending',
        scheduledFor,
      });

      await queueItem.save();
      console.log(
        `[OrderQueueService] Enqueued order ${orderData.orderId} for business ${businessId}, scheduled for ${scheduledFor.toISOString()}`
      );

      return toQueuedOrder(queueItem);
    } catch (error) {
      // Handle duplicate order (unique index violation)
      if (error instanceof Error && 'code' in error && (error as { code: number }).code === 11000) {
        console.log(
          `[OrderQueueService] Order ${orderData.orderId} already queued for business ${businessId}, skipping`
        );
        const existing = await OrderQueue.findOne({
          businessId,
          orderId: orderData.orderId,
          platform: orderData.platform,
        });
        if (existing) {
          return toQueuedOrder(existing);
        }
      }
      throw error;
    }
  }

  async getQueuedOrders(
    status: 'pending' | 'processing' | 'completed' | 'failed',
    beforeDate?: Date
  ): Promise<QueuedOrder[]> {
    const query: Record<string, unknown> = { status };

    if (beforeDate) {
      query.scheduledFor = { $lte: beforeDate };
    }

    const items = await OrderQueue.find(query).sort({ scheduledFor: 1 });
    return items.map(toQueuedOrder);
  }

  async getDueOrders(): Promise<QueuedOrder[]> {
    return this.getQueuedOrders('pending', new Date());
  }

  async markProcessing(id: string): Promise<QueuedOrder> {
    const item = await OrderQueue.findByIdAndUpdate(
      id,
      { status: 'processing' },
      { new: true }
    );

    if (!item) {
      throw new NotFoundError(`Queue item ${id} not found`);
    }

    return toQueuedOrder(item);
  }

  async markCompleted(id: string): Promise<QueuedOrder> {
    const item = await OrderQueue.findByIdAndUpdate(
      id,
      { status: 'completed', processedAt: new Date() },
      { new: true }
    );

    if (!item) {
      throw new NotFoundError(`Queue item ${id} not found`);
    }

    console.log(`[OrderQueueService] Marked order ${item.orderId} as completed`);
    return toQueuedOrder(item);
  }

  async markFailed(id: string, errorMessage: string): Promise<QueuedOrder> {
    const item = await OrderQueue.findByIdAndUpdate(
      id,
      { status: 'failed', processedAt: new Date(), errorMessage },
      { new: true }
    );

    if (!item) {
      throw new NotFoundError(`Queue item ${id} not found`);
    }

    console.error(`[OrderQueueService] Marked order ${item.orderId} as failed: ${errorMessage}`);
    return toQueuedOrder(item);
  }

  async retryFailed(id: string, delayMinutes: number = 60): Promise<QueuedOrder> {
    const scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000);

    const item = await OrderQueue.findByIdAndUpdate(
      id,
      {
        status: 'pending',
        scheduledFor,
        processedAt: undefined,
        errorMessage: undefined,
      },
      { new: true }
    );

    if (!item) {
      throw new NotFoundError(`Queue item ${id} not found`);
    }

    console.log(`[OrderQueueService] Retrying order ${item.orderId}, scheduled for ${scheduledFor.toISOString()}`);
    return toQueuedOrder(item);
  }

  async getPendingCount(businessId: string): Promise<number> {
    return OrderQueue.countDocuments({ businessId, status: 'pending' });
  }

  async getBusinessQueueStats(businessId: string): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const [result] = await OrderQueue.aggregate([
      { $match: { businessId: new mongoose.Types.ObjectId(businessId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    if (result) {
      const grouped = await OrderQueue.aggregate([
        { $match: { businessId: new mongoose.Types.ObjectId(businessId) } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      for (const item of grouped) {
        const status = item._id as keyof typeof stats;
        if (status in stats) {
          stats[status] = item.count;
        }
      }
    }

    return stats;
  }

  async findById(id: string): Promise<QueuedOrder | null> {
    const item = await OrderQueue.findById(id);
    return item ? toQueuedOrder(item) : null;
  }

  async deleteOldCompleted(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const result = await OrderQueue.deleteMany({
      status: 'completed',
      processedAt: { $lt: cutoffDate },
    });

    console.log(`[OrderQueueService] Deleted ${result.deletedCount} old completed queue items`);
    return result.deletedCount;
  }
}

export const orderQueueService = new OrderQueueService();
