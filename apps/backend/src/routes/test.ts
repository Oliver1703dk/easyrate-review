import { Router, Request, Response, NextFunction } from 'express';
import { authenticateJwt } from '../middleware/auth.js';
import { reviewTokenService } from '../services/ReviewTokenService.js';
import { sendSuccess } from '../utils/response.js';

const router = Router();

// Default test customer data
const TEST_CUSTOMER = {
  email: 'test@easyrate.app',
  phone: '+4512345678',
  name: 'Test Kunde',
};

/**
 * POST /api/v1/test/review-link
 * Generate a JWT-based test review link for the authenticated business
 */
router.post(
  '/review-link',
  authenticateJwt,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = req.user!.businessId;

      // Generate JWT token with test customer data
      const token = reviewTokenService.generateToken({
        businessId,
        customer: TEST_CUSTOMER,
        sourcePlatform: 'direct',
      });

      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const link = `${baseUrl}/r/${token}?isTest=true`;

      sendSuccess(res, { link });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
