import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import crypto from 'crypto';
import { DullyAdapter } from '../../../src/integrations/dully/DullyAdapter.js';
import type { DullyWebhookPayload } from '@easyrate/shared';

describe('DullyAdapter', () => {
  let adapter: DullyAdapter;
  const testSecret = 'whsec_test_secret_key_12345';

  beforeEach(async () => {
    adapter = new DullyAdapter();
    await adapter.connect({
      platform: 'dully',
      enabled: true,
      webhookSecret: testSecret,
    });
  });

  describe('verifySignature', () => {
    const payload = JSON.stringify({ event: 'order.picked_up', orderId: '123' });
    const webhookId = 'msg_12345';
    const timestamp = Math.floor(Date.now() / 1000).toString();

    function computeSignature(secret: string, ts: string, id: string, body: string): string {
      const signedPayload = `${ts}.${id}.${body}`;
      const signature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('base64');
      return `v1,${signature}`;
    }

    it('should verify valid signature', () => {
      const signature = computeSignature(testSecret, timestamp, webhookId, payload);

      const isValid = adapter.verifySignature(payload, signature, webhookId, timestamp);

      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const signature = 'v1,invalid_signature_here';

      const isValid = adapter.verifySignature(payload, signature, webhookId, timestamp);

      expect(isValid).toBe(false);
    });

    it('should reject signature with wrong secret', () => {
      const signature = computeSignature('wrong_secret', timestamp, webhookId, payload);

      const isValid = adapter.verifySignature(payload, signature, webhookId, timestamp);

      expect(isValid).toBe(false);
    });

    it('should handle multiple space-separated signatures', () => {
      const validSignature = computeSignature(testSecret, timestamp, webhookId, payload);
      const invalidSignature = 'v1,invalid_sig';
      const multipleSignatures = `${invalidSignature} ${validSignature}`;

      const isValid = adapter.verifySignature(payload, multipleSignatures, webhookId, timestamp);

      expect(isValid).toBe(true);
    });

    it('should reject signature with wrong version prefix', () => {
      const signedPayload = `${timestamp}.${webhookId}.${payload}`;
      const sig = crypto
        .createHmac('sha256', testSecret)
        .update(signedPayload)
        .digest('base64');
      const signature = `v2,${sig}`;

      const isValid = adapter.verifySignature(payload, signature, webhookId, timestamp);

      expect(isValid).toBe(false);
    });

    it('should reject malformed signature without version', () => {
      const signature = 'just_a_signature_no_version';

      const isValid = adapter.verifySignature(payload, signature, webhookId, timestamp);

      expect(isValid).toBe(false);
    });
  });

  describe('isTimestampValid', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('should accept timestamp within tolerance (now)', () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();

      const isValid = adapter.isTimestampValid(timestamp);

      expect(isValid).toBe(true);
    });

    it('should accept timestamp 4 minutes ago', () => {
      const fourMinutesAgo = Math.floor(Date.now() / 1000) - 240;

      const isValid = adapter.isTimestampValid(fourMinutesAgo.toString());

      expect(isValid).toBe(true);
    });

    it('should reject timestamp 6 minutes ago', () => {
      const sixMinutesAgo = Math.floor(Date.now() / 1000) - 360;

      const isValid = adapter.isTimestampValid(sixMinutesAgo.toString());

      expect(isValid).toBe(false);
    });

    it('should reject timestamp 6 minutes in future', () => {
      const sixMinutesFuture = Math.floor(Date.now() / 1000) + 360;

      const isValid = adapter.isTimestampValid(sixMinutesFuture.toString());

      expect(isValid).toBe(false);
    });

    it('should reject invalid timestamp format', () => {
      const isValid = adapter.isTimestampValid('not-a-number');

      expect(isValid).toBe(false);
    });

    it('should reject empty timestamp', () => {
      const isValid = adapter.isTimestampValid('');

      expect(isValid).toBe(false);
    });
  });

  describe('shouldProcess', () => {
    it('should process order.picked_up events', () => {
      const payload: DullyWebhookPayload = {
        event: 'order.picked_up',
        orderId: '123',
        timestamp: new Date().toISOString(),
        restaurantId: 'rest-1',
      };

      expect(adapter.shouldProcess(payload)).toBe(true);
    });

    it('should process order.approved events', () => {
      const payload: DullyWebhookPayload = {
        event: 'order.approved',
        orderId: '123',
        timestamp: new Date().toISOString(),
        restaurantId: 'rest-1',
      };

      expect(adapter.shouldProcess(payload)).toBe(true);
    });

    it('should not process order.created events', () => {
      const payload: DullyWebhookPayload = {
        event: 'order.created',
        orderId: '123',
        timestamp: new Date().toISOString(),
        restaurantId: 'rest-1',
      };

      expect(adapter.shouldProcess(payload)).toBe(false);
    });

    it('should not process order.cancelled events', () => {
      const payload: DullyWebhookPayload = {
        event: 'order.cancelled',
        orderId: '123',
        timestamp: new Date().toISOString(),
        restaurantId: 'rest-1',
      };

      expect(adapter.shouldProcess(payload)).toBe(false);
    });
  });

  describe('isCancellation', () => {
    it('should return true for order.cancelled events', () => {
      const payload: DullyWebhookPayload = {
        event: 'order.cancelled',
        orderId: '123',
        timestamp: new Date().toISOString(),
        restaurantId: 'rest-1',
        cancelReason: 'Customer request',
      };

      expect(adapter.isCancellation(payload)).toBe(true);
    });

    it('should return false for order.picked_up events', () => {
      const payload: DullyWebhookPayload = {
        event: 'order.picked_up',
        orderId: '123',
        timestamp: new Date().toISOString(),
        restaurantId: 'rest-1',
      };

      expect(adapter.isCancellation(payload)).toBe(false);
    });

    it('should return false for order.approved events', () => {
      const payload: DullyWebhookPayload = {
        event: 'order.approved',
        orderId: '123',
        timestamp: new Date().toISOString(),
        restaurantId: 'rest-1',
      };

      expect(adapter.isCancellation(payload)).toBe(false);
    });

    it('should return false for order.created events', () => {
      const payload: DullyWebhookPayload = {
        event: 'order.created',
        orderId: '123',
        timestamp: new Date().toISOString(),
        restaurantId: 'rest-1',
      };

      expect(adapter.isCancellation(payload)).toBe(false);
    });
  });

  describe('transformPayload', () => {
    it('should transform payload to OrderData', () => {
      const timestamp = '2024-01-15T12:00:00.000Z';
      const payload: DullyWebhookPayload = {
        event: 'order.picked_up',
        orderId: 'order-123',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        customerPhone: '+4512345678',
        totalAmount: 199.50,
        timestamp,
        restaurantId: 'rest-456',
      };

      const orderData = adapter.transformPayload(payload);

      expect(orderData.orderId).toBe('order-123');
      expect(orderData.customerName).toBe('John Doe');
      expect(orderData.customerEmail).toBe('john@example.com');
      expect(orderData.customerPhone).toBe('+4512345678');
      expect(orderData.orderTotal).toBe(199.50);
      expect(orderData.platform).toBe('dully');
      expect(orderData.metadata).toEqual({
        restaurantId: 'rest-456',
        event: 'order.picked_up',
      });
    });

    it('should handle minimal payload', () => {
      const timestamp = '2024-01-15T12:00:00.000Z';
      const payload: DullyWebhookPayload = {
        event: 'order.picked_up',
        orderId: 'order-123',
        timestamp,
        restaurantId: 'rest-456',
      };

      const orderData = adapter.transformPayload(payload);

      expect(orderData.orderId).toBe('order-123');
      expect(orderData.customerName).toBeUndefined();
      expect(orderData.customerEmail).toBeUndefined();
      expect(orderData.customerPhone).toBeUndefined();
      expect(orderData.orderTotal).toBeUndefined();
      expect(orderData.platform).toBe('dully');
    });
  });

  describe('connect', () => {
    it('should require webhookSecret', async () => {
      const newAdapter = new DullyAdapter();

      await expect(
        newAdapter.connect({
          platform: 'dully',
          enabled: true,
        })
      ).rejects.toThrow('Dully integration requires webhookSecret');
    });

    it('should connect with valid config', async () => {
      const newAdapter = new DullyAdapter();

      await expect(
        newAdapter.connect({
          platform: 'dully',
          enabled: true,
          webhookSecret: 'test-secret',
        })
      ).resolves.not.toThrow();
    });
  });

  describe('testConnection', () => {
    it('should return true when configured', async () => {
      const result = await adapter.testConnection();

      expect(result).toBe(true);
    });

    it('should return false without webhook secret', async () => {
      const newAdapter = new DullyAdapter();

      const result = await newAdapter.testConnection();

      expect(result).toBe(false);
    });
  });
});
