import type { SmsProvider, EmailProvider } from '@easyrate/shared';
import { GatewayApiProvider, type GatewayApiConfig } from './sms/GatewayApiProvider.js';
import { SendGridProvider, type SendGridConfig } from './email/SendGridProvider.js';

/**
 * Singleton factory for creating message providers from environment config
 * Extensible for future providers (Twilio, AWS SES, etc.)
 */
export class ProviderFactory {
  private static instance: ProviderFactory;
  private smsProvider: SmsProvider | null = null;
  private emailProvider: EmailProvider | null = null;

  private constructor() {}

  static getInstance(): ProviderFactory {
    if (!ProviderFactory.instance) {
      ProviderFactory.instance = new ProviderFactory();
    }
    return ProviderFactory.instance;
  }

  /**
   * Get or create the SMS provider
   * Currently supports Gateway API only
   */
  getSmsProvider(): SmsProvider {
    if (!this.smsProvider) {
      const config = this.getGatewayApiConfig();
      this.smsProvider = new GatewayApiProvider(config);
    }
    return this.smsProvider;
  }

  /**
   * Get or create the email provider
   * Currently supports SendGrid only
   */
  getEmailProvider(): EmailProvider {
    if (!this.emailProvider) {
      const config = this.getSendGridConfig();
      this.emailProvider = new SendGridProvider(config);
    }
    return this.emailProvider;
  }

  /**
   * Check if SMS provider is configured
   */
  isSmsConfigured(): boolean {
    return Boolean(process.env.GATEWAYAPI_API_KEY);
  }

  /**
   * Check if email provider is configured
   */
  isEmailConfigured(): boolean {
    return Boolean(process.env.SENDGRID_API_KEY);
  }

  /**
   * Get Gateway API configuration from environment
   */
  private getGatewayApiConfig(): GatewayApiConfig {
    const apiKey = process.env.GATEWAYAPI_API_KEY;
    if (!apiKey) {
      throw new Error('GATEWAYAPI_API_KEY environment variable is required');
    }

    return {
      apiKey,
      senderId: process.env.GATEWAYAPI_SENDER_ID || 'EasyRate',
      webhookSecret: process.env.GATEWAYAPI_WEBHOOK_SECRET,
    };
  }

  /**
   * Get SendGrid configuration from environment
   */
  private getSendGridConfig(): SendGridConfig {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY environment variable is required');
    }

    const fromEmail = process.env.SENDGRID_FROM_EMAIL;
    if (!fromEmail) {
      throw new Error('SENDGRID_FROM_EMAIL environment variable is required');
    }

    return {
      apiKey,
      fromEmail,
      fromName: process.env.SENDGRID_FROM_NAME || 'EasyRate',
      webhookVerificationKey: process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY,
    };
  }

  /**
   * Reset providers (mainly for testing)
   */
  reset(): void {
    this.smsProvider = null;
    this.emailProvider = null;
  }
}

// Convenience functions for getting providers
export function getSmsProvider(): SmsProvider {
  return ProviderFactory.getInstance().getSmsProvider();
}

export function getEmailProvider(): EmailProvider {
  return ProviderFactory.getInstance().getEmailProvider();
}

export function isSmsConfigured(): boolean {
  return ProviderFactory.getInstance().isSmsConfigured();
}

export function isEmailConfigured(): boolean {
  return ProviderFactory.getInstance().isEmailConfigured();
}
