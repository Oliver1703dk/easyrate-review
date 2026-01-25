import mongoose, { Schema, Document, Model } from 'mongoose';
import type { OrderData } from '@easyrate/shared';

export interface OrderQueueDocument extends Document {
  _id: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
  orderId: string;
  platform: 'dully' | 'easytable';
  orderData: OrderData;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  scheduledFor: Date;
  processedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderDataSchema = new Schema<OrderData>(
  {
    orderId: { type: String, required: true },
    customerName: { type: String },
    customerEmail: { type: String },
    customerPhone: { type: String },
    orderTotal: { type: Number },
    orderDate: { type: Date, required: true },
    completedAt: { type: Date },
    platform: {
      type: String,
      required: true,
      enum: ['dully', 'easytable'],
    },
    metadata: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const orderQueueSchema = new Schema<OrderQueueDocument>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    orderId: {
      type: String,
      required: true,
    },
    platform: {
      type: String,
      required: true,
      enum: ['dully', 'easytable'],
    },
    orderData: {
      type: orderDataSchema,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    scheduledFor: {
      type: Date,
      required: true,
      index: true,
    },
    processedAt: {
      type: Date,
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for queue processing
orderQueueSchema.index({ status: 1, scheduledFor: 1 });

// Unique compound index to prevent duplicate orders
orderQueueSchema.index(
  { businessId: 1, orderId: 1, platform: 1 },
  { unique: true }
);

// Transform _id to id and remove __v
orderQueueSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const result = ret as unknown as Record<string, unknown>;
    result.id = String(result._id);
    delete result._id;
    delete result.__v;
    return result;
  },
});

export const OrderQueue: Model<OrderQueueDocument> = mongoose.model<OrderQueueDocument>(
  'OrderQueue',
  orderQueueSchema
);
