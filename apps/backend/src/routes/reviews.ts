import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  createReviewSchema,
  paginationParamsSchema,
  idParamSchema,
  ReviewFilters,
} from '@easyrate/shared';
import { reviewService } from '../services/ReviewService.js';
import { authenticateJwt, authenticateApiKey } from '../middleware/auth.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

const router = Router();

// Review filters schema for query params
const reviewFiltersQuerySchema = z.object({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  sourcePlatform: z.enum(['dully', 'easytable', 'direct']).optional(),
  isPublic: z.coerce.boolean().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  search: z.string().max(255).optional(),
});

const listReviewsQuerySchema = reviewFiltersQuerySchema.merge(paginationParamsSchema);

// GET /api/v1/reviews - List reviews for current business
router.get(
  '/',
  authenticateJwt,
  validateQuery(listReviewsQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = req.query as unknown as z.infer<typeof listReviewsQuerySchema>;
      const { page = 1, limit = 20, rating, sourcePlatform, isPublic, fromDate, toDate, search } = parsed;

      const filters: Omit<ReviewFilters, 'businessId'> = {};
      if (rating !== undefined) filters.rating = rating as 1 | 2 | 3 | 4 | 5;
      if (sourcePlatform) filters.sourcePlatform = sourcePlatform;
      if (isPublic !== undefined) filters.isPublic = isPublic;
      if (fromDate) filters.fromDate = new Date(fromDate);
      if (toDate) filters.toDate = new Date(toDate);
      if (search) filters.search = search;

      const result = await reviewService.list(
        req.businessId!,
        filters,
        page,
        limit
      );
      sendPaginated(res, result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/reviews/stats - Get review statistics
router.get(
  '/stats',
  authenticateJwt,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await reviewService.getStats(req.businessId!);
      sendSuccess(res, { stats });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/reviews/:id - Get single review
router.get(
  '/:id',
  authenticateJwt,
  validateParams(idParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const review = await reviewService.findByIdOrThrow(
        req.businessId!,
        id
      );
      sendSuccess(res, { review });
    } catch (error) {
      next(error);
    }
  }
);

// Internal review creation schema (without businessId, since it comes from API key)
const internalCreateReviewSchema = createReviewSchema.omit({ businessId: true });

// POST /api/v1/reviews - Create review (internal use, requires API key)
router.post(
  '/',
  authenticateApiKey,
  validateBody(internalCreateReviewSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const review = await reviewService.create(req.businessId!, req.body);
      sendSuccess(res, { review }, 201);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/reviews/:id - Delete review
router.delete(
  '/:id',
  authenticateJwt,
  validateParams(idParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      await reviewService.delete(req.businessId!, id);
      sendSuccess(res, { message: 'Anmeldelse slettet' });
    } catch (error) {
      next(error);
    }
  }
);

// Reply text validation schema
const replyBodySchema = z.object({
  text: z.string().min(1, 'Tekst er påkrævet').max(2000, 'Tekst må maks være 2000 tegn'),
});

// POST /api/v1/reviews/:id/reply - Reply to a review
router.post(
  '/:id/reply',
  authenticateJwt,
  validateParams(idParamSchema),
  validateBody(replyBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const { text } = req.body as z.infer<typeof replyBodySchema>;
      const review = await reviewService.replyToReview(req.businessId!, id, text);
      sendSuccess(res, { review });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
