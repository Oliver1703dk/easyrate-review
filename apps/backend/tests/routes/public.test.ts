import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import mongoose from 'mongoose';
import { Business } from '../../src/models/Business.js';
import { Review } from '../../src/models/Review.js';
import publicRoutes from '../../src/routes/public.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';

// Mock the storage service
vi.mock('../../src/services/StorageService.js', () => ({
  storageService: {
    generateUploadUrl: vi.fn().mockResolvedValue({
      uploadUrl: 'https://test-bucket.s3.amazonaws.com/test-key',
      fileKey: 'test-key',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    }),
  },
  ALLOWED_CONTENT_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
}));

describe('Public Routes', () => {
  let app: Express;
  let testBusiness: mongoose.Document;
  let testBusinessId: string;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use('/r', publicRoutes);
    app.use(errorHandler);

    // Create test business
    testBusiness = new Business({
      name: 'Test Restaurant',
      email: 'test@restaurant.com',
      settings: {
        googleReviewUrl: 'https://g.page/test-restaurant/review',
        gdpr: {
          privacyPolicyUrl: 'https://example.com/privacy',
        },
      },
      integrations: [],
      messageTemplates: {},
      branding: {
        primaryColor: '#FF5733',
        logoUrl: 'https://example.com/logo.png',
      },
    });
    await testBusiness.save();
    testBusinessId = testBusiness._id.toString();
  });

  describe('GET /r/:token - Get review page data', () => {
    it('should return business info for valid token', async () => {
      const response = await request(app).get(`/r/${testBusinessId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.business).toBeDefined();
      expect(response.body.data.business.name).toBe('Test Restaurant');
      expect(response.body.data.business.googleReviewUrl).toBe(
        'https://g.page/test-restaurant/review'
      );
    });

    it('should return branding info', async () => {
      const response = await request(app).get(`/r/${testBusinessId}`);

      expect(response.body.data.business.branding).toBeDefined();
      expect(response.body.data.business.branding.primaryColor).toBe('#FF5733');
      expect(response.body.data.business.branding.logoUrl).toBe(
        'https://example.com/logo.png'
      );
    });

    it('should return privacy policy URL for GDPR', async () => {
      const response = await request(app).get(`/r/${testBusinessId}`);

      expect(response.body.data.business.privacyPolicyUrl).toBe(
        'https://example.com/privacy'
      );
    });

    it('should return 404 for invalid token', async () => {
      const invalidId = new mongoose.Types.ObjectId().toString();
      const response = await request(app).get(`/r/${invalidId}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Ugyldig anmeldelses link');
    });

    it('should return 400 for malformed token', async () => {
      const response = await request(app).get('/r/not-a-valid-id');

      expect(response.status).toBe(400);
    });

    it('should use default primary color if not set', async () => {
      const businessNoColor = new Business({
        name: 'No Color Restaurant',
        email: 'nocolor@restaurant.com',
        settings: {},
        integrations: [],
        messageTemplates: {},
        branding: {},
      });
      await businessNoColor.save();

      const response = await request(app).get(`/r/${businessNoColor._id}`);

      expect(response.body.data.business.branding.primaryColor).toBe('#3B82F6');
    });
  });

  describe('POST /r/:token - Submit review', () => {
    it('should submit review with rating only', async () => {
      const response = await request(app)
        .post(`/r/${testBusinessId}`)
        .send({
          rating: 5,
          consent: { given: true },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.review).toBeDefined();
      expect(response.body.data.review.rating).toBe(5);
      expect(response.body.data.message).toBe('Tak for din anmeldelse!');
    });

    it('should submit review with all fields', async () => {
      const response = await request(app)
        .post(`/r/${testBusinessId}`)
        .send({
          rating: 4,
          feedbackText: 'Fremragende mad og service!',
          customer: {
            name: 'Anders Jensen',
            email: 'anders@example.com',
          },
          photos: ['https://example.com/photo1.jpg'],
          consent: { given: true },
        });

      expect(response.status).toBe(201);
      expect(response.body.data.review.rating).toBe(4);

      // Verify review was saved
      const review = await Review.findById(response.body.data.review.id);
      expect(review).toBeDefined();
      expect(review?.feedbackText).toBe('Fremragende mad og service!');
    });

    it('should record consent information', async () => {
      const response = await request(app)
        .post(`/r/${testBusinessId}`)
        .set('User-Agent', 'Test Browser')
        .send({
          rating: 5,
          consent: { given: true },
        });

      expect(response.status).toBe(201);

      const review = await Review.findById(response.body.data.review.id);
      expect(review?.consent).toBeDefined();
      expect(review?.consent?.given).toBe(true);
      expect(review?.consent?.version).toBe('1.0');
      expect(review?.consent?.userAgent).toBe('Test Browser');
    });

    it('should set sourcePlatform to direct', async () => {
      const response = await request(app)
        .post(`/r/${testBusinessId}`)
        .send({
          rating: 5,
          consent: { given: true },
        });

      const review = await Review.findById(response.body.data.review.id);
      expect(review?.sourcePlatform).toBe('direct');
    });

    it('should mark external review as submitted when indicated', async () => {
      const response = await request(app)
        .post(`/r/${testBusinessId}`)
        .send({
          rating: 5,
          consent: { given: true },
          submittedExternalReview: true,
        });

      expect(response.status).toBe(201);

      const review = await Review.findById(response.body.data.review.id);
      expect(review?.submittedExternalReview).toBe(true);
    });

    it('should return 400 without consent', async () => {
      const response = await request(app)
        .post(`/r/${testBusinessId}`)
        .send({
          rating: 5,
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 without rating', async () => {
      const response = await request(app)
        .post(`/r/${testBusinessId}`)
        .send({
          consent: { given: true },
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid rating', async () => {
      const response = await request(app)
        .post(`/r/${testBusinessId}`)
        .send({
          rating: 6,
          consent: { given: true },
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for rating less than 1', async () => {
      const response = await request(app)
        .post(`/r/${testBusinessId}`)
        .send({
          rating: 0,
          consent: { given: true },
        });

      expect(response.status).toBe(400);
    });

    it('should return 404 for invalid business token', async () => {
      const invalidId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .post(`/r/${invalidId}`)
        .send({
          rating: 5,
          consent: { given: true },
        });

      expect(response.status).toBe(404);
    });

    it('should handle Danish characters in feedback', async () => {
      const response = await request(app)
        .post(`/r/${testBusinessId}`)
        .send({
          rating: 4,
          feedbackText: 'Dejlig smørrebrød og æbleflæsk. Øllet var også godt!',
          consent: { given: true },
        });

      expect(response.status).toBe(201);

      const review = await Review.findById(response.body.data.review.id);
      expect(review?.feedbackText).toBe(
        'Dejlig smørrebrød og æbleflæsk. Øllet var også godt!'
      );
    });

    it('should limit photos to maximum 5', async () => {
      const response = await request(app)
        .post(`/r/${testBusinessId}`)
        .send({
          rating: 5,
          photos: [
            'photo1.jpg',
            'photo2.jpg',
            'photo3.jpg',
            'photo4.jpg',
            'photo5.jpg',
            'photo6.jpg',
          ],
          consent: { given: true },
        });

      expect(response.status).toBe(400);
    });

    it('should limit feedback text to 5000 characters', async () => {
      const longText = 'a'.repeat(5001);
      const response = await request(app)
        .post(`/r/${testBusinessId}`)
        .send({
          rating: 5,
          feedbackText: longText,
          consent: { given: true },
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /r/:token/upload-url - Get upload URL', () => {
    it('should return presigned upload URL', async () => {
      const response = await request(app)
        .post(`/r/${testBusinessId}/upload-url`)
        .send({
          filename: 'photo.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.uploadUrl).toBeDefined();
      expect(response.body.data.fileKey).toBeDefined();
      expect(response.body.data.expiresAt).toBeDefined();
    });

    it('should return 400 for invalid content type', async () => {
      const response = await request(app)
        .post(`/r/${testBusinessId}/upload-url`)
        .send({
          filename: 'document.pdf',
          contentType: 'application/pdf',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing filename', async () => {
      const response = await request(app)
        .post(`/r/${testBusinessId}/upload-url`)
        .send({
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(400);
    });

    it('should return 404 for invalid business token', async () => {
      const invalidId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .post(`/r/${invalidId}/upload-url`)
        .send({
          filename: 'photo.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(404);
    });
  });
});
