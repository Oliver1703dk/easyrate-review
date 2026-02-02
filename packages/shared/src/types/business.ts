import type { AISettings } from './ai.js';

export interface BusinessSettings {
  defaultDelayMinutes: number;
  smsEnabled: boolean;
  emailEnabled: boolean;
  googleReviewUrl?: string;
  primaryColor?: string;
  logoUrl?: string;
  aiSettings?: AISettings;
}

export interface IntegrationConfig {
  platform: 'dully' | 'easytable';
  apiKey?: string;
  webhookSecret?: string;
  enabled: boolean;
  settings?: Record<string, unknown>;
}

export interface Business {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  settings: BusinessSettings;
  integrations: IntegrationConfig[];
  messageTemplates: {
    sms?: string;
    email?: string;
  };
  branding: {
    primaryColor: string;
    logoUrl?: string;
  };
  locationId?: string; // Reserved for future multi-location support
  metadata?: Record<string, unknown>; // Reserved for extensibility
  tags?: string[]; // Reserved for categorization
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBusinessInput {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  settings?: Partial<BusinessSettings>;
}

export interface UpdateBusinessInput {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  settings?: Partial<BusinessSettings>;
  integrations?: IntegrationConfig[];
  messageTemplates?: {
    sms?: string;
    email?: string;
  };
  branding?: {
    primaryColor?: string;
    logoUrl?: string;
  };
}
