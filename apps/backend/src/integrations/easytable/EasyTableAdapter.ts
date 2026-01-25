import type { IntegrationConfig, EasyTableBooking, OrderData } from '@easyrate/shared';
import { BaseAdapter } from '../BaseAdapter.js';
import { EasyTableClient } from './EasyTableClient.js';

export class EasyTableAdapter extends BaseAdapter {
  readonly name = 'easytable';

  private client: EasyTableClient | null = null;

  async connect(config: IntegrationConfig): Promise<void> {
    if (!config.apiKey) {
      throw new Error('EasyTable integration requires apiKey');
    }

    const baseUrl = config.settings?.baseUrl as string | undefined;
    this.client = new EasyTableClient({
      apiKey: config.apiKey,
      baseUrl,
    });

    await super.connect(config);
    this.log('API client initialized');
  }

  async disconnect(): Promise<void> {
    this.client = null;
    await super.disconnect();
  }

  async testConnection(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      return await this.client.testConnection();
    } catch (error) {
      this.logError('Connection test failed', error);
      return false;
    }
  }

  getClient(): EasyTableClient {
    if (!this.client) {
      throw new Error('EasyTable client not initialized. Call connect() first.');
    }
    return this.client;
  }

  transformBooking(booking: EasyTableBooking): OrderData {
    // Combine date and time to create orderDate
    const bookingDateTime = new Date(`${booking.bookingDate}T${booking.bookingTime}`);

    const orderData: OrderData = {
      orderId: booking.bookingId,
      customerName: booking.guestName,
      orderDate: bookingDateTime,
      completedAt: booking.completedAt ? new Date(booking.completedAt) : new Date(),
      platform: 'easytable',
      metadata: {
        partySize: booking.partySize,
        restaurantId: booking.restaurantId,
        bookingStatus: booking.status,
      },
    };

    if (booking.guestEmail) orderData.customerEmail = booking.guestEmail;
    if (booking.guestPhone) orderData.customerPhone = booking.guestPhone;

    return orderData;
  }

  shouldProcess(booking: EasyTableBooking): boolean {
    // Only process completed bookings
    return booking.status === 'completed';
  }

  async fetchCompletedBookings(since: Date): Promise<OrderData[]> {
    this.validateConfig();

    if (!this.client) {
      throw new Error('EasyTable client not initialized');
    }

    try {
      const bookings = await this.client.getAllCompletedBookings(since);
      this.log(`Fetched ${bookings.length} completed bookings since ${since.toISOString()}`);

      const orderDataList: OrderData[] = [];

      for (const booking of bookings) {
        if (this.shouldProcess(booking)) {
          const orderData = this.transformBooking(booking);
          orderDataList.push(orderData);
          await this.notifyHandlers(orderData);
        }
      }

      return orderDataList;
    } catch (error) {
      this.logError('Failed to fetch completed bookings', error);
      throw error;
    }
  }
}

export const easyTableAdapter = new EasyTableAdapter();
