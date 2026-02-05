import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import type { DullyWebhookPayload } from '@easyrate/shared';
import { dullyWebhookPayloadSchema, INTEGRATION_DELAYS } from '@easyrate/shared';
import { Business } from '../../models/Business.js';
import { dullyAdapter } from '../../integrations/dully/index.js';
import { orderQueueService } from '../../services/OrderQueueService.js';
import { UnauthorizedError, NotFoundError, ValidationError } from '../../utils/errors.js';

const router = Router();

interface StandardWebhookHeaders {
  webhookId: string;
  timestamp: string;
  signature: string;
}

/**
 * Extract Standard Webhooks headers from request
 */
function extractWebhookHeaders(req: Request): StandardWebhookHeaders | null {
  const webhookId = req.headers['webhook-id'];
  const timestamp = req.headers['webhook-timestamp'];
  const signature = req.headers['webhook-signature'];

  const id = Array.isArray(webhookId) ? webhookId[0] : webhookId;
  const ts = Array.isArray(timestamp) ? timestamp[0] : timestamp;
  const sig = Array.isArray(signature) ? signature[0] : signature;

  if (!id || !ts || !sig) {
    return null;
  }

  return {
    webhookId: id,
    timestamp: ts,
    signature: sig,
  };
}

/**
 * Update webhook tracking on business integration
 */
async function updateWebhookTracking(businessId: string): Promise<void> {
  await Business.updateOne(
    { _id: businessId, 'integrations.platform': 'dully' },
    {
      $set: { 'integrations.$.lastWebhookAt': new Date() },
      $inc: { 'integrations.$.webhookCount': 1 },
    }
  );
}

// POST /api/v1/webhooks/dully/:businessId - Receive Dully webhook
router.post('/:businessId', async (req: Request, res: Response, next: NextFunction) => {
  const businessId = req.params.businessId as string;

  try {
    // 1. Find business and get Dully integration config
    const business = await Business.findById(businessId);
    if (!business) {
      throw new NotFoundError('Virksomhed ikke fundet');
    }

    const dullyIntegration = business.integrations.find((i) => i.platform === 'dully' && i.enabled);

    if (!dullyIntegration) {
      throw new NotFoundError('Dully integration ikke aktiveret');
    }

    if (!dullyIntegration.webhookSecret) {
      throw new ValidationError('Dully webhook secret ikke konfigureret');
    }

    // 2. Extract Standard Webhooks headers
    const headers = extractWebhookHeaders(req);
    if (!headers) {
      console.warn(`[DullyWebhook] Missing required headers for business ${businessId}`);
      throw new UnauthorizedError('Manglende webhook headers');
    }

    // 3. Connect adapter with config
    await dullyAdapter.connect({
      platform: 'dully',
      enabled: true,
      webhookSecret: dullyIntegration.webhookSecret,
    });

    // 4. Validate timestamp (replay protection)
    if (!dullyAdapter.isTimestampValid(headers.timestamp)) {
      console.warn(`[DullyWebhook] Expired timestamp for business ${businessId}`);
      throw new UnauthorizedError('Webhook timestamp udløbet');
    }

    // 5. Verify signature
    const rawBody = JSON.stringify(req.body);
    const isValid = dullyAdapter.verifySignature(
      rawBody,
      headers.signature,
      headers.webhookId,
      headers.timestamp
    );

    if (!isValid) {
      console.warn(`[DullyWebhook] Invalid signature for business ${businessId}`);
      throw new UnauthorizedError('Ugyldig webhook signatur');
    }

    // 6. Parse and validate payload
    const parseResult = dullyWebhookPayloadSchema.safeParse(req.body);
    if (!parseResult.success) {
      console.warn('[DullyWebhook] Invalid payload:', parseResult.error.errors);
      throw new ValidationError('Ugyldig webhook payload', {
        errors: parseResult.error.errors,
      });
    }

    const payload = parseResult.data as DullyWebhookPayload;

    // 7. Handle cancellation events
    if (dullyAdapter.isCancellation(payload)) {
      const cancelled = await orderQueueService.cancelByOrderId(
        businessId,
        payload.orderId,
        'dully',
        payload.cancelReason
      );

      await updateWebhookTracking(businessId);

      console.log(
        `[DullyWebhook] Cancellation processed for order ${payload.orderId}, business ${businessId}${cancelled ? ' (order cancelled)' : ' (no pending order found)'}`
      );

      res.status(200).json({
        success: true,
        message: 'Annullering modtaget',
        orderId: payload.orderId,
        cancelled: !!cancelled,
      });
      return;
    }

    // 8. Filter for processable events
    if (!dullyAdapter.shouldProcess(payload)) {
      console.log(`[DullyWebhook] Skipping event: ${payload.event}`);
      res.status(200).json({ success: true, message: 'Event skipped' });
      return;
    }

    // 9. Transform to OrderData
    const orderData = dullyAdapter.transformPayload(payload);

    // 10. Queue notification with configured delay
    await orderQueueService.enqueue(businessId, orderData, INTEGRATION_DELAYS.dully);

    // 11. Update webhook tracking
    await updateWebhookTracking(businessId);

    console.log(`[DullyWebhook] Order ${orderData.orderId} queued for business ${businessId}`);

    // 12. Return 200 immediately (async processing)
    res.status(200).json({
      success: true,
      message: 'Webhook modtaget',
      orderId: orderData.orderId,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
