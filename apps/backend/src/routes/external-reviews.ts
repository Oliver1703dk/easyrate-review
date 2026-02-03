import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { paginationParamsSchema, idParamSchema } from '@easyrate/shared';
import { externalReviewService } from '../services/ExternalReviewService.js';
import { googleReviewsSyncService } from '../services/GoogleReviewsSyncService.js';
import { reviewAttributionService } from '../services/ReviewAttributionService.js';
import { authenticateJwt } from '../middleware/auth.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

const router = Router();

// External review filters schema
const externalReviewFiltersSchema = z.object({
  sourcePlatform: z.enum(['google', 'trustpilot']).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  hasReply: z.coerce.boolean().optional(),
  hasAttribution: z.coerce.boolean().optional(),
  locationId: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  search: z.string().max(255).optional(),
});

const listExternalReviewsQuerySchema = externalReviewFiltersSchema.merge(paginationParamsSchema);

// GET /api/v1/external-reviews - List external reviews
router.get(
  '/',
  authenticateJwt,
  validateQuery(listExternalReviewsQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = req.query as unknown as z.infer<typeof listExternalReviewsQuerySchema>;
      const {
        page = 1,
        limit = 20,
        sourcePlatform,
        rating,
        hasReply,
        hasAttribution,
        locationId,
        fromDate,
        toDate,
        search,
      } = parsed;

      const filters: Record<string, unknown> = {};
      if (sourcePlatform) filters.sourcePlatform = sourcePlatform;
      if (rating !== undefined) filters.rating = rating as 1 | 2 | 3 | 4 | 5;
      if (hasReply !== undefined) filters.hasReply = hasReply;
      if (hasAttribution !== undefined) filters.hasAttribution = hasAttribution;
      if (locationId) filters.locationId = locationId;
      if (fromDate) filters.fromDate = new Date(fromDate);
      if (toDate) filters.toDate = new Date(toDate);
      if (search) filters.search = search;

      const result = await externalReviewService.list(req.businessId!, filters, page, limit);
      sendPaginated(res, result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  }
);

// Stats query schema
const statsQuerySchema = z.object({
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

// GET /api/v1/external-reviews/stats - Get external review stats
router.get(
  '/stats',
  authenticateJwt,
  validateQuery(statsQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fromDate, toDate } = req.query as z.infer<typeof statsQuerySchema>;
      const dateRange =
        fromDate && toDate
          ? { from: new Date(fromDate), to: new Date(toDate) }
          : undefined;
      const stats = await externalReviewService.getStats(req.businessId!, dateRange);
      sendSuccess(res, stats);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/external-reviews/sync - Trigger manual sync
router.post(
  '/sync',
  authenticateJwt,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await googleReviewsSyncService.triggerManualSync(req.businessId!);
      sendSuccess(res, {
        success: result.success,
        newReviews: result.newReviews,
        updatedReviews: result.updatedReviews,
        errors: result.errors,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/external-reviews/sync/status - Get sync status
router.get(
  '/sync/status',
  authenticateJwt,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = await googleReviewsSyncService.getLastSyncStatus(req.businessId!);
      sendSuccess(res, status);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/external-reviews/:id - Get single external review
router.get(
  '/:id',
  authenticateJwt,
  validateParams(idParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;
      const review = await externalReviewService.getByIdOrThrow(
        req.businessId!,
        id
      );
      sendSuccess(res, { review });
    } catch (error) {
      next(error);
    }
  }
);

// Reply schema
const replySchema = z.object({
  text: z.string().min(1).max(4096),
});

// POST /api/v1/external-reviews/:id/reply - Reply to a Google review
router.post(
  '/:id/reply',
  authenticateJwt,
  validateParams(idParamSchema),
  validateBody(replySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { text } = req.body as z.infer<typeof replySchema>;
      const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;
      const review = await externalReviewService.replyToGoogleReview(
        req.businessId!,
        id,
        text
      );
      sendSuccess(res, { review });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/external-reviews/:id/attribution - Get potential matches
router.get(
  '/:id/attribution',
  authenticateJwt,
  validateParams(idParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;
      const result = await reviewAttributionService.findPotentialMatches(
        req.businessId!,
        id
      );
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
);

// Link schema
const linkSchema = z.object({
  internalReviewId: z.string().min(1),
});

// POST /api/v1/external-reviews/:id/attribution - Manually link reviews
router.post(
  '/:id/attribution',
  authenticateJwt,
  validateParams(idParamSchema),
  validateBody(linkSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { internalReviewId } = req.body as z.infer<typeof linkSchema>;
      const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;
      const review = await reviewAttributionService.linkReviews(
        req.businessId!,
        id,
        internalReviewId,
        'manual'
      );
      sendSuccess(res, { review });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/external-reviews/:id/attribution - Remove link
router.delete(
  '/:id/attribution',
  authenticateJwt,
  validateParams(idParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;
      const review = await reviewAttributionService.unlinkReview(
        req.businessId!,
        id
      );
      sendSuccess(res, { review });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/external-reviews/:id/linked-review - Get the linked internal review
router.get(
  '/:id/linked-review',
  authenticateJwt,
  validateParams(idParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;
      const review = await reviewAttributionService.getLinkedInternalReview(
        req.businessId!,
        id
      );
      sendSuccess(res, { review });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
