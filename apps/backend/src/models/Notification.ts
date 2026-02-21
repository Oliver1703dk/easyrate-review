import type { Document, Model } from 'mongoose';
import mongoose, { Schema } from 'mongoose';
import type { Notification as NotificationType } from '@easyrate/shared';

export interface NotificationConsent {
  marketingOptIn: boolean;
  consentTimestamp?: Date;
  consentSource?: 'order' | 'signup' | 'manual';
}

export interface NotificationDocument
  extends Omit<NotificationType, 'id' | 'businessId'>, Document {
  _id: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
  retryCount: number;
  retryAt: Date | null;
  consent?: NotificationConsent;
}

const notificationSchema = new Schema<NotificationDocument>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },
    type: {
      type: String,
      enum: ['sms', 'email'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked', 'converted'],
      default: 'pending',
    },
    recipient: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    reviewLink: {
      type: String,
      required: true,
    },
    orderId: {
      type: String,
    },
    externalMessageId: {
      type: String,
    },
    errorMessage: {
      type: String,
    },
    sentAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    openedAt: {
      type: Date,
    },
    clickedAt: {
      type: Date,
    },
    convertedAt: {
      type: Date,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    retryAt: {
      type: Date,
      default: null,
    },
    consent: {
      marketingOptIn: { type: Boolean, default: false },
      consentTimestamp: { type: Date },
      consentSource: { type: String, enum: ['order', 'signup', 'manual'] },
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
notificationSchema.index({ businessId: 1, createdAt: -1 });
notificationSchema.index({ businessId: 1, status: 1 });
notificationSchema.index({ externalMessageId: 1 });
notificationSchema.index({ locationId: 1 });
// Index for notification processor to find pending notifications
notificationSchema.index({ status: 1, retryAt: 1 });

export const Notification: Model<NotificationDocument> = mongoose.model<NotificationDocument>(
  'Notification',
  notificationSchema
);
