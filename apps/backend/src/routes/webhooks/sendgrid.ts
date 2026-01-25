import { Router, Request, Response } from 'express';
import { notificationService } from '../../services/NotificationService.js';
import { SendGridProvider, type SendGridWebhookEvent } from '../../providers/email/SendGridProvider.js';
import type { NotificationStatus } from '@easyrate/shared';

const router = Router();

/**
 * SendGrid event webhook
 * POST /api/v1/webhooks/sendgrid/events
 *
 * SendGrid sends arrays of events for email status updates.
 * Status mapping:
 * - processed/deferred → sent
 * - delivered → delivered
 * - bounce → bounced
 * - dropped → failed
 * - open → opened
 * - click → clicked
 */
router.post('/events', async (req: Request, res: Response) => {
  try {
    // Verify webhook signature if verification key is configured
    const verificationKey = process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY;
    if (verificationKey) {
      const signature = req.headers['x-twilio-email-event-webhook-signature'] as string;
      const timestamp = req.headers['x-twilio-email-event-webhook-timestamp'] as string;

      if (!signature || !timestamp) {
        console.warn('[SendGrid Webhook] Missing signature or timestamp headers');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // For full ECDSA verification, we'd combine timestamp + payload and verify
      // with the public key. For MVP, we'll log and continue.
      console.log('[SendGrid Webhook] Signature verification would happen here');
    }

    // SendGrid sends an array of events
    const events = req.body as SendGridWebhookEvent[];

    if (!Array.isArray(events)) {
      console.warn('[SendGrid Webhook] Invalid payload format - expected array');
      return res.status(400).json({ error: 'Invalid payload format' });
    }

    console.log(`[SendGrid Webhook] Received ${events.length} event(s)`);

    // Parse and process each event
    const parsedEvents = SendGridProvider.parseEventWebhook(events);

    for (const event of parsedEvents) {
      try {
        if (!event.messageId) {
          console.warn('[SendGrid Webhook] Event missing message ID, skipping');
          continue;
        }

        // Find the notification by external message ID
        const notification = await notificationService.findByExternalMessageId(event.messageId);

        if (!notification) {
          console.warn(`[SendGrid Webhook] Notification not found for message ID: ${event.messageId}`);
          continue;
        }

        // Map the event to our status
        const newStatus = SendGridProvider.mapWebhookEvent(event.event) as NotificationStatus;

        // Only update if the new status is "more advanced" than the current status
        if (shouldUpdateStatus(notification.status, newStatus)) {
          const updateOptions: { errorMessage?: string } = {};
          if (event.reason) {
            updateOptions.errorMessage = event.reason;
          }
          await notificationService.updateStatus(notification.id, newStatus, updateOptions);

          console.log(`[SendGrid Webhook] Updated notification ${notification.id}: ${event.event} → ${newStatus}`);
        }
      } catch (eventError) {
        console.error(`[SendGrid Webhook] Error processing event:`, eventError);
        // Continue processing other events
      }
    }

    // Always return 200 to acknowledge receipt
    return res.status(200).json({ received: true, processed: parsedEvents.length });
  } catch (error) {
    console.error('[SendGrid Webhook] Error processing webhook:', error);
    // Return 500 to signal SendGrid to retry
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

  const currentOrder = statusOrder[currentStatus] ?? 0;
  const newOrder = statusOrder[newStatus] ?? 0;

  // Allow update if new status is more advanced, or if it's a failure status
  return newOrder > currentOrder || newStatus === 'failed' || newStatus === 'bounced';
}

export default router;
