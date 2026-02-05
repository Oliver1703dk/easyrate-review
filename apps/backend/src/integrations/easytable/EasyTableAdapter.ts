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

    const placeToken = config.settings?.placeToken as string | undefined;
    if (!placeToken) {
      throw new Error('EasyTable integration requires placeToken (X-Place-Token)');
    }

    const baseUrl = config.settings?.baseUrl as string | undefined;
    this.client = new EasyTableClient({
      apiKey: config.apiKey,
      placeToken,
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

  /**
   * Transform EasyTable booking to OrderData
   * Maps API v2 fields to our internal format
   */
  transformBooking(booking: EasyTableBooking): OrderData {
    // Combine date and arrival time to create orderDate
    // API returns date as "YYYY-MM-DD" and arrival as "HH:MM"
    const bookingDateTime = new Date(`${booking.date}T${booking.arrival}:00`);

    // Calculate completion time based on booking duration
    const completedAt = new Date(bookingDateTime);
    completedAt.setMinutes(completedAt.getMinutes() + booking.duration);

    const orderData: OrderData = {
      orderId: booking.bookingID.toString(),
      orderDate: bookingDateTime,
      completedAt,
      platform: 'easytable',
      metadata: {
        partySize: booking.persons,
        children: booking.children,
        customerID: booking.customerID,
        externalID: booking.externalID,
        tables: booking.tables,
        tags: booking.tags,
        note: booking.note,
        guestNote: booking.guestNote,
      },
    };

    if (booking.name) {
      orderData.customerName = booking.name;
    }
    if (booking.email) {
      orderData.customerEmail = booking.email;
    }
    if (booking.mobile) {
      orderData.customerPhone = booking.mobile.toString();
    }

    return orderData;
  }

  /**
   * Check if a booking should be processed for review request
   * Only process bookings where the guest has arrived (completed visit)
   */
  shouldProcess(booking: EasyTableBooking): boolean {
    // Only process active bookings where guest has arrived
    return booking.status === '1' && booking.arrived === 1;
  }

  async fetchCompletedBookings(since: Date): Promise<OrderData[]> {
    this.validateConfig();

    if (!this.client) {
      throw new Error('EasyTable client not initialized');
    }

    try {
      const bookings = await this.client.getCompletedBookings(since);
      this.log(
        `Fetched ${String(bookings.length)} completed bookings since ${since.toISOString()}`
      );

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
