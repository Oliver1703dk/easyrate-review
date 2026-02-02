import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface ResponseGenerationLogDocument extends Document {
  _id: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
  reviewId: mongoose.Types.ObjectId;
  generatedAt: Date;
  tokensUsed: number;
  modelUsed: string;
}

const responseGenerationLogSchema = new Schema<ResponseGenerationLogDocument>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },
    reviewId: {
      type: Schema.Types.ObjectId,
      ref: 'Review',
      required: true,
    },
    generatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    tokensUsed: {
      type: Number,
      required: true,
      default: 0,
    },
    modelUsed: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: false,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        ret.businessId = String(ret.businessId);
        ret.reviewId = String(ret.reviewId);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Index for rate limit queries - find generations by business within date range
responseGenerationLogSchema.index({ businessId: 1, generatedAt: 1 });

export const ResponseGenerationLog: Model<ResponseGenerationLogDocument> =
  mongoose.model<ResponseGenerationLogDocument>(
    'ResponseGenerationLog',
    responseGenerationLogSchema
  );
