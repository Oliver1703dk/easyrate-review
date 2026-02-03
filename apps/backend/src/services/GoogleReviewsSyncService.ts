import mongoose from 'mongoose';
import type { GoogleSyncStatus } from '@easyrate/shared';
import { Business, BusinessDocument } from '../models/Business.js';
import { ExternalReview } from '../models/ExternalReview.js';
import { googleAuthService } from './GoogleAuthService.js';
import { googleBusinessProvider, type GoogleReview } from '../providers/google/GoogleBusinessProvider.js';
import { NotFoundError } from '../utils/errors.js';

export interface SyncResult {
  success: boolean;
  newReviews: number;
  updatedReviews: number;
  errors: string[];
}

export interface SyncStatus {
  lastSyncAt?: Date;
  lastSyncStatus?: GoogleSyncStatus;
  isRunning: boolean;
  nextSyncAt?: Date;
}

export class GoogleReviewsSyncService {
  private runningSyncs: Set<string> = new Set();

  private log(message: string, data?: Record<string, unknown>): void {
    const prefix = '[GOOGLE_SYNC]';
    if (data) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  }

  private logError(message: string, error: unknown): void {
    const prefix = '[GOOGLE_SYNC]';
    console.error(prefix, message, error);
  }

  /**
   * Sync reviews for a single business
   */
  async syncBusinessReviews(businessId: string): Promise<SyncResult> {
    // Prevent concurrent syncs for the same business
    if (this.runningSyncs.has(businessId)) {
      return {
        success: false,
        newReviews: 0,
        updatedReviews: 0,
        errors: ['Synkronisering kører allerede'],
      };
    }

    this.runningSyncs.add(businessId);
    const result: SyncResult = {
      success: true,
      newReviews: 0,
      updatedReviews: 0,
      errors: [],
    };

    try {
      const business = await Business.findById(businessId);
      if (!business) {
        throw new NotFoundError('Virksomhed ikke fundet');
      }

      const googleSettings = business.settings?.googleBusiness;
      if (!googleSettings?.enabled || !googleSettings.syncEnabled) {
        result.success = false;
        result.errors.push('Google synkronisering er ikke aktiveret');
        return result;
      }

      const locationIds = googleSettings.locationIds || [];
      if (locationIds.length === 0) {
        result.success = false;
        result.errors.push('Ingen Google lokationer er valgt');
        return result;
      }

      // Get valid access token
      let accessToken: string;
      try {
        accessToken = await googleAuthService.getValidToken(businessId);
      } catch (error) {
        result.success = false;
        result.errors.push('Kunne ikke hente Google adgangstoken');
        await this.updateSyncStatus(business, 'error');
        return result;
      }

      // Sync reviews for each location
      for (const locationId of locationIds) {
        try {
          const locationResult = await this.syncLocationReviews(
            businessId,
            locationId,
            accessToken
          );
          result.newReviews += locationResult.newReviews;
          result.updatedReviews += locationResult.updatedReviews;
          if (locationResult.errors.length > 0) {
            result.errors.push(...locationResult.errors);
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : 'Ukendt fejl';
          result.errors.push(`Fejl ved lokation ${locationId}: ${errorMsg}`);
          this.logError(`Error syncing location ${locationId}`, error);
        }
      }

      // Update sync status
      await this.updateSyncStatus(
        business,
        result.errors.length === 0 ? 'success' : 'error'
      );

      this.log('Sync completed', {
        businessId,
        newReviews: result.newReviews,
        updatedReviews: result.updatedReviews,
        errors: result.errors.length,
      });

      return result;
    } catch (error) {
      this.logError('Sync failed', error);
      result.success = false;
      result.errors.push(
        error instanceof Error ? error.message : 'Synkronisering fejlede'
      );
      return result;
    } finally {
      this.runningSyncs.delete(businessId);
    }
  }

  /**
   * Sync reviews for a specific location
   */
  private async syncLocationReviews(
    businessId: string,
    locationId: string,
    accessToken: string
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      newReviews: 0,
      updatedReviews: 0,
      errors: [],
    };

    try {
      // Fetch all reviews from Google
      const googleReviews = await googleBusinessProvider.getAllReviews(
        accessToken,
        locationId
      );

      this.log(`Fetched ${googleReviews.length} reviews from Google`, {
        locationId,
      });

      // Process each review
      for (const googleReview of googleReviews) {
        try {
          const isNew = await this.upsertReview(
            businessId,
            locationId,
            googleReview
          );
          if (isNew) {
            result.newReviews++;
          } else {
            result.updatedReviews++;
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : 'Ukendt fejl';
          result.errors.push(`Review ${googleReview.externalId}: ${errorMsg}`);
        }
      }

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(
        error instanceof Error ? error.message : 'Kunne ikke hente anmeldelser'
      );
      return result;
    }
  }

  /**
   * Insert or update a review
   */
  private async upsertReview(
    businessId: string,
    locationId: string,
    googleReview: GoogleReview
  ): Promise<boolean> {
    const businessObjectId = new mongoose.Types.ObjectId(businessId);

    const existingReview = await ExternalReview.findOne({
      businessId: businessObjectId,
      sourcePlatform: 'google',
      externalId: googleReview.externalId,
    });

    const reviewData = {
      businessId: businessObjectId,
      sourcePlatform: 'google' as const,
      externalId: googleReview.externalId,
      rating: googleReview.rating,
      reviewText: googleReview.reviewText,
      reviewerName: googleReview.reviewerName,
      reviewerPhotoUrl: googleReview.reviewerPhotoUrl,
      reviewedAt: googleReview.reviewedAt,
      lastSyncedAt: new Date(),
      locationId,
      reply: googleReview.reply
        ? {
            text: googleReview.reply.text,
            repliedAt: googleReview.reply.repliedAt,
            repliedBy: 'google' as const,
          }
        : undefined,
      metadata: {
        resourceName: googleReview.resourceName,
      },
    };

    if (existingReview) {
      // Update existing review
      Object.assign(existingReview, reviewData);
      // Preserve existing attribution
      if (existingReview.attribution) {
        reviewData.metadata = {
          ...reviewData.metadata,
        };
      }
      await existingReview.save();
      return false;
    } else {
      // Create new review
      const newReview = new ExternalReview(reviewData);
      await newReview.save();
      return true;
    }
  }

  /**
   * Update sync status on business
   */
  private async updateSyncStatus(
    business: BusinessDocument,
    status: GoogleSyncStatus
  ): Promise<void> {
    if (business.settings?.googleBusiness) {
      business.settings.googleBusiness.lastSyncAt = new Date();
      business.settings.googleBusiness.lastSyncStatus = status;
      business.markModified('settings');
      await business.save();
    }
  }

  /**
   * Sync all businesses with Google enabled
   */
  async syncAllBusinesses(): Promise<Map<string, SyncResult>> {
    const results = new Map<string, SyncResult>();

    const businesses = await Business.find({
      'settings.googleBusiness.enabled': true,
      'settings.googleBusiness.syncEnabled': true,
    });

    this.log(`Starting sync for ${businesses.length} businesses`);

    for (const business of businesses) {
      const businessId = business._id.toString();
      try {
        const result = await this.syncBusinessReviews(businessId);
        results.set(businessId, result);
      } catch (error) {
        this.logError(`Failed to sync business ${businessId}`, error);
        results.set(businessId, {
          success: false,
          newReviews: 0,
          updatedReviews: 0,
          errors: [error instanceof Error ? error.message : 'Sync failed'],
        });
      }
    }

    return results;
  }

  /**
   * Trigger manual sync for a business
   */
  async triggerManualSync(businessId: string): Promise<SyncResult> {
    this.log('Manual sync triggered', { businessId });
    return this.syncBusinessReviews(businessId);
  }

  /**
   * Get sync status for a business
   */
  async getLastSyncStatus(businessId: string): Promise<SyncStatus> {
    const business = await Business.findById(businessId);
    if (!business) {
      throw new NotFoundError('Virksomhed ikke fundet');
    }

    const googleSettings = business.settings?.googleBusiness;
    const isRunning = this.runningSyncs.has(businessId);

    // Build status object conditionally to satisfy exactOptionalPropertyTypes
    const status: SyncStatus = { isRunning };

    if (googleSettings?.lastSyncAt) {
      status.lastSyncAt = googleSettings.lastSyncAt;
    }
    if (googleSettings?.lastSyncStatus) {
      status.lastSyncStatus = googleSettings.lastSyncStatus;
    }

    // Calculate next sync time
    if (googleSettings?.syncEnabled && googleSettings.lastSyncAt) {
      const intervalMs = (googleSettings.syncIntervalHours || 2) * 60 * 60 * 1000;
      status.nextSyncAt = new Date(
        new Date(googleSettings.lastSyncAt).getTime() + intervalMs
      );
    }

    return status;
  }

  /**
   * Check if sync should run for a business (based on interval)
   */
  shouldSync(business: BusinessDocument): boolean {
    const googleSettings = business.settings?.googleBusiness;
    if (!googleSettings?.enabled || !googleSettings.syncEnabled) {
      return false;
    }

    if (!googleSettings.lastSyncAt) {
      return true; // Never synced, should sync now
    }

    const intervalMs = (googleSettings.syncIntervalHours || 2) * 60 * 60 * 1000;
    const nextSyncTime =
      new Date(googleSettings.lastSyncAt).getTime() + intervalMs;

    return Date.now() >= nextSyncTime;
  }
}

export const googleReviewsSyncService = new GoogleReviewsSyncService();
