import type { ReviewRating } from './review.js';

/**
 * Google Business Profile integration types
 */

export type ExternalReviewSource = 'google' | 'trustpilot';

export type AttributionMatchMethod = 'name_time' | 'email' | 'manual';

export type GoogleSyncStatus = 'success' | 'error' | 'pending';

export interface GoogleBusinessSettings {
  enabled: boolean;
  accountId?: string;
  locationIds?: string[];
  accessToken?: string; // Stored encrypted
  refreshToken?: string;
  tokenExpiresAt?: Date;
  syncEnabled: boolean;
  syncIntervalHours: number; // Default: 2
  lastSyncAt?: Date;
  lastSyncStatus?: GoogleSyncStatus;
  replyEnabled: boolean;
  attributionEnabled: boolean;
}

export interface GoogleLocation {
  id: string;
  name: string;
  address?: string;
  primaryPhone?: string;
  websiteUrl?: string;
  placeId?: string;
}

export interface ExternalReviewReply {
  text: string;
  repliedAt: Date;
  repliedBy: 'google' | 'easyrate';
}

export interface ReviewAttribution {
  internalReviewId?: string;
  confidence: number; // 0-1
  matchMethod: AttributionMatchMethod;
}

export interface ExternalReview {
  id: string;
  businessId: string;
  sourcePlatform: ExternalReviewSource;
  externalId: string; // Google review ID
  externalUrl?: string;
  rating: ReviewRating;
  reviewText?: string;
  reviewerName: string;
  reviewerPhotoUrl?: string;
  reviewedAt: Date;
  reply?: ExternalReviewReply;
  attribution?: ReviewAttribution;
  lastSyncedAt: Date;
  locationId?: string; // For multi-location support
  metadata?: Record<string, unknown>; // Reserved for extensibility
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateExternalReviewInput {
  businessId: string;
  sourcePlatform: ExternalReviewSource;
  externalId: string;
  externalUrl?: string;
  rating: ReviewRating;
  reviewText?: string;
  reviewerName: string;
  reviewerPhotoUrl?: string;
  reviewedAt: Date;
  reply?: ExternalReviewReply;
  locationId?: string;
}

export interface ExternalReviewFilters {
  businessId: string;
  sourcePlatform?: ExternalReviewSource;
  rating?: ReviewRating | ReviewRating[];
  hasReply?: boolean;
  hasAttribution?: boolean;
  fromDate?: Date;
  toDate?: Date;
  locationId?: string;
  search?: string;
}

export interface ExternalReviewStats {
  total: number;
  avgRating: number;
  byRating: Record<ReviewRating, number>;
  withReply: number;
  withAttribution: number;
  bySource: Record<ExternalReviewSource, number>;
  recentTrend: number;
}

export interface GoogleOAuthState {
  businessId: string;
  redirectUri: string;
  nonce: string;
}

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface GoogleReviewFromAPI {
  name: string; // Resource name: accounts/{accountId}/locations/{locationId}/reviews/{reviewId}
  reviewId: string;
  reviewer: {
    displayName: string;
    profilePhotoUrl?: string;
  };
  starRating: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE';
  comment?: string;
  createTime: string;
  updateTime: string;
  reviewReply?: {
    comment: string;
    updateTime: string;
  };
}

export interface GoogleLocationFromAPI {
  name: string; // Resource name (v1 format: "locations/{id}")
  title: string; // Business name (v1 field — was "locationName" in v4)
  primaryPhone?: string;
  address?: {
    addressLines: string[];
    locality: string;
    regionCode: string;
    postalCode: string;
  };
  websiteUri?: string;
  metadata?: {
    placeId?: string;
  };
}

// Attribution matching types
export interface AttributionCandidate {
  reviewId: string;
  customerName?: string;
  reviewDate: Date;
  rating: ReviewRating;
  confidence: number;
  matchReasons: string[];
}

export interface AttributionResult {
  externalReviewId: string;
  matchedInternalReviewId?: string;
  confidence: number;
  matchMethod: AttributionMatchMethod;
  candidates: AttributionCandidate[];
}
