import { Router, Request, Response } from 'express';
import { notificationService } from '../../services/NotificationService.js';
import { GatewayApiProvider } from '../../providers/sms/GatewayApiProvider.js';
import type { NotificationStatus } from '@easyrate/shared';

const router = Router();

/**
 * Gateway API delivery status webhook
 * POST /api/v1/webhooks/gatewayapi/delivery
 *
 * Gateway API sends delivery status updates via JWT-authenticated webhooks.
 * Status mapping:
 * - DELIVERED → delivered
 * - UNDELIVERED/EXPIRED/REJECTED → failed
 * - BUFFERED/ENROUTE → sent
 */
router.post('/delivery', async (req: Request, res: Response) => {
  try {
    // Get JWT token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('[GatewayAPI Webhook] Missing or invalid Authorization header');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix

    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.GATEWAYAPI_WEBHOOK_SECRET;
    if (webhookSecret) {
      // For full JWT verification, we'd use jsonwebtoken library
      // For now, do basic structure validation
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.warn('[GatewayAPI Webhook] Invalid JWT structure');
        return res.status(401).json({ error: 'Invalid token' });
      }

      try {
        const payloadPart = parts[1];
        if (!payloadPart) {
          console.warn('[GatewayAPI Webhook] Missing JWT payload');
          return res.status(401).json({ error: 'Invalid token' });
        }
        const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf-8'));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
          console.warn('[GatewayAPI Webhook] JWT expired');
          return res.status(401).json({ error: 'Token expired' });
        }
      } catch {
        console.warn('[GatewayAPI Webhook] Failed to parse JWT payload');
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    // Parse the webhook payload
    const webhookData = GatewayApiProvider.parseDeliveryWebhook(req.body);
    console.log(`[GatewayAPI Webhook] Received delivery status: ${webhookData.messageId} → ${webhookData.status}`);

    // Find the notification by external message ID
    const notification = await notificationService.findByExternalMessageId(webhookData.messageId);

    if (!notification) {
      console.warn(`[GatewayAPI Webhook] Notification not found for message ID: ${webhookData.messageId}`);
      // Return 200 to acknowledge receipt even if we can't find the notification
      // This prevents Gateway API from retrying indefinitely
      return res.status(200).json({ received: true, found: false });
    }

    // Map the status
    const newStatus = GatewayApiProvider.mapWebhookStatus(webhookData.status) as NotificationStatus;

    // Update notification status
    const updateOptions: { errorMessage?: string } = {};
    if (webhookData.error) {
      updateOptions.errorMessage = webhookData.error;
    }
    await notificationService.updateStatus(notification.id, newStatus, updateOptions);

    console.log(`[GatewayAPI Webhook] Updated notification ${notification.id} status to ${newStatus}`);

    return res.status(200).json({ received: true, updated: true });
  } catch (error) {
    console.error('[GatewayAPI Webhook] Error processing webhook:', error);
    // Return 500 to signal Gateway API to retry
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
