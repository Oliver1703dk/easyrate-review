import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { authenticateJwt } from '../middleware/auth.js';
import { gdprService } from '../services/GdprService.js';
import { sendSuccess } from '../utils/response.js';

const router = Router();

// All GDPR routes require authentication
router.use(authenticateJwt);

// Schema for customer identifier
const customerIdentifierSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(8).optional(),
}).refine((data) => data.email || data.phone, {
  message: 'Email eller telefonnummer er påkrævet',
});

// Schema for retention policy
const retentionPolicySchema = z.object({
  retentionDays: z.number().int().min(30).max(3650), // Between 30 days and 10 years
});

/**
 * POST /api/v1/gdpr/export
 * Export all business data as a downloadable ZIP file
 */
router.post(
  '/export',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = req.businessId as string;

      const result = await gdprService.exportBusinessData(businessId);

      sendSuccess(res, {
        downloadUrl: result.downloadUrl,
        expiresAt: result.expiresAt.toISOString(),
        message: 'Data export klar til download',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/gdpr/export/customer
 * Export data for a specific customer
 */
router.post(
  '/export/customer',
  validateBody(customerIdentifierSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = req.businessId as string;
      const { email, phone } = req.body;

      const result = await gdprService.exportCustomerData(businessId, { email, phone });

      sendSuccess(res, {
        downloadUrl: result.downloadUrl,
        expiresAt: result.expiresAt.toISOString(),
        message: 'Kundedata export klar til download',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/gdpr/customer
 * Delete all data for a specific customer (right to be forgotten)
 */
router.delete(
  '/customer',
  validateBody(customerIdentifierSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = req.businessId as string;
      const { email, phone } = req.body;

      const result = await gdprService.deleteCustomerData(businessId, { email, phone });

      sendSuccess(res, {
        ...result,
        message: 'Kundedata er slettet',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/gdpr/retention/apply
 * Apply data retention policy - delete data older than specified days
 */
router.post(
  '/retention/apply',
  validateBody(retentionPolicySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = req.businessId as string;
      const { retentionDays } = req.body;

      const result = await gdprService.applyRetentionPolicy(businessId, retentionDays);

      sendSuccess(res, {
        ...result,
        cutoffDate: result.cutoffDate.toISOString(),
        message: `Data ældre end ${retentionDays} dage er slettet`,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/gdpr/account
 * Delete entire business account and all associated data
 * WARNING: This action is irreversible
 */
router.delete(
  '/account',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = req.businessId as string;

      const result = await gdprService.deleteBusinessData(businessId);

      sendSuccess(res, {
        ...result,
        message: 'Konto og alle data er permanent slettet',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
