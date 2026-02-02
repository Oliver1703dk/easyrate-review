import { Router, type Request, type Response, type NextFunction } from 'express';
import type { z } from 'zod';
import { paginationParamsSchema, idParamSchema } from '@easyrate/shared';
import { insightsService } from '../services/InsightsService.js';
import { authenticateJwt } from '../middleware/auth.js';
import { validateQuery, validateParams } from '../middleware/validate.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

const router = Router();

// History query schema
const historyQuerySchema = paginationParamsSchema;

// GET /api/v1/insights - Get latest completed insight
router.get(
  '/',
  authenticateJwt,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const insight = await insightsService.getLatest(req.businessId!);
      sendSuccess(res, { insight });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/insights/status - Check feature availability and rate limits
router.get(
  '/status',
  authenticateJwt,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = await insightsService.getStatus(req.businessId!);
      sendSuccess(res, status);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/insights/history - List historical insight runs
router.get(
  '/history',
  authenticateJwt,
  validateQuery(historyQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = req.query as unknown as z.infer<typeof historyQuerySchema>;
      const page = parsed.page ?? 1;
      const limit = parsed.limit ?? 10;
      const result = await insightsService.list(req.businessId!, page, limit);
      sendPaginated(res, result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/insights/:id - Get specific insight run by ID
router.get(
  '/:id',
  authenticateJwt,
  validateParams(idParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const insight = await insightsService.getByIdOrThrow(req.businessId!, id);
      sendSuccess(res, { insight });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/insights/refresh - Trigger manual regeneration
router.post(
  '/refresh',
  authenticateJwt,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const insight = await insightsService.createAndProcess(req.businessId!, 'manual');
      sendSuccess(res, { insight }, 201);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
