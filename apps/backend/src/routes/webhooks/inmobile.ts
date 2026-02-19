import { Router, Request, Response } from 'express';
import { notificationService } from '../../services/NotificationService.js';
import { InMobileProvider } from '../../providers/sms/InMobileProvider.js';
import type { NotificationStatus } from '@easyrate/shared';

const router = Router();

/**
 * InMobile delivery status webhook
 * POST /api/v1/webhooks/inmobile/delivery
 *
 * InMobile posts delivery status to the statusCallbackUrl set per-message.
 * Auth: shared secret via X-InMobile-Secret header.
 *
 * Status mapping:
 * - delivered → delivered
 * - failed/rejected/expired → failed
 * - sent/buffered → sent
 */
router.post('/delivery', async (req: Request, res: Response) => {
  try {
    // Verify shared secret header
    const secret = req.headers['x-inmobile-secret'] as string | undefined;
    const expectedSecret = process.env.INMOBILE_WEBHOOK_SECRET;

    if (expectedSecret) {
      if (!secret || secret !== expectedSecret) {
        console.warn('[InMobile Webhook] Missing or invalid X-InMobile-Secret header');
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    // Parse the webhook payload
    const webhookData = InMobileProvider.parseDeliveryWebhook(req.body);
    console.log(`[InMobile Webhook] Received delivery status: ${webhookData.messageId} → ${webhookData.status}`);

    // Find the notification by external message ID
    const notification = await notificationService.findByExternalMessageId(webhookData.messageId);

    if (!notification) {
      console.warn(`[InMobile Webhook] Notification not found for message ID: ${webhookData.messageId}`);
      // Return 200 to acknowledge receipt even if we can't find the notification
      return res.status(200).json({ received: true, found: false });
    }

    // Map the status
    const newStatus = InMobileProvider.mapWebhookStatus(webhookData.status) as NotificationStatus;

    // Update notification status
    const updateOptions: { errorMessage?: string } = {};
    if (webhookData.error) {
      updateOptions.errorMessage = webhookData.error;
    }
    await notificationService.updateStatus(notification.id, newStatus, updateOptions);

    console.log(`[InMobile Webhook] Updated notification ${notification.id} status to ${newStatus}`);

    return res.status(200).json({ received: true, updated: true });
  } catch (error) {
    console.error('[InMobile Webhook] Error processing webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
