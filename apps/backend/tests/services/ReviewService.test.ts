import { describe, it, expect, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { ReviewService } from '../../src/services/ReviewService.js';
import { Business } from '../../src/models/Business.js';
import * as providerFactory from '../../src/providers/ProviderFactory.js';

describe('ReviewService', () => {
  let reviewService: ReviewService;
  let testBusinessId: string;

  beforeEach(async () => {
    reviewService = new ReviewService();

    // Create test business
    const business = new Business({
      name: 'Test Restaurant',
      email: 'test@restaurant.com',
      settings: {},
      integrations: [],
      messageTemplates: {},
      branding: {},
    });
    await business.save();
    testBusinessId = business._id.toString();
  });

  describe('create', () => {
    it('should create a review with required fields', async () => {
      const review = await reviewService.create(testBusinessId, {
        rating: 5,
        sourcePlatform: 'direct',
      });

      expect(review).toBeDefined();
      expect(review.id).toBeDefined();
      expect(review.rating).toBe(5);
      expect(review.sourcePlatform).toBe('direct');
      expect(review.isPublic).toBe(false);
      expect(review.submittedExternalReview).toBe(false);
    });

    it('should create a review with all optional fields', async () => {
      const review = await reviewService.create(testBusinessId, {
        rating: 4,
        feedbackText: 'God mad og service!',
        customer: {
          name: 'Anders Jensen',
          email: 'anders@example.com',
          phone: '+4512345678',
        },
        sourcePlatform: 'dully',
        orderId: 'order-123',
        photos: ['https://example.com/photo1.jpg'],
      });

      expect(review.rating).toBe(4);
      expect(review.feedbackText).toBe('God mad og service!');
      expect(review.customer?.name).toBe('Anders Jensen');
      expect(review.orderId).toBe('order-123');
      expect(review.photos).toHaveLength(1);
    });

    it('should create review with consent record', async () => {
      const consent = {
        given: true as const,
        timestamp: new Date(),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        version: '1.0',
      };

      const review = await reviewService.create(testBusinessId, {
        rating: 5,
        sourcePlatform: 'direct',
        consent,
      });

      expect(review.consent).toBeDefined();
      expect(review.consent?.given).toBe(true);
      expect(review.consent?.version).toBe('1.0');
    });

    it('should set default consent if not provided', async () => {
      const review = await reviewService.create(testBusinessId, {
        rating: 5,
        sourcePlatform: 'direct',
      });

      expect(review.consent).toBeDefined();
      expect(review.consent?.given).toBe(true);
    });
  });

  describe('findById', () => {
    it('should find review by ID within business scope', async () => {
      const created = await reviewService.create(testBusinessId, {
        rating: 5,
        sourcePlatform: 'direct',
      });

      const found = await reviewService.findById(testBusinessId, created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it('should return null for non-existent review', async () => {
      const found = await reviewService.findById(
        testBusinessId,
        new mongoose.Types.ObjectId().toString()
      );

      expect(found).toBeNull();
    });

    it('should not find review from different business', async () => {
      const review = await reviewService.create(testBusinessId, {
        rating: 5,
        sourcePlatform: 'direct',
      });

      // Try to find with different business ID
      const differentBusinessId = new mongoose.Types.ObjectId().toString();
      const found = await reviewService.findById(differentBusinessId, review.id);

      expect(found).toBeNull();
    });
  });

  describe('findByIdOrThrow', () => {
    it('should return review when found', async () => {
      const created = await reviewService.create(testBusinessId, {
        rating: 5,
        sourcePlatform: 'direct',
      });

      const found = await reviewService.findByIdOrThrow(testBusinessId, created.id);

      expect(found.id).toBe(created.id);
    });

    it('should throw NotFoundError when not found', async () => {
      await expect(
        reviewService.findByIdOrThrow(
          testBusinessId,
          new mongoose.Types.ObjectId().toString()
        )
      ).rejects.toThrow('Anmeldelse ikke fundet');
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      // Create test reviews
      await reviewService.create(testBusinessId, { rating: 5, sourcePlatform: 'direct' });
      await reviewService.create(testBusinessId, { rating: 4, sourcePlatform: 'dully' });
      await reviewService.create(testBusinessId, { rating: 2, sourcePlatform: 'easytable' });
      await reviewService.create(testBusinessId, {
        rating: 3,
        feedbackText: 'Maden var okay',
        sourcePlatform: 'direct',
      });
    });

    it('should list all reviews for business', async () => {
      const result = await reviewService.list(testBusinessId, {});

      expect(result.data).toHaveLength(4);
      expect(result.pagination.total).toBe(4);
    });

    it('should filter by rating', async () => {
      const result = await reviewService.list(testBusinessId, { rating: 5 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].rating).toBe(5);
    });

    it('should filter by source platform', async () => {
      const result = await reviewService.list(testBusinessId, { sourcePlatform: 'direct' });

      expect(result.data).toHaveLength(2);
      result.data.forEach((review) => {
        expect(review.sourcePlatform).toBe('direct');
      });
    });

    it('should search by feedback text', async () => {
      const result = await reviewService.list(testBusinessId, { search: 'Maden' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].feedbackText).toContain('Maden');
    });

    it('should paginate results', async () => {
      const page1 = await reviewService.list(testBusinessId, {}, 1, 2);
      const page2 = await reviewService.list(testBusinessId, {}, 2, 2);

      expect(page1.data).toHaveLength(2);
      expect(page2.data).toHaveLength(2);
      expect(page1.pagination.page).toBe(1);
      expect(page2.pagination.page).toBe(2);
      expect(page1.pagination.hasNextPage).toBe(true);
      expect(page2.pagination.hasNextPage).toBe(false);
    });

    it('should sort by createdAt descending', async () => {
      const result = await reviewService.list(testBusinessId, {});

      for (let i = 1; i < result.data.length; i++) {
        const prevDate = new Date(result.data[i - 1].createdAt).getTime();
        const currDate = new Date(result.data[i].createdAt).getTime();
        expect(prevDate).toBeGreaterThanOrEqual(currDate);
      }
    });

    it('should not return reviews from other businesses', async () => {
      const otherBusinessId = new mongoose.Types.ObjectId().toString();
      const result = await reviewService.list(otherBusinessId, {});

      expect(result.data).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      // Create reviews with different ratings and sources
      await reviewService.create(testBusinessId, { rating: 5, sourcePlatform: 'direct' });
      await reviewService.create(testBusinessId, { rating: 5, sourcePlatform: 'dully' });
      await reviewService.create(testBusinessId, { rating: 4, sourcePlatform: 'direct' });
      await reviewService.create(testBusinessId, { rating: 2, sourcePlatform: 'easytable' });
      await reviewService.create(testBusinessId, { rating: 1, sourcePlatform: 'direct' });
    });

    it('should return correct stats', async () => {
      const stats = await reviewService.getStats(testBusinessId);

      expect(stats.total).toBe(5);
      expect(stats.avgRating).toBe(3.4); // (5+5+4+2+1) / 5 = 3.4
    });

    it('should return rating distribution', async () => {
      const stats = await reviewService.getStats(testBusinessId);

      expect(stats.byRating[1]).toBe(1);
      expect(stats.byRating[2]).toBe(1);
      expect(stats.byRating[3]).toBe(0);
      expect(stats.byRating[4]).toBe(1);
      expect(stats.byRating[5]).toBe(2);
    });

    it('should return source distribution', async () => {
      const stats = await reviewService.getStats(testBusinessId);

      expect(stats.bySource.direct).toBe(3);
      expect(stats.bySource.dully).toBe(1);
      expect(stats.bySource.easytable).toBe(1);
    });

    it('should return empty stats for business with no reviews', async () => {
      const emptyBusinessId = new mongoose.Types.ObjectId().toString();
      const stats = await reviewService.getStats(emptyBusinessId);

      expect(stats.total).toBe(0);
      expect(stats.avgRating).toBe(0);
      expect(stats.bySource.direct).toBe(0);
      expect(stats.bySource.dully).toBe(0);
      expect(stats.bySource.easytable).toBe(0);
      expect(stats.recentTrend).toBe(0);
    });

    it('should calculate trend when date range provided', async () => {
      // Create some older reviews for "previous period"
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      // Get stats with date range - trend should be 0 or positive since no previous period data
      const stats = await reviewService.getStats(testBusinessId, {
        from: oneWeekAgo,
        to: now,
      });

      // All 5 reviews are in current period (just created), so recentTrend = 100% if no previous
      expect(stats.total).toBe(5);
      expect(stats.recentTrend).toBe(100); // 100% increase from 0 previous
    });
  });

  describe('markExternalReviewSubmitted', () => {
    it('should mark review as external review submitted', async () => {
      const review = await reviewService.create(testBusinessId, {
        rating: 5,
        sourcePlatform: 'direct',
      });

      const updated = await reviewService.markExternalReviewSubmitted(
        testBusinessId,
        review.id
      );

      expect(updated.submittedExternalReview).toBe(true);
    });

    it('should throw error for non-existent review', async () => {
      await expect(
        reviewService.markExternalReviewSubmitted(
          testBusinessId,
          new mongoose.Types.ObjectId().toString()
        )
      ).rejects.toThrow('Anmeldelse ikke fundet');
    });
  });

  describe('delete', () => {
    it('should delete a review', async () => {
      const review = await reviewService.create(testBusinessId, {
        rating: 5,
        sourcePlatform: 'direct',
      });

      await reviewService.delete(testBusinessId, review.id);

      const found = await reviewService.findById(testBusinessId, review.id);
      expect(found).toBeNull();
    });

    it('should throw error when deleting non-existent review', async () => {
      await expect(
        reviewService.delete(
          testBusinessId,
          new mongoose.Types.ObjectId().toString()
        )
      ).rejects.toThrow('Anmeldelse ikke fundet');
    });

    it('should not delete review from different business', async () => {
      const review = await reviewService.create(testBusinessId, {
        rating: 5,
        sourcePlatform: 'direct',
      });

      const differentBusinessId = new mongoose.Types.ObjectId().toString();

      await expect(
        reviewService.delete(differentBusinessId, review.id)
      ).rejects.toThrow('Anmeldelse ikke fundet');

      // Verify review still exists
      const found = await reviewService.findById(testBusinessId, review.id);
      expect(found).toBeDefined();
    });
  });

  describe('replyToReview', () => {
    const mockEmailProvider = {
      send: vi.fn(),
      getStatus: vi.fn(),
    };

    beforeEach(() => {
      vi.spyOn(providerFactory, 'isEmailConfigured').mockReturnValue(true);
      vi.spyOn(providerFactory, 'getEmailProvider').mockReturnValue(mockEmailProvider as unknown as ReturnType<typeof providerFactory.getEmailProvider>);
      mockEmailProvider.send.mockResolvedValue({ success: true, messageId: 'test-message-id' });
    });

    it('should reply to review with customer email', async () => {
      const review = await reviewService.create(testBusinessId, {
        rating: 3,
        feedbackText: 'Maden var kold',
        customer: {
          name: 'Anders',
          email: 'anders@example.com',
        },
        sourcePlatform: 'direct',
      });

      const updated = await reviewService.replyToReview(
        testBusinessId,
        review.id,
        'Tak for din feedback. Vi beklager oplevelsen.'
      );

      expect(updated.response).toBeDefined();
      expect(updated.response?.text).toBe('Tak for din feedback. Vi beklager oplevelsen.');
      expect(updated.response?.sentVia).toBe('email');
      expect(updated.response?.status).toBe('sent');
      expect(updated.response?.messageId).toBe('test-message-id');
      expect(mockEmailProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'anders@example.com',
        })
      );
    });

    it('should throw error if customer has no email', async () => {
      const review = await reviewService.create(testBusinessId, {
        rating: 3,
        customer: {
          name: 'Anders',
          phone: '+4512345678',
        },
        sourcePlatform: 'direct',
      });

      await expect(
        reviewService.replyToReview(testBusinessId, review.id, 'Svar tekst')
      ).rejects.toThrow('Kunden har ingen email');
    });

    it('should throw error if review already has response', async () => {
      const review = await reviewService.create(testBusinessId, {
        rating: 3,
        customer: {
          email: 'test@example.com',
        },
        sourcePlatform: 'direct',
      });

      // First reply
      await reviewService.replyToReview(testBusinessId, review.id, 'Første svar');

      // Second reply should fail
      await expect(
        reviewService.replyToReview(testBusinessId, review.id, 'Andet svar')
      ).rejects.toThrow('Anmeldelsen er allerede besvaret');
    });

    it('should throw error if review not found', async () => {
      await expect(
        reviewService.replyToReview(
          testBusinessId,
          new mongoose.Types.ObjectId().toString(),
          'Svar tekst'
        )
      ).rejects.toThrow('Anmeldelse ikke fundet');
    });

    it('should throw error if email send fails', async () => {
      mockEmailProvider.send.mockResolvedValue({ success: false, error: 'Send failed' });

      const review = await reviewService.create(testBusinessId, {
        rating: 3,
        customer: {
          email: 'test@example.com',
        },
        sourcePlatform: 'direct',
      });

      await expect(
        reviewService.replyToReview(testBusinessId, review.id, 'Svar tekst')
      ).rejects.toThrow('Kunne ikke sende email');
    });

    it('should throw error if email provider not configured', async () => {
      vi.spyOn(providerFactory, 'isEmailConfigured').mockReturnValue(false);

      const review = await reviewService.create(testBusinessId, {
        rating: 3,
        customer: {
          email: 'test@example.com',
        },
        sourcePlatform: 'direct',
      });

      await expect(
        reviewService.replyToReview(testBusinessId, review.id, 'Svar tekst')
      ).rejects.toThrow('Email provider er ikke konfigureret');
    });
  });
});
