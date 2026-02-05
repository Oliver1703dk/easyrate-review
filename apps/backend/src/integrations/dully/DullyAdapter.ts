import crypto from 'crypto';
import type { IntegrationConfig, DullyWebhookPayload, OrderData } from '@easyrate/shared';
import { BaseAdapter } from '../BaseAdapter.js';

// Standard Webhooks timestamp tolerance: 5 minutes
const TIMESTAMP_TOLERANCE_SECONDS = 300;

export class DullyAdapter extends BaseAdapter {
  readonly name = 'dully';

  async connect(config: IntegrationConfig): Promise<void> {
    if (!config.webhookSecret) {
      throw new Error('Dully integration requires webhookSecret');
    }
    await super.connect(config);
    this.log('Webhook secret configured');
  }

  async testConnection(): Promise<boolean> {
    if (!this.config?.webhookSecret) {
      return false;
    }
    return super.testConnection();
  }

  /**
   * Verify Standard Webhooks signature
   * Signed payload format: ${timestamp}.${webhookId}.${payload}
   * Signature format: v1,{base64(HMAC-SHA256)}
   */
  verifySignature(
    payload: string,
    signature: string,
    webhookId: string,
    timestamp: string
  ): boolean {
    if (!this.config?.webhookSecret) {
      this.logError('Cannot verify signature', new Error('No webhook secret configured'));
      return false;
    }

    try {
      // Build the signed payload per Standard Webhooks spec
      const signedPayload = `${timestamp}.${webhookId}.${payload}`;

      // Compute expected signature
      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(signedPayload)
        .digest('base64');

      // Parse signature(s) - can be space-separated
      const signatures = signature.split(' ');

      for (const sig of signatures) {
        // Format: v1,{base64-signature}
        const [version, sigValue] = sig.split(',');
        if (version !== 'v1' || !sigValue) {
          continue;
        }

        // Timing-safe comparison
        try {
          const isValid = crypto.timingSafeEqual(
            Buffer.from(sigValue),
            Buffer.from(expectedSignature)
          );
          if (isValid) {
            return true;
          }
        } catch {
          // Buffer length mismatch - continue to next signature
          continue;
        }
      }

      return false;
    } catch (error) {
      this.logError('Signature verification failed', error);
      return false;
    }
  }

  /**
   * Validate timestamp for replay protection
   * Rejects if timestamp is more than 5 minutes from current time
   */
  isTimestampValid(timestamp: string): boolean {
    try {
      const timestampSeconds = parseInt(timestamp, 10);
      if (isNaN(timestampSeconds)) {
        this.logError('Invalid timestamp format', new Error(`Cannot parse: ${timestamp}`));
        return false;
      }

      const nowSeconds = Math.floor(Date.now() / 1000);
      const difference = Math.abs(nowSeconds - timestampSeconds);

      if (difference > TIMESTAMP_TOLERANCE_SECONDS) {
        this.log(
          `Timestamp rejected: ${difference}s difference exceeds ${TIMESTAMP_TOLERANCE_SECONDS}s tolerance`
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logError('Timestamp validation failed', error);
      return false;
    }
  }

  /**
   * Check if this is a cancellation event
   */
  isCancellation(payload: DullyWebhookPayload): boolean {
    return payload.event === 'order.cancelled';
  }

  transformPayload(payload: DullyWebhookPayload): OrderData {
    const orderData: OrderData = {
      orderId: payload.orderId,
      orderDate: new Date(payload.timestamp),
      completedAt: new Date(payload.timestamp),
      platform: 'dully',
      metadata: {
        restaurantId: payload.restaurantId,
        event: payload.event,
      },
    };

    if (payload.customerName) orderData.customerName = payload.customerName;
    if (payload.customerEmail) orderData.customerEmail = payload.customerEmail;
    if (payload.customerPhone) orderData.customerPhone = payload.customerPhone;
    if (payload.totalAmount !== undefined) orderData.orderTotal = payload.totalAmount;

    return orderData;
  }

  /**
   * Determine if an event should be processed for queuing
   * Process both order.picked_up AND order.approved events
   */
  shouldProcess(payload: DullyWebhookPayload): boolean {
    return payload.event === 'order.picked_up' || payload.event === 'order.approved';
  }

  async handleWebhook(payload: DullyWebhookPayload): Promise<OrderData | null> {
    this.validateConfig();

    if (!this.shouldProcess(payload)) {
      this.log(`Skipping event: ${payload.event}`);
      return null;
    }

    const orderData = this.transformPayload(payload);
    this.log(`Processing order: ${orderData.orderId}`);

    await this.notifyHandlers(orderData);

    return orderData;
  }
}

export const dullyAdapter = new DullyAdapter();
