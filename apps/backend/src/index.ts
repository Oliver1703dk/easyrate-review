import cors from 'cors';
import dotenv from 'dotenv';
import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { connectDatabase } from './lib/database.js';
import { initSentry } from './lib/sentry.js';
import { requestLogger } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';
import { initializeIntegrations, shutdownIntegrations } from './integrations/index.js';

dotenv.config();

// Initialize Sentry before other code
initSentry();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());
app.use(requestLogger);

// Health check with database status
app.get('/health', (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';

  res.json({
    status: dbState === 1 ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '0.0.1',
    services: {
      database: dbStatus,
    },
  });
});

// API v1 info endpoint
app.get('/api/v1', (_req: Request, res: Response) => {
  res.json({
    message: 'EasyRate API v1',
    endpoints: {
      health: '/health',
      auth: '/api/v1/auth',
      businesses: '/api/v1/businesses',
      reviews: '/api/v1/reviews',
      notifications: '/api/v1/notifications',
      public: '/api/v1/r/:token',
      webhooks: '/api/v1/webhooks',
    },
  });
});

// Mount API routes
app.use('/api/v1', routes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Den ønskede ressource blev ikke fundet.',
      statusCode: 404,
    },
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown handler
async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  try {
    await shutdownIntegrations();
    console.log('Integrations shut down');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Start server with database connection
async function startServer(): Promise<void> {
  try {
    await connectDatabase();

    // Initialize integrations (adapters, poller, queue processor)
    await initializeIntegrations();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${String(PORT)}`);
      console.log(`Health check: http://localhost:${String(PORT)}/health`);
      console.log(`API: http://localhost:${String(PORT)}/api/v1`);
    });

    // Register shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
