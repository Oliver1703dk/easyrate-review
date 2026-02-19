import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { authenticateJwt } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { reviewTokenService } from '../services/ReviewTokenService.js';
import { notificationService } from '../services/NotificationService.js';
import { templateService, type TemplateVariables } from '../services/TemplateService.js';
import { Business } from '../models/Business.js';
import { NotFoundError } from '../utils/errors.js';
import type { ReviewTokenCustomer } from '@easyrate/shared';
import { sendSuccess } from '../utils/response.js';

const router = Router();

// Default test customer data
const TEST_CUSTOMER = {
  email: 'test@easyrate.app',
  phone: '+4512345678',
  name: 'Test Kunde',
};

// Schema for send-order endpoint
const testOrderSchema = z
  .object({
    phone: z.string().optional(),
    email: z.string().email().optional(),
    customerName: z.string().optional(),
  })
  .refine((data) => data.phone ?? data.email, {
    message: 'At least one contact method required',
  });

/**
 * POST /api/v1/test/review-link
 * Generate a JWT-based test review link for the authenticated business
 */
router.post('/review-link', authenticateJwt, (req: Request, res: Response, next: NextFunction) => {
  try {
    const businessId = req.user?.businessId;

    // Generate JWT token with test customer data
    const token = reviewTokenService.generateToken({
      businessId,
      customer: TEST_CUSTOMER,
      sourcePlatform: 'direct',
    });

    const baseUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const link = `${baseUrl}/r/${token}?isTest=true`;

    sendSuccess(res, { link });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/test/send-order
 * Send a test SMS/email notification to test the complete flow
 */
router.post(
  '/send-order',
  authenticateJwt,
  validateBody(testOrderSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = req.user?.businessId;
      const input = req.body as z.infer<typeof testOrderSchema>;

      // Load business for templates
      const business = await Business.findById(businessId);
      if (!business) {
        throw new NotFoundError('Business not found');
      }

      const notifications: {
        id: string;
        type: 'sms' | 'email';
        recipient: string;
        reviewLink: string;
      }[] = [];
      const baseUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

      // Create SMS notification if phone provided
      if (input.phone) {
        const smsCustomer: ReviewTokenCustomer = { phone: input.phone };
        if (input.customerName) smsCustomer.name = input.customerName;

        const smsToken = reviewTokenService.generateToken({
          businessId,
          customer: smsCustomer,
          sourcePlatform: 'test',
        });

        const smsLink = `${baseUrl}/r/${smsToken}?isTest=true`;
        const templateVars: TemplateVariables = {
          businessName: business.name,
          reviewLink: smsLink,
        };
        if (input.customerName) {
          templateVars.customerName = input.customerName;
        }
        const smsContent = templateService.renderSmsReviewRequest(templateVars);

        const smsNotification = await notificationService.create(businessId, {
          type: 'sms',
          recipient: input.phone,
          content: smsContent,
          reviewLink: smsLink,
          orderId: `test-${String(Date.now())}`,
        });

        notifications.push({
          id: smsNotification.id,
          type: 'sms',
          recipient: input.phone,
          reviewLink: smsLink,
        });
      }

      // Create email notification if email provided
      if (input.email) {
        const emailCustomer: ReviewTokenCustomer = { email: input.email };
        if (input.customerName) emailCustomer.name = input.customerName;

        const emailToken = reviewTokenService.generateToken({
          businessId,
          customer: emailCustomer,
          sourcePlatform: 'test',
        });

        const emailLink = `${baseUrl}/r/${emailToken}?isTest=true`;
        const emailTemplateVars: TemplateVariables = {
          businessName: business.name,
          reviewLink: emailLink,
        };
        if (input.customerName) {
          emailTemplateVars.customerName = input.customerName;
        }
        const { subject, body } = templateService.renderEmailReviewRequest(emailTemplateVars);

        const emailNotification = await notificationService.create(businessId, {
          type: 'email',
          recipient: input.email,
          content: body,
          subject,
          reviewLink: emailLink,
          orderId: `test-${String(Date.now())}`,
        });

        notifications.push({
          id: emailNotification.id,
          type: 'email',
          recipient: input.email,
          reviewLink: emailLink,
        });
      }

      sendSuccess(res, {
        notifications: notifications.map((n) => ({
          id: n.id,
          type: n.type,
          recipient: n.recipient,
        })),
        reviewLink: notifications[0]?.reviewLink,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
