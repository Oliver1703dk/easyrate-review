import { Business, BusinessDocument } from '../models/Business.js';
import { googleReviewsSyncService } from '../services/GoogleReviewsSyncService.js';
import { reviewAttributionService } from '../services/ReviewAttributionService.js';
import { isGoogleConfigured } from '../providers/index.js';

interface ProcessorConfig {
  intervalMs: number;
  batchSize: number;
}

const DEFAULT_CONFIG: ProcessorConfig = {
  intervalMs: 30 * 60 * 1000, // 30 minutes (check interval, not sync interval)
  batchSize: 10,
};

// Google API rate limit: ~2000 requests/day
// We'll track requests to stay under limit
const DAILY_REQUEST_LIMIT = 1800; // Leave some buffer

/**
 * GoogleReviewsProcessor - Scheduled job for syncing Google reviews
 *
 * Checks every 30 minutes for businesses that need review sync
 * (based on their configured syncIntervalHours).
 * Also runs auto-attribution after syncing.
 */
class GoogleReviewsProcessor {
  private config: ProcessorConfig;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private isProcessing = false;
  private dailyRequestCount = 0;
  private lastRequestCountReset: Date = new Date();

  constructor(config: Partial<ProcessorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  start(): void {
    if (this.isRunning) {
      console.log('[GoogleReviewsProcessor] Already running');
      return;
    }

    this.isRunning = true;
    console.log(`[GoogleReviewsProcessor] Starting with ${this.config.intervalMs}ms interval`);

    // Check if Google provider is configured
    if (!isGoogleConfigured()) {
      console.warn('[GoogleReviewsProcessor] Google OAuth not configured. Sync disabled.');
      return;
    }

    console.log('[GoogleReviewsProcessor] Google OAuth configured, sync enabled');

    // Run first check after 5 minutes (give server time to start)
    setTimeout(() => {
      this.checkAndProcessReviews().catch((error) => {
        console.error('[GoogleReviewsProcessor] Initial check error:', error);
      });
    }, 5 * 60 * 1000);

    // Set up interval for subsequent checks
    this.intervalId = setInterval(() => {
      this.checkAndProcessReviews().catch((error) => {
        console.error('[GoogleReviewsProcessor] Check error:', error);
      });
    }, this.config.intervalMs);
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('[GoogleReviewsProcessor] Stopping');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
  }

  async checkAndProcessReviews(): Promise<void> {
    if (this.isProcessing) {
      console.log('[GoogleReviewsProcessor] Already processing, skipping');
      return;
    }

    if (!isGoogleConfigured()) {
      return;
    }

    // Reset daily count at midnight UTC
    this.resetDailyCountIfNeeded();

    // Check if we're approaching rate limit
    if (this.dailyRequestCount >= DAILY_REQUEST_LIMIT) {
      console.warn(
        '[GoogleReviewsProcessor] Daily request limit reached, skipping until tomorrow'
      );
      return;
    }

    this.isProcessing = true;

    try {
      // Find businesses that need sync
      const businessesToSync = await this.findBusinessesNeedingSync();

      if (businessesToSync.length === 0) {
        return;
      }

      console.log(
        `[GoogleReviewsProcessor] Found ${businessesToSync.length} businesses needing sync`
      );

      // Process each business (up to batch size)
      const batch = businessesToSync.slice(0, this.config.batchSize);
      for (const business of batch) {
        // Check rate limit before each sync
        if (this.dailyRequestCount >= DAILY_REQUEST_LIMIT) {
          console.warn('[GoogleReviewsProcessor] Rate limit reached mid-batch, stopping');
          break;
        }

        await this.processBusiness(business);
      }

      console.log(
        `[GoogleReviewsProcessor] Completed processing ${batch.length} businesses`
      );
    } finally {
      this.isProcessing = false;
    }
  }

  private async findBusinessesNeedingSync(): Promise<BusinessDocument[]> {
    // Find all businesses with Google sync enabled
    const businesses = await Business.find({
      'settings.googleBusiness.enabled': true,
      'settings.googleBusiness.syncEnabled': true,
      'settings.googleBusiness.locationIds.0': { $exists: true }, // Has at least one location
    });

    // Filter to only those that need sync based on their interval
    const needsSync = businesses.filter((business) =>
      googleReviewsSyncService.shouldSync(business)
    );

    // Sort by last sync time (oldest first)
    needsSync.sort((a, b) => {
      const aTime = a.settings?.googleBusiness?.lastSyncAt?.getTime() || 0;
      const bTime = b.settings?.googleBusiness?.lastSyncAt?.getTime() || 0;
      return aTime - bTime;
    });

    return needsSync;
  }

  private async processBusiness(business: BusinessDocument): Promise<void> {
    const businessId = business._id.toString();

    try {
      console.log(`[GoogleReviewsProcessor] Syncing reviews for business ${businessId}`);

      // Estimate requests: 1 per location for reviews
      const locationCount = business.settings?.googleBusiness?.locationIds?.length || 0;
      this.dailyRequestCount += locationCount + 1; // +1 for token refresh

      // Sync reviews
      const result = await googleReviewsSyncService.syncBusinessReviews(businessId);

      console.log(
        `[GoogleReviewsProcessor] Synced business ${businessId}: ` +
          `${result.newReviews} new, ${result.updatedReviews} updated, ` +
          `${result.errors.length} errors`
      );

      // Run auto-attribution if enabled
      if (
        business.settings?.googleBusiness?.attributionEnabled &&
        result.newReviews > 0
      ) {
        try {
          const linked = await reviewAttributionService.autoAttributeNewReviews(businessId);
          if (linked > 0) {
            console.log(
              `[GoogleReviewsProcessor] Auto-attributed ${linked} reviews for business ${businessId}`
            );
          }
        } catch (attrError) {
          console.error(
            `[GoogleReviewsProcessor] Attribution error for ${businessId}:`,
            attrError
          );
        }
      }
    } catch (error) {
      console.error(
        `[GoogleReviewsProcessor] Failed to process business ${businessId}:`,
        error
      );
      // Continue with other businesses even if one fails
    }
  }

  private resetDailyCountIfNeeded(): void {
    const now = new Date();
    const lastReset = this.lastRequestCountReset;

    // Reset at midnight UTC
    if (
      now.getUTCDate() !== lastReset.getUTCDate() ||
      now.getUTCMonth() !== lastReset.getUTCMonth() ||
      now.getUTCFullYear() !== lastReset.getUTCFullYear()
    ) {
      console.log('[GoogleReviewsProcessor] Resetting daily request count');
      this.dailyRequestCount = 0;
      this.lastRequestCountReset = now;
    }
  }

  getStatus(): {
    isRunning: boolean;
    isProcessing: boolean;
    dailyRequestCount: number;
    dailyLimit: number;
  } {
    return {
      isRunning: this.isRunning,
      isProcessing: this.isProcessing,
      dailyRequestCount: this.dailyRequestCount,
      dailyLimit: DAILY_REQUEST_LIMIT,
    };
  }
}

export const googleReviewsProcessor = new GoogleReviewsProcessor();

export function startGoogleReviewsProcessor(): void {
  googleReviewsProcessor.start();
}

export function stopGoogleReviewsProcessor(): void {
  googleReviewsProcessor.stop();
}
