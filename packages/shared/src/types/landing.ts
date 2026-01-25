import type { ReviewRating } from './review.js';

/**
 * Business data returned for landing page display
 */
export interface LandingPageBusiness {
  id: string;
  name: string;
  googleReviewUrl?: string;
  privacyPolicyUrl?: string;
  // Future: trustpilotUrl, tripadvisorUrl
  branding: {
    primaryColor: string;
    logoUrl?: string;
  };
}

/**
 * Data submitted when customer completes review flow
 */
export interface ReviewSubmission {
  rating: ReviewRating;
  feedbackText?: string;
  photos?: string[];
  submittedExternalReview: boolean;
}

/**
 * Steps in the review collection flow
 */
export type ReviewFlowStep =
  | 'loading'
  | 'rating'
  | 'negative-feedback'
  | 'positive-prompt'
  | 'submitting'
  | 'thank-you'
  | 'error';

/**
 * State for the review flow state machine
 */
export interface ReviewFlowState {
  step: ReviewFlowStep;
  rating: ReviewRating | null;
  feedbackText: string;
  photos: string[];
  consentGiven: boolean;
  submittedExternalReview: boolean;
  error: string | null;
}

/**
 * Actions for the review flow reducer
 */
export type ReviewFlowAction =
  | { type: 'SET_RATING'; rating: ReviewRating }
  | { type: 'SET_FEEDBACK_TEXT'; text: string }
  | { type: 'ADD_PHOTO'; fileKey: string }
  | { type: 'REMOVE_PHOTO'; fileKey: string }
  | { type: 'SET_CONSENT'; given: boolean }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; error: string }
  | { type: 'MARK_EXTERNAL_REVIEW' }
  | { type: 'SKIP_EXTERNAL_REVIEW' }
  | { type: 'RESET' };

/**
 * API response for GET /api/v1/r/:token
 */
export interface LandingPageResponse {
  business: LandingPageBusiness;
}

/**
 * API request for POST /api/v1/r/:token
 */
export interface SubmitReviewRequest {
  rating: ReviewRating;
  feedbackText?: string;
  photos?: string[];
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  consent: { given: true };
  submittedExternalReview?: boolean;
}

/**
 * API response for POST /api/v1/r/:token
 */
export interface SubmitReviewResponse {
  review: {
    id: string;
    rating: ReviewRating;
  };
  message: string;
}
