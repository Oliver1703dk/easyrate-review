import mongoose from 'mongoose';
import type {
  ExternalReview as ExternalReviewType,
  ExternalReviewFilters,
  ExternalReviewStats,
  ReviewRating,
} from '@easyrate/shared';
import { ExternalReview, ExternalReviewDocument } from '../models/ExternalReview.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { calculatePagination, PaginationMeta } from '../utils/response.js';
import { googleAuthService } from './GoogleAuthService.js';
import { googleBusinessProvider } from '../providers/google/GoogleBusinessProvider.js';

function toExternalReviewType(doc: ExternalReviewDocument): ExternalReviewType {
  return doc.toJSON() as unknown as ExternalReviewType;
}

export interface PaginatedExternalReviews {
  data: ExternalReviewType[];
  pagination: PaginationMeta;
}

export class ExternalReviewService {
  /**
   * List external reviews with filtering and pagination
   */
  async list(
    businessId: string,
    filters: Omit<ExternalReviewFilters, 'businessId'>,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedExternalReviews> {
    const query: Record<string, unknown> = { businessId };

    // Apply filters
    if (filters.sourcePlatform) {
      query.sourcePlatform = filters.sourcePlatform;
    }
    if (filters.rating) {
      if (Array.isArray(filters.rating)) {
        query.rating = { $in: filters.rating };
      } else {
        query.rating = filters.rating;
      }
    }
    if (filters.hasReply !== undefined) {
      query.reply = filters.hasReply ? { $ne: null } : null;
    }
    if (filters.hasAttribution !== undefined) {
      query.attribution = filters.hasAttribution ? { $ne: null } : null;
    }
    if (filters.locationId) {
      query.locationId = filters.locationId;
    }
    if (filters.fromDate || filters.toDate) {
      query.reviewedAt = {};
      if (filters.fromDate) {
        (query.reviewedAt as Record<string, Date>).$gte = new Date(filters.fromDate);
      }
      if (filters.toDate) {
        (query.reviewedAt as Record<string, Date>).$lte = new Date(filters.toDate);
      }
    }
    if (filters.search) {
      query.$or = [
        { reviewText: { $regex: filters.search, $options: 'i' } },
        { reviewerName: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      ExternalReview.find(query)
        .sort({ reviewedAt: -1 })
        .skip(skip)
        .limit(limit),
      ExternalReview.countDocuments(query),
    ]);

    return {
      data: reviews.map(toExternalReviewType),
      pagination: calculatePagination(page, limit, total),
    };
  }

  /**
   * Get a single external review by ID
   */
  async getById(businessId: string, id: string): Promise<ExternalReviewType | null> {
    const review = await ExternalReview.findOne({ _id: id, businessId });
    return review ? toExternalReviewType(review) : null;
  }

  /**
   * Get a single external review by ID or throw NotFoundError
   */
  async getByIdOrThrow(businessId: string, id: string): Promise<ExternalReviewType> {
    const review = await this.getById(businessId, id);
    if (!review) {
      throw new NotFoundError('Ekstern anmeldelse ikke fundet');
    }
    return review;
  }

  /**
   * Get stats for external reviews
   */
  async getStats(
    businessId: string,
    dateRange?: { from: Date; to: Date }
  ): Promise<ExternalReviewStats> {
    const businessObjectId = new mongoose.Types.ObjectId(businessId);

    const dateMatch: Record<string, unknown> = dateRange
      ? { reviewedAt: { $gte: dateRange.from, $lte: dateRange.to } }
      : {};

    const [mainAggregation] = await ExternalReview.aggregate([
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
          withReply: { $sum: { $cond: [{ $ne: ['$reply', null] }, 1, 0] } },
          withAttribution: { $sum: { $cond: [{ $ne: ['$attribution', null] }, 1, 0] } },
        },
      },
    ]);

    const sourceAggregation = await ExternalReview.aggregate([
      { $match: { businessId: businessObjectId, ...dateMatch } },
      {
        $group: {
          _id: '$sourcePlatform',
          count: { $sum: 1 },
        },
      },
    ]);

    const bySource: Record<string, number> = {
      google: 0,
      trustpilot: 0,
    };
    for (const src of sourceAggregation) {
      if (src._id) {
        bySource[src._id] = src.count;
      }
    }

    if (!mainAggregation) {
      return {
        total: 0,
        avgRating: 0,
        byRating: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<ReviewRating, number>,
        withReply: 0,
        withAttribution: 0,
        bySource: bySource as Record<'google' | 'trustpilot', number>,
      };
    }

    return {
      total: mainAggregation.total,
      avgRating:
        mainAggregation.total > 0
          ? Math.round((mainAggregation.totalRating / mainAggregation.total) * 10) / 10
          : 0,
      byRating: {
        1: mainAggregation.rating1,
        2: mainAggregation.rating2,
        3: mainAggregation.rating3,
        4: mainAggregation.rating4,
        5: mainAggregation.rating5,
      } as Record<ReviewRating, number>,
      withReply: mainAggregation.withReply,
      withAttribution: mainAggregation.withAttribution,
      bySource: bySource as Record<'google' | 'trustpilot', number>,
    };
  }

