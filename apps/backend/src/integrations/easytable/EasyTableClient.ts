import type { EasyTableBooking } from '@easyrate/shared';

export interface EasyTableClientConfig {
  apiKey: string;
  baseUrl: string | undefined;
}

export interface EasyTablePaginatedResponse {
  bookings: EasyTableBooking[];
  hasMore: boolean;
  nextCursor: string | undefined;
}

export class EasyTableClient {
  private apiKey: string;
  private baseUrl: string;
  private maxRetries: number = 3;
  private retryDelayMs: number = 1000;

  constructor(config: EasyTableClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.easytable.dk/v1';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        if (response.status === 429) {
          // Rate limited - wait and retry
          const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
          console.log(`[EasyTableClient] Rate limited, waiting ${retryAfter}s`);
          await this.delay(retryAfter * 1000);
          continue;
        }

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`EasyTable API error: ${response.status} - ${errorBody}`);
        }

        return await response.json() as T;
      } catch (error) {
        lastError = error as Error;
        console.error(`[EasyTableClient] Request attempt ${attempt} failed:`, error);

        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelayMs * attempt);
        }
      }
    }

    throw lastError || new Error('Request failed after all retries');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getCompletedBookings(
    since: Date,
    cursor?: string
  ): Promise<EasyTablePaginatedResponse> {
    const params = new URLSearchParams({
      status: 'completed',
      since: since.toISOString(),
    });

    if (cursor) {
      params.set('cursor', cursor);
    }

    const response = await this.request<{
      data: EasyTableBooking[];
      pagination: { hasMore: boolean; nextCursor?: string };
    }>(`/bookings?${params.toString()}`);

    return {
      bookings: response.data,
      hasMore: response.pagination.hasMore,
      nextCursor: response.pagination.nextCursor,
    };
  }

  async getAllCompletedBookings(since: Date): Promise<EasyTableBooking[]> {
    const allBookings: EasyTableBooking[] = [];
    let cursor: string | undefined;

    do {
      const response = await this.getCompletedBookings(since, cursor);
      allBookings.push(...response.bookings);
      cursor = response.hasMore ? response.nextCursor : undefined;
    } while (cursor);

    return allBookings;
  }

  async getBooking(bookingId: string): Promise<EasyTableBooking> {
    return this.request<EasyTableBooking>(`/bookings/${bookingId}`);
  }

  async testConnection(): Promise<boolean> {
    try {
      // Try to fetch a small amount of bookings to verify credentials
      await this.request<unknown>('/bookings?limit=1');
      return true;
    } catch (error) {
      console.error('[EasyTableClient] Connection test failed:', error);
      return false;
    }
  }
}
