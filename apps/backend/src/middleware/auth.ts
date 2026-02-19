import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '@easyrate/shared';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { Business } from '../models/Business.js';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      businessId?: string;
      isServiceToken?: boolean;
    }
  }
}

export function authenticateJwt(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Manglende eller ugyldig authorization header'));
  }

  const token = authHeader.substring(7);

  // Try service JWT secret first (for webapp-proxied requests)
  const serviceSecret = process.env.REVIEW_SERVICE_JWT_SECRET;
  if (serviceSecret) {
    try {
      const decoded = jwt.verify(token, serviceSecret) as JwtPayload;
      req.user = decoded;
      req.businessId = decoded.businessId;
      req.isServiceToken = true;
      return next();
    } catch {
      // Not a service token — fall through to regular JWT_SECRET
    }
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    req.businessId = decoded.businessId;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new UnauthorizedError('Token er udløbet'));
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new UnauthorizedError('Ugyldig token'));
    }
    next(error);
  }
}

export async function authenticateApiKey(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return next(new UnauthorizedError('Manglende API nøgle'));
  }

  try {
    // Find business by integration API key
    const business = await Business.findOne({
      'integrations.apiKey': apiKey,
      'integrations.enabled': true,
    });

    if (!business) {
      return next(new UnauthorizedError('Ugyldig API nøgle'));
    }

    req.businessId = business._id.toString();
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...allowedRoles: Array<'admin' | 'user'>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Ikke autoriseret'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('Du har ikke tilladelse til denne handling'));
    }

    next();
  };
}
