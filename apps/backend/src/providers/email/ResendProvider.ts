import crypto from 'crypto';
import { Resend } from 'resend';
import type { Message, SendResult, MessageStatusResult, EmailProvider } from '@easyrate/shared';
import { PROVIDER_NAMES } from '@easyrate/shared';
import { BaseProvider } from '../BaseProvider.js';

export interface ResendConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string | undefined;
  webhookSecret?: string | undefined;
}

/**
 * Resend Email Provider
 * API Docs: https://resend.com/docs
 */
export class ResendProvider extends BaseProvider implements EmailProvider {
  protected readonly providerName = PROVIDER_NAMES.RESEND;
  public readonly fromEmail: string;
  public readonly fromName: string | undefined;
  private readonly client: Resend;
  private readonly webhookSecret: string | undefined;

  constructor(config: ResendConfig) {
    super({ apiKey: config.apiKey });
    this.client = new Resend(config.apiKey);
    this.fromEmail = config.fromEmail;
    this.fromName = config.fromName;
    this.webhookSecret = config.webhookSecret;
  }

  async send(message: Message): Promise<SendResult> {
    if (!this.isValidEmail(message.to)) {
      return {
        success: false,
        error: `Invalid email address: ${message.to}`,
      };
    }

    this.log(`Sending email`, { to: message.to, subject: message.subject });

    try {
      await this.waitForRateLimit();

      const fromAddress = message.from ?? this.fromEmail;
      const from = this.fromName ? `${this.fromName} <${fromAddress}>` : fromAddress;

      const { data, error } = await this.client.emails.send({
        from,
        to: [message.to],
        subject: message.subject ?? 'Message from EasyRate',
        ...(message.html ? { html: message.html } : { text: message.content }),
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      const messageId = data.id;
      this.log(`Email sent successfully`, { messageId });

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  async getStatus(messageId: string): Promise<MessageStatusResult> {
    try {
      const { data, error } = await this.client.emails.get(messageId);

      if (error) {
        return { messageId, status: 'sent' };
      }

      const status = ResendProvider.mapWebhookEvent(data.last_event);

      return { messageId, status };
    } catch {
      return { messageId, status: 'sent' };
    }
  }

  /**
   * Verify Resend webhook signature (svix)
   * Resend uses svix for webhook delivery. The signature is an HMAC-SHA256
   * of `${msgId}.${timestamp}.${body}` using the webhook secret.
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    if (!this.webhookSecret) {
      this.logError('Webhook secret not configured', {});
      return false;
    }

    try {
      const payloadStr = typeof payload === 'string' ? payload : payload.toString('utf-8');

      // svix signatures are comma-separated list of "v1,<base64>" values
      const signatures = signature.split(' ');
      const secret = this.webhookSecret.startsWith('whsec_')
        ? this.webhookSecret.slice(6)
        : this.webhookSecret;
      const secretBytes = Buffer.from(secret, 'base64');

      for (const sig of signatures) {
        const [version, sigValue] = sig.split(',');
        if (version !== 'v1' || !sigValue) continue;

        const expected = crypto
          .createHmac('sha256', secretBytes)
          .update(payloadStr)
          .digest('base64');

        if (sigValue === expected) {
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logError('Webhook signature verification failed', error);
      return false;
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Parse Resend webhook event payload
   */
  static parseWebhookEvent(event: ResendWebhookEvent): {
    messageId: string;
    email: string;
    event: string;
    timestamp: Date;
    reason?: string | undefined;
  } {
    const result: {
      messageId: string;
      email: string;
      event: string;
      timestamp: Date;
      reason?: string | undefined;
    } = {
      messageId: event.data.email_id,
      email: event.data.to[0],
      event: event.type,
      timestamp: new Date(event.created_at),
    };

    if (event.data.bounce?.message) {
      result.reason = event.data.bounce.message;
    }

    return result;
  }

  /**
   * Map Resend event type to NotificationStatus
   */
  static mapWebhookEvent(
    eventType: string
  ): 'sent' | 'delivered' | 'failed' | 'bounced' | 'opened' | 'clicked' {
    switch (eventType) {
      case 'email.sent':
        return 'sent';
      case 'email.delivered':
        return 'delivered';
      case 'email.bounced':
        return 'bounced';
      case 'email.delivery_delayed':
        return 'sent';
      case 'email.complained':
        return 'bounced';
      case 'email.opened':
        return 'opened';
      case 'email.clicked':
        return 'clicked';
      default:
        return 'sent';
    }
  }
}

/**
 * Resend webhook event structure
 */
export interface ResendWebhookEvent {
  type:
    | 'email.sent'
    | 'email.delivered'
    | 'email.delivery_delayed'
    | 'email.complained'
    | 'email.bounced'
    | 'email.opened'
    | 'email.clicked';
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    bounce?: {
      message: string;
    };
  };
}
