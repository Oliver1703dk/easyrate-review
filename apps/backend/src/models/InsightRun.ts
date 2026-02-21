import type { Document, Model } from 'mongoose';
import mongoose, { Schema } from 'mongoose';
import type {
  InsightRun as InsightRunType,
  ThemeSeverity,
  ThemeSentiment,
  SentimentLabel,
  InsightRunStatus,
  InsightTrigger,
  AIProviderType,
} from '@easyrate/shared';

export interface InsightRunDocument extends Omit<InsightRunType, 'id' | 'businessId'>, Document {
  _id: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
}

const overallSentimentSchema = new Schema(
  {
    score: { type: Number, required: true, min: 0, max: 100 },
    label: {
      type: String,
      enum: [
        'very_negative',
        'negative',
        'neutral',
        'positive',
        'very_positive',
      ] as SentimentLabel[],
      required: true,
    },
    summary: { type: String, required: true },
  },
  { _id: false }
);

const insightThemeSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    customerCount: { type: Number, required: true, min: 0 },
    mentionCount: { type: Number, required: true, min: 0 },
    severity: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'] as ThemeSeverity[],
      required: true,
    },
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral'] as ThemeSentiment[],
      required: true,
    },
    exampleQuotes: { type: [String], default: [] },
    suggestion: { type: String },
  },
  { _id: false }
);

const dateRangeSchema = new Schema(
  {
    from: { type: Date, required: true },
    to: { type: Date, required: true },
  },
  { _id: false }
);

const insightRunSchema = new Schema<InsightRunDocument>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'] as InsightRunStatus[],
      required: true,
      default: 'pending',
    },
    dateRange: {
      type: dateRangeSchema,
      required: true,
    },
    reviewCount: {
      type: Number,
      required: true,
      default: 0,
    },
    avgRating: {
      type: Number,
      default: null,
    },
    overallSentiment: {
      type: overallSentimentSchema,
      default: null,
    },
    themes: {
      type: [insightThemeSchema],
      default: [],
    },
    topImprovementPoint: {
      type: String,
      default: null,
    },
    customerSatisfactionSummary: {
      type: String,
      default: null,
    },
    aiProvider: {
      type: String,
      enum: ['grok', 'openai'] as AIProviderType[],
      required: true,
    },
    modelUsed: {
      type: String,
      default: '',
    },
    tokensUsed: {
      type: Number,
      default: 0,
    },
    processingTimeMs: {
      type: Number,
      default: 0,
    },
    triggeredBy: {
      type: String,
      enum: ['scheduled', 'manual'] as InsightTrigger[],
      required: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        ret.businessId = String(ret.businessId);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for efficient queries
insightRunSchema.index({ businessId: 1, createdAt: -1 });
insightRunSchema.index({ businessId: 1, status: 1 });
insightRunSchema.index({ status: 1, createdAt: -1 });

export const InsightRun: Model<InsightRunDocument> = mongoose.model<InsightRunDocument>(
  'InsightRun',
  insightRunSchema
);
