import crypto from 'crypto';
import type { Message, SendResult, MessageStatusResult, EmailProvider } from '@easyrate/shared';
import { PROVIDER_NAMES } from '@easyrate/shared';
import { BaseProvider } from '../BaseProvider.js';

export interface SendGridConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string | undefined;
  webhookVerificationKey?: string | undefined;
}

interface SendGridError {
  errors: Array<{
    message: string;
    field?: string;
    help?: string;
  }>;
}

/**
 * SendGrid Email Provider
 * API Docs: https://docs.sendgrid.com/api-reference/mail-send/mail-send
 */
export class SendGridProvider extends BaseProvider implements EmailProvider {
  protected readonly providerName = PROVIDER_NAMES.SENDGRID;
  public readonly fromEmail: string;
  public readonly fromName: string | undefined;
  private readonly apiKey: string;
  private readonly webhookVerificationKey: string | undefined;
  private readonly baseUrl = 'https://api.sendgrid.com/v3';

  constructor(config: SendGridConfig) {
    super({ apiKey: config.apiKey });
    this.apiKey = config.apiKey;
    this.fromEmail = config.fromEmail;
    this.fromName = config.fromName;
    this.webhookVerificationKey = config.webhookVerificationKey;
  }

  /**
   * Send email via SendGrid
   */
  async send(message: Message): Promise<SendResult> {
    // Validate email format
    if (!this.isValidEmail(message.to)) {
      return {
        success: false,
        error: `Invalid email address: ${message.to}`,
      };
    }

    this.log(`Sending email`, { to: message.to, subject: message.subject });

    try {
      await this.waitForRateLimit();

      const payload = {
        personalizations: [
          {
            to: [{ email: message.to }],
          },
        ],
        from: {
          email: message.from || this.fromEmail,
          name: this.fromName,
        },
        subject: message.subject || 'Message from EasyRate',
        content: [
          {
            type: message.html ? 'text/html' : 'text/plain',
            value: message.html || message.content,
          },
        ],
      };

      const response = await fetch(`${this.baseUrl}/mail/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // SendGrid returns 202 Accepted for successful sends
      if (response.status === 202) {
        // Get message ID from headers
        const messageId = response.headers.get('X-Message-Id') || '';
        this.log(`Email sent successfully`, { messageId });

        return {
          success: true,
          messageId,
        };
      }

      // Handle errors
      const errorData = (await response.json()) as SendGridError;
      const errorMessage = errorData.errors?.map((e) => e.message).join(', ') ||
        `HTTP ${response.status}`;

      return {
        success: false,
        error: errorMessage,
      };
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  /**
   * Get message status
   * Note: SendGrid uses webhooks for status updates, not polling
   */
  async getStatus(messageId: string): Promise<MessageStatusResult> {
    // SendGrid doesn't provide a polling API for message status
    // Status is delivered via webhooks only
    return {
      messageId,
      status: 'sent', // Assume sent if we have a message ID
    };
  }

  /**
   * Verify SendGrid webhook signature (ECDSA)
   * Docs: https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook-security-features
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    if (!this.webhookVerificationKey) {
      this.logError('Webhook verification key not configured', {});
      return false;
    }

    try {
      const payloadStr = typeof payload === 'string' ? payload : payload.toString('utf-8');

      // SendGrid uses ECDSA with SHA-256
      const verifier = crypto.createVerify('sha256');
      verifier.update(payloadStr);

      return verifier.verify(
        {
          key: this.webhookVerificationKey,
          format: 'pem',
        },
        signature,
        'base64'
      );
    } catch (error) {
      this.logError('Webhook signature verification failed', error);
      return false;
    }
  }

  /**
   * Basic email validation
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Parse SendGrid event webhook payload
   */
  static parseEventWebhook(events: SendGridWebhookEvent[]): Array<{
    messageId: string;
    email: string;
    event: string;
    timestamp: Date;
    reason?: string | undefined;
  }> {
    return events.map((event) => {
      const result: {
        messageId: string;
        email: string;
        event: string;
        timestamp: Date;
        reason?: string | undefined;
      } = {
        messageId: event.sg_message_id?.split('.')[0] || '',
        email: event.email,
        event: event.event,
        timestamp: new Date(event.timestamp * 1000),
      };

      if (event.reason) {
        result.reason = event.reason;
      }

      return result;
    });
  }

  /**
   * Map SendGrid event to NotificationStatus
   */
  static mapWebhookEvent(event: string): 'sent' | 'delivered' | 'failed' | 'bounced' | 'opened' | 'clicked' {
    switch (event.toLowerCase()) {
      case 'processed':
      case 'deferred':
        return 'sent';
      case 'delivered':
        return 'delivered';
      case 'bounce':
        return 'bounced';
      case 'dropped':
        return 'failed';
      case 'open':
        return 'opened';
      case 'click':
        return 'clicked';
      default:
        return 'sent';
    }
  }
}

/**
 * SendGrid webhook event structure
 */
export interface SendGridWebhookEvent {
  email: string;
  timestamp: number;
  event: 'processed' | 'deferred' | 'delivered' | 'open' | 'click' | 'bounce' | 'dropped' | 'spamreport' | 'unsubscribe' | 'group_unsubscribe' | 'group_resubscribe';
  sg_message_id?: string;
  reason?: string;
  status?: string;
  response?: string;
  attempt?: string;
  category?: string[];
  url?: string;
  ip?: string;
  useragent?: string;
}
