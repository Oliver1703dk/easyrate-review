import mongoose from 'mongoose';
import type {
  ExternalReview as ExternalReviewType,
  Review as ReviewType,
  AttributionCandidate,
  AttributionResult,
  AttributionMatchMethod,
} from '@easyrate/shared';
import { ExternalReview, ExternalReviewDocument } from '../models/ExternalReview.js';
import { Review, ReviewDocument } from '../models/Review.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

// Configuration for attribution matching
const MATCH_CONFIG = {
  TIME_WINDOW_DAYS: 7, // Match reviews within +/- 7 days
  MIN_CONFIDENCE_THRESHOLD: 0.6, // Minimum confidence to auto-link
  NAME_SIMILARITY_WEIGHT: 0.5,
  TIME_PROXIMITY_WEIGHT: 0.3,
  RATING_MATCH_WEIGHT: 0.2,
};

function toExternalReviewType(doc: ExternalReviewDocument): ExternalReviewType {
  return doc.toJSON() as unknown as ExternalReviewType;
}

function toReviewType(doc: ReviewDocument): ReviewType {
  return doc.toJSON() as unknown as ReviewType;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0]![j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1, // substitution
          matrix[i]![j - 1]! + 1, // insertion
          matrix[i - 1]![j]! + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length]![a.length]!;
}

/**
 * Calculate name similarity score (0-1)
 */
function calculateNameSimilarity(name1: string, name2: string): number {
  if (!name1 || !name2) return 0;

  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();

  if (n1 === n2) return 1;

  const maxLen = Math.max(n1.length, n2.length);
  if (maxLen === 0) return 0;

  const distance = levenshteinDistance(n1, n2);
  return Math.max(0, 1 - distance / maxLen);
}

/**
 * Calculate time proximity score (0-1)
 * Full score if same day, decreasing over the time window
 */
function calculateTimeProximity(date1: Date, date2: Date): number {
  const diffMs = Math.abs(date1.getTime() - date2.getTime());
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays > MATCH_CONFIG.TIME_WINDOW_DAYS) return 0;

  // Linear decay over the time window
  return 1 - diffDays / MATCH_CONFIG.TIME_WINDOW_DAYS;
}

/**
 * Calculate rating match score (0-1)
 */
function calculateRatingMatch(rating1: number, rating2: number): number {
  if (rating1 === rating2) return 1;
  const diff = Math.abs(rating1 - rating2);
  // Partial credit for close ratings
  return Math.max(0, 1 - diff * 0.25);
}

