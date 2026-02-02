import { insightsService } from '../services/InsightsService.js';
import { isAIConfigured } from '../providers/index.js';

interface ProcessorConfig {
  intervalMs: number;
  batchSize: number;
}

const DEFAULT_CONFIG: ProcessorConfig = {
  intervalMs: 60 * 60 * 1000, // 1 hour
  batchSize: 10,
};

/**
 * InsightsProcessor - Scheduled job for auto-refreshing AI insights
 *
 * Checks hourly for businesses that need insight refresh (7+ days old)
 * and processes them in batches.
 */
class InsightsProcessor {
  private config: ProcessorConfig;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private isProcessing = false;

  constructor(config: Partial<ProcessorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  start(): void {
    if (this.isRunning) {
      console.log('[InsightsProcessor] Already running');
      return;
    }

    this.isRunning = true;
    console.log(`[InsightsProcessor] Starting with ${this.config.intervalMs}ms interval`);

    // Check if AI provider is configured
    if (!isAIConfigured()) {
      console.warn('[InsightsProcessor] No AI provider configured. Auto-refresh disabled.');
      return;
    }

    console.log('[InsightsProcessor] AI provider configured, auto-refresh enabled');

    // Run first check after 5 minutes (give server time to start)
    setTimeout(() => {
      this.checkAndProcessInsights().catch((error) => {
        console.error('[InsightsProcessor] Initial check error:', error);
      });
    }, 5 * 60 * 1000);

    // Set up interval for subsequent checks
    this.intervalId = setInterval(() => {
      this.checkAndProcessInsights().catch((error) => {
        console.error('[InsightsProcessor] Check error:', error);
      });
    }, this.config.intervalMs);
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('[InsightsProcessor] Stopping');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
  }

  async checkAndProcessInsights(): Promise<void> {
    if (this.isProcessing) {
      console.log('[InsightsProcessor] Already processing, skipping');
      return;
    }

    if (!isAIConfigured()) {
      return;
    }

    this.isProcessing = true;

    try {
      // Find businesses that need insight refresh
      const businessIds = await insightsService.getBusinessesNeedingRefresh(this.config.batchSize);

      if (businessIds.length === 0) {
        return;
      }

      console.log(`[InsightsProcessor] Found ${businessIds.length} businesses needing refresh`);

      // Process each business
      for (const businessId of businessIds) {
        await this.processBusinessInsight(businessId);
      }

      console.log(`[InsightsProcessor] Completed processing ${businessIds.length} businesses`);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processBusinessInsight(businessId: string): Promise<void> {
    try {
      console.log(`[InsightsProcessor] Processing insights for business ${businessId}`);

      const insight = await insightsService.createAndProcess(businessId, 'scheduled');

      console.log(
        `[InsightsProcessor] Completed insight ${insight.id} for business ${businessId} ` +
        `(${insight.reviewCount} reviews, ${insight.themes.length} themes)`
      );
    } catch (error) {
      console.error(`[InsightsProcessor] Failed to process business ${businessId}:`, error);
      // Continue with other businesses even if one fails
    }
  }

  getStatus(): { isRunning: boolean; isProcessing: boolean } {
    return {
      isRunning: this.isRunning,
      isProcessing: this.isProcessing,
    };
  }
}

export const insightsProcessor = new InsightsProcessor();

export function startInsightsProcessor(): void {
  insightsProcessor.start();
}

export function stopInsightsProcessor(): void {
  insightsProcessor.stop();
}
