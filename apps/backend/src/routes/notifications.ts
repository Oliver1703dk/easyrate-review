import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { paginationParamsSchema, idParamSchema } from '@easyrate/shared';
import { notificationService, NotificationFilters } from '../services/NotificationService.js';
import { authenticateJwt } from '../middleware/auth.js';
import { validateQuery, validateParams } from '../middleware/validate.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

const router = Router();

// All routes require JWT authentication
router.use(authenticateJwt);

// Notification filters schema for query params
const notificationFiltersQuerySchema = z.object({
  type: z.enum(['sms', 'email']).optional(),
  status: z.enum(['pending', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked']).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

const listNotificationsQuerySchema = notificationFiltersQuerySchema.merge(paginationParamsSchema);

// GET /api/v1/notifications - List notifications for current business
router.get(
  '/',
  validateQuery(listNotificationsQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = req.query as unknown as z.infer<typeof listNotificationsQuerySchema>;
      const { page = 1, limit = 20, type, status, fromDate, toDate } = parsed;
      const filters: NotificationFilters = {};
      if (type) filters.type = type;
      if (status) filters.status = status;
      if (fromDate) filters.fromDate = fromDate;
      if (toDate) filters.toDate = toDate;

      const result = await notificationService.list(
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

// Stats query schema with optional date range
const statsQuerySchema = z.object({
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

// GET /api/v1/notifications/stats - Get notification statistics
router.get(
  '/stats',
  validateQuery(statsQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fromDate, toDate } = req.query as z.infer<typeof statsQuerySchema>;
      const dateRange = fromDate && toDate
        ? { from: new Date(fromDate), to: new Date(toDate) }
        : undefined;
      const stats = await notificationService.getStats(req.businessId!, dateRange);
      sendSuccess(res, stats);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/notifications/:id - Get single notification
router.get(
  '/:id',
  validateParams(idParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const notification = await notificationService.findByIdOrThrow(
        req.businessId!,
        id
      );
      sendSuccess(res, { notification });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
