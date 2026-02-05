import { describe, it, expect, beforeEach } from 'vitest';
import { EasyTableAdapter } from '../../../src/integrations/easytable/EasyTableAdapter.js';
import { easyTableBookingSchema } from '@easyrate/shared';
import type { EasyTableBooking } from '@easyrate/shared';

describe('EasyTableAdapter', () => {
  let adapter: EasyTableAdapter;

  beforeEach(() => {
    adapter = new EasyTableAdapter();
  });

  describe('transformBooking', () => {
    it('should transform booking to OrderData', () => {
      const booking: EasyTableBooking = {
        bookingID: 12345,
        date: '2024-01-15',
        arrival: '19:00',
        duration: 120,
        persons: 4,
        status: '1',
        arrived: 1,
        expired: 0,
        name: 'Anders Jensen',
        email: 'anders@example.com',
        mobile: 4512345678,
      };

      const orderData = adapter.transformBooking(booking);

      expect(orderData.orderId).toBe('12345');
      expect(orderData.customerName).toBe('Anders Jensen');
      expect(orderData.customerEmail).toBe('anders@example.com');
      expect(orderData.customerPhone).toBe('4512345678');
      expect(orderData.platform).toBe('easytable');
      expect(orderData.orderDate).toEqual(new Date('2024-01-15T19:00:00'));
      expect(orderData.metadata?.partySize).toBe(4);
    });

    it('should calculate completedAt based on duration', () => {
      const booking: EasyTableBooking = {
        bookingID: 12345,
        date: '2024-01-15',
        arrival: '19:00',
        duration: 90, // 90 minutes
        persons: 2,
        status: '1',
        arrived: 1,
        expired: 0,
      };

      const orderData = adapter.transformBooking(booking);

      // Arrival at 19:00, duration 90 min, should complete at 20:30
      expect(orderData.completedAt).toEqual(new Date('2024-01-15T20:30:00'));
    });

    it('should handle minimal booking data', () => {
      const booking: EasyTableBooking = {
        bookingID: 99999,
        date: '2024-02-01',
        arrival: '12:00',
        duration: 60,
        persons: 1,
        status: '1',
        arrived: 1,
        expired: 0,
      };

      const orderData = adapter.transformBooking(booking);

      expect(orderData.orderId).toBe('99999');
      expect(orderData.customerName).toBeUndefined();
      expect(orderData.customerEmail).toBeUndefined();
      expect(orderData.customerPhone).toBeUndefined();
      expect(orderData.platform).toBe('easytable');
    });

    it('should include metadata with booking details', () => {
      const booking: EasyTableBooking = {
        bookingID: 12345,
        externalID: 'ext-123',
        date: '2024-01-15',
        arrival: '19:00',
        duration: 120,
        persons: 4,
        children: 2,
        status: '1',
        arrived: 1,
        expired: 0,
        customerID: 5678,
        tables: [{ tableID: 1, tableName: 'Table 1' }],
        tags: [{ tagID: 1, tagName: 'VIP' }],
        note: 'Birthday party',
        guestNote: 'Allergic to nuts',
      };

      const orderData = adapter.transformBooking(booking);

      expect(orderData.metadata).toBeDefined();
      expect(orderData.metadata?.partySize).toBe(4);
      expect(orderData.metadata?.children).toBe(2);
      expect(orderData.metadata?.customerID).toBe(5678);
      expect(orderData.metadata?.externalID).toBe('ext-123');
      expect(orderData.metadata?.tables).toEqual([{ tableID: 1, tableName: 'Table 1' }]);
      expect(orderData.metadata?.tags).toEqual([{ tagID: 1, tagName: 'VIP' }]);
      expect(orderData.metadata?.note).toBe('Birthday party');
      expect(orderData.metadata?.guestNote).toBe('Allergic to nuts');
    });
  });

  describe('shouldProcess', () => {
    it('should process active booking where guest has arrived', () => {
      const booking: EasyTableBooking = {
        bookingID: 12345,
        date: '2024-01-15',
        arrival: '19:00',
        duration: 120,
        persons: 4,
        status: '1', // Active
        arrived: 1, // Arrived
        expired: 0,
      };

      expect(adapter.shouldProcess(booking)).toBe(true);
    });

    it('should not process booking where guest has not arrived', () => {
      const booking: EasyTableBooking = {
        bookingID: 12345,
        date: '2024-01-15',
        arrival: '19:00',
        duration: 120,
        persons: 4,
        status: '1', // Active
        arrived: 0, // Not arrived
        expired: 0,
      };

      expect(adapter.shouldProcess(booking)).toBe(false);
    });

    it('should not process cancelled booking', () => {
      const booking: EasyTableBooking = {
        bookingID: 12345,
        date: '2024-01-15',
        arrival: '19:00',
        duration: 120,
        persons: 4,
        status: '2', // Cancelled
        arrived: 1,
        expired: 0,
      };

      expect(adapter.shouldProcess(booking)).toBe(false);
    });

    it('should not process no-show booking', () => {
      const booking: EasyTableBooking = {
        bookingID: 12345,
        date: '2024-01-15',
        arrival: '19:00',
        duration: 120,
        persons: 4,
        status: '3', // No-show
        arrived: 0,
        expired: 1,
      };

      expect(adapter.shouldProcess(booking)).toBe(false);
    });
  });

  describe('connect', () => {
    it('should require apiKey', async () => {
      await expect(
        adapter.connect({
          platform: 'easytable',
          enabled: true,
          settings: { placeToken: 'test-token' },
        })
      ).rejects.toThrow('EasyTable integration requires apiKey');
    });

    it('should require placeToken', async () => {
      await expect(
        adapter.connect({
          platform: 'easytable',
          apiKey: 'test-api-key',
          enabled: true,
        })
      ).rejects.toThrow('EasyTable integration requires placeToken');
    });

    it('should connect with valid config', async () => {
      await expect(
        adapter.connect({
          platform: 'easytable',
          apiKey: 'test-api-key',
          enabled: true,
          settings: { placeToken: 'test-place-token' },
        })
      ).resolves.not.toThrow();
    });
  });
});

