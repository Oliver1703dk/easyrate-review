import crypto from 'crypto';
import { Business, type BusinessDocument } from '../models/Business.js';
import { orderQueueService, type QueuedOrder } from '../services/OrderQueueService.js';
import { notificationService } from '../services/NotificationService.js';

interface ProcessorConfig {
  intervalMs: number;
  batchSize: number;
}

const DEFAULT_CONFIG: ProcessorConfig = {
  intervalMs: 60 * 1000, // 1 minute
  batchSize: 10,
};

class OrderQueueProcessor {
  private config: ProcessorConfig;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;
  private isProcessing: boolean = false;

  constructor(config: Partial<ProcessorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  start(): void {
    if (this.isRunning) {
      console.log('[OrderQueueProcessor] Already running');
      return;
    }

    this.isRunning = true;
    console.log(`[OrderQueueProcessor] Starting with ${this.config.intervalMs}ms interval`);

    // Run first processing immediately
    this.processQueue().catch((error) => {
      console.error('[OrderQueueProcessor] Initial process error:', error);
    });

    // Set up interval for subsequent processing
    this.intervalId = setInterval(() => {
      this.processQueue().catch((error) => {
        console.error('[OrderQueueProcessor] Process error:', error);
      });
    }, this.config.intervalMs);
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('[OrderQueueProcessor] Stopping');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      console.log('[OrderQueueProcessor] Already processing, skipping');
      return;
    }

    this.isProcessing = true;

    try {
      const dueOrders = await orderQueueService.getDueOrders();

      if (dueOrders.length === 0) {
        return;
      }

      console.log(`[OrderQueueProcessor] Processing ${dueOrders.length} due orders`);

      // Process in batches
      for (let i = 0; i < dueOrders.length; i += this.config.batchSize) {
        const batch = dueOrders.slice(i, i + this.config.batchSize);
        await Promise.all(batch.map((order) => this.processOrder(order)));
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processOrder(queuedOrder: QueuedOrder): Promise<void> {
    const { id, businessId, orderData } = queuedOrder;

    try {
      // Mark as processing
      await orderQueueService.markProcessing(id);

      // Load business config
      const business = await Business.findById(businessId) as BusinessDocument | null;
      if (!business) {
        await orderQueueService.markFailed(id, 'Business not found');
        return;
      }

      // Check if customer has contact info
      const hasPhone = Boolean(orderData.customerPhone);
      const hasEmail = Boolean(orderData.customerEmail);

      if (!hasPhone && !hasEmail) {
        console.warn(
          `[OrderQueueProcessor] Order ${orderData.orderId} has no customer contact info, skipping`
        );
        await orderQueueService.markCompleted(id);
        return;
      }

      // Determine notification type based on business settings and available contact
      const shouldSendSms = business.settings.smsEnabled && hasPhone;
      const shouldSendEmail = business.settings.emailEnabled && hasEmail;

      if (!shouldSendSms && !shouldSendEmail) {
        console.warn(
          `[OrderQueueProcessor] No notification method available for order ${orderData.orderId}`
        );
        await orderQueueService.markCompleted(id);
        return;
      }

      // Generate review link with unique token
      const reviewToken = crypto.randomBytes(16).toString('hex');
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const reviewLink = `${baseUrl}/r/${businessId}?token=${reviewToken}&order=${orderData.orderId}`;

      // Get message content
      const smsTemplate = business.messageTemplates.sms ||
        `Tak for dit besøg hos ${business.name}! Del venligst din oplevelse: {link}`;
      const emailTemplate = business.messageTemplates.email ||
        `Tak for dit besøg hos ${business.name}! Vi vil meget gerne høre om din oplevelse.`;

      // Create SMS notification if enabled
      if (shouldSendSms && orderData.customerPhone) {
        const smsContent = smsTemplate.replace('{link}', reviewLink);

        await notificationService.create(businessId, {
          type: 'sms',
          recipient: orderData.customerPhone,
          content: smsContent,
          reviewLink,
          orderId: orderData.orderId,
        });

        console.log(
          `[OrderQueueProcessor] Created SMS notification for order ${orderData.orderId}`
        );
      }

      // Create email notification if enabled
      if (shouldSendEmail && orderData.customerEmail) {
        const emailSubject = `Hvordan var din oplevelse hos ${business.name}?`;
        const emailContent = emailTemplate.replace('{link}', reviewLink);

        await notificationService.create(businessId, {
          type: 'email',
          recipient: orderData.customerEmail,
          subject: emailSubject,
          content: emailContent,
          reviewLink,
          orderId: orderData.orderId,
        });

        console.log(
          `[OrderQueueProcessor] Created email notification for order ${orderData.orderId}`
        );
      }

      // Mark as completed
      await orderQueueService.markCompleted(id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[OrderQueueProcessor] Failed to process order ${orderData.orderId}:`, error);
      await orderQueueService.markFailed(id, errorMessage);
    }
  }

  getStatus(): { isRunning: boolean; isProcessing: boolean } {
    return {
      isRunning: this.isRunning,
      isProcessing: this.isProcessing,
    };
  }
}

export const orderQueueProcessor = new OrderQueueProcessor();

export function startQueueProcessor(): void {
  orderQueueProcessor.start();
}

export function stopQueueProcessor(): void {
  orderQueueProcessor.stop();
}
