import mongoose from 'mongoose';
import type {
  CreateReviewInput,
  Review as ReviewType,
  ReviewFilters,
  ConsentRecord,
  ReviewStats,
  ResponseGenerationStatus,
  InternalFeedbackMetrics,
} from '@easyrate/shared';
import { EMAIL_TEMPLATES } from '@easyrate/shared';
import { Review, ReviewDocument } from '../models/Review.js';
import { ResponseGenerationLog } from '../models/ResponseGenerationLog.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { calculatePagination, PaginationMeta } from '../utils/response.js';
import { getEmailProvider, isEmailConfigured, getAIProvider, isAIConfigured } from '../providers/ProviderFactory.js';
import { businessService } from './BusinessService.js';

const DAILY_GENERATION_LIMIT = 50;

interface CreateReviewWithConsent extends Omit<CreateReviewInput, 'businessId'> {
  consent?: ConsentRecord;
  metadata?: Record<string, unknown>;
}

function toReviewType(doc: ReviewDocument): ReviewType {
  return doc.toJSON() as unknown as ReviewType;
}

export interface PaginatedReviews {
  data: ReviewType[];
  pagination: PaginationMeta;
}

export class ReviewService {
  async create(
    businessId: string,
    input: CreateReviewWithConsent
  ): Promise<ReviewType> {
    // Default consent if not provided (for backwards compatibility with integrations)
    const consent = input.consent || {
      given: true,
      timestamp: new Date(),
      version: '1.0',
    };

    const review = new Review({
      businessId,
      rating: input.rating,
      feedbackText: input.feedbackText,
      customer: input.customer ?? {},
      sourcePlatform: input.sourcePlatform,
      orderId: input.orderId,
      photos: input.photos ?? [],
      isPublic: false,
      submittedExternalReview: false,
      consent,
      metadata: input.metadata,
    });

    await review.save();
    return toReviewType(review);
  }

  async findById(businessId: string, id: string): Promise<ReviewType | null> {
    const review = await Review.findOne({ _id: id, businessId });
    return review ? toReviewType(review) : null;
  }

  async findByIdOrThrow(businessId: string, id: string): Promise<ReviewType> {
    const review = await this.findById(businessId, id);
    if (!review) {
      throw new NotFoundError('Anmeldelse ikke fundet');
    }
    return review;
  }

