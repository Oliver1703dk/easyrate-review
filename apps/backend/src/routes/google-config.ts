import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { googleAuthService } from '../services/GoogleAuthService.js';
import { googleBusinessProvider } from '../providers/google/GoogleBusinessProvider.js';
import { businessService } from '../services/BusinessService.js';
import { authenticateJwt } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { sendSuccess } from '../utils/response.js';
import { ValidationError } from '../utils/errors.js';
import { Business } from '../models/Business.js';

const router = Router();

// GET /api/v1/google/locations - List available Google Business locations
router.get(
  '/locations',
  authenticateJwt,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get valid access token
      const accessToken = await googleAuthService.getValidToken(req.businessId!);

      // Fetch locations from Google
      const locations = await googleBusinessProvider.getLocations(accessToken);

      sendSuccess(res, { locations });
    } catch (error) {
      next(error);
    }
  }
);

// Save locations schema
const saveLocationsSchema = z.object({
  locationIds: z.array(z.string()).min(1, 'Vælg mindst én lokation'),
});

// POST /api/v1/google/locations - Save selected locations
router.post(
  '/locations',
  authenticateJwt,
  validateBody(saveLocationsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { locationIds } = req.body as z.infer<typeof saveLocationsSchema>;

      const business = await Business.findById(req.businessId!);
      if (!business) {
        throw new ValidationError('Virksomhed ikke fundet');
      }

      if (!business.settings?.googleBusiness?.enabled) {
        throw new ValidationError('Google er ikke forbundet');
      }

      business.settings.googleBusiness.locationIds = locationIds;
      business.markModified('settings');
      await business.save();

      sendSuccess(res, { message: 'Lokationer gemt', locationIds });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/google/settings - Get Google sync settings
router.get(
  '/settings',
  authenticateJwt,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const business = await businessService.findByIdOrThrow(req.businessId!);

      const googleSettings = business.settings?.googleBusiness;
      if (!googleSettings) {
        sendSuccess(res, {
          enabled: false,
          syncEnabled: false,
          syncIntervalHours: 2,
          replyEnabled: false,
          attributionEnabled: false,
        });
        return;
      }

      // Return settings without sensitive data (tokens)
      sendSuccess(res, {
        enabled: googleSettings.enabled,
        accountId: googleSettings.accountId,
        locationIds: googleSettings.locationIds,
        syncEnabled: googleSettings.syncEnabled,
        syncIntervalHours: googleSettings.syncIntervalHours,
        lastSyncAt: googleSettings.lastSyncAt,
        lastSyncStatus: googleSettings.lastSyncStatus,
        replyEnabled: googleSettings.replyEnabled,
        attributionEnabled: googleSettings.attributionEnabled,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update settings schema
const updateSettingsSchema = z.object({
  syncEnabled: z.boolean().optional(),
  syncIntervalHours: z.number().int().min(1).max(24).optional(),
  replyEnabled: z.boolean().optional(),
  attributionEnabled: z.boolean().optional(),
});

// PUT /api/v1/google/settings - Update settings
router.put(
  '/settings',
  authenticateJwt,
  validateBody(updateSettingsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updates = req.body as z.infer<typeof updateSettingsSchema>;

      const business = await Business.findById(req.businessId!);
      if (!business) {
        throw new ValidationError('Virksomhed ikke fundet');
      }

      if (!business.settings?.googleBusiness?.enabled) {
        throw new ValidationError('Google er ikke forbundet');
      }

      // Update settings
      if (updates.syncEnabled !== undefined) {
        business.settings.googleBusiness.syncEnabled = updates.syncEnabled;
      }
      if (updates.syncIntervalHours !== undefined) {
        business.settings.googleBusiness.syncIntervalHours = updates.syncIntervalHours;
      }
      if (updates.replyEnabled !== undefined) {
        business.settings.googleBusiness.replyEnabled = updates.replyEnabled;
      }
      if (updates.attributionEnabled !== undefined) {
        business.settings.googleBusiness.attributionEnabled = updates.attributionEnabled;
      }

      business.markModified('settings');
      await business.save();

      sendSuccess(res, {
        message: 'Indstillinger opdateret',
        settings: {
          enabled: business.settings.googleBusiness.enabled,
          syncEnabled: business.settings.googleBusiness.syncEnabled,
          syncIntervalHours: business.settings.googleBusiness.syncIntervalHours,
          replyEnabled: business.settings.googleBusiness.replyEnabled,
          attributionEnabled: business.settings.googleBusiness.attributionEnabled,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/google/accounts - List available Google Business accounts
router.get(
  '/accounts',
  authenticateJwt,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get valid access token
      const accessToken = await googleAuthService.getValidToken(req.businessId!);

      // Fetch accounts from Google
      const accounts = await googleBusinessProvider.getAccounts(accessToken);

      sendSuccess(res, { accounts });
    } catch (error) {
      next(error);
    }
  }
);

// Save account schema
const saveAccountSchema = z.object({
  accountId: z.string().min(1, 'Vælg en konto'),
});

// POST /api/v1/google/accounts - Save selected account
router.post(
  '/accounts',
  authenticateJwt,
  validateBody(saveAccountSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accountId } = req.body as z.infer<typeof saveAccountSchema>;

      const business = await Business.findById(req.businessId!);
      if (!business) {
        throw new ValidationError('Virksomhed ikke fundet');
      }

      if (!business.settings?.googleBusiness?.enabled) {
        throw new ValidationError('Google er ikke forbundet');
      }

      business.settings.googleBusiness.accountId = accountId;
      business.markModified('settings');
      await business.save();

      sendSuccess(res, { message: 'Konto gemt', accountId });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
