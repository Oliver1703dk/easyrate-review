import type { Document, Model } from 'mongoose';
import mongoose, { Schema } from 'mongoose';
import type { ReviewTokenPayload } from '@easyrate/shared';

export interface ReviewLinkDocument extends Document {
  _id: mongoose.Types.ObjectId;
  shortCode: string;
  businessId: mongoose.Types.ObjectId;
  payload: ReviewTokenPayload;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reviewLinkSchema = new Schema<ReviewLinkDocument>(
  {
    shortCode: {
      type: String,
      required: true,
      unique: true,
    },
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
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

// TTL index — MongoDB automatically deletes expired documents
reviewLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ReviewLink: Model<ReviewLinkDocument> = mongoose.model<ReviewLinkDocument>(
  'ReviewLink',
  reviewLinkSchema
);
