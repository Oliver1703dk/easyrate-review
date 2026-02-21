import mongoose from 'mongoose';
import type {
  InsightRun as InsightRunType,
  InsightTrigger,
  InsightStatusResponse,
} from '@easyrate/shared';
import { InsightRun, type InsightRunDocument } from '../models/InsightRun.js';
import { Review } from '../models/Review.js';
import { Business } from '../models/Business.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { calculatePagination, type PaginationMeta } from '../utils/response.js';
import {
  getAIProvider,
  isAIConfigured,
  getConfiguredAIProviderName,
} from '../providers/ProviderFactory.js';

// Rate limit: 1 manual refresh per hour
const MANUAL_REFRESH_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

// Default analysis period: 30 days
const DEFAULT_ANALYSIS_DAYS = 30;

function toInsightRunType(doc: InsightRunDocument): InsightRunType {
  return doc.toJSON() as unknown as InsightRunType;
}

export interface PaginatedInsightRuns {
  data: InsightRunType[];
  pagination: PaginationMeta;
}

export class InsightsService {
  /**
   * Get the latest completed insight run for a business
   */
  async getLatest(businessId: string): Promise<InsightRunType | null> {
    const run = await InsightRun.findOne({
      businessId,
      status: 'completed',
    }).sort({ createdAt: -1 });

    return run ? toInsightRunType(run) : null;
  }

  /**
   * Get an insight run by ID
   */
  async getById(businessId: string, id: string): Promise<InsightRunType | null> {
    const run = await InsightRun.findOne({ _id: id, businessId });
    return run ? toInsightRunType(run) : null;
  }

  /**
   * Get an insight run by ID or throw
   */
  async getByIdOrThrow(businessId: string, id: string): Promise<InsightRunType> {
    const run = await this.getById(businessId, id);
    if (!run) {
      throw new NotFoundError('Insight not found');
    }
    return run;
  }

