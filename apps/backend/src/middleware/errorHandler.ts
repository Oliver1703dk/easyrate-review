import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { AppError } from '../utils/errors.js';
import { sendError } from '../utils/response.js';
import { captureError } from '../lib/sentry.js';

export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log all errors
  console.error('Error:', {
    name: error.name,
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  });

  // Handle AppError (our custom errors)
  if (error instanceof AppError) {
    const details = error.details as Record<string, unknown> | undefined;
    sendError(
      res,
      {
        code: error.code,
        message: error.message,
        ...(details ? { details } : {}),
        statusCode: error.statusCode,
      },
      error.statusCode
    );
    return;
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const details = error.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    sendError(
      res,
      {
        code: 'VALIDATION_ERROR',
        message: 'Valideringsfejl',
        details: Object.fromEntries(details.map(d => [d.path, d.message])),
        statusCode: 400,
      },
      400
    );
    return;
  }

  // Handle Mongoose validation errors
  if (error instanceof mongoose.Error.ValidationError) {
    const details = Object.entries(error.errors).map(([path, err]) => ({
      path,
      message: err.message,
    }));
    sendError(
      res,
      {
        code: 'VALIDATION_ERROR',
        message: 'Database valideringsfejl',
        details: Object.fromEntries(details.map(d => [d.path, d.message])),
        statusCode: 400,
      },
      400
    );
    return;
  }

  // Handle Mongoose cast errors (invalid ObjectId etc)
  if (error instanceof mongoose.Error.CastError) {
    sendError(
      res,
      {
        code: 'INVALID_ID',
        message: 'Ugyldigt ID format',
        statusCode: 400,
      },
      400
    );
    return;
  }

  // Handle MongoDB duplicate key error
  if (error.name === 'MongoServerError' && (error as { code?: number }).code === 11000) {
    sendError(
      res,
      {
        code: 'DUPLICATE_KEY',
        message: 'Ressource eksisterer allerede',
        statusCode: 409,
      },
      409
    );
    return;
  }

  // Handle unknown errors - capture to Sentry for 5xx errors
  captureError(error, {
    url: _req.url,
    method: _req.method,
    headers: _req.headers,
    body: _req.body,
  });

  sendError(
    res,
    {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'Der opstod en intern fejl'
        : error.message,
      statusCode: 500,
    },
    500
  );
}
