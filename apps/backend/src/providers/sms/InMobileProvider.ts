import type { Message, SendResult, MessageStatusResult, SmsProvider } from '@easyrate/shared';
import { PROVIDER_NAMES } from '@easyrate/shared';
import { BaseProvider } from '../BaseProvider.js';
import {
  normalizeDanishPhone,
  isValidPhoneNumber,
  requiresUcs2Encoding,
  calculateSmsSegments,
} from '../../utils/smsEncoding.js';

export interface InMobileConfig {
  apiKey: string;
  senderId: string;
  webhookSecret?: string | undefined;
  statusCallbackUrl?: string | undefined;
}

interface InMobileMessageResult {
  numberDetails: {
    countryCode: string;
    phoneNumber: string;
    rawMsisdn: string;
    isValidGsm: boolean;
  };
  encoding: string;
  smsCount: number;
  messageId: string;
}

interface InMobileResponse {
  results: InMobileMessageResult[];
}

interface InMobileError {
  errorMessage: string;
  details: string[];
}

/**
 * InMobile SMS Provider
 * API Docs: https://www.inmobile.com/docs/rest-api/v4
 */
export class InMobileProvider extends BaseProvider implements SmsProvider {
  protected readonly providerName = PROVIDER_NAMES.INMOBILE;
  public readonly senderId: string;
  private readonly apiKey: string;
  private readonly webhookSecret: string | undefined;
  private readonly statusCallbackUrl: string | undefined;
  private readonly baseUrl = 'https://api.inmobile.com/v4';

  constructor(config: InMobileConfig) {
    super({ apiKey: config.apiKey });
    this.apiKey = config.apiKey;
    this.senderId = config.senderId;
    this.webhookSecret = config.webhookSecret;
    this.statusCallbackUrl = config.statusCallbackUrl;
  }

  /**
   * Send SMS via InMobile
   */
  async send(message: Message): Promise<SendResult> {
    const normalizedPhone = normalizeDanishPhone(message.to);
    if (!isValidPhoneNumber(normalizedPhone)) {
      return {
        success: false,
        error: `Invalid phone number: ${message.to}`,
      };
    }

    // InMobile expects MSISDN without + prefix
    const msisdn = normalizedPhone.replace('+', '');

    const encodingInfo = calculateSmsSegments(message.content);
    this.log(
      `Sending SMS: ${encodingInfo.encoding} encoding, ${encodingInfo.segmentCount} segment(s)`,
      { to: msisdn, charCount: encodingInfo.characterCount }
    );

    try {
      await this.waitForRateLimit();

      const messagePayload: Record<string, unknown> = {
        to: msisdn,
        text: message.content,
        from: message.fromName?.slice(0, 11) || message.from || this.senderId,
        encoding: requiresUcs2Encoding(message.content) ? 'ucs2' : 'gsm7',
        respectBlacklist: true,
      };

      if (this.statusCallbackUrl) {
        messagePayload.statusCallbackUrl = this.statusCallbackUrl;
      }

      const response = await fetch(`${this.baseUrl}/sms/outgoing`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(':' + this.apiKey).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: [messagePayload] }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as InMobileError;
        return {
          success: false,
          error: errorData.errorMessage || `HTTP ${response.status}`,
        };
      }

      const data = (await response.json()) as InMobileResponse;
      const result = data.results[0];
      const messageId = result?.messageId || '';

      this.log(`SMS sent successfully`, { messageId, smsCount: result?.smsCount });

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  /**
   * Get message status via delivery reports
   * Note: InMobile reports are consumed on read — primarily use webhooks instead
   */
  async getStatus(messageId: string): Promise<MessageStatusResult> {
    try {
      await this.waitForRateLimit();

      const response = await fetch(`${this.baseUrl}/sms/outgoing/reports?limit=250`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(':' + this.apiKey).toString('base64')}`,
        },
      });

      if (!response.ok) {
        return {
          messageId,
          status: 'failed',
          error: `HTTP ${response.status}`,
        };
      }

      const data = await response.json() as { reports: Array<Record<string, unknown>> };

      // Find the report matching our messageId (reports are consumed on read)
      const report = data.reports?.find(
        (r: Record<string, unknown>) => r.messageId === messageId
      );

      if (!report) {
        return { messageId, status: 'sent' };
      }

      const status = this.mapInMobileStatus(report.status as string);
      const result: MessageStatusResult = { messageId, status };

      if (report.statusTimestamp) {
        result.timestamp = new Date(report.statusTimestamp as string);
      }

      return result;
    } catch (error) {
      return {
        messageId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify webhook signature via shared secret header
   * InMobile webhooks are authenticated with a shared secret in X-InMobile-Secret header
   */
  verifyWebhookSignature(_payload: string | Buffer, signature: string): boolean {
    if (!this.webhookSecret) {
      this.logError('Webhook secret not configured', {});
      return false;
    }

    return signature === this.webhookSecret;
  }

  /**
   * Normalize a Danish phone number to E.164 format
   */
  normalizePhone(phone: string): string {
    return normalizeDanishPhone(phone);
  }

  /**
   * Map InMobile delivery status to our MessageStatus
   */
  private mapInMobileStatus(status: string): MessageStatusResult['status'] {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'delivered';
      case 'failed':
      case 'rejected':
      case 'expired':
        return 'failed';
      case 'sent':
      case 'buffered':
        return 'sent';
      default:
        return 'queued';
    }
  }

  /**
   * Parse InMobile delivery webhook payload
   */
  static parseDeliveryWebhook(body: Record<string, unknown>): {
    messageId: string;
    status: string;
    msisdn: string;
    timestamp: Date;
    error?: string | undefined;
  } {
    const result: {
      messageId: string;
      status: string;
      msisdn: string;
      timestamp: Date;
      error?: string | undefined;
    } = {
      messageId: String(body.messageId),
      status: String(body.status),
      msisdn: String(body.msisdn || body.to),
      timestamp: body.statusTimestamp
        ? new Date(body.statusTimestamp as string)
        : new Date(),
    };

    if (body.errorDescription) {
      result.error = String(body.errorDescription);
    }

    return result;
  }

  /**
   * Map InMobile webhook status to NotificationStatus
   */
  static mapWebhookStatus(status: string): 'sent' | 'delivered' | 'failed' {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'delivered';
      case 'failed':
      case 'rejected':
      case 'expired':
        return 'failed';
      case 'sent':
      case 'buffered':
      default:
        return 'sent';
    }
  }
}
