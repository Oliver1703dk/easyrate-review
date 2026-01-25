import { Router, Request, Response, NextFunction } from 'express';
import { registerSchema, loginSchema } from '@easyrate/shared';
import { authService } from '../services/AuthService.js';
import { authenticateJwt } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { sendSuccess } from '../utils/response.js';

const router = Router();

// POST /api/v1/auth/register - Register new business and user
router.post(
  '/register',
  validateBody(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.register(req.body);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/auth/login - Login user
router.post(
  '/login',
  validateBody(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.login(req.body);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/auth/me - Get current user
router.get(
  '/me',
  authenticateJwt,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await authService.getUserById(req.user!.sub);
      sendSuccess(res, { user });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/auth/refresh - Refresh JWT token
router.post(
  '/refresh',
  authenticateJwt,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization!;
      const oldToken = authHeader.substring(7);
      const newToken = authService.refreshToken(oldToken);
      sendSuccess(res, { token: newToken });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
