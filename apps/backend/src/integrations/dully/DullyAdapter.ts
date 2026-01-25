import crypto from 'crypto';
import type { IntegrationConfig, DullyWebhookPayload, OrderData } from '@easyrate/shared';
import { BaseAdapter } from '../BaseAdapter.js';

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

  verifySignature(payload: string, signature: string): boolean {
    if (!this.config?.webhookSecret) {
      this.logError('Cannot verify signature', new Error('No webhook secret configured'));
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      this.logError('Signature verification failed', error);
      return false;
    }
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

  shouldProcess(payload: DullyWebhookPayload): boolean {
    // Only process order.picked_up events
    return payload.event === 'order.picked_up';
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
