import crypto from 'crypto';
import type { GoogleTokenResponse, GoogleBusinessSettings } from '@easyrate/shared';
import { Business } from '../models/Business.js';
import { NotFoundError, ValidationError, UnauthorizedError } from '../utils/errors.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

// Google Business Profile API scope for reading/replying to reviews
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/business.manage',
].join(' ');

// Token encryption - use a consistent key derived from JWT_SECRET
const ENCRYPTION_KEY = crypto
  .createHash('sha256')
  .update(process.env.JWT_SECRET || 'development-secret')
  .digest();
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0]!, 'hex');
  const encryptedText = parts[1]!;
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export interface GoogleAuthState {
  businessId: string;
  nonce: string;
  redirectUri: string;
}

export class GoogleAuthService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    this.redirectUri =
      process.env.GOOGLE_REDIRECT_URI ||
      'http://localhost:3001/api/v1/google/auth/callback';
  }

  /**
   * Check if Google OAuth is configured
   */
  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  /**
   * Generate OAuth authorization URL with state for CSRF protection
   */
  getAuthorizationUrl(businessId: string, frontendRedirectUri?: string): { url: string; state: string } {
    if (!this.isConfigured()) {
      throw new ValidationError('Google OAuth er ikke konfigureret');
    }

    const nonce = crypto.randomBytes(16).toString('hex');
    const state: GoogleAuthState = {
      businessId,
      nonce,
      redirectUri: frontendRedirectUri || '/dashboard/settings',
    };
    const stateString = Buffer.from(JSON.stringify(state)).toString('base64url');

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: GOOGLE_SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state: stateString,
    });

    return {
      url: `${GOOGLE_AUTH_URL}?${params.toString()}`,
      state: stateString,
    };
  }

  /**
   * Parse and validate state from OAuth callback
   */
  parseState(stateString: string): GoogleAuthState {
    try {
      const state = JSON.parse(
        Buffer.from(stateString, 'base64url').toString()
      ) as GoogleAuthState;

      if (!state.businessId || !state.nonce) {
        throw new ValidationError('Ugyldig OAuth state');
      }

      return state;
    } catch {
      throw new ValidationError('Ugyldig OAuth state');
    }
  }

  /**
   * Exchange authorization code for tokens
   */
  async handleCallback(
    code: string,
    state: GoogleAuthState
  ): Promise<{ businessId: string; redirectUri: string }> {
    if (!this.isConfigured()) {
      throw new ValidationError('Google OAuth er ikke konfigureret');
    }

    // Exchange code for tokens
    const tokenResponse = await this.exchangeCodeForTokens(code);

    // Store tokens in business settings
    await this.storeTokens(state.businessId, tokenResponse);

    return {
      businessId: state.businessId,
      redirectUri: state.redirectUri,
    };
  }

  /**
   * Exchange authorization code for access and refresh tokens
   */
  private async exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[GOOGLE_AUTH] Token exchange failed:', error);
      throw new UnauthorizedError('Kunne ikke bekræfte Google-konto');
    }

    return (await response.json()) as GoogleTokenResponse;
  }

  /**
   * Store OAuth tokens in business settings (encrypted)
   */
  private async storeTokens(
    businessId: string,
    tokens: GoogleTokenResponse
  ): Promise<void> {
    const business = await Business.findById(businessId);
    if (!business) {
      throw new NotFoundError('Virksomhed ikke fundet');
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    const googleSettings: GoogleBusinessSettings = {
      enabled: true,
      accessToken: encrypt(tokens.access_token),
      tokenExpiresAt: expiresAt,
      syncEnabled: true,
      syncIntervalHours: 2,
      replyEnabled: true,
      attributionEnabled: true,
    };
    if (tokens.refresh_token) {
      googleSettings.refreshToken = encrypt(tokens.refresh_token);
    }

    // Preserve existing settings if present
    const existingSettings = business.settings?.googleBusiness;
    if (existingSettings) {
      if (existingSettings.accountId) {
        googleSettings.accountId = existingSettings.accountId;
      }
      if (existingSettings.locationIds) {
        googleSettings.locationIds = existingSettings.locationIds;
      }
      if (existingSettings.lastSyncAt) {
        googleSettings.lastSyncAt = existingSettings.lastSyncAt;
      }
      if (existingSettings.lastSyncStatus) {
        googleSettings.lastSyncStatus = existingSettings.lastSyncStatus;
      }
    }

    business.settings = {
      ...business.settings,
      googleBusiness: googleSettings,
    };
    business.markModified('settings');
    await business.save();
  }

  /**
   * Refresh an expired access token
   */
  async refreshToken(businessId: string): Promise<string> {
    const business = await Business.findById(businessId);
    if (!business) {
      throw new NotFoundError('Virksomhed ikke fundet');
    }

    const googleSettings = business.settings?.googleBusiness;
    if (!googleSettings?.refreshToken) {
      throw new UnauthorizedError('Ingen Google-forbindelse. Log ind igen.');
    }

    const refreshToken = decrypt(googleSettings.refreshToken);

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[GOOGLE_AUTH] Token refresh failed:', error);
      // Clear invalid tokens - create new settings object without tokens
      const clearedSettings: GoogleBusinessSettings = {
        enabled: false,
        syncEnabled: googleSettings.syncEnabled,
        syncIntervalHours: googleSettings.syncIntervalHours,
        replyEnabled: googleSettings.replyEnabled,
        attributionEnabled: googleSettings.attributionEnabled,
        lastSyncStatus: 'error',
      };
      if (googleSettings.accountId) {
        clearedSettings.accountId = googleSettings.accountId;
      }
      if (googleSettings.locationIds) {
        clearedSettings.locationIds = googleSettings.locationIds;
      }
      if (googleSettings.lastSyncAt) {
        clearedSettings.lastSyncAt = googleSettings.lastSyncAt;
      }
      business.settings.googleBusiness = clearedSettings;
      business.markModified('settings');
      await business.save();
      throw new UnauthorizedError('Google-session er udløbet. Log ind igen.');
    }

    const tokens = (await response.json()) as GoogleTokenResponse;
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    business.settings.googleBusiness = {
      ...googleSettings,
      accessToken: encrypt(tokens.access_token),
      tokenExpiresAt: expiresAt,
    };
    business.markModified('settings');
    await business.save();

    return tokens.access_token;
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  async getValidToken(businessId: string): Promise<string> {
    const business = await Business.findById(businessId);
    if (!business) {
      throw new NotFoundError('Virksomhed ikke fundet');
    }

    const googleSettings = business.settings?.googleBusiness;
    if (!googleSettings?.enabled || !googleSettings.accessToken) {
      throw new UnauthorizedError('Google er ikke forbundet');
    }

    // Check if token is expired (with 5 minute buffer)
    const bufferMs = 5 * 60 * 1000;
    const isExpired =
      googleSettings.tokenExpiresAt &&
      new Date(googleSettings.tokenExpiresAt).getTime() < Date.now() + bufferMs;

    if (isExpired) {
      return this.refreshToken(businessId);
    }

    return decrypt(googleSettings.accessToken);
  }

  /**
   * Revoke access and clear stored tokens
   */
  async revokeAccess(businessId: string): Promise<void> {
    const business = await Business.findById(businessId);
    if (!business) {
      throw new NotFoundError('Virksomhed ikke fundet');
    }

    const googleSettings = business.settings?.googleBusiness;

    // Try to revoke the token at Google (best effort)
    if (googleSettings?.accessToken) {
      try {
        const token = decrypt(googleSettings.accessToken);
        await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
          method: 'POST',
        });
      } catch (error) {
        console.error('[GOOGLE_AUTH] Token revocation failed:', error);
        // Continue anyway - we'll clear local tokens
      }
    }

    // Clear stored tokens
    business.settings = {
      ...business.settings,
      googleBusiness: {
        enabled: false,
        syncEnabled: false,
        syncIntervalHours: 2,
        replyEnabled: false,
        attributionEnabled: false,
      },
    };
    business.markModified('settings');
    await business.save();
  }

  /**
   * Get connection status
   */
  async getConnectionStatus(businessId: string): Promise<{
    connected: boolean;
    accountId?: string;
    locationIds?: string[];
    syncEnabled: boolean;
    lastSyncAt?: Date;
    lastSyncStatus?: string;
  }> {
    const business = await Business.findById(businessId);
    if (!business) {
      throw new NotFoundError('Virksomhed ikke fundet');
    }

    const googleSettings = business.settings?.googleBusiness;
    if (!googleSettings?.enabled || !googleSettings.accessToken) {
      return { connected: false, syncEnabled: false };
    }

    // Build result object conditionally to satisfy exactOptionalPropertyTypes
    const result: {
      connected: boolean;
      accountId?: string;
      locationIds?: string[];
      syncEnabled: boolean;
      lastSyncAt?: Date;
      lastSyncStatus?: string;
    } = {
      connected: true,
      syncEnabled: googleSettings.syncEnabled,
    };

    if (googleSettings.accountId) {
      result.accountId = googleSettings.accountId;
    }
    if (googleSettings.locationIds) {
      result.locationIds = googleSettings.locationIds;
    }
    if (googleSettings.lastSyncAt) {
      result.lastSyncAt = googleSettings.lastSyncAt;
    }
    if (googleSettings.lastSyncStatus) {
      result.lastSyncStatus = googleSettings.lastSyncStatus;
    }

    return result;
  }
}

export const googleAuthService = new GoogleAuthService();
