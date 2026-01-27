import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { reviewRatingSchema, reviewCustomerSchema } from '@easyrate/shared';
import { Business } from '../models/Business.js';
import { reviewService } from '../services/ReviewService.js';
import { storageService, ALLOWED_CONTENT_TYPES } from '../services/StorageService.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { sendSuccess } from '../utils/response.js';
import { NotFoundError } from '../utils/errors.js';

const router = Router();

const tokenParamSchema = z.object({
  token: z.string().min(1),
});

// Consent schema - required for GDPR compliance
const consentSchema = z.object({
  given: z.literal(true),
});

// Public review submission schema
const publicReviewSchema = z.object({
  rating: reviewRatingSchema,
  feedbackText: z.string().max(5000).optional(),
  customer: reviewCustomerSchema.optional(),
  photos: z.array(z.string()).max(5).optional(),
  consent: consentSchema,
  submittedExternalReview: z.boolean().optional(),
});

// Upload URL request schema
const uploadUrlSchema = z.object({
  filename: z.string().min(1).max(100),
  contentType: z.enum(ALLOWED_CONTENT_TYPES as unknown as [string, ...string[]]),
});

// For MVP, the token is the business ID (can be enhanced with JWT tokens later)
async function getBusinessFromToken(token: string) {
  // Try to find business by ID
  const business = await Business.findById(token);
  if (!business) {
    throw new NotFoundError('Ugyldig anmeldelses link');
  }
  return business;
}

// GET /api/v1/r/:token - Get review page data (business info for landing page)
router.get(
  '/:token',
  validateParams(tokenParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.params.token as string;
      const business = await getBusinessFromToken(token);

      // Access GDPR settings safely
      const gdprSettings = (business.settings as { gdpr?: { privacyPolicyUrl?: string } } | undefined)?.gdpr;

      // Return only public information needed for the landing page
      sendSuccess(res, {
        business: {
          id: business._id.toString(),
          name: business.name,
          googleReviewUrl: business.settings?.googleReviewUrl,
          privacyPolicyUrl: gdprSettings?.privacyPolicyUrl,
          branding: {
            primaryColor: business.branding?.primaryColor || business.settings?.primaryColor || '#3B82F6',
            logoUrl: business.branding?.logoUrl || business.settings?.logoUrl,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/r/:token/upload-url - Get presigned URL for photo upload
router.post(
  '/:token/upload-url',
  validateParams(tokenParamSchema),
  validateBody(uploadUrlSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.params.token as string;
      const business = await getBusinessFromToken(token);
      const businessId = business._id.toString();

      const { filename, contentType } = req.body;

      // Use 'pending' as reviewId since we don't have a review yet
      // Files will be moved/associated when review is created
      const result = await storageService.generateUploadUrl(
        businessId,
        'pending',
        filename,
        contentType
      );

      sendSuccess(res, {
        uploadUrl: result.uploadUrl,
        fileKey: result.fileKey,
        expiresAt: result.expiresAt.toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/r/:token - Submit review
router.post(
  '/:token',
  validateParams(tokenParamSchema),
  validateBody(publicReviewSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.params.token as string;
      const business = await getBusinessFromToken(token);
      const businessId = business._id.toString();

      // Build consent record
      const consentRecord = {
        given: true as const,
        timestamp: new Date(),
        ipAddress: req.ip || req.headers['x-forwarded-for'] as string,
        userAgent: req.headers['user-agent'],
        version: '1.0',
      };

      // Check query param for test flag
      const isTest = req.query.isTest === 'true';

      const reviewInput: Parameters<typeof reviewService.create>[1] = {
        rating: req.body.rating,
        feedbackText: req.body.feedbackText,
        customer: req.body.customer,
        photos: req.body.photos,
        sourcePlatform: 'direct', // Public submissions are direct
        consent: consentRecord,
      };

      if (isTest) {
        reviewInput.metadata = { isTest: true };
      }

      const review = await reviewService.create(businessId, reviewInput);

      // If user indicated they submitted external review, update it
      if (req.body.submittedExternalReview) {
        await reviewService.markExternalReviewSubmitted(businessId, review.id);
      }

      sendSuccess(res, {
        review: {
          id: review.id,
          rating: review.rating,
        },
        message: 'Tak for din anmeldelse!',
      }, 201);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