export class ReviewAttributionService {
  /**
   * Find potential matches for an external review
   */
  async findPotentialMatches(
    businessId: string,
    externalReviewId: string
  ): Promise<AttributionResult> {
    const externalReview = await ExternalReview.findOne({
      _id: externalReviewId,
      businessId,
    });

    if (!externalReview) {
      throw new NotFoundError('Ekstern anmeldelse ikke fundet');
    }

    // Calculate date range for matching
    const reviewDate = new Date(externalReview.reviewedAt);
    const startDate = new Date(reviewDate);
    startDate.setDate(startDate.getDate() - MATCH_CONFIG.TIME_WINDOW_DAYS);
    const endDate = new Date(reviewDate);
    endDate.setDate(endDate.getDate() + MATCH_CONFIG.TIME_WINDOW_DAYS);

    // Find internal reviews in the time window
    const businessObjectId = new mongoose.Types.ObjectId(businessId);
    const internalReviews = await Review.find({
      businessId: businessObjectId,
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const candidates: AttributionCandidate[] = [];

    for (const internalReview of internalReviews) {
      const matchReasons: string[] = [];
      let totalScore = 0;

      // Calculate name similarity
      const customerName = internalReview.customer?.name || '';
      const reviewerName = externalReview.reviewerName;
      const nameSimilarity = calculateNameSimilarity(customerName, reviewerName);

      if (nameSimilarity > 0.7) {
        matchReasons.push('Navn matcher');
      } else if (nameSimilarity > 0.4) {
        matchReasons.push('Lignende navn');
      }
      totalScore += nameSimilarity * MATCH_CONFIG.NAME_SIMILARITY_WEIGHT;

      // Calculate time proximity
      const timeProximity = calculateTimeProximity(
        new Date(internalReview.createdAt),
        reviewDate
      );
      if (timeProximity > 0.8) {
        matchReasons.push('Samme tidspunkt');
      } else if (timeProximity > 0.5) {
        matchReasons.push('Nær tidspunkt');
      }
      totalScore += timeProximity * MATCH_CONFIG.TIME_PROXIMITY_WEIGHT;

      // Calculate rating match
      const ratingMatch = calculateRatingMatch(
        internalReview.rating,
        externalReview.rating
      );
      if (ratingMatch === 1) {
        matchReasons.push('Samme bedømmelse');
      }
      totalScore += ratingMatch * MATCH_CONFIG.RATING_MATCH_WEIGHT;

      // Only include candidates with some match potential
      if (totalScore > 0.2) {
        const candidate: AttributionCandidate = {
          reviewId: internalReview._id.toString(),
          reviewDate: internalReview.createdAt,
          rating: internalReview.rating,
          confidence: Math.round(totalScore * 100) / 100,
          matchReasons,
        };
        if (customerName) {
          candidate.customerName = customerName;
        }
        candidates.push(candidate);
      }
    }

    // Sort by confidence descending
    candidates.sort((a, b) => b.confidence - a.confidence);

    // Determine best match
    const bestMatch =
      candidates.length > 0 && candidates[0]!.confidence >= MATCH_CONFIG.MIN_CONFIDENCE_THRESHOLD
        ? candidates[0]
        : null;

    // Build result object conditionally to satisfy exactOptionalPropertyTypes
    const result: AttributionResult = {
      externalReviewId,
      confidence: bestMatch?.confidence || 0,
      matchMethod: 'name_time',
      candidates: candidates.slice(0, 10), // Return top 10 candidates
    };
    if (bestMatch?.reviewId) {
      result.matchedInternalReviewId = bestMatch.reviewId;
    }

    return result;
  }

  /**
   * Manually link an external review to an internal review
   */
  async linkReviews(
    businessId: string,
    externalReviewId: string,
    internalReviewId: string,
    method: AttributionMatchMethod = 'manual'
  ): Promise<ExternalReviewType> {
    const businessObjectId = new mongoose.Types.ObjectId(businessId);

    // Verify external review exists
    const externalReview = await ExternalReview.findOne({
      _id: externalReviewId,
      businessId: businessObjectId,
    });

    if (!externalReview) {
      throw new NotFoundError('Ekstern anmeldelse ikke fundet');
    }

    // Verify internal review exists
    const internalReview = await Review.findOne({
      _id: internalReviewId,
      businessId: businessObjectId,
    });

    if (!internalReview) {
      throw new NotFoundError('Intern anmeldelse ikke fundet');
    }

    // Check if the internal review is already linked to another external review
    const existingLink = await ExternalReview.findOne({
      businessId: businessObjectId,
      'attribution.internalReviewId': new mongoose.Types.ObjectId(internalReviewId),
      _id: { $ne: externalReview._id },
    });

    if (existingLink) {
      throw new ValidationError(
        'Denne interne anmeldelse er allerede forbundet med en anden ekstern anmeldelse',
        { code: 'ALREADY_LINKED' }
      );
    }

    // Calculate confidence for manual links or recalculate for auto-links
    let confidence = 1.0;
    if (method !== 'manual') {
      const nameSimilarity = calculateNameSimilarity(
        internalReview.customer?.name || '',
        externalReview.reviewerName
      );
      const timeProximity = calculateTimeProximity(
        new Date(internalReview.createdAt),
        new Date(externalReview.reviewedAt)
      );
      const ratingMatch = calculateRatingMatch(internalReview.rating, externalReview.rating);

      confidence =
        nameSimilarity * MATCH_CONFIG.NAME_SIMILARITY_WEIGHT +
        timeProximity * MATCH_CONFIG.TIME_PROXIMITY_WEIGHT +
        ratingMatch * MATCH_CONFIG.RATING_MATCH_WEIGHT;
    }

    // Create the link
    externalReview.attribution = {
      internalReviewId: new mongoose.Types.ObjectId(internalReviewId),
      confidence: Math.round(confidence * 100) / 100,
      matchMethod: method,
    };

    await externalReview.save();
    return toExternalReviewType(externalReview);
  }

  /**
   * Remove the link between an external and internal review
   */
  async unlinkReview(businessId: string, externalReviewId: string): Promise<ExternalReviewType> {
    const externalReview = await ExternalReview.findOne({
      _id: externalReviewId,
      businessId,
    });

    if (!externalReview) {
      throw new NotFoundError('Ekstern anmeldelse ikke fundet');
    }

    if (!externalReview.attribution) {
      throw new ValidationError('Anmeldelsen har ingen forbindelse at fjerne', {
        code: 'NOT_LINKED',
      });
    }

    externalReview.attribution = null as unknown as typeof externalReview.attribution;
    await externalReview.save();

    return toExternalReviewType(externalReview);
  }

  /**
   * Auto-attribute new external reviews for a business
   */
  async autoAttributeNewReviews(businessId: string): Promise<number> {
    const businessObjectId = new mongoose.Types.ObjectId(businessId);

    // Find external reviews without attribution
    const unlinkedReviews = await ExternalReview.find({
      businessId: businessObjectId,
      attribution: null,
    });

    let linkedCount = 0;

    for (const externalReview of unlinkedReviews) {
      try {
        const result = await this.findPotentialMatches(
          businessId,
          externalReview._id.toString()
        );

        if (
          result.matchedInternalReviewId &&
          result.confidence >= MATCH_CONFIG.MIN_CONFIDENCE_THRESHOLD
        ) {
          await this.linkReviews(
            businessId,
            externalReview._id.toString(),
            result.matchedInternalReviewId,
            'name_time'
          );
          linkedCount++;
        }
      } catch {
        // Skip reviews that fail to match
      }
    }

    return linkedCount;
  }

  /**
   * Get the internal review linked to an external review
   */
  async getLinkedInternalReview(
    businessId: string,
    externalReviewId: string
  ): Promise<ReviewType | null> {
    const externalReview = await ExternalReview.findOne({
      _id: externalReviewId,
      businessId,
    });

    if (!externalReview?.attribution?.internalReviewId) {
      return null;
    }

    const internalReview = await Review.findOne({
      _id: externalReview.attribution.internalReviewId,
      businessId,
    });

    return internalReview ? toReviewType(internalReview) : null;
  }

  /**
   * Get external reviews linked to an internal review
   */
  async getLinkedExternalReviews(
    businessId: string,
    internalReviewId: string
  ): Promise<ExternalReviewType[]> {
    const businessObjectId = new mongoose.Types.ObjectId(businessId);
    const reviewObjectId = new mongoose.Types.ObjectId(internalReviewId);

    const externalReviews = await ExternalReview.find({
      businessId: businessObjectId,
      'attribution.internalReviewId': reviewObjectId,
    });

    return externalReviews.map(toExternalReviewType);
  }
}

export const reviewAttributionService = new ReviewAttributionService();
