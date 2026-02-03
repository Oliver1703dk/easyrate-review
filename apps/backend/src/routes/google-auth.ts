import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { googleAuthService } from '../services/GoogleAuthService.js';
import { authenticateJwt } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { sendSuccess } from '../utils/response.js';
import { ValidationError } from '../utils/errors.js';
import { isGoogleConfigured } from '../providers/ProviderFactory.js';

const router = Router();

// GET /api/v1/google/auth/url - Get OAuth authorization URL
router.get(
  '/url',
  authenticateJwt,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!isGoogleConfigured()) {
        throw new ValidationError('Google OAuth er ikke konfigureret');
      }

      const redirectUri = req.query.redirectUri as string | undefined;
      const { url, state } = googleAuthService.getAuthorizationUrl(
        req.businessId!,
        redirectUri
      );

      sendSuccess(res, { authorizationUrl: url, state });
    } catch (error) {
      next(error);
    }
  }
);

// OAuth callback query schema
const callbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

// GET /api/v1/google/auth/callback - OAuth callback handler
router.get(
  '/callback',
  validateQuery(callbackQuerySchema),
  async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const { code, state, error, error_description } = req.query as z.infer<
        typeof callbackQuerySchema
      >;

      // Handle OAuth errors
      if (error) {
        console.error('[GOOGLE_AUTH] OAuth error:', error, error_description);
        // Redirect to frontend with error
        const errorParams = new URLSearchParams({
          error: error as string,
          error_description: (error_description as string) || 'Google forbindelse mislykkedes',
        });
        return res.redirect(`/dashboard/settings?${errorParams.toString()}`);
      }

      // Parse and validate state
      const parsedState = googleAuthService.parseState(state);

      // Exchange code for tokens and store them
      const result = await googleAuthService.handleCallback(code, parsedState);

      // Redirect to frontend with success
      const successParams = new URLSearchParams({
        google_connected: 'true',
      });
      res.redirect(`${result.redirectUri}?${successParams.toString()}`);
    } catch (error) {
      console.error('[GOOGLE_AUTH] Callback error:', error);
      // Redirect to frontend with error
      const errorParams = new URLSearchParams({
        error: 'callback_failed',
        error_description: error instanceof Error ? error.message : 'Ukendt fejl',
      });
      res.redirect(`/dashboard/settings?${errorParams.toString()}`);
    }
  }
);

// POST /api/v1/google/auth/revoke - Disconnect Google account
router.post(
  '/revoke',
  authenticateJwt,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await googleAuthService.revokeAccess(req.businessId!);
      sendSuccess(res, { message: 'Google konto afbrudt' });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/google/auth/status - Check connection status
router.get(
  '/status',
  authenticateJwt,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = await googleAuthService.getConnectionStatus(req.businessId!);
      sendSuccess(res, status);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
