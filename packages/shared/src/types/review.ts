import type { ConsentRecord } from './gdpr.js';

export type ReviewRating = 1 | 2 | 3 | 4 | 5;

export type ReviewResponseStatus = 'sent' | 'delivered' | 'failed' | 'bounced';

export interface ReviewResponse {
  text: string;
  sentAt: Date;
  sentVia: 'email';
  messageId?: string;
  status: ReviewResponseStatus;
  createdAt: Date;
}

export interface ReviewCustomer {
  name?: string;
  email?: string;
  phone?: string;
}

export interface Review {
  id: string;
  businessId: string;
  rating: ReviewRating;
  feedbackText?: string;
  customer: ReviewCustomer;
  sourcePlatform: 'dully' | 'easytable' | 'direct' | 'test';
  orderId?: string;
  photos?: string[];
  isPublic: boolean;
  submittedExternalReview: boolean;
  consent: ConsentRecord;
  locationId?: string; // Reserved for future multi-location support
  metadata?: Record<string, unknown>; // Reserved for extensibility
  tags?: string[]; // Reserved for categorization
  response?: ReviewResponse;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReviewInput {
  businessId: string;
  rating: ReviewRating;
  feedbackText?: string;
  customer?: ReviewCustomer;
  sourcePlatform: 'dully' | 'easytable' | 'direct' | 'test';
  orderId?: string;
  photos?: string[];
  consent?: ConsentRecord;
  metadata?: Record<string, unknown>;
}

export interface ReviewFilters {
  businessId: string;
  rating?: ReviewRating | ReviewRating[];
  sourcePlatform?: 'dully' | 'easytable' | 'direct';
  isPublic?: boolean;
  fromDate?: Date;
  toDate?: Date;
  search?: string;
}
