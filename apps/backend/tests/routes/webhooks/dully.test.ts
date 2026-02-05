import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { Business } from '../../../src/models/Business.js';
import { OrderQueue } from '../../../src/models/OrderQueue.js';
import dullyWebhookRoutes from '../../../src/routes/webhooks/dully.js';
import { errorHandler } from '../../../src/middleware/errorHandler.js';

describe('Dully Webhook Routes', () => {
  let app: Express;
  let testBusiness: mongoose.Document & { _id: mongoose.Types.ObjectId };
  let testBusinessId: string;
  const webhookSecret = 'whsec_test_secret_key_12345';

  function computeSignature(
    secret: string,
    timestamp: string,
    webhookId: string,
    payload: string
  ): string {
    const signedPayload = `${timestamp}.${webhookId}.${payload}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('base64');
    return `v1,${signature}`;
  }

  function makeWebhookRequest(
    payload: object,
    options: {
      timestamp?: string;
      webhookId?: string;
      signature?: string;
      omitHeaders?: boolean;
    } = {}
  ) {
    const bodyStr = JSON.stringify(payload);
    const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000).toString();
    const webhookId = options.webhookId ?? `msg_${Date.now()}`;
    const signature =
      options.signature ?? computeSignature(webhookSecret, timestamp, webhookId, bodyStr);

    const req = request(app)
      .post(`/webhooks/dully/${testBusinessId}`)
      .send(payload);

    if (!options.omitHeaders) {
      req
        .set('webhook-id', webhookId)
        .set('webhook-timestamp', timestamp)
        .set('webhook-signature', signature);
    }

    return req;
  }

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use('/webhooks/dully', dullyWebhookRoutes);
    app.use(errorHandler);

    // Create test business with Dully integration
    testBusiness = new Business({
      name: 'Test Restaurant',
      email: 'test@restaurant.com',
      settings: {
        defaultDelayMinutes: 60,
      },
      integrations: [
        {
          platform: 'dully',
          enabled: true,
          webhookSecret,
          webhookCount: 0,
        },
      ],
      messageTemplates: {},
      branding: {},
    }) as mongoose.Document & { _id: mongoose.Types.ObjectId };
    await testBusiness.save();
    testBusinessId = testBusiness._id.toString();
  });

  afterEach(async () => {
    // Clean up queue items
    await OrderQueue.deleteMany({ businessId: testBusiness._id });
  });

  describe('POST /webhooks/dully/:businessId - Valid webhooks', () => {
    it('should queue order.picked_up event', async () => {
      const payload = {
        event: 'order.picked_up',
        orderId: 'order-123',
        customerName: 'John Doe',
        customerPhone: '+4512345678',
        customerEmail: 'john@example.com',
        totalAmount: 199.50,
        timestamp: new Date().toISOString(),
        restaurantId: 'rest-456',
      };

      const response = await makeWebhookRequest(payload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.orderId).toBe('order-123');

      // Verify order was queued
      const queuedOrder = await OrderQueue.findOne({
        businessId: testBusiness._id,
        orderId: 'order-123',
      });
      expect(queuedOrder).toBeDefined();
      expect(queuedOrder?.status).toBe('pending');
      expect(queuedOrder?.platform).toBe('dully');
      expect(queuedOrder?.orderData.customerName).toBe('John Doe');
    });

    it('should queue order.approved event', async () => {
      const payload = {
        event: 'order.approved',
        orderId: 'order-approved-123',
        timestamp: new Date().toISOString(),
        restaurantId: 'rest-456',
      };

      const response = await makeWebhookRequest(payload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const queuedOrder = await OrderQueue.findOne({
        businessId: testBusiness._id,
        orderId: 'order-approved-123',
      });
      expect(queuedOrder).toBeDefined();
      expect(queuedOrder?.status).toBe('pending');
    });

    it('should skip order.created events', async () => {
      const payload = {
        event: 'order.created',
        orderId: 'order-created-123',
        timestamp: new Date().toISOString(),
        restaurantId: 'rest-456',
      };

      const response = await makeWebhookRequest(payload);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Event skipped');

      const queuedOrder = await OrderQueue.findOne({
        businessId: testBusiness._id,
        orderId: 'order-created-123',
      });
      expect(queuedOrder).toBeNull();
    });

    it('should handle duplicate orders idempotently', async () => {
      const payload = {
        event: 'order.picked_up',
        orderId: 'order-duplicate',
        timestamp: new Date().toISOString(),
        restaurantId: 'rest-456',
      };

      // First request
      await makeWebhookRequest(payload);

      // Second request with same order
      const response = await makeWebhookRequest(payload);

      expect(response.status).toBe(200);

      // Should still have only one queue entry
      const count = await OrderQueue.countDocuments({
        businessId: testBusiness._id,
        orderId: 'order-duplicate',
      });
      expect(count).toBe(1);
    });

    it('should update webhook tracking', async () => {
      const payload = {
        event: 'order.picked_up',
        orderId: 'order-tracking',
        timestamp: new Date().toISOString(),
        restaurantId: 'rest-456',
      };

      await makeWebhookRequest(payload);

      const business = await Business.findById(testBusinessId);
      const integration = business?.integrations.find((i) => i.platform === 'dully');
      expect(integration?.webhookCount).toBe(1);
      expect(integration?.lastWebhookAt).toBeDefined();
    });
  });

  describe('POST /webhooks/dully/:businessId - Cancellation handling', () => {
    it('should cancel pending order on order.cancelled event', async () => {
      // First, queue an order
      const orderPayload = {
        event: 'order.picked_up',
        orderId: 'order-to-cancel',
        timestamp: new Date().toISOString(),
        restaurantId: 'rest-456',
      };
      await makeWebhookRequest(orderPayload);

      // Verify order is pending
      let queuedOrder = await OrderQueue.findOne({
        businessId: testBusiness._id,
        orderId: 'order-to-cancel',
      });
      expect(queuedOrder?.status).toBe('pending');

      // Now cancel it
      const cancelPayload = {
        event: 'order.cancelled',
        orderId: 'order-to-cancel',
        timestamp: new Date().toISOString(),
        restaurantId: 'rest-456',
        cancelReason: 'Customer request',
      };

      const response = await makeWebhookRequest(cancelPayload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.cancelled).toBe(true);

      // Verify order was cancelled
      queuedOrder = await OrderQueue.findOne({
        businessId: testBusiness._id,
        orderId: 'order-to-cancel',
      });
      expect(queuedOrder?.status).toBe('cancelled');
      expect(queuedOrder?.cancelReason).toBe('Customer request');
      expect(queuedOrder?.cancelledAt).toBeDefined();
    });

    it('should return success even if no pending order found', async () => {
      const cancelPayload = {
        event: 'order.cancelled',
        orderId: 'non-existent-order',
        timestamp: new Date().toISOString(),
        restaurantId: 'rest-456',
      };

      const response = await makeWebhookRequest(cancelPayload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.cancelled).toBe(false);
    });
  });

  describe('POST /webhooks/dully/:businessId - Missing headers', () => {
    it('should return 401 for missing webhook-id header', async () => {
      const payload = {
        event: 'order.picked_up',
        orderId: 'order-123',
        timestamp: new Date().toISOString(),
        restaurantId: 'rest-456',
      };

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = computeSignature(webhookSecret, timestamp, 'msg_123', JSON.stringify(payload));

      const response = await request(app)
        .post(`/webhooks/dully/${testBusinessId}`)
        .set('webhook-timestamp', timestamp)
        .set('webhook-signature', signature)
        .send(payload);

      expect(response.status).toBe(401);
    });

    it('should return 401 for missing webhook-timestamp header', async () => {
      const payload = {
        event: 'order.picked_up',
        orderId: 'order-123',
        timestamp: new Date().toISOString(),
        restaurantId: 'rest-456',
      };

      const response = await request(app)
        .post(`/webhooks/dully/${testBusinessId}`)
        .set('webhook-id', 'msg_123')
        .set('webhook-signature', 'v1,fake')
        .send(payload);

      expect(response.status).toBe(401);
    });

    it('should return 401 for missing webhook-signature header', async () => {
      const payload = {
        event: 'order.picked_up',
        orderId: 'order-123',
        timestamp: new Date().toISOString(),
        restaurantId: 'rest-456',
      };

      const response = await request(app)
        .post(`/webhooks/dully/${testBusinessId}`)
        .set('webhook-id', 'msg_123')
        .set('webhook-timestamp', Math.floor(Date.now() / 1000).toString())
        .send(payload);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /webhooks/dully/:businessId - Replay protection', () => {
    it('should reject expired timestamp (6 minutes old)', async () => {
      const payload = {
        event: 'order.picked_up',
        orderId: 'order-123',
        timestamp: new Date().toISOString(),
        restaurantId: 'rest-456',
      };

      const oldTimestamp = (Math.floor(Date.now() / 1000) - 360).toString(); // 6 minutes ago

      const response = await makeWebhookRequest(payload, {
        timestamp: oldTimestamp,
      });

      expect(response.status).toBe(401);
    });

    it('should accept timestamp within tolerance (4 minutes old)', async () => {
      const payload = {
        event: 'order.picked_up',
        orderId: 'order-recent',
        timestamp: new Date().toISOString(),
        restaurantId: 'rest-456',
      };

      const recentTimestamp = (Math.floor(Date.now() / 1000) - 240).toString(); // 4 minutes ago

      const response = await makeWebhookRequest(payload, {
        timestamp: recentTimestamp,
      });

      expect(response.status).toBe(200);
    });
  });

  describe('POST /webhooks/dully/:businessId - Invalid signature', () => {
    it('should reject invalid signature', async () => {
      const payload = {
        event: 'order.picked_up',
        orderId: 'order-123',
        timestamp: new Date().toISOString(),
        restaurantId: 'rest-456',
      };

      const response = await makeWebhookRequest(payload, {
        signature: 'v1,invalid_signature_here',
      });

      expect(response.status).toBe(401);
    });

    it('should reject signature computed with wrong secret', async () => {
      const payload = {
        event: 'order.picked_up',
        orderId: 'order-123',
        timestamp: new Date().toISOString(),
        restaurantId: 'rest-456',
      };

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const webhookId = 'msg_wrong';
      const wrongSignature = computeSignature(
        'wrong_secret',
        timestamp,
        webhookId,
        JSON.stringify(payload)
      );

      const response = await makeWebhookRequest(payload, {
        timestamp,
        webhookId,
        signature: wrongSignature,
      });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /webhooks/dully/:businessId - Business validation', () => {
    it('should return 404 for non-existent business', async () => {
      const payload = {
        event: 'order.picked_up',
        orderId: 'order-123',
        timestamp: new Date().toISOString(),
        restaurantId: 'rest-456',
      };

      const fakeId = new mongoose.Types.ObjectId().toString();
      const bodyStr = JSON.stringify(payload);
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const webhookId = 'msg_123';
      const signature = computeSignature(webhookSecret, timestamp, webhookId, bodyStr);

      const response = await request(app)
        .post(`/webhooks/dully/${fakeId}`)
        .set('webhook-id', webhookId)
        .set('webhook-timestamp', timestamp)
        .set('webhook-signature', signature)
        .send(payload);

      expect(response.status).toBe(404);
    });

    it('should return 404 if Dully integration not enabled', async () => {
      // Create business without Dully enabled
      const disabledBusiness = new Business({
        name: 'No Dully Restaurant',
        email: 'nodully@restaurant.com',
        integrations: [
          {
            platform: 'dully',
            enabled: false,
            webhookSecret: 'some_secret',
          },
        ],
      });
      await disabledBusiness.save();

      const payload = {
        event: 'order.picked_up',
        orderId: 'order-123',
        timestamp: new Date().toISOString(),
        restaurantId: 'rest-456',
      };

      const bodyStr = JSON.stringify(payload);
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const webhookId = 'msg_123';
      const signature = computeSignature('some_secret', timestamp, webhookId, bodyStr);

      const response = await request(app)
        .post(`/webhooks/dully/${disabledBusiness._id}`)
        .set('webhook-id', webhookId)
        .set('webhook-timestamp', timestamp)
        .set('webhook-signature', signature)
        .send(payload);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /webhooks/dully/:businessId - Invalid payload', () => {
    it('should return 400 for invalid event type', async () => {
      const payload = {
        event: 'order.invalid_event',
        orderId: 'order-123',
        timestamp: new Date().toISOString(),
        restaurantId: 'rest-456',
      };

      const response = await makeWebhookRequest(payload);

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing orderId', async () => {
      const payload = {
        event: 'order.picked_up',
        timestamp: new Date().toISOString(),
        restaurantId: 'rest-456',
      };

      const response = await makeWebhookRequest(payload);

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing restaurantId', async () => {
      const payload = {
        event: 'order.picked_up',
        orderId: 'order-123',
        timestamp: new Date().toISOString(),
      };

      const response = await makeWebhookRequest(payload);

      expect(response.status).toBe(400);
    });
  });
});
