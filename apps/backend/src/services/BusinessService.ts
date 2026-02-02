import type { CreateBusinessInput, UpdateBusinessInput, Business as BusinessType, IntegrationConfig } from '@easyrate/shared';
import { Business, BusinessDocument } from '../models/Business.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';

function toBusinessType(doc: BusinessDocument): BusinessType {
  return doc.toJSON() as unknown as BusinessType;
}

export class BusinessService {
  async create(input: CreateBusinessInput): Promise<BusinessType> {
    const existing = await Business.findOne({ email: input.email });
    if (existing) {
      throw new ConflictError('En virksomhed med denne email eksisterer allerede');
    }

    const business = new Business({
      name: input.name,
      email: input.email,
      phone: input.phone,
      address: input.address,
      settings: {},
      integrations: [],
      messageTemplates: {},
      branding: {},
    });

    await business.save();
    return toBusinessType(business);
  }

  async findById(id: string): Promise<BusinessType | null> {
    const business = await Business.findById(id);
    return business ? toBusinessType(business) : null;
  }

  async findByIdOrThrow(id: string): Promise<BusinessType> {
    const business = await this.findById(id);
    if (!business) {
      throw new NotFoundError('Virksomhed ikke fundet');
    }
    return business;
  }

  async findByEmail(email: string): Promise<BusinessType | null> {
    const business = await Business.findOne({ email: email.toLowerCase() });
    return business ? toBusinessType(business) : null;
  }

  async update(id: string, input: UpdateBusinessInput): Promise<BusinessType> {
    const business = await Business.findById(id);
    if (!business) {
      throw new NotFoundError('Virksomhed ikke fundet');
    }

    // Update basic fields
    if (input.name !== undefined) business.name = input.name;
    if (input.email !== undefined) business.email = input.email;
    if (input.phone !== undefined) business.phone = input.phone;
    if (input.address !== undefined) business.address = input.address;

    // Update settings (deep merge for nested objects like aiSettings)
    if (input.settings) {
      const currentSettings = JSON.parse(JSON.stringify(business.settings ?? {})) as Record<string, unknown>;
      const newSettings = { ...currentSettings };

      // Merge top-level settings
      for (const [key, value] of Object.entries(input.settings)) {
        if (key === 'aiSettings' && value && typeof value === 'object') {
          // Deep merge aiSettings
          newSettings.aiSettings = {
            ...(currentSettings.aiSettings as Record<string, unknown> | undefined),
            ...value,
          };
        } else if (value !== undefined) {
          newSettings[key] = value;
        }
      }

      business.settings = newSettings as unknown as typeof business.settings;
      business.markModified('settings');
    }

    // Update branding (merge)
    if (input.branding) {
      business.branding = {
        ...business.branding,
        ...input.branding,
      };
    }

    await business.save();
    return toBusinessType(business);
  }

  async updateSettings(
    id: string,
    settings: Partial<BusinessType['settings']>
  ): Promise<BusinessType> {
    const business = await Business.findById(id);
    if (!business) {
      throw new NotFoundError('Virksomhed ikke fundet');
    }

    const currentSettings = JSON.parse(JSON.stringify(business.settings ?? {})) as Record<string, unknown>;
    const newSettings = { ...currentSettings };

    // Merge settings with deep merge for aiSettings
    for (const [key, value] of Object.entries(settings)) {
      if (key === 'aiSettings' && value && typeof value === 'object') {
        newSettings.aiSettings = {
          ...(currentSettings.aiSettings as Record<string, unknown> | undefined),
          ...value,
        };
      } else if (value !== undefined) {
        newSettings[key] = value;
      }
    }

    business.settings = newSettings as unknown as typeof business.settings;
    business.markModified('settings');

    await business.save();
    return toBusinessType(business);
  }

  async updateIntegration(
    id: string,
    platform: 'dully' | 'easytable',
    config: Partial<IntegrationConfig>
  ): Promise<BusinessType> {
    const business = await Business.findById(id);
    if (!business) {
      throw new NotFoundError('Virksomhed ikke fundet');
    }

    const integrationIndex = business.integrations.findIndex(
      (i: { platform: string }) => i.platform === platform
    );

    if (integrationIndex === -1) {
      // Add new integration
      const newIntegration: IntegrationConfig = {
        platform,
        enabled: config.enabled ?? false,
        settings: config.settings ?? {},
      };
      if (config.apiKey) newIntegration.apiKey = config.apiKey;
      if (config.webhookSecret) newIntegration.webhookSecret = config.webhookSecret;
      business.integrations.push(newIntegration);
    } else {
      // Update existing integration
      const existing = business.integrations[integrationIndex]!;
      const updated: IntegrationConfig = {
        platform,
        enabled: config.enabled ?? existing.enabled,
        settings: config.settings ?? existing.settings ?? {},
      };
      if (config.apiKey !== undefined) {
        if (config.apiKey) updated.apiKey = config.apiKey;
      } else if (existing.apiKey) {
        updated.apiKey = existing.apiKey;
      }
      if (config.webhookSecret !== undefined) {
        if (config.webhookSecret) updated.webhookSecret = config.webhookSecret;
      } else if (existing.webhookSecret) {
        updated.webhookSecret = existing.webhookSecret;
      }
      business.integrations[integrationIndex] = updated;
    }

    await business.save();
    return toBusinessType(business);
  }

  async delete(id: string): Promise<void> {
    const result = await Business.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundError('Virksomhed ikke fundet');
    }
  }
}

export const businessService = new BusinessService();
