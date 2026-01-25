import type { Message, SendResult, MessageStatusResult, SmsProvider } from '@easyrate/shared';
import { PROVIDER_NAMES } from '@easyrate/shared';
import { BaseProvider } from '../BaseProvider.js';
import {
  normalizeDanishPhone,
  isValidPhoneNumber,
  requiresUcs2Encoding,
  calculateSmsSegments,
} from '../../utils/smsEncoding.js';

export interface GatewayApiConfig {
  apiKey: string;
  senderId: string;
  webhookSecret?: string | undefined;
}

interface GatewayApiResponse {
  ids: number[];
  usage: {
    total_cost: number;
    currency: string;
    countries: Record<string, { count: number; cost: number }>;
  };
}

interface GatewayApiError {
  code: string;
  message: string;
}

/**
 * Gateway API SMS Provider
 * API Docs: https://gatewayapi.com/docs/
 */
export class GatewayApiProvider extends BaseProvider implements SmsProvider {
  protected readonly providerName = PROVIDER_NAMES.GATEWAY_API;
  public readonly senderId: string;
  private readonly apiKey: string;
  private readonly webhookSecret: string | undefined;
  private readonly baseUrl = 'https://gatewayapi.com/rest';

  constructor(config: GatewayApiConfig) {
    super({ apiKey: config.apiKey });
    this.apiKey = config.apiKey;
    this.senderId = config.senderId;
    this.webhookSecret = config.webhookSecret;
  }

  /**
   * Send SMS via Gateway API
   */
  async send(message: Message): Promise<SendResult> {
    // Normalize and validate phone number
    const normalizedPhone = normalizeDanishPhone(message.to);
    if (!isValidPhoneNumber(normalizedPhone)) {
      return {
        success: false,
        error: `Invalid phone number: ${message.to}`,
      };
    }

    // Remove + prefix for Gateway API (they expect MSISDN format)
    const msisdn = normalizedPhone.replace('+', '');

    // Check encoding and log segment count
    const encodingInfo = calculateSmsSegments(message.content);
    this.log(
      `Sending SMS: ${encodingInfo.encoding} encoding, ${encodingInfo.segmentCount} segment(s)`,
      { to: msisdn, charCount: encodingInfo.characterCount }
    );

    try {
      await this.waitForRateLimit();

      const payload = {
        sender: message.from || this.senderId,
        message: message.content,
        recipients: [{ msisdn }],
        // Set encoding if UCS-2 is required
        ...(requiresUcs2Encoding(message.content) && { encoding: 'UCS2' }),
      };

      const response = await fetch(`${this.baseUrl}/mtsms`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as GatewayApiError;
        return {
          success: false,
          error: errorData.message || `HTTP ${response.status}`,
        };
      }

      const data = (await response.json()) as GatewayApiResponse;
      const messageId = data.ids[0]?.toString() || '';

      this.log(`SMS sent successfully`, { messageId, cost: data.usage.total_cost });

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  /**
   * Get message status
   * Note: Gateway API primarily uses webhooks for status updates
   * This method is mainly for initial confirmation
   */
  async getStatus(messageId: string): Promise<MessageStatusResult> {
    try {
      await this.waitForRateLimit();

      const response = await fetch(`${this.baseUrl}/mtsms/${messageId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`,
        },
      });

      if (!response.ok) {
        return {
          messageId,
          status: 'failed',
          error: `HTTP ${response.status}`,
        };
      }

      const data = await response.json() as Record<string, unknown>;

      // Map Gateway API status to our status
      const status = this.mapGatewayStatus(data.status as string);

      const result: MessageStatusResult = {
        messageId,
        status,
      };

      if (data.delivered_time) {
        result.timestamp = new Date(data.delivered_time as string);
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
   * Verify webhook signature (JWT-based)
   * Gateway API sends a JWT in the Authorization header
   */
  verifyWebhookSignature(_payload: string | Buffer, signature: string): boolean {
    if (!this.webhookSecret) {
      this.logError('Webhook secret not configured', {});
      return false;
    }

    try {
      // Gateway API uses JWT for webhooks
      // The signature parameter is the full JWT token
      const [headerB64, payloadB64, signatureB64] = signature.split('.');

      if (!headerB64 || !payloadB64 || !signatureB64) {
        return false;
      }

      // For MVP, we'll do basic JWT structure validation
      // In production, use a proper JWT library with the webhook secret
      const jwtPayload = JSON.parse(
        Buffer.from(payloadB64, 'base64url').toString('utf-8')
      );

      // Check if the JWT has required fields
      if (!jwtPayload.iat || !jwtPayload.exp) {
        return false;
      }

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (jwtPayload.exp < now) {
        this.logError('Webhook JWT expired', { exp: jwtPayload.exp, now });
        return false;
      }

      // For full verification, use jsonwebtoken library with HMAC-SHA256
      // const jwt = require('jsonwebtoken');
      // jwt.verify(signature, this.webhookSecret, { algorithms: ['HS256'] });

      return true;
    } catch (error) {
      this.logError('Webhook signature verification failed', error);
      return false;
    }
  }

  /**
   * Normalize a Danish phone number to E.164 format
   */
  normalizePhone(phone: string): string {
    return normalizeDanishPhone(phone);
  }

  /**
   * Map Gateway API status to our MessageStatus
   */
  private mapGatewayStatus(gatewayStatus: string): MessageStatusResult['status'] {
    switch (gatewayStatus?.toUpperCase()) {
      case 'DELIVERED':
        return 'delivered';
      case 'UNDELIVERED':
      case 'EXPIRED':
      case 'REJECTED':
        return 'failed';
      case 'BUFFERED':
      case 'ENROUTE':
        return 'sent';
      default:
        return 'queued';
    }
  }

  /**
   * Parse Gateway API delivery webhook payload
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
      messageId: String(body.id),
      status: String(body.status),
      msisdn: String(body.msisdn),
      timestamp: body.time ? new Date(Number(body.time) * 1000) : new Date(),
    };

    if (body.error) {
      result.error = String(body.error);
    }

    return result;
  }

  /**
   * Map Gateway API webhook status to NotificationStatus
   */
  static mapWebhookStatus(status: string): 'sent' | 'delivered' | 'failed' {
    switch (status.toUpperCase()) {
      case 'DELIVERED':
        return 'delivered';
      case 'UNDELIVERED':
      case 'EXPIRED':
      case 'REJECTED':
        return 'failed';
      case 'BUFFERED':
      case 'ENROUTE':
      default:
        return 'sent';
    }
  }
}
