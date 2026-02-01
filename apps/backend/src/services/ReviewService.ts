import mongoose from 'mongoose';
import type { CreateReviewInput, Review as ReviewType, ReviewFilters, ConsentRecord } from '@easyrate/shared';
import { EMAIL_TEMPLATES } from '@easyrate/shared';
import { Review, ReviewDocument } from '../models/Review.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { calculatePagination, PaginationMeta } from '../utils/response.js';
import { getEmailProvider, isEmailConfigured } from '../providers/ProviderFactory.js';
import { businessService } from './BusinessService.js';

interface CreateReviewWithConsent extends Omit<CreateReviewInput, 'businessId'> {
  consent?: ConsentRecord;
  metadata?: Record<string, unknown>;
}

function toReviewType(doc: ReviewDocument): ReviewType {
  return doc.toJSON() as unknown as ReviewType;
}

export interface ReviewStats {
  totalCount: number;
  averageRating: number;
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  positiveCount: number;
  negativeCount: number;
  externalReviewCount: number;
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

  async getStats(businessId: string): Promise<ReviewStats> {
    const [aggregation] = await Review.aggregate([
      { $match: { businessId: new mongoose.Types.ObjectId(businessId) } },
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          totalRating: { $sum: '$rating' },
          rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
          rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          externalReviewCount: {
            $sum: { $cond: ['$submittedExternalReview', 1, 0] },
          },
        },
      },
    ]);

    if (!aggregation) {
      return {
        totalCount: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        positiveCount: 0,
        negativeCount: 0,
        externalReviewCount: 0,
      };
    }

    const negativeCount = aggregation.rating1 + aggregation.rating2 + aggregation.rating3;
    const positiveCount = aggregation.rating4 + aggregation.rating5;

    return {
      totalCount: aggregation.totalCount,
      averageRating: aggregation.totalCount > 0
        ? Math.round((aggregation.totalRating / aggregation.totalCount) * 10) / 10
        : 0,
      ratingDistribution: {
        1: aggregation.rating1,
        2: aggregation.rating2,
        3: aggregation.rating3,
        4: aggregation.rating4,
        5: aggregation.rating5,
      },
      positiveCount,
      negativeCount,
      externalReviewCount: aggregation.externalReviewCount,
    };
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
}

export const reviewService = new ReviewService();