  /**
   * Reply to a Google review
   * Note: Google replies cannot be edited after posting
   */
  async replyToGoogleReview(
    businessId: string,
    reviewId: string,
    text: string
  ): Promise<ExternalReviewType> {
    // Find the review
    const review = await ExternalReview.findOne({
      _id: reviewId,
      businessId,
      sourcePlatform: 'google',
    });

    if (!review) {
      throw new NotFoundError('Google anmeldelse ikke fundet');
    }

    // Check if already replied
    if (review.reply) {
      throw new ValidationError(
        'Anmeldelsen er allerede besvaret. Google-svar kan ikke redigeres.',
        { code: 'ALREADY_REPLIED' }
      );
    }

    // Get the resource name from metadata
    const resourceName = (review.metadata as Record<string, unknown>)?.resourceName as
      | string
      | undefined;
    if (!resourceName) {
      throw new ValidationError('Mangler Google review reference', {
        code: 'MISSING_RESOURCE_NAME',
      });
    }

    // Get valid access token
    const accessToken = await googleAuthService.getValidToken(businessId);

    // Post reply to Google
    const result = await googleBusinessProvider.replyToReview(
      accessToken,
      resourceName,
      text
    );

    if (!result.success) {
      throw new ValidationError(`Kunne ikke sende svar til Google: ${result.error}`, {
        code: 'GOOGLE_REPLY_FAILED',
      });
    }

    // Update local review with reply
    review.reply = {
      text,
      repliedAt: new Date(),
      repliedBy: 'easyrate',
    };
    await review.save();

    return toExternalReviewType(review);
  }

  /**
   * Delete a review (for GDPR compliance)
   */
  async delete(businessId: string, id: string): Promise<void> {
    const result = await ExternalReview.findOneAndDelete({ _id: id, businessId });
    if (!result) {
      throw new NotFoundError('Ekstern anmeldelse ikke fundet');
    }
  }

  /**
   * Delete all external reviews for a business (for GDPR compliance)
   */
  async deleteAllForBusiness(businessId: string): Promise<number> {
    const result = await ExternalReview.deleteMany({ businessId });
    return result.deletedCount;
  }

  /**
   * Get recent reviews (for dashboard overview)
   */
  async getRecent(businessId: string, limit: number = 5): Promise<ExternalReviewType[]> {
    const reviews = await ExternalReview.find({ businessId })
      .sort({ reviewedAt: -1 })
      .limit(limit);

    return reviews.map(toExternalReviewType);
  }

  /**
   * Find external review by external ID (for deduplication)
   */
  async findByExternalId(
    businessId: string,
    sourcePlatform: 'google' | 'trustpilot',
    externalId: string
  ): Promise<ExternalReviewType | null> {
    const review = await ExternalReview.findOne({
      businessId,
      sourcePlatform,
      externalId,
    });
    return review ? toExternalReviewType(review) : null;
  }
}

export const externalReviewService = new ExternalReviewService();