  async list(
    businessId: string,
    filters: Omit<ReviewFilters, 'businessId'>,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedReviews> {
    const query: Record<string, unknown> = { businessId };

    // Apply filters
    if (filters.rating) {
      query.rating = filters.rating;
    }
    if (filters.sourcePlatform) {
      query.sourcePlatform = filters.sourcePlatform;
    }
    if (filters.isPublic !== undefined) {
      query.isPublic = filters.isPublic;
    }
    if (filters.fromDate || filters.toDate) {
      query.createdAt = {};
      if (filters.fromDate) {
        (query.createdAt as Record<string, Date>).$gte = new Date(filters.fromDate);
      }
      if (filters.toDate) {
        (query.createdAt as Record<string, Date>).$lte = new Date(filters.toDate);
      }
    }
    if (filters.search) {
      query.$or = [
        { feedbackText: { $regex: filters.search, $options: 'i' } },
        { 'customer.name': { $regex: filters.search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments(query),
    ]);

    return {
      data: reviews.map(toReviewType),
      pagination: calculatePagination(page, limit, total),
    };
  }

  async getStats(businessId: string, dateRange?: { from: Date; to: Date }): Promise<ReviewStats> {
    const businessObjectId = new mongoose.Types.ObjectId(businessId);

    // Build date match condition
    const dateMatch: Record<string, unknown> = dateRange
      ? { createdAt: { $gte: dateRange.from, $lte: dateRange.to } }
      : {};

    // Calculate previous period for trend (same duration before the range)
    let previousPeriodCount = 0;
    if (dateRange) {
      const duration = dateRange.to.getTime() - dateRange.from.getTime();
      const previousFrom = new Date(dateRange.from.getTime() - duration);
      const previousTo = dateRange.from;

      previousPeriodCount = await Review.countDocuments({
        businessId: businessObjectId,
        createdAt: { $gte: previousFrom, $lt: previousTo },
      });
    }

    // Main aggregation for current period stats
    const [aggregation] = await Review.aggregate([
      { $match: { businessId: businessObjectId, ...dateMatch } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          totalRating: { $sum: '$rating' },
          rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
          rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        },
      },
    ]);

    // Source aggregation
    const sourceAggregation = await Review.aggregate([
      { $match: { businessId: businessObjectId, ...dateMatch } },
      {
        $group: {
          _id: '$sourcePlatform',
          count: { $sum: 1 },
        },
      },
    ]);

    // Build bySource map
    const bySource: Record<string, number> = {
      dully: 0,
      easytable: 0,
      direct: 0,
    };
    for (const src of sourceAggregation) {
      if (src._id && bySource.hasOwnProperty(src._id)) {
        bySource[src._id] = src.count;
      }
    }

    if (!aggregation) {
      return {
        total: 0,
        avgRating: 0,
        byRating: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        bySource,
        recentTrend: 0,
      };
    }

    // Calculate trend percentage
    let recentTrend = 0;
    if (dateRange && previousPeriodCount > 0) {
      recentTrend = Math.round(((aggregation.total - previousPeriodCount) / previousPeriodCount) * 100);
    } else if (dateRange && previousPeriodCount === 0 && aggregation.total > 0) {
      recentTrend = 100; // 100% increase if no previous data
    }

    return {
      total: aggregation.total,
      avgRating: aggregation.total > 0
        ? Math.round((aggregation.totalRating / aggregation.total) * 10) / 10
        : 0,
      byRating: {
        1: aggregation.rating1,
        2: aggregation.rating2,
        3: aggregation.rating3,
        4: aggregation.rating4,
        5: aggregation.rating5,
      },
      bySource,
      recentTrend,
    };
  }

  async getFeedbackMetrics(businessId: string, dateRange?: { from: Date; to: Date }): Promise<InternalFeedbackMetrics> {
    const businessObjectId = new mongoose.Types.ObjectId(businessId);

    const dateMatch: Record<string, unknown> = dateRange
      ? { createdAt: { $gte: dateRange.from, $lte: dateRange.to } }
      : {};

    const [result] = await Review.aggregate([
      { $match: { businessId: businessObjectId, ...dateMatch } },
      {
        $group: {
          _id: null,
          received: { $sum: 1 },
          responded: {
            $sum: { $cond: [{ $ne: ['$response', null] }, 1, 0] },
          },
          totalResponseTimeMs: {
            $sum: {
              $cond: [
                { $ne: ['$response', null] },
                { $subtract: ['$response.sentAt', '$createdAt'] },
                0,
              ],
            },
          },
        },
      },
    ]);

    if (!result) {
      return { received: 0, responded: 0, responseRate: 0, avgResponseTime: 0, pending: 0 };
    }

    const { received, responded, totalResponseTimeMs } = result;
    const pending = received - responded;
    const responseRate = received > 0 ? Math.round((responded / received) * 100) : 0;
    const avgResponseTime = responded > 0
      ? Math.round((totalResponseTimeMs / responded / (1000 * 60 * 60)) * 10) / 10
      : 0;

    return { received, responded, responseRate, avgResponseTime, pending };
  }

  async markExternalReviewSubmitted(
    businessId: string,
    id: string
  ): Promise<ReviewType> {
    const review = await Review.findOneAndUpdate(
      { _id: id, businessId },
      { submittedExternalReview: true },
      { new: true }
    );

    if (!review) {
      throw new NotFoundError('Anmeldelse ikke fundet');
    }

    return toReviewType(review);
  }

  async delete(businessId: string, id: string): Promise<void> {
    const result = await Review.findOneAndDelete({ _id: id, businessId });
    if (!result) {
      throw new NotFoundError('Anmeldelse ikke fundet');
    }
  }

  async replyToReview(
    businessId: string,
    reviewId: string,
    text: string
  ): Promise<ReviewType> {
    // Find review scoped to business
    const review = await Review.findOne({ _id: reviewId, businessId });
    if (!review) {
      throw new NotFoundError('Anmeldelse ikke fundet');
    }

    // Check customer has email
    if (!review.customer?.email) {
      throw new ValidationError('Kunden har ingen email', { code: 'NO_CUSTOMER_EMAIL' });
    }

    // Check no existing response
    if (review.response) {
      throw new ValidationError('Anmeldelsen er allerede besvaret', { code: 'ALREADY_REPLIED' });
    }

    // Check email provider is configured
    if (!isEmailConfigured()) {
      throw new ValidationError('Email provider er ikke konfigureret', { code: 'EMAIL_NOT_CONFIGURED' });
    }

    // Get business info for email template
    const business = await businessService.findByIdOrThrow(businessId);

    // Build email content from template
    const customerName = review.customer.name || 'Kunde';
    const subject = EMAIL_TEMPLATES.reviewResponse.subject.replace('{{businessName}}', business.name);
    const body = EMAIL_TEMPLATES.reviewResponse.body
      .replace('{{customerName}}', customerName)
      .replace('{{responseText}}', text)
      .replace('{{businessName}}', business.name);

    // Send email
    const emailProvider = getEmailProvider();
    const sendResult = await emailProvider.send({
      to: review.customer.email,
      subject,
      content: body,
    });

    if (!sendResult.success) {
      throw new ValidationError('Kunne ikke sende email', { code: 'EMAIL_SEND_FAILED', error: sendResult.error });
    }

    // Update review with response
    const now = new Date();
    const responseData: {
      text: string;
      sentAt: Date;
      sentVia: 'email';
      messageId?: string;
      status: 'sent';
      createdAt: Date;
    } = {
      text,
      sentAt: now,
      sentVia: 'email',
      status: 'sent',
      createdAt: now,
    };
    if (sendResult.messageId) {
      responseData.messageId = sendResult.messageId;
    }
    review.response = responseData;

    await review.save();
    return toReviewType(review);
  }

  async getResponseGenerationStatus(businessId: string): Promise<ResponseGenerationStatus> {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setUTCHours(23, 59, 59, 999);

    const businessObjectId = new mongoose.Types.ObjectId(businessId);
    const todayCount = await ResponseGenerationLog.countDocuments({
      businessId: businessObjectId,
      generatedAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const remainingToday = Math.max(0, DAILY_GENERATION_LIMIT - todayCount);

    // Calculate when the limit resets (midnight UTC)
    const resetsAt = new Date();
    resetsAt.setUTCDate(resetsAt.getUTCDate() + 1);
    resetsAt.setUTCHours(0, 0, 0, 0);

    return {
      canGenerate: remainingToday > 0,
      remainingToday,
      dailyLimit: DAILY_GENERATION_LIMIT,
      resetsAt,
    };
  }

  async generateResponse(
    businessId: string,
    reviewId: string
  ): Promise<{ responseText: string; remainingToday: number }> {
    // Verify review exists and belongs to business
    const review = await Review.findOne({ _id: reviewId, businessId });
    if (!review) {
      throw new NotFoundError('Anmeldelse ikke fundet');
    }

    // Verify AI is configured
    if (!isAIConfigured()) {
      throw new ValidationError('AI er ikke konfigureret', { code: 'AI_NOT_CONFIGURED' });
    }

    // Check rate limit
    const status = await this.getResponseGenerationStatus(businessId);
    if (!status.canGenerate) {
      throw new ValidationError('Daglig grænse for AI-generering er nået', {
        code: 'RATE_LIMIT_EXCEEDED',
        remainingToday: 0,
        resetsAt: status.resetsAt,
      });
    }

    // Get business info for prompt
    const business = await businessService.findByIdOrThrow(businessId);

    // Generate response using AI provider
    const aiProvider = getAIProvider(business.settings.aiSettings?.provider);
    const result = await aiProvider.generateResponse({
      review: {
        rating: review.rating,
        feedbackText: review.feedbackText,
        customerName: review.customer?.name || undefined,
      },
      businessName: business.name,
    });

    // Log the generation for rate limiting
    const businessObjectId = new mongoose.Types.ObjectId(businessId);
    const reviewObjectId = new mongoose.Types.ObjectId(reviewId);
    await ResponseGenerationLog.create({
      businessId: businessObjectId,
      reviewId: reviewObjectId,
      generatedAt: new Date(),
      tokensUsed: result.tokensUsed,
      modelUsed: result.modelUsed,
    });

    return {
      responseText: result.responseText,
      remainingToday: status.remainingToday - 1,
    };
  }
}

export const reviewService = new ReviewService();
