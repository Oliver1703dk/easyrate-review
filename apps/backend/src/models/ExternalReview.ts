import mongoose, { Schema, Document, Model } from 'mongoose';
import type { ExternalReview as ExternalReviewType } from '@easyrate/shared';

export interface ExternalReviewDocument
  extends Omit<ExternalReviewType, 'id' | 'businessId' | 'attribution'>,
    Document {
  _id: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
  attribution?: {
    internalReviewId?: mongoose.Types.ObjectId;
    confidence: number;
    matchMethod: 'name_time' | 'email' | 'manual';
  };
}

const externalReviewReplySchema = new Schema(
  {
    text: { type: String, required: true, maxlength: 4096 },
    repliedAt: { type: Date, required: true },
    repliedBy: { type: String, enum: ['google', 'easyrate'], required: true },
  },
  { _id: false }
);

const attributionSchema = new Schema(
  {
    internalReviewId: { type: Schema.Types.ObjectId, ref: 'Review' },
    confidence: { type: Number, min: 0, max: 1, required: true },
    matchMethod: {
      type: String,
      enum: ['name_time', 'email', 'manual'],
      required: true,
    },
  },
  { _id: false }
);

const externalReviewSchema = new Schema<ExternalReviewDocument>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },
    sourcePlatform: {
      type: String,
      enum: ['google', 'trustpilot'],
      required: true,
    },
    externalId: {
      type: String,
      required: true,
    },
    externalUrl: {
      type: String,
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    reviewText: {
      type: String,
      trim: true,
      maxlength: 10000,
    },
    reviewerName: {
      type: String,
      required: true,
      trim: true,
    },
    reviewerPhotoUrl: {
      type: String,
      trim: true,
    },
    reviewedAt: {
      type: Date,
      required: true,
    },
    reply: {
      type: externalReviewReplySchema,
      default: null,
    },
    attribution: {
      type: attributionSchema,
      default: null,
    },
    lastSyncedAt: {
      type: Date,
      required: true,
    },
    // For multi-location support
    locationId: {
      type: String,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        ret.businessId = String(ret.businessId);
        if (ret.attribution && typeof ret.attribution === 'object') {
          const attr = ret.attribution as Record<string, unknown>;
          if (attr.internalReviewId) {
            attr.internalReviewId = String(attr.internalReviewId);
          }
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes for common queries
externalReviewSchema.index({ businessId: 1, createdAt: -1 });
externalReviewSchema.index({ businessId: 1, sourcePlatform: 1 });
externalReviewSchema.index({ businessId: 1, rating: 1 });
externalReviewSchema.index({ businessId: 1, reviewedAt: -1 });
externalReviewSchema.index({ locationId: 1 });
// Unique index to prevent duplicate external reviews
externalReviewSchema.index(
  { businessId: 1, sourcePlatform: 1, externalId: 1 },
  { unique: true }
);
// Index for attribution matching
externalReviewSchema.index({ 'attribution.internalReviewId': 1 });

export const ExternalReview: Model<ExternalReviewDocument> =
  mongoose.model<ExternalReviewDocument>('ExternalReview', externalReviewSchema);
