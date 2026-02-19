import { Router } from 'express';
import authRouter from './auth.js';
import businessesRouter from './businesses.js';
import reviewsRouter from './reviews.js';
import notificationsRouter from './notifications.js';
import publicRouter from './public.js';
import webhooksRouter from './webhooks/index.js';
import uploadsRouter from './uploads.js';
import gdprRouter from './gdpr.js';
import testRouter from './test.js';
import insightsRouter from './insights.js';
import googleAuthRouter from './google-auth.js';
import googleConfigRouter from './google-config.js';
import externalReviewsRouter from './external-reviews.js';
import internalRouter from './internal.js';

const router = Router();

// Mount routes under /api/v1
router.use('/auth', authRouter);
router.use('/businesses', businessesRouter);
router.use('/reviews', reviewsRouter);
router.use('/notifications', notificationsRouter);
router.use('/r', publicRouter);
router.use('/webhooks', webhooksRouter);
router.use('/uploads', uploadsRouter);
router.use('/gdpr', gdprRouter);
router.use('/test', testRouter);
router.use('/insights', insightsRouter);
router.use('/google/auth', googleAuthRouter);
router.use('/google', googleConfigRouter);
router.use('/external-reviews', externalReviewsRouter);
router.use('/internal', internalRouter);

export default router;
