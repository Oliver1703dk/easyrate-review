import type { Message, SendResult, MessageStatusResult, MessageProvider } from '@easyrate/shared';
import type { ProviderName } from '@easyrate/shared';
import { getRateLimiter, type RateLimiter } from '../services/RateLimiter.js';

export interface ProviderConfig {
  apiKey: string;
  [key: string]: unknown;
}

/**
 * Abstract base class for message providers (SMS, Email)
 * Provides common functionality for rate limiting, logging, and error handling
 */
export abstract class BaseProvider implements MessageProvider {
  protected abstract readonly providerName: ProviderName;
  protected config: ProviderConfig;
  private _rateLimiter: RateLimiter | null = null;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  /**
   * Get the rate limiter for this provider
   */
  protected get rateLimiter(): RateLimiter {
    if (!this._rateLimiter) {
      this._rateLimiter = getRateLimiter(this.providerName);
    }
    return this._rateLimiter;
  }

  /**
   * Wait for rate limit before making request
   */
  protected async waitForRateLimit(): Promise<void> {
    await this.rateLimiter.acquire();
  }

  /**
   * Log an info message with provider context
   */
  protected log(message: string, data?: Record<string, unknown>): void {
    const prefix = `[${this.providerName.toUpperCase()}]`;
    if (data) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  }

  /**
   * Log an error with provider context
   */
  protected logError(message: string, error: unknown): void {
    const prefix = `[${this.providerName.toUpperCase()}]`;
    console.error(prefix, message, error);
  }

  /**
   * Handle API errors consistently
   */
  protected handleApiError(error: unknown): SendResult {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.logError('API error:', error);
    return {
      success: false,
      error: errorMessage,
    };
  }

  /**
   * Send a message - must be implemented by subclasses
   */
  abstract send(message: Message): Promise<SendResult>;

  /**
   * Get message status - must be implemented by subclasses
   * Note: Most providers deliver status via webhooks rather than polling
   */
  abstract getStatus(messageId: string): Promise<MessageStatusResult>;

  /**
   * Verify webhook signature - must be implemented by subclasses that receive webhooks
   */
  abstract verifyWebhookSignature(payload: string | Buffer, signature: string): boolean;
}