  /**
   * List insight runs for a business with pagination
   */
  async list(businessId: string, page = 1, limit = 10): Promise<PaginatedInsightRuns> {
    const skip = (page - 1) * limit;

    const [runs, total] = await Promise.all([
      InsightRun.find({ businessId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      InsightRun.countDocuments({ businessId }),
    ]);

    return {
      data: runs.map(toInsightRunType),
      pagination: calculatePagination(page, limit, total),
    };
  }

  /**
   * Check if a new insight can be requested (rate limiting)
   */
  async canRequestNewInsight(businessId: string): Promise<{
    canRequest: boolean;
    nextAvailableAt?: Date | undefined;
    lastRunAt?: Date | undefined;
    lastRunStatus?: string | undefined;
  }> {
    // Find the most recent manual run
    const lastManualRun = await InsightRun.findOne({
      businessId,
      triggeredBy: 'manual',
    }).sort({ createdAt: -1 });

    // Find the latest run overall
    const lastRun = await InsightRun.findOne({ businessId }).sort({ createdAt: -1 });

    if (!lastManualRun) {
      return {
        canRequest: true,
        lastRunAt: lastRun?.createdAt ?? undefined,
        lastRunStatus: lastRun?.status ?? undefined,
      };
    }

    const timeSinceLastManualRun = Date.now() - new Date(lastManualRun.createdAt).getTime();
    const canRequest = timeSinceLastManualRun >= MANUAL_REFRESH_COOLDOWN_MS;

    return {
      canRequest,
      nextAvailableAt: canRequest
        ? undefined
        : new Date(new Date(lastManualRun.createdAt).getTime() + MANUAL_REFRESH_COOLDOWN_MS),
      lastRunAt: lastRun?.createdAt ?? undefined,
      lastRunStatus: lastRun?.status ?? undefined,
    };
  }

  /**
   * Get the status of AI insights for a business
   */
  async getStatus(businessId: string): Promise<InsightStatusResponse> {
    const business = await Business.findById(businessId);
    if (!business) {
      throw new NotFoundError('Business not found');
    }

    const aiEnabled = business.settings.aiSettings?.enabled ?? false;
    const configured = isAIConfigured();
    const rateLimit = await this.canRequestNewInsight(businessId);

    return {
      enabled: aiEnabled,
      configured,
      canRequestNew: rateLimit.canRequest && aiEnabled && configured,
      nextAvailableAt: rateLimit.nextAvailableAt,
      lastRunAt: rateLimit.lastRunAt,
      lastRunStatus: rateLimit.lastRunStatus as InsightStatusResponse['lastRunStatus'],
    };
  }

  /**
   * Create a new pending insight run
   */
  async createRun(businessId: string, triggeredBy: InsightTrigger): Promise<InsightRunType> {
    // Check rate limit for manual requests
    if (triggeredBy === 'manual') {
      const rateLimit = await this.canRequestNewInsight(businessId);
      if (!rateLimit.canRequest) {
        throw new ValidationError(
          `You can only generate new insights once per hour. Try again ${
            rateLimit.nextAvailableAt
              ? `after ${rateLimit.nextAvailableAt.toLocaleTimeString('en-GB')}`
              : 'later'
          }`,
          { code: 'RATE_LIMITED' }
        );
      }
    }

    // Check if AI is configured
    if (!isAIConfigured()) {
      throw new ValidationError('AI is not configured', { code: 'AI_NOT_CONFIGURED' });
    }

    // Get business for AI settings
    const business = await Business.findById(businessId);
    if (!business) {
      throw new NotFoundError('Business not found');
    }

    // Calculate date range (last 30 days)
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - DEFAULT_ANALYSIS_DAYS);

    // Determine AI provider
    const preferredProvider = business.settings.aiSettings?.provider;
    const providerName = getConfiguredAIProviderName() ?? 'grok';

    const run = new InsightRun({
      businessId,
      status: 'pending',
      dateRange: { from, to },
      reviewCount: 0,
      themes: [],
      aiProvider: preferredProvider === providerName ? preferredProvider : providerName,
      modelUsed: '',
      tokensUsed: 0,
      processingTimeMs: 0,
      triggeredBy,
    });

    await run.save();
    return toInsightRunType(run);
  }

  /**
   * Process a pending insight run
   */
  async processRun(runId: string): Promise<InsightRunType> {
    const run = await InsightRun.findById(runId);
    if (!run) {
      throw new NotFoundError('Insight not found');
    }

    if (run.status !== 'pending') {
      throw new ValidationError('Insight has already been processed', {
        code: 'ALREADY_PROCESSED',
      });
    }

    const startTime = Date.now();

    // Update status to processing
    run.status = 'processing';
    await run.save();

    try {
      // Fetch reviews for the date range
      const reviews = await Review.find({
        businessId: run.businessId,
        createdAt: {
          $gte: run.dateRange.from,
          $lte: run.dateRange.to,
        },
      }).sort({ createdAt: -1 });

      run.reviewCount = reviews.length;

      // Calculate actual average rating from reviews
      if (reviews.length > 0) {
        const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
        run.avgRating = Math.round((totalRating / reviews.length) * 10) / 10;
      }

      // Check if we have enough reviews
      if (reviews.length === 0) {
        run.status = 'completed';
        run.overallSentiment = {
          score: 50,
          label: 'neutral',
          summary: 'No reviews in the period to analyse.',
        };
        run.customerSatisfactionSummary = 'There are no reviews to analyse in the selected period.';
        run.processingTimeMs = Date.now() - startTime;
        await run.save();

        // Update business with last insight run
        await this.updateBusinessInsightRun(String(run.businessId), String(run._id));

        return toInsightRunType(run);
      }

      // Get business info
      const business = await Business.findById(run.businessId);
      if (!business) {
        throw new NotFoundError('Business not found');
      }

      // Get AI provider and analyze
      const aiProvider = getAIProvider(run.aiProvider);

      const analysisInput = {
        reviews: reviews.map((r) => ({
          rating: r.rating,
          feedbackText: r.feedbackText,
          createdAt: r.createdAt,
          customerId: r.customer.email ?? r.customer.phone ?? undefined,
        })),
        businessName: business.name,
        analysisLanguage: 'da' as const,
      };

      const result = await aiProvider.analyze(analysisInput);

      // Update run with results
      run.status = 'completed';
      run.overallSentiment = result.overallSentiment;
      run.themes = result.themes;
      if (result.topImprovementPoint) {
        run.topImprovementPoint = result.topImprovementPoint;
      }
      if (result.customerSatisfactionSummary) {
        run.customerSatisfactionSummary = result.customerSatisfactionSummary;
      }
      run.modelUsed = result.modelUsed;
      run.tokensUsed = result.tokensUsed;
      run.processingTimeMs = Date.now() - startTime;

      await run.save();

      // Update business with last insight run
      await this.updateBusinessInsightRun(String(run.businessId), String(run._id));

      return toInsightRunType(run);
    } catch (error) {
      // Mark run as failed
      run.status = 'failed';
      run.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      run.processingTimeMs = Date.now() - startTime;
      await run.save();

      console.error('[InsightsService] Processing failed:', error);
      throw error;
    }
  }

  /**
   * Create and process a new insight run in one step
   */
  async createAndProcess(businessId: string, triggeredBy: InsightTrigger): Promise<InsightRunType> {
    const run = await this.createRun(businessId, triggeredBy);
    return this.processRun(run.id);
  }

  /**
   * Get businesses that need scheduled insight refresh
   * Returns businesses with AI enabled, autoRefresh on, and last run > 7 days ago
   */
  async getBusinessesNeedingRefresh(limit = 10): Promise<string[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const businesses = await Business.find({
      'settings.aiSettings.enabled': true,
      'settings.aiSettings.autoRefresh': true,
      $or: [
        { 'settings.aiSettings.lastInsightRunAt': { $lt: sevenDaysAgo } },
        { 'settings.aiSettings.lastInsightRunAt': { $exists: false } },
      ],
    })
      .select('_id')
      .limit(limit);

    return businesses.map((b) => String(b._id));
  }

  /**
   * Update business with last insight run info
   */
  private async updateBusinessInsightRun(businessId: string, runId: string): Promise<void> {
    await Business.findByIdAndUpdate(businessId, {
      $set: {
        'settings.aiSettings.lastInsightRunId': new mongoose.Types.ObjectId(runId),
        'settings.aiSettings.lastInsightRunAt': new Date(),
      },
    });
  }
}

export const insightsService = new InsightsService();
