import { z } from 'zod';

// Helper for optional URL fields that also accept empty strings
const optionalUrl = z.union([z.string().url(), z.literal('')]).optional();

export const businessSettingsSchema = z.object({
  defaultDelayMinutes: z.number().int().min(0).max(1440),
  smsEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  googleReviewUrl: optionalUrl,
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  logoUrl: optionalUrl,
});

export const integrationConfigSchema = z.object({
  platform: z.enum(['dully', 'easytable']),
  apiKey: z.string().min(1).optional(),
  webhookSecret: z.string().min(1).optional(),
  enabled: z.boolean(),
  settings: z.record(z.unknown()).optional(),
});

export const createBusinessSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  phone: z.string().min(8).max(20).optional(),
  address: z.string().max(500).optional(),
  settings: businessSettingsSchema.partial().optional(),
});

export const updateBusinessSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(8).max(20).optional(),
  address: z.string().max(500).optional(),
  settings: businessSettingsSchema.partial().optional(),
  integrations: z.array(integrationConfigSchema).optional(),
  messageTemplates: z
    .object({
      sms: z.string().max(160).optional(),
      email: z.string().max(5000).optional(),
    })
    .optional(),
  branding: z
    .object({
      primaryColor: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
      logoUrl: optionalUrl,
    })
    .optional(),
});

export type BusinessSettingsSchema = z.infer<typeof businessSettingsSchema>;
export type IntegrationConfigSchema = z.infer<typeof integrationConfigSchema>;
export type CreateBusinessSchema = z.infer<typeof createBusinessSchema>;
export type UpdateBusinessSchema = z.infer<typeof updateBusinessSchema>;
