import type { SmsProvider, EmailProvider, AIProviderType } from '@easyrate/shared';
import { InMobileProvider, type InMobileConfig } from './sms/InMobileProvider.js';
import { ResendProvider, type ResendConfig } from './email/ResendProvider.js';
import type { BaseAIProvider } from './ai/index.js';
import { createGrokProvider, createOpenAIProvider } from './ai/index.js';
import { GoogleBusinessProvider } from './google/GoogleBusinessProvider.js';

/**
 * Singleton factory for creating message providers from environment config
 * Extensible for future providers (Twilio, AWS SES, etc.)
 */
export class ProviderFactory {
  private static instance: ProviderFactory | undefined;
  private smsProvider: SmsProvider | null = null;
  private emailProvider: EmailProvider | null = null;
  private aiProvider: BaseAIProvider | null = null;
  private googleProvider: GoogleBusinessProvider | null = null;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  static getInstance(): ProviderFactory {
    ProviderFactory.instance ??= new ProviderFactory();
    return ProviderFactory.instance;
  }

  /**
   * Get or create the SMS provider
   */
  getSmsProvider(): SmsProvider {
    if (!this.smsProvider) {
      const config = this.getInMobileConfig();
      this.smsProvider = new InMobileProvider(config);
    }
    return this.smsProvider;
  }

  /**
   * Get or create the email provider
   */
  getEmailProvider(): EmailProvider {
    if (!this.emailProvider) {
      const config = this.getResendConfig();
      this.emailProvider = new ResendProvider(config);
    }
    return this.emailProvider;
  }

  /**
   * Check if SMS provider is configured
   */
  isSmsConfigured(): boolean {
    return Boolean(process.env.INMOBILE_API_KEY);
  }

  /**
   * Check if email provider is configured
   */
  isEmailConfigured(): boolean {
    return Boolean(process.env.RESEND_API_KEY);
  }

  /**
   * Get or create the AI provider
   * Prefers Grok, falls back to OpenAI
   */
  getAIProvider(preferredProvider?: AIProviderType): BaseAIProvider {
    // If a specific provider is requested and different from cached, create new
    if (preferredProvider && this.aiProvider && this.aiProvider.getName() !== preferredProvider) {
      this.aiProvider = null;
    }

    if (!this.aiProvider) {
      if (preferredProvider === 'openai') {
        this.aiProvider = createOpenAIProvider();
      } else if (preferredProvider === 'grok') {
        this.aiProvider = createGrokProvider();
      } else {
        // Default: try Grok first, then OpenAI
        this.aiProvider = createGrokProvider() ?? createOpenAIProvider();
      }

      if (!this.aiProvider) {
        throw new Error('No AI provider is configured. Set GROK_API_KEY or OPENAI_API_KEY.');
      }
    }
    return this.aiProvider;
  }

  /**
   * Check if any AI provider is configured
   */
  isAIConfigured(): boolean {
    return Boolean(process.env.GROK_API_KEY ?? process.env.OPENAI_API_KEY);
  }

  /**
   * Get or create the Google Business provider
   */
  getGoogleProvider(): GoogleBusinessProvider {
    this.googleProvider ??= new GoogleBusinessProvider();
    return this.googleProvider;
  }

  /**
   * Check if Google OAuth is configured
   */
  isGoogleConfigured(): boolean {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  }

  /**
   * Get the name of the configured AI provider
   */
  getConfiguredAIProviderName(): AIProviderType | null {
    if (process.env.GROK_API_KEY) return 'grok';
    if (process.env.OPENAI_API_KEY) return 'openai';
    return null;
  }

  /**
   * Get InMobile configuration from environment
   */
  private getInMobileConfig(): InMobileConfig {
    const apiKey = process.env.INMOBILE_API_KEY;
    if (!apiKey) {
      throw new Error('INMOBILE_API_KEY environment variable is required');
    }

    return {
      apiKey,
      senderId: process.env.INMOBILE_SENDER_ID ?? 'EasyRate',
      webhookSecret: process.env.INMOBILE_WEBHOOK_SECRET,
      statusCallbackUrl: process.env.INMOBILE_STATUS_CALLBACK_URL,
    };
  }

  /**
   * Get Resend configuration from environment
   */
  private getResendConfig(): ResendConfig {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (!fromEmail) {
      throw new Error('RESEND_FROM_EMAIL environment variable is required');
    }

    return {
      apiKey,
      fromEmail,
      fromName: process.env.RESEND_FROM_NAME ?? 'EasyRate',
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
    };
  }

  /**
   * Reset providers (mainly for testing)
   */
  reset(): void {
    this.smsProvider = null;
    this.emailProvider = null;
    this.aiProvider = null;
    this.googleProvider = null;
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

export function getAIProvider(preferredProvider?: AIProviderType): BaseAIProvider {
  return ProviderFactory.getInstance().getAIProvider(preferredProvider);
}

export function isAIConfigured(): boolean {
  return ProviderFactory.getInstance().isAIConfigured();
}

export function getConfiguredAIProviderName(): AIProviderType | null {
  return ProviderFactory.getInstance().getConfiguredAIProviderName();
}

export function getGoogleProvider(): GoogleBusinessProvider {
  return ProviderFactory.getInstance().getGoogleProvider();
}

export function isGoogleConfigured(): boolean {
  return ProviderFactory.getInstance().isGoogleConfigured();
}
