import mongoose, { Schema, Document, Model } from 'mongoose';
import type { Review as ReviewType } from '@easyrate/shared';

export interface ReviewDocument extends Omit<ReviewType, 'id' | 'businessId'>, Document {
  _id: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
}

const reviewCustomerSchema = new Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
  },
  { _id: false }
);

const consentSchema = new Schema(
  {
    given: { type: Boolean, required: true },
    timestamp: { type: Date, required: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    version: { type: String, default: '1.0' },
  },
  { _id: false }
);

const reviewSchema = new Schema<ReviewDocument>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    feedbackText: {
      type: String,
      trim: true,
      maxlength: 5000,
    },
    customer: {
      type: reviewCustomerSchema,
      default: () => ({}),
    },
    sourcePlatform: {
      type: String,
      enum: ['dully', 'easytable', 'direct'],
      required: true,
    },
    orderId: {
      type: String,
    },
    photos: {
      type: [String],
      default: [],
      validate: {
        validator: (v: string[]) => v.length <= 5,
        message: 'Maksimalt 5 billeder tilladt',
      },
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    submittedExternalReview: {
      type: Boolean,
      default: false,
    },
    consent: {
      type: consentSchema,
      required: true,
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
    response: {
      type: new Schema(
        {
          text: { type: String, required: true, maxlength: 2000 },
          sentAt: { type: Date, required: true },
          sentVia: { type: String, enum: ['email'], required: true },
          messageId: { type: String },
          status: {
            type: String,
            enum: ['sent', 'delivered', 'failed', 'bounced'],
            required: true,
          },
          createdAt: { type: Date, required: true },
        },
        { _id: false }
      ),
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

// Compound indexes for common queries
reviewSchema.index({ businessId: 1, createdAt: -1 });
reviewSchema.index({ businessId: 1, rating: 1 });
reviewSchema.index({ businessId: 1, sourcePlatform: 1 });
reviewSchema.index({ locationId: 1 });

export const Review: Model<ReviewDocument> = mongoose.model<ReviewDocument>(
  'Review',
  reviewSchema
);
