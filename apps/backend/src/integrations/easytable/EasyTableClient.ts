import type { EasyTableBooking } from '@easyrate/shared';

export interface EasyTableClientConfig {
  apiKey: string;
  placeToken: string;
  baseUrl?: string | undefined;
}

export interface EasyTableBookingsResponse {
  settings: {
    duration: number;
    serverTime: string;
  };
  bookings: EasyTableBooking[];
}

export class EasyTableClient {
  private apiKey: string;
  private placeToken: string;
  private baseUrl: string;
  private maxRetries = 3;
  private retryDelayMs = 1000;

  constructor(config: EasyTableClientConfig) {
    this.apiKey = config.apiKey;
    this.placeToken = config.placeToken;
    this.baseUrl = config.baseUrl ?? 'https://api.easytable.dk/v2';
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const headers: Record<string, string> = {
          'X-Api-Key': this.apiKey,
          'X-Place-Token': this.placeToken,
          'Content-Type': 'application/json',
        };
        // Merge custom headers if provided
        if (options.headers) {
          const customHeaders = options.headers as Record<string, string>;
          Object.assign(headers, customHeaders);
        }
        const response = await fetch(url, {
          ...options,
          headers,
        });

        if (response.status === 429) {
          // Rate limited - wait and retry (API allows 3 req/s)
          const retryAfter = parseInt(response.headers.get('Retry-After') ?? '2', 10);
          console.log(`[EasyTableClient] Rate limited, waiting ${String(retryAfter)}s`);
          await this.delay(retryAfter * 1000);
          continue;
        }

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`EasyTable API error: ${String(response.status)} - ${errorBody}`);
        }

        return (await response.json()) as T;
      } catch (error) {
        lastError = error as Error;
        console.error(`[EasyTableClient] Request attempt ${String(attempt)} failed:`, error);

        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelayMs * attempt);
        }
      }
    }

    throw lastError ?? new Error('Request failed after all retries');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Format date as YYYY/MM/DD for EasyTable API
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${String(year)}/${month}/${day}`;
  }

  /**
   * Get bookings for a specific date
   * @param date The date to fetch bookings for (defaults to today)
   */
  async getBookings(date?: Date): Promise<EasyTableBooking[]> {
    const params = new URLSearchParams();

    if (date) {
      params.set('date', this.formatDate(date));
    }

    const response = await this.request<EasyTableBookingsResponse>(
      `/bookings?${params.toString()}`
    );

    return response.bookings;
  }

  /**
   * Get bookings modified since a specific timestamp
   * @param modifiedSince Server timestamp to fetch modifications after
   */
  async getBookingsModifiedSince(modifiedSince: Date): Promise<EasyTableBooking[]> {
    const params = new URLSearchParams({
      modifiedSince: modifiedSince.toISOString(),
    });

    const response = await this.request<EasyTableBookingsResponse>(
      `/bookings?${params.toString()}`
    );

    return response.bookings;
  }

  /**
   * Get a single booking by ID
   */
  async getBookingById(bookingId: number): Promise<EasyTableBooking | null> {
    const params = new URLSearchParams({
      bookingID: bookingId.toString(),
    });

    const response = await this.request<EasyTableBookingsResponse>(
      `/bookings?${params.toString()}`
    );

    return response.bookings[0] ?? null;
  }

  /**
   * Get completed bookings (arrived guests) for a date range
   * Fetches bookings where arrived=1 (guest has arrived and visit is complete)
   */
  async getCompletedBookings(since: Date): Promise<EasyTableBooking[]> {
    const allBookings: EasyTableBooking[] = [];
    const today = new Date();
    const currentDate = new Date(since);

    // Iterate through each day from 'since' to today
    while (currentDate <= today) {
      const bookings = await this.getBookings(currentDate);

      // Filter for arrived bookings (completed visits)
      const completedBookings = bookings.filter(
        (booking) => booking.arrived === 1 && booking.status === '1'
      );

      allBookings.push(...completedBookings);

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);

      // Small delay to respect rate limits (3 req/s)
      await this.delay(400);
    }

    return allBookings;
  }

  /**
   * Test the connection by fetching today's bookings
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getBookings(new Date());
      return true;
    } catch (error) {
      console.error('[EasyTableClient] Connection test failed:', error);
      return false;
    }
  }
}
