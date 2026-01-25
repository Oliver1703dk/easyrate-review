import { PROVIDER_RATE_LIMITS, type ProviderName } from '@easyrate/shared';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

/**
 * Token bucket rate limiter with async queue for waiting on rate limits
 */
export class RateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();
  private config: RateLimitConfig;
  private queue: Array<{ resolve: () => void; reject: (err: Error) => void }> = [];
  private isProcessingQueue: boolean = false;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Create a rate limiter for a specific provider
   */
  static forProvider(providerName: ProviderName): RateLimiter {
    const config = PROVIDER_RATE_LIMITS[providerName];
    if (!config) {
      throw new Error(`Unknown provider: ${providerName}`);
    }
    return new RateLimiter(config);
  }

  /**
   * Get or create a token bucket for a key
   */
  private getBucket(key: string): TokenBucket {
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = {
        tokens: this.config.maxRequests,
        lastRefill: Date.now(),
      };
      this.buckets.set(key, bucket);
    }

    return bucket;
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillBucket(bucket: TokenBucket): void {
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor((elapsed / this.config.windowMs) * this.config.maxRequests);

    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(this.config.maxRequests, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }
  }

  /**
   * Try to acquire a token (non-blocking)
   * Returns true if token acquired, false if rate limited
   */
  tryAcquire(key: string = 'default'): boolean {
    const bucket = this.getBucket(key);
    this.refillBucket(bucket);

    if (bucket.tokens > 0) {
      bucket.tokens--;
      return true;
    }

    return false;
  }

  /**
   * Acquire a token, waiting if necessary
   * Throws if the wait would exceed maxWaitMs
   */
  async acquire(key: string = 'default', maxWaitMs: number = 30000): Promise<void> {
    if (this.tryAcquire(key)) {
      return;
    }

    // Calculate wait time
    const msPerToken = this.config.windowMs / this.config.maxRequests;
    const waitTime = msPerToken;

    if (waitTime > maxWaitMs) {
      throw new Error(`Rate limit exceeded, would need to wait ${waitTime}ms`);
    }

    // Add to queue and wait
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject });

      // Set timeout to process queue
      if (!this.isProcessingQueue) {
        this.isProcessingQueue = true;
        setTimeout(() => {
          this.processQueue(key);
        }, msPerToken);
      }
    });
  }

  /**
   * Process the waiting queue
   */
  private processQueue(key: string): void {
    this.isProcessingQueue = false;

    while (this.queue.length > 0) {
      if (this.tryAcquire(key)) {
        const item = this.queue.shift();
        if (item) {
          item.resolve();
        }
      } else {
        // Need to wait more
        const msPerToken = this.config.windowMs / this.config.maxRequests;
        this.isProcessingQueue = true;
        setTimeout(() => {
          this.processQueue(key);
        }, msPerToken);
        return;
      }
    }
  }

  /**
   * Get current token count for a key
   */
  getTokenCount(key: string = 'default'): number {
    const bucket = this.buckets.get(key);
    if (!bucket) {
      return this.config.maxRequests;
    }
    this.refillBucket(bucket);
    return bucket.tokens;
  }

  /**
   * Reset the rate limiter (mainly for testing)
   */
  reset(): void {
    this.buckets.clear();
    this.queue.forEach((item) => item.reject(new Error('Rate limiter reset')));
    this.queue = [];
    this.isProcessingQueue = false;
  }
}

// Singleton rate limiters for each provider
const rateLimiters: Map<ProviderName, RateLimiter> = new Map();

export function getRateLimiter(providerName: ProviderName): RateLimiter {
  let limiter = rateLimiters.get(providerName);
  if (!limiter) {
    limiter = RateLimiter.forProvider(providerName);
    rateLimiters.set(providerName, limiter);
  }
  return limiter;
}
