import { Request, Response, NextFunction } from 'express';

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip logging for health check endpoint
  if (req.path === '/health') {
    return next();
  }

  const start = Date.now();

  // Log when response is finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent')?.substring(0, 50),
    };

    // Color code based on status
    if (res.statusCode >= 500) {
      console.error('[ERROR]', logData);
    } else if (res.statusCode >= 400) {
      console.warn('[WARN]', logData);
    } else {
      console.log('[INFO]', logData);
    }
  });

  next();
}
