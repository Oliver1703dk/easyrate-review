import mongoose, { Schema, Document, Model } from 'mongoose';
import type { Business as BusinessType, IntegrationConfig } from '@easyrate/shared';

export interface BusinessDocument extends Omit<BusinessType, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const integrationConfigSchema = new Schema<IntegrationConfig>(
  {
    platform: {
      type: String,
      enum: ['dully', 'easytable'],
      required: true,
    },
    apiKey: { type: String },
    webhookSecret: { type: String },
    enabled: { type: Boolean, default: false },
    settings: { type: Schema.Types.Mixed, default: {} },
    connectedAt: { type: Date },
    lastWebhookAt: { type: Date },
    webhookCount: { type: Number, default: 0 },
  },
  { _id: false }
);

const gdprSettingsSchema = new Schema(
  {
    dataRetentionDays: { type: Number, default: 365 },
    privacyPolicyUrl: { type: String },
    autoDeleteEnabled: { type: Boolean, default: false },
    lastRetentionRun: { type: Date },
  },
  { _id: false }
);

const aiSettingsSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    provider: { type: String, enum: ['grok', 'openai'], default: 'grok' },
    autoRefresh: { type: Boolean, default: true },
    lastInsightRunId: { type: Schema.Types.ObjectId, ref: 'InsightRun' },
    lastInsightRunAt: { type: Date },
  },
  { _id: false }
);

const businessSettingsSchema = new Schema(
  {
    defaultDelayMinutes: { type: Number, default: 60 },
    smsDelayMinutes: { type: Number },
    emailDelayMinutes: { type: Number },
    smsEnabled: { type: Boolean, default: true },
    emailEnabled: { type: Boolean, default: false },
    googleReviewUrl: { type: String },
    primaryColor: { type: String, default: '#3B82F6' },
    logoUrl: { type: String },
    gdpr: { type: gdprSettingsSchema, default: () => ({}) },
    aiSettings: { type: aiSettingsSchema, default: () => ({}) },
  },
  { _id: false }
);

const messageTemplatesSchema = new Schema(
  {
    sms: { type: String },
    email: { type: String },
  },
  { _id: false }
);

const brandingSchema = new Schema(
  {
    primaryColor: { type: String, default: '#3B82F6' },
    logoUrl: { type: String },
  },
  { _id: false }
);

const businessSchema = new Schema<BusinessDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 255,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    settings: {
      type: businessSettingsSchema,
      default: () => ({}),
    },
    integrations: {
      type: [integrationConfigSchema],
      default: [],
    },
    messageTemplates: {
      type: messageTemplatesSchema,
      default: () => ({}),
    },
    branding: {
      type: brandingSchema,
      default: () => ({}),
    },
    // Reserved for future multi-location support
    locationId: {
      type: String,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
businessSchema.index({ email: 1 }, { unique: true });
businessSchema.index({ locationId: 1 });

export const Business: Model<BusinessDocument> = mongoose.model<BusinessDocument>(
  'Business',
  businessSchema
);
