import crypto from 'node:crypto';
import type { ReviewTokenPayload } from '@easyrate/shared';
import { ReviewLink } from '../models/ReviewLink.js';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const DEFAULT_CODE_LENGTH = 10;

// Parse expiry from env (same source as ReviewTokenService)
function getExpiryMs(): number {
  const raw = process.env.REVIEW_TOKEN_EXPIRES_IN ?? '60d';
  const match = raw.match(/^(\d+)([dhms])$/);
  if (!match || !match[1] || !match[2]) return 60 * 24 * 60 * 60 * 1000; // fallback: 60 days
  const value = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    d: 24 * 60 * 60 * 1000,
    h: 60 * 60 * 1000,
    m: 60 * 1000,
    s: 1000,
  };
  return value * (multipliers[unit] ?? 24 * 60 * 60 * 1000);
}

export class ReviewLinkService {
  private static instance: ReviewLinkService;

  private constructor() {}

  static getInstance(): ReviewLinkService {
    if (!ReviewLinkService.instance) {
      ReviewLinkService.instance = new ReviewLinkService();
    }
    return ReviewLinkService.instance;
  }

  generateShortCode(length = DEFAULT_CODE_LENGTH): string {
    const bytes = crypto.randomBytes(length);
    let result = '';
    for (let i = 0; i < length; i++) {
      result += ALPHABET[bytes[i]! % ALPHABET.length];
    }
    return result;
  }

  async createShortLink(payload: ReviewTokenPayload): Promise<string> {
    const shortCode = this.generateShortCode();
    const expiresAt = new Date(Date.now() + getExpiryMs());

    await ReviewLink.create({
      shortCode,
      businessId: payload.businessId,
      payload,
      expiresAt,
    });

    return shortCode;
  }

  async resolveShortCode(code: string): Promise<ReviewTokenPayload | null> {
    const doc = await ReviewLink.findOne({ shortCode: code });
    if (!doc) return null;
    return doc.payload;
  }
}

export const reviewLinkService = ReviewLinkService.getInstance();
