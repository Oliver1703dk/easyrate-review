import type { Request, Response } from 'express';
import { Router } from 'express';
import { notificationService } from '../../services/NotificationService.js';
import { ResendProvider, type ResendWebhookEvent } from '../../providers/email/ResendProvider.js';
import type { NotificationStatus } from '@easyrate/shared';

const router = Router();

/**
 * Resend event webhook
 * POST /api/v1/webhooks/resend/events
 *
 * Resend sends individual event objects (not arrays like SendGrid).
 * Status mapping:
 * - email.sent            → sent
 * - email.delivered       → delivered
 * - email.bounced         → bounced
 * - email.delivery_delayed → sent
 * - email.complained      → bounced
 * - email.opened          → opened
 * - email.clicked         → clicked
 */
router.post('/events', async (req: Request, res: Response) => {
  try {
    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (webhookSecret) {
      const svixId = req.headers['svix-id'] as string;
      const svixTimestamp = req.headers['svix-timestamp'] as string;
      const svixSignature = req.headers['svix-signature'] as string;

      if (!svixId || !svixTimestamp || !svixSignature) {
        console.warn('[Resend Webhook] Missing svix signature headers');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify timestamp is within tolerance (5 minutes)
      const timestampSeconds = parseInt(svixTimestamp, 10);
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - timestampSeconds) > 300) {
        console.warn('[Resend Webhook] Timestamp outside tolerance');
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    const event = req.body as ResendWebhookEvent;

    // Runtime guard — req.body is untyped at runtime despite the `as` cast
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!event.type || !event.data) {
      console.warn('[Resend Webhook] Invalid payload format');
      return res.status(400).json({ error: 'Invalid payload format' });
    }

    console.log(`[Resend Webhook] Received event: ${event.type}`);

    const parsedEvent = ResendProvider.parseWebhookEvent(event);

    try {
      if (!parsedEvent.messageId) {
        console.warn('[Resend Webhook] Event missing message ID, skipping');
        return res.status(200).json({ received: true });
      }

      const notification = await notificationService.findByExternalMessageId(parsedEvent.messageId);

      if (!notification) {
        console.warn(
          `[Resend Webhook] Notification not found for message ID: ${parsedEvent.messageId}`
        );
        return res.status(200).json({ received: true });
      }

      const newStatus = ResendProvider.mapWebhookEvent(parsedEvent.event) as NotificationStatus;

      if (shouldUpdateStatus(notification.status, newStatus)) {
        const updateOptions: { errorMessage?: string } = {};
        if (parsedEvent.reason) {
          updateOptions.errorMessage = parsedEvent.reason;
        }
        await notificationService.updateStatus(notification.id, newStatus, updateOptions);

        console.log(
          `[Resend Webhook] Updated notification ${notification.id}: ${parsedEvent.event} → ${newStatus}`
        );
      }
    } catch (eventError) {
      console.error(`[Resend Webhook] Error processing event:`, eventError);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[Resend Webhook] Error processing webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Determine if we should update the notification status
 * based on status progression order
 */
function shouldUpdateStatus(
  currentStatus: NotificationStatus,
  newStatus: NotificationStatus
): boolean {
  const statusOrder: Record<NotificationStatus, number> = {
    pending: 0,
    sent: 1,
    delivered: 2,
    opened: 3,
    clicked: 4,
    failed: 5,
    bounced: 5,
  };

  const currentOrder = statusOrder[currentStatus];
  const newOrder = statusOrder[newStatus];

  return newOrder > currentOrder || newStatus === 'failed' || newStatus === 'bounced';
}

export default router;
