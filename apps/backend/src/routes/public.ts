import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { reviewRatingSchema, reviewCustomerSchema } from '@easyrate/shared';
import type { ReviewTokenPayload, ReviewTokenCustomer } from '@easyrate/shared';
import { Business, type BusinessDocument } from '../models/Business.js';
import { reviewService } from '../services/ReviewService.js';
import { notificationService } from '../services/NotificationService.js';
import { storageService, ALLOWED_CONTENT_TYPES } from '../services/StorageService.js';
import { reviewTokenService } from '../services/ReviewTokenService.js';
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

/**
 * Result of resolving a review token
 */
interface ResolvedToken {
  business: BusinessDocument;
  tokenPayload: ReviewTokenPayload | null;
}

/**
 * Resolve a token to a business and optional JWT payload.
 * Supports both JWT tokens (with embedded customer info) and plain businessId (backwards compatibility).
 */
async function resolveToken(token: string): Promise<ResolvedToken> {
  let businessId: string;
  let tokenPayload: ReviewTokenPayload | null = null;

  // Check if token is a JWT
  if (reviewTokenService.isJwtToken(token)) {
    const payload = reviewTokenService.verifyToken(token);
    if (!payload) {
      throw new NotFoundError('Ugyldig eller udløbet anmeldelses link');
    }
    businessId = payload.businessId;
    tokenPayload = payload;
  } else {
    // Plain businessId for backwards compatibility
    businessId = token;
  }

  // Find business
  const business = await Business.findById(businessId);
  if (!business) {
    throw new NotFoundError('Ugyldig anmeldelses link');
  }

  return { business, tokenPayload };
}

// GET /api/v1/r/:token - Get review page data (business info for landing page)
router.get(
  '/:token',
  validateParams(tokenParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.params.token as string;
      const { business, tokenPayload } = await resolveToken(token);

      // Track link click if notificationId is present in JWT
      if (tokenPayload?.notificationId) {
        // Fire and forget - don't block response for tracking
        notificationService.updateStatus(tokenPayload.notificationId, 'clicked').catch((err) => {
          console.warn(`[public] Failed to track click for notification ${tokenPayload.notificationId}:`, err.message);
        });
      }

      // Access GDPR settings safely
      const gdprSettings = (business.settings as { gdpr?: { privacyPolicyUrl?: string } } | undefined)?.gdpr;

      // Build branding object, only adding logoUrl if it exists
      const branding: { primaryColor: string; logoUrl?: string } = {
        primaryColor: business.branding?.primaryColor || business.settings?.primaryColor || '#3B82F6',
      };
      const logoUrl = business.branding?.logoUrl || business.settings?.logoUrl;
      if (logoUrl) {
        branding.logoUrl = logoUrl;
      }

      // Build response with optional customer info from JWT
      const response: {
        business: {
          id: string;
          name: string;
          googleReviewUrl?: string;
          privacyPolicyUrl?: string;
          branding: { primaryColor: string; logoUrl?: string };
        };
        customer?: ReviewTokenCustomer;
      } = {
        business: {
          id: business._id.toString(),
          name: business.name,
          branding,
        },
      };

      // Only add optional properties if they exist
      if (business.settings?.googleReviewUrl) {
        response.business.googleReviewUrl = business.settings.googleReviewUrl;
      }
      if (gdprSettings?.privacyPolicyUrl) {
        response.business.privacyPolicyUrl = gdprSettings.privacyPolicyUrl;
      }

      // Include customer info if present in JWT (for pre-population)
      if (tokenPayload?.customer) {
        response.customer = tokenPayload.customer;
      }

      sendSuccess(res, response);
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
      const { business } = await resolveToken(token);
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
      const { business, tokenPayload } = await resolveToken(token);
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

      // Merge customer info: JWT payload provides defaults, request body can override
      const mergedCustomer = {
        ...tokenPayload?.customer,
        ...req.body.customer,
      };
      const hasCustomerInfo = mergedCustomer.email || mergedCustomer.phone || mergedCustomer.name;

      // Determine source platform: JWT payload or default to 'direct'
      const sourcePlatform = tokenPayload?.sourcePlatform || 'direct';

      const reviewInput: Parameters<typeof reviewService.create>[1] = {
        rating: req.body.rating,
        feedbackText: req.body.feedbackText,
        customer: hasCustomerInfo ? mergedCustomer : undefined,
        photos: req.body.photos,
        sourcePlatform,
        consent: consentRecord,
      };

      // Add orderId from JWT if present
      if (tokenPayload?.orderId) {
        reviewInput.metadata = { ...reviewInput.metadata, orderId: tokenPayload.orderId };
      }

      if (isTest) {
        reviewInput.metadata = { ...reviewInput.metadata, isTest: true };
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
