import * as Sentry from '@sentry/node';

export function initSentry(): void {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.npm_package_version,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      // Filter out health check transactions
      ignoreTransactions: ['/health', '/api/v1'],
      beforeSend(event) {
        // Don't send events in test environment
        if (process.env.NODE_ENV === 'test') {
          return null;
        }
        return event;
      },
    });
    console.log('Sentry initialized');
  } else if (process.env.NODE_ENV === 'production') {
    console.warn('SENTRY_DSN not set - error tracking disabled');
  }
}

export function captureError(error: Error, context?: Record<string, unknown>): void {
  if (process.env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (context) {
        scope.setExtras(context);
      }
      Sentry.captureException(error);
    });
  }
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  if (process.env.SENTRY_DSN) {
    Sentry.captureMessage(message, level);
  }
}

export function setUser(userId: string, email?: string, businessId?: string): void {
  if (process.env.SENTRY_DSN) {
    Sentry.setUser({
      id: userId,
      email,
      businessId,
    } as Sentry.User);
  }
}

export function clearUser(): void {
  if (process.env.SENTRY_DSN) {
    Sentry.setUser(null);
  }
}

export { Sentry };
