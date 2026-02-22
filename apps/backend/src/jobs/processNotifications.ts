import type { NotificationDocument } from '../models/Notification.js';
import { Notification } from '../models/Notification.js';
import type { BusinessDocument } from '../models/Business.js';
import { Business } from '../models/Business.js';
import { notificationService } from '../services/NotificationService.js';
import {
  getSmsProvider,
  getEmailProvider,
  isSmsConfigured,
  isEmailConfigured,
} from '../providers/index.js';
import type { Message } from '@easyrate/shared';

interface ProcessorConfig {
  intervalMs: number;
  batchSize: number;
  maxRetries: number;
  retryDelaysMs: number[];
}

const DEFAULT_CONFIG: ProcessorConfig = {
  intervalMs: 10 * 1000, // 10 seconds
  batchSize: 10,
  maxRetries: 3,
  retryDelaysMs: [60 * 1000, 2 * 60 * 1000, 4 * 60 * 1000], // 1min, 2min, 4min
};

class NotificationProcessor {
  private config: ProcessorConfig;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private isProcessing = false;

  constructor(config: Partial<ProcessorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  start(): void {
    if (this.isRunning) {
      console.log('[NotificationProcessor] Already running');
      return;
    }

    this.isRunning = true;
    console.log(
      `[NotificationProcessor] Starting with ${String(this.config.intervalMs)}ms interval`
    );

    // Check if providers are configured
    if (!isSmsConfigured() && !isEmailConfigured()) {
      console.warn(
        '[NotificationProcessor] No message providers configured. Notifications will not be sent.'
      );
    } else {
      if (isSmsConfigured()) {
        console.log('[NotificationProcessor] SMS provider (Gateway API) configured');
      }
      if (isEmailConfigured()) {
        console.log('[NotificationProcessor] Email provider (Resend) configured');
      }
    }

    // Run first processing immediately
    this.processNotifications().catch((error: unknown) => {
      console.error('[NotificationProcessor] Initial process error:', error);
    });

    // Set up interval for subsequent processing
    this.intervalId = setInterval(() => {
      this.processNotifications().catch((error: unknown) => {
        console.error('[NotificationProcessor] Process error:', error);
      });
    }, this.config.intervalMs);
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('[NotificationProcessor] Stopping');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
  }

  async processNotifications(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      // Find pending notifications that are due for sending or retry
      const now = new Date();
      const pendingNotifications = await Notification.find({
        status: 'pending',
        $or: [{ retryAt: null }, { retryAt: { $lte: now } }],
      })
        .sort({ createdAt: 1 })
        .limit(this.config.batchSize);

      if (pendingNotifications.length === 0) {
        return;
      }

      console.log(
        `[NotificationProcessor] Processing ${String(pendingNotifications.length)} notifications`
      );

      // Process each notification
      for (const notification of pendingNotifications) {
        await this.processNotification(notification);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processNotification(notification: NotificationDocument): Promise<void> {
    const notificationId = String(notification._id);

    try {
      // Load business for fallback email
      const business = await Business.findById(notification.businessId);

      if (notification.type === 'sms') {
        await this.sendSms(notification, business);
      } else {
        await this.sendEmail(notification, business);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `[NotificationProcessor] Failed to process notification ${notificationId}:`,
        error
      );

      await this.handleFailure(notification, errorMessage);
    }
  }

  private async sendSms(
    notification: NotificationDocument,
    business: BusinessDocument | null
  ): Promise<void> {
    const notificationId = String(notification._id);

    if (!isSmsConfigured()) {
      console.warn(
        `[NotificationProcessor] SMS provider not configured, skipping ${notificationId}`
      );
      await this.handleFailure(notification, 'SMS provider not configured');
      return;
    }

    const smsProvider = getSmsProvider();

    const message: Message = {
      to: notification.recipient,
      content: notification.content,
    };

    if (business?.name) {
      message.fromName = business.name;
    }

    console.log(`[NotificationProcessor] Sending SMS to ${notification.recipient}`);

    const result = await smsProvider.send(message);

    if (result.success) {
      const updateOptions: { externalMessageId?: string } = {};
      if (result.messageId) {
        updateOptions.externalMessageId = result.messageId;
      }
      await notificationService.updateStatus(notificationId, 'sent', updateOptions);
      console.log(
        `[NotificationProcessor] Sent SMS ${notificationId} (external: ${result.messageId ?? ''})`
      );
    } else {
      console.error(
        `[NotificationProcessor] SMS send failed for ${notificationId}: ${result.error ?? ''}`
      );

      // Attempt fallback to email if customer has email
      if (business && notification.orderId) {
        const fallbackEmail = await this.attemptEmailFallback(notification, business);
        if (fallbackEmail) {
          console.log(`[NotificationProcessor] Created email fallback for ${notificationId}`);
          // Mark SMS as failed since we're falling back
          await notificationService.updateStatus(notificationId, 'failed', {
            errorMessage: `${result.error ?? 'Unknown error'} (email fallback created)`,
          });
          return;
        }
      }

      await this.handleFailure(notification, result.error ?? 'Unknown SMS error');
    }
  }

  private async sendEmail(
    notification: NotificationDocument,
    business: BusinessDocument | null
  ): Promise<void> {
    const notificationId = String(notification._id);

    if (!isEmailConfigured()) {
      console.warn(
        `[NotificationProcessor] Email provider not configured, skipping ${notificationId}`
      );
      await this.handleFailure(notification, 'Email provider not configured');
      return;
    }

    const emailProvider = getEmailProvider();

    const message: Message = {
      to: notification.recipient,
      content: notification.content,
    };

    if (notification.subject) {
      message.subject = notification.subject;
    }

    if (business?.name) {
      message.fromName = business.name;
    }

    console.log(`[NotificationProcessor] Sending email to ${notification.recipient}`);

    const result = await emailProvider.send(message);

    if (result.success) {
      const updateOptions: { externalMessageId?: string } = {};
      if (result.messageId) {
        updateOptions.externalMessageId = result.messageId;
      }
      await notificationService.updateStatus(notificationId, 'sent', updateOptions);
      console.log(
        `[NotificationProcessor] Sent email ${notificationId} (external: ${result.messageId ?? ''})`
      );
    } else {
      console.error(
        `[NotificationProcessor] Email send failed for ${notificationId}: ${result.error ?? ''}`
      );
      await this.handleFailure(notification, result.error ?? 'Unknown email error');
    }
  }

  private async attemptEmailFallback(
    notification: NotificationDocument,
    business: BusinessDocument
  ): Promise<boolean> {
    // Check if email is enabled for this business
    if (!business.settings.emailEnabled) {
      return false;
    }

    // We need to find the original order to get the customer email
    // For now, check if there's metadata with email
    const customerEmail = notification.metadata?.customerEmail as string | undefined;
    if (!customerEmail) {
      return false;
    }

    // Create a fallback email notification
    const emailSubject = `Hvordan var din oplevelse hos ${business.name}?`;
    const emailContent =
      business.messageTemplates.email ??
      `Tak for dit besøg hos ${business.name}! Vi vil meget gerne høre om din oplevelse. ${notification.reviewLink}`;

    const createInput: Parameters<typeof notificationService.create>[1] = {
      type: 'email',
      recipient: customerEmail,
      subject: emailSubject,
      content: emailContent,
      reviewLink: notification.reviewLink,
    };

    if (notification.orderId) {
      createInput.orderId = notification.orderId;
    }

    await notificationService.create(String(notification.businessId), createInput);

    return true;
  }

  private async handleFailure(
    notification: NotificationDocument,
    errorMessage: string
  ): Promise<void> {
    const notificationId = String(notification._id);
    const currentRetryCount = notification.retryCount;

    if (currentRetryCount >= this.config.maxRetries) {
      // Max retries reached, mark as failed
      await notificationService.updateStatus(notificationId, 'failed', {
        errorMessage: `Max retries exceeded. Last error: ${errorMessage}`,
      });
      console.log(
        `[NotificationProcessor] Notification ${notificationId} failed after ${String(currentRetryCount)} retries`
      );
      return;
    }

    // Schedule retry with exponential backoff
    const retryDelayIndex = Math.min(currentRetryCount, this.config.retryDelaysMs.length - 1);
    const retryDelay =
      this.config.retryDelaysMs[retryDelayIndex] ?? this.config.retryDelaysMs[0] ?? 60000;
    const retryAt = new Date(Date.now() + retryDelay);

    await Notification.findByIdAndUpdate(notificationId, {
      retryCount: currentRetryCount + 1,
      retryAt,
      errorMessage,
    });

    console.log(
      `[NotificationProcessor] Scheduled retry ${String(currentRetryCount + 1)}/${String(this.config.maxRetries)} for ${notificationId} at ${retryAt.toISOString()}`
    );
  }

  getStatus(): { isRunning: boolean; isProcessing: boolean } {
    return {
      isRunning: this.isRunning,
      isProcessing: this.isProcessing,
    };
  }
}

export const notificationProcessor = new NotificationProcessor();

export function startNotificationProcessor(): void {
  notificationProcessor.start();
}

export function stopNotificationProcessor(): void {
  notificationProcessor.stop();
}
