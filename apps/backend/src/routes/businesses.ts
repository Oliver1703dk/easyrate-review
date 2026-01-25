import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { updateBusinessSchema, businessSettingsSchema, integrationConfigSchema } from '@easyrate/shared';
import { businessService } from '../services/BusinessService.js';
import { authenticateJwt } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { sendSuccess } from '../utils/response.js';
import { IntegrationRegistry } from '../integrations/IntegrationRegistry.js';
import { dullyAdapter } from '../integrations/dully/index.js';
import { easyTableAdapter, easyTablePoller } from '../integrations/easytable/index.js';
import { orderQueueService } from '../services/OrderQueueService.js';
import { ValidationError } from '../utils/errors.js';

const router = Router();

// All routes require JWT authentication
router.use(authenticateJwt);

// GET /api/v1/businesses/me - Get current business
router.get(
  '/me',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const business = await businessService.findByIdOrThrow(req.businessId!);
      sendSuccess(res, { business });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/v1/businesses/me - Update current business
router.patch(
  '/me',
  validateBody(updateBusinessSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const business = await businessService.update(req.businessId!, req.body);
      sendSuccess(res, { business });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/businesses/me/settings - Get business settings
router.get(
  '/me/settings',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const business = await businessService.findByIdOrThrow(req.businessId!);
      sendSuccess(res, { settings: business.settings });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/v1/businesses/me/settings - Update business settings
router.patch(
  '/me/settings',
  validateBody(businessSettingsSchema.partial()),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const business = await businessService.updateSettings(req.businessId!, req.body);
      sendSuccess(res, { settings: business.settings });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/businesses/me/integrations - Get business integrations
router.get(
  '/me/integrations',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const business = await businessService.findByIdOrThrow(req.businessId!);
      sendSuccess(res, { integrations: business.integrations });
    } catch (error) {
      next(error);
    }
  }
);

const platformParamSchema = z.object({
  platform: z.enum(['dully', 'easytable']),
});

const integrationUpdateSchema = integrationConfigSchema.partial().omit({ platform: true });

// PATCH /api/v1/businesses/me/integrations/:platform - Update specific integration
router.patch(
  '/me/integrations/:platform',
  validateParams(platformParamSchema),
  validateBody(integrationUpdateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const platform = req.params.platform as 'dully' | 'easytable';
      const business = await businessService.updateIntegration(
        req.businessId!,
        platform,
        req.body
      );
      const integration = business.integrations.find((i) => i.platform === platform);
      sendSuccess(res, { integration });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/businesses/me/integrations/:platform/test - Test integration connection
router.post(
  '/me/integrations/:platform/test',
  validateParams(platformParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const platform = req.params.platform as 'dully' | 'easytable';
      const business = await businessService.findByIdOrThrow(req.businessId!);

      const integration = business.integrations.find((i) => i.platform === platform);
      if (!integration) {
        throw new ValidationError(`Integration ${platform} ikke konfigureret`);
      }

      let connected = false;
      let message = '';

      if (platform === 'dully') {
        // For Dully, we just check if webhook secret is configured
        if (integration.webhookSecret) {
          await dullyAdapter.connect({
            platform: 'dully',
            enabled: true,
            webhookSecret: integration.webhookSecret,
          });
          connected = await dullyAdapter.testConnection();
          message = connected
            ? 'Dully webhook secret er konfigureret korrekt'
            : 'Dully webhook secret mangler';
        } else {
          message = 'Dully webhook secret er ikke konfigureret';
        }
      } else if (platform === 'easytable') {
        // For EasyTable, we test the API connection
        if (integration.apiKey) {
          await easyTableAdapter.connect({
            platform: 'easytable',
            enabled: true,
            apiKey: integration.apiKey,
          });
          connected = await easyTableAdapter.testConnection();
          message = connected
            ? 'EasyTable API forbindelse verificeret'
            : 'Kunne ikke forbinde til EasyTable API';
        } else {
          message = 'EasyTable API nøgle er ikke konfigureret';
        }
      }

      sendSuccess(res, {
        platform,
        connected,
        message,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/businesses/me/integrations/:platform/status - Get integration status
router.get(
  '/me/integrations/:platform/status',
  validateParams(platformParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const platform = req.params.platform as 'dully' | 'easytable';
      const businessId = req.businessId!;
      const business = await businessService.findByIdOrThrow(businessId);

      const integration = business.integrations.find((i) => i.platform === platform);
      const enabled = integration?.enabled ?? false;

      // Check if adapter is connected
      const adapter = IntegrationRegistry.get(platform);
      const connected = adapter ? await adapter.testConnection() : false;

      // Get pending notification count
      const pendingNotifications = await orderQueueService.getPendingCount(businessId);

      // For EasyTable, get last poll info
      let lastEventAt: Date | null = null;
      if (platform === 'easytable') {
        const pollerStatus = easyTablePoller.getStatus();
        const businessState = pollerStatus.businesses.find(
          (b) => b.businessId === businessId
        );
        if (businessState) {
          lastEventAt = businessState.lastPollAt;
        }
      }

      sendSuccess(res, {
        platform,
        enabled,
        connected,
        lastEventAt,
        pendingNotifications,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
