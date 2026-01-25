import { Router, Request, Response, NextFunction } from 'express';
import type { DullyWebhookPayload } from '@easyrate/shared';
import { dullyWebhookPayloadSchema, INTEGRATION_DELAYS } from '@easyrate/shared';
import { Business, type BusinessDocument } from '../../models/Business.js';
import { dullyAdapter } from '../../integrations/dully/index.js';
import { orderQueueService } from '../../services/OrderQueueService.js';
import { UnauthorizedError, NotFoundError, ValidationError } from '../../utils/errors.js';

const router = Router();

// POST /api/v1/webhooks/dully/:businessId - Receive Dully webhook
router.post(
  '/:businessId',
  async (req: Request, res: Response, next: NextFunction) => {
    const businessId = req.params.businessId as string;

    try {
      // 1. Find business and get Dully integration config
      const business = await Business.findById(businessId) as BusinessDocument | null;
      if (!business) {
        throw new NotFoundError('Virksomhed ikke fundet');
      }

      const dullyIntegration = business.integrations.find(
        (i) => i.platform === 'dully' && i.enabled
      );

      if (!dullyIntegration) {
        throw new NotFoundError('Dully integration ikke aktiveret');
      }

      if (!dullyIntegration.webhookSecret) {
        throw new ValidationError('Dully webhook secret ikke konfigureret');
      }

      // 2. Verify webhook signature
      const signatureHeader = req.headers['x-dully-signature'];
      const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
      if (!signature) {
        throw new UnauthorizedError('Manglende webhook signatur');
      }

      // Get raw body for signature verification
      const rawBody = JSON.stringify(req.body);

      // Temporarily connect adapter with config to verify signature
      await dullyAdapter.connect({
        platform: 'dully',
        enabled: true,
        webhookSecret: dullyIntegration.webhookSecret,
      });

      const isValid = dullyAdapter.verifySignature(rawBody, signature);
      if (!isValid) {
        console.warn(`[DullyWebhook] Invalid signature for business ${businessId}`);
        throw new UnauthorizedError('Ugyldig webhook signatur');
      }

      // 3. Parse and validate payload
      const parseResult = dullyWebhookPayloadSchema.safeParse(req.body);
      if (!parseResult.success) {
        console.warn('[DullyWebhook] Invalid payload:', parseResult.error.errors);
        throw new ValidationError('Ugyldig webhook payload', {
          errors: parseResult.error.errors,
        });
      }

      // Cast to DullyWebhookPayload type (schema validates the shape)
      const payload = parseResult.data as DullyWebhookPayload;

      // 4. Filter for order.picked_up events only
      if (!dullyAdapter.shouldProcess(payload)) {
        console.log(`[DullyWebhook] Skipping event: ${payload.event}`);
        res.status(200).json({ success: true, message: 'Event skipped' });
        return;
      }

      // 5. Transform to OrderData
      const orderData = dullyAdapter.transformPayload(payload);

      // 6. Queue notification with 1 hour delay
      await orderQueueService.enqueue(
        businessId,
        orderData,
        INTEGRATION_DELAYS.dully
      );

      console.log(
        `[DullyWebhook] Order ${orderData.orderId} queued for business ${businessId}`
      );

      // 7. Return 200 immediately (async processing)
      res.status(200).json({
        success: true,
        message: 'Webhook modtaget',
        orderId: orderData.orderId,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