describe('easyTableBookingSchema', () => {
  it('should validate a complete booking from API', () => {
    const apiResponse = {
      bookingID: 12345,
      externalID: 'ext-123',
      date: '2024-01-15',
      arrival: '19:00',
      duration: 120,
      persons: 4,
      children: 2,
      status: '1',
      arrived: 1,
      expired: 0,
      customerID: 5678,
      customerExternalID: 'cust-ext-123',
      name: 'Anders Jensen',
      email: 'anders@example.com',
      mobile: 4512345678,
      company: 'Test Company',
      note: 'Birthday party',
      guestNote: 'Allergic to nuts',
      tables: [
        { tableID: 1, externalID: 'table-ext-1', tableName: 'Table 1' },
        { tableID: 2, tableName: 'Table 2' },
      ],
      tags: [
        { tagID: 1, tagName: 'VIP' },
        { tagID: 2, tagName: 'Regular' },
      ],
    };

    const result = easyTableBookingSchema.safeParse(apiResponse);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bookingID).toBe(12345);
      expect(result.data.name).toBe('Anders Jensen');
      expect(result.data.status).toBe('1');
      expect(result.data.arrived).toBe(1);
    }
  });

  it('should validate minimal booking', () => {
    const minimalBooking = {
      bookingID: 1,
      date: '2024-01-15',
      arrival: '12:00',
      duration: 60,
      persons: 1,
      status: '1',
      arrived: 0,
      expired: 0,
    };

    const result = easyTableBookingSchema.safeParse(minimalBooking);

    expect(result.success).toBe(true);
  });

  it('should reject invalid status', () => {
    const invalidBooking = {
      bookingID: 1,
      date: '2024-01-15',
      arrival: '12:00',
      duration: 60,
      persons: 1,
      status: 'active', // Invalid - should be '1', '2', or '3'
      arrived: 0,
      expired: 0,
    };

    const result = easyTableBookingSchema.safeParse(invalidBooking);

    expect(result.success).toBe(false);
  });

  it('should reject invalid arrived value', () => {
    const invalidBooking = {
      bookingID: 1,
      date: '2024-01-15',
      arrival: '12:00',
      duration: 60,
      persons: 1,
      status: '1',
      arrived: 2, // Invalid - should be 0 or 1
      expired: 0,
    };

    const result = easyTableBookingSchema.safeParse(invalidBooking);

    expect(result.success).toBe(false);
  });

  it('should reject missing required fields', () => {
    const incompleteBooking = {
      bookingID: 1,
      date: '2024-01-15',
      // Missing: arrival, duration, persons, status, arrived, expired
    };

    const result = easyTableBookingSchema.safeParse(incompleteBooking);

    expect(result.success).toBe(false);
  });

  it('should validate cancelled booking status', () => {
    const cancelledBooking = {
      bookingID: 1,
      date: '2024-01-15',
      arrival: '12:00',
      duration: 60,
      persons: 1,
      status: '2', // Cancelled
      arrived: 0,
      expired: 0,
    };

    const result = easyTableBookingSchema.safeParse(cancelledBooking);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('2');
    }
  });

  it('should validate no-show booking status', () => {
    const noShowBooking = {
      bookingID: 1,
      date: '2024-01-15',
      arrival: '12:00',
      duration: 60,
      persons: 1,
      status: '3', // No-show
      arrived: 0,
      expired: 1,
    };

    const result = easyTableBookingSchema.safeParse(noShowBooking);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('3');
    }
  });
});
