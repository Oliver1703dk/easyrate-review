import { Router, Request, Response, NextFunction } from 'express';
import { WebappBridgeService } from '../services/WebappBridgeService.js';
import { sendSuccess } from '../utils/response.js';
import { UnauthorizedError, ValidationError } from '../utils/errors.js';

const router = Router();

/** Simple shared-secret auth for internal service-to-service calls. */
function authenticateServiceSecret(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const secret = process.env.REVIEW_SERVICE_JWT_SECRET;
  if (!secret) {
    return next(new UnauthorizedError('Service secret not configured'));
  }

  const provided = req.headers['x-service-secret'] as string;
  if (!provided || provided !== secret) {
    return next(new UnauthorizedError('Invalid service secret'));
  }

  next();
}

router.post(
  '/bridge/find-or-create-user',
  authenticateServiceSecret,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { webappUserId, email, name, businessName } = req.body;

      if (!webappUserId || !email) {
        throw new ValidationError('webappUserId and email are required');
      }

      const result = await WebappBridgeService.findOrCreateReviewUser({
        webappUserId,
        email,
        name,
        businessName,
      });

      sendSuccess(res, result, result.isNew ? 201 : 200);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
