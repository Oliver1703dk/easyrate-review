import { z } from 'zod';
import { reviewRatingSchema, reviewCustomerSchema } from './review.js';

/**
 * Schema for business branding in landing page
 */
export const landingPageBrandingSchema = z.object({
  primaryColor: z.string(),
  logoUrl: z.string().url().optional(),
});

/**
 * Schema for business data returned to landing page
 */
export const landingPageBusinessSchema = z.object({
  id: z.string(),
  name: z.string(),
  googleReviewUrl: z.string().url().optional(),
  branding: landingPageBrandingSchema,
});

/**
 * Schema for review submission from landing page
 */
export const reviewSubmissionSchema = z.object({
  rating: reviewRatingSchema,
  feedbackText: z.string().max(5000).optional(),
  submittedExternalReview: z.boolean(),
});

/**
 * Schema for public review submission API request
 */
export const publicReviewSubmitSchema = z.object({
  rating: reviewRatingSchema,
  feedbackText: z.string().max(5000).optional(),
  customer: reviewCustomerSchema.optional(),
  submittedExternalReview: z.boolean().optional(),
});

/**
 * Schema for token param validation
 */
export const tokenParamSchema = z.object({
  token: z.string().min(1),
});

/**
 * Schema for landing page API response
 */
export const landingPageResponseSchema = z.object({
  business: landingPageBusinessSchema,
});

/**
 * Schema for review submit API response
 */
export const submitReviewResponseSchema = z.object({
  review: z.object({
    id: z.string(),
    rating: reviewRatingSchema,
  }),
  message: z.string(),
});

export type LandingPageBrandingSchema = z.infer<typeof landingPageBrandingSchema>;
export type LandingPageBusinessSchema = z.infer<typeof landingPageBusinessSchema>;
export type ReviewSubmissionSchema = z.infer<typeof reviewSubmissionSchema>;
export type PublicReviewSubmitSchema = z.infer<typeof publicReviewSubmitSchema>;
export type TokenParamSchema = z.infer<typeof tokenParamSchema>;
export type LandingPageResponseSchema = z.infer<typeof landingPageResponseSchema>;
export type SubmitReviewResponseSchema = z.infer<typeof submitReviewResponseSchema>;
