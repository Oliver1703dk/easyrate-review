import jwt from 'jsonwebtoken';
import type { ReviewTokenPayload } from '@easyrate/shared';

// Use dedicated secret or fall back to JWT_SECRET
const REVIEW_TOKEN_SECRET = process.env.REVIEW_TOKEN_SECRET ||
  process.env.JWT_SECRET ||
  'development-review-secret-change-in-production';

// Long-lived tokens for review links (default 60 days)
const REVIEW_TOKEN_EXPIRES_IN = process.env.REVIEW_TOKEN_EXPIRES_IN || '60d';

/**
 * Service for generating and verifying JWT tokens for review links.
 * These tokens embed customer information (email, phone) from notification triggers,
 * enabling automatic capture of contact details when reviews are submitted.
 */
export class ReviewTokenService {
  /**
   * Generate a JWT token for a review link
   * @param payload - Business ID, customer info, order ID, and source platform
   * @returns JWT token string
   */
  generateToken(payload: ReviewTokenPayload): string {
    return jwt.sign(payload, REVIEW_TOKEN_SECRET, {
      expiresIn: REVIEW_TOKEN_EXPIRES_IN,
    } as jwt.SignOptions);
  }

  /**
   * Verify and decode a review token
   * @param token - JWT token string
   * @returns Decoded payload or null if invalid/expired
   */
  verifyToken(token: string): ReviewTokenPayload | null {
    try {
      const decoded = jwt.verify(token, REVIEW_TOKEN_SECRET) as ReviewTokenPayload & jwt.JwtPayload;
      // Return only the ReviewTokenPayload fields, excluding JWT standard fields
      const result: ReviewTokenPayload = {
        businessId: decoded.businessId,
      };
      if (decoded.customer) {
        result.customer = decoded.customer;
      }
      if (decoded.orderId) {
        result.orderId = decoded.orderId;
      }
      if (decoded.sourcePlatform) {
        result.sourcePlatform = decoded.sourcePlatform;
      }
      return result;
    } catch {
      return null;
    }
  }

  /**
   * Detect if a token string is a JWT (vs plain businessId for backwards compatibility)
   * JWTs start with 'eyJ' (base64 for '{"') and contain two dots
   * @param token - Token string to check
   * @returns true if the token appears to be a JWT
   */
  isJwtToken(token: string): boolean {
    return token.includes('.') && token.startsWith('eyJ');
  }
}

export const reviewTokenService = new ReviewTokenService();
