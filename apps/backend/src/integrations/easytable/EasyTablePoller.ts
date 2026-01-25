import type { OrderData } from '@easyrate/shared';
import { Business, type BusinessDocument } from '../../models/Business.js';
import { EasyTableAdapter } from './EasyTableAdapter.js';

export interface PollerConfig {
  intervalMs: number;
}

interface BusinessPollState {
  businessId: string;
  adapter: EasyTableAdapter;
  lastPollAt: Date;
}

export class EasyTablePoller {
  private intervalMs: number;
  private pollStates: Map<string, BusinessPollState> = new Map();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;
  private orderHandler: ((businessId: string, order: OrderData) => Promise<void>) | null = null;

  constructor(config: PollerConfig = { intervalMs: 5 * 60 * 1000 }) {
    this.intervalMs = config.intervalMs;
  }

  setOrderHandler(handler: (businessId: string, order: OrderData) => Promise<void>): void {
    this.orderHandler = handler;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[EasyTablePoller] Already running');
      return;
    }

    this.isRunning = true;
    console.log(`[EasyTablePoller] Starting with ${this.intervalMs}ms interval`);

    // Initialize adapters for all enabled businesses
    await this.initializeAdapters();

    // Run first poll immediately
    await this.poll();

    // Set up interval for subsequent polls
    this.intervalId = setInterval(() => {
      this.poll().catch((error) => {
        console.error('[EasyTablePoller] Poll error:', error);
      });
    }, this.intervalMs);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('[EasyTablePoller] Stopping');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Disconnect all adapters
    for (const state of this.pollStates.values()) {
      try {
        await state.adapter.disconnect();
      } catch (error) {
        console.error(`[EasyTablePoller] Error disconnecting adapter for ${state.businessId}:`, error);
      }
    }

    this.pollStates.clear();
    this.isRunning = false;
  }

  private async initializeAdapters(): Promise<void> {
    console.log('[EasyTablePoller] Initializing adapters for enabled businesses');

    try {
      // Find all businesses with EasyTable enabled
      const businesses = await Business.find({
        'integrations.platform': 'easytable',
        'integrations.enabled': true,
      }) as BusinessDocument[];

      for (const business of businesses) {
        const integration = business.integrations.find(
          (i) => i.platform === 'easytable' && i.enabled
        );

        if (integration?.apiKey) {
          await this.addBusiness(business._id.toString(), integration.apiKey);
        }
      }

      console.log(`[EasyTablePoller] Initialized ${this.pollStates.size} business adapters`);
    } catch (error) {
      console.error('[EasyTablePoller] Failed to initialize adapters:', error);
    }
  }

  async addBusiness(businessId: string, apiKey: string): Promise<void> {
    if (this.pollStates.has(businessId)) {
      console.log(`[EasyTablePoller] Business ${businessId} already registered, updating`);
      await this.removeBusiness(businessId);
    }

    const adapter = new EasyTableAdapter();
    await adapter.connect({
      platform: 'easytable',
      apiKey,
      enabled: true,
    });

    if (this.orderHandler) {
      adapter.onOrderComplete(async (order) => {
        await this.orderHandler!(businessId, order);
      });
    }

    this.pollStates.set(businessId, {
      businessId,
      adapter,
      // Start polling from 1 day ago to catch any missed bookings
      lastPollAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });

    console.log(`[EasyTablePoller] Added business ${businessId}`);
  }

  async removeBusiness(businessId: string): Promise<void> {
    const state = this.pollStates.get(businessId);
    if (state) {
      try {
        await state.adapter.disconnect();
      } catch (error) {
        console.error(`[EasyTablePoller] Error disconnecting adapter for ${businessId}:`, error);
      }
      this.pollStates.delete(businessId);
      console.log(`[EasyTablePoller] Removed business ${businessId}`);
    }
  }

  async refreshBusinessConfig(businessId: string): Promise<void> {
    try {
      const business = await Business.findById(businessId) as BusinessDocument | null;
      if (!business) {
        await this.removeBusiness(businessId);
        return;
      }

      const integration = business.integrations.find(
        (i) => i.platform === 'easytable'
      );

      if (integration?.enabled && integration.apiKey) {
        await this.addBusiness(businessId, integration.apiKey);
      } else {
        await this.removeBusiness(businessId);
      }
    } catch (error) {
      console.error(`[EasyTablePoller] Error refreshing config for ${businessId}:`, error);
    }
  }

  private async poll(): Promise<void> {
    if (this.pollStates.size === 0) {
      return;
    }

    console.log(`[EasyTablePoller] Polling ${this.pollStates.size} businesses`);

    for (const state of this.pollStates.values()) {
      try {
        await this.pollBusiness(state);
      } catch (error) {
        console.error(`[EasyTablePoller] Error polling business ${state.businessId}:`, error);
      }
    }
  }

  private async pollBusiness(state: BusinessPollState): Promise<void> {
    const { businessId, adapter, lastPollAt } = state;

    try {
      const orders = await adapter.fetchCompletedBookings(lastPollAt);
      console.log(`[EasyTablePoller] Business ${businessId}: fetched ${orders.length} new orders`);

      // Update last poll time
      state.lastPollAt = new Date();
    } catch (error) {
      console.error(`[EasyTablePoller] Failed to poll business ${businessId}:`, error);

      // Check if it's an auth error and the integration might need to be disabled
      if (error instanceof Error && error.message.includes('401')) {
        console.warn(`[EasyTablePoller] Auth error for business ${businessId}, credentials may be invalid`);
      }
    }
  }

  getStatus(): {
    isRunning: boolean;
    businessCount: number;
    businesses: Array<{ businessId: string; lastPollAt: Date }>;
  } {
    return {
      isRunning: this.isRunning,
      businessCount: this.pollStates.size,
      businesses: Array.from(this.pollStates.values()).map((state) => ({
        businessId: state.businessId,
        lastPollAt: state.lastPollAt,
      })),
    };
  }
}

export const easyTablePoller = new EasyTablePoller();
