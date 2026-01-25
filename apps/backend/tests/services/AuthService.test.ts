import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../../src/services/AuthService.js';
import { User } from '../../src/models/User.js';
import { Business } from '../../src/models/Business.js';
import jwt from 'jsonwebtoken';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
  });

  describe('register', () => {
    it('should register a new business and admin user', async () => {
      const input = {
        email: 'test@example.com',
        password: 'SecurePassword123',
        name: 'Test User',
        businessName: 'Test Restaurant',
      };

      const result = await authService.register(input);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.role).toBe('admin');
      expect(result.business).toBeDefined();
      expect(result.business.name).toBe('Test Restaurant');
      expect(result.token).toBeDefined();

      // Verify business was created
      const business = await Business.findById(result.business.id);
      expect(business).toBeDefined();
      expect(business?.name).toBe('Test Restaurant');

      // Verify user was created
      const user = await User.findById(result.user.id);
      expect(user).toBeDefined();
      expect(user?.email).toBe('test@example.com');
    });

    it('should normalize email to lowercase', async () => {
      const input = {
        email: 'Test@EXAMPLE.com',
        password: 'SecurePassword123',
        name: 'Test User',
        businessName: 'Test Restaurant',
      };

      const result = await authService.register(input);

      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw error for short password', async () => {
      const input = {
        email: 'test@example.com',
        password: 'short',
        name: 'Test User',
        businessName: 'Test Restaurant',
      };

      await expect(authService.register(input)).rejects.toThrow(
        'Adgangskode skal være mindst 8 tegn'
      );
    });

    it('should throw error for duplicate email', async () => {
      const input = {
        email: 'duplicate@example.com',
        password: 'SecurePassword123',
        name: 'Test User',
        businessName: 'Test Restaurant',
      };

      await authService.register(input);

      await expect(authService.register({
        ...input,
        businessName: 'Another Restaurant',
      })).rejects.toThrow('En bruger med denne email eksisterer allerede');
    });

    it('should hash password securely', async () => {
      const input = {
        email: 'test@example.com',
        password: 'SecurePassword123',
        name: 'Test User',
        businessName: 'Test Restaurant',
      };

      await authService.register(input);

      const user = await User.findOne({ email: 'test@example.com' });
      expect(user?.passwordHash).toBeDefined();
      expect(user?.passwordHash).not.toBe('SecurePassword123');
      expect(user?.passwordHash).toMatch(/^\$2[aby]\$/);
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await authService.register({
        email: 'login@example.com',
        password: 'SecurePassword123',
        name: 'Login User',
        businessName: 'Login Restaurant',
      });
    });

    it('should login with valid credentials', async () => {
      const result = await authService.login({
        email: 'login@example.com',
        password: 'SecurePassword123',
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('login@example.com');
      expect(result.token).toBeDefined();
    });

    it('should normalize email on login', async () => {
      const result = await authService.login({
        email: 'LOGIN@EXAMPLE.com',
        password: 'SecurePassword123',
      });

      expect(result.user.email).toBe('login@example.com');
    });

    it('should throw error for invalid email', async () => {
      await expect(authService.login({
        email: 'nonexistent@example.com',
        password: 'SecurePassword123',
      })).rejects.toThrow('Ugyldig email eller adgangskode');
    });

    it('should throw error for invalid password', async () => {
      await expect(authService.login({
        email: 'login@example.com',
        password: 'WrongPassword123',
      })).rejects.toThrow('Ugyldig email eller adgangskode');
    });

    it('should update lastLoginAt on successful login', async () => {
      const beforeLogin = new Date();
      await authService.login({
        email: 'login@example.com',
        password: 'SecurePassword123',
      });

      const user = await User.findOne({ email: 'login@example.com' });
      expect(user?.lastLoginAt).toBeDefined();
      expect(user!.lastLoginAt!.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
    });
  });

  describe('validateToken', () => {
    let validToken: string;

    beforeEach(async () => {
      const result = await authService.register({
        email: 'token@example.com',
        password: 'SecurePassword123',
        name: 'Token User',
        businessName: 'Token Restaurant',
      });
      validToken = result.token;
    });

    it('should validate a valid token', async () => {
      const payload = await authService.validateToken(validToken);

      expect(payload).toBeDefined();
      expect(payload.email).toBe('token@example.com');
      expect(payload.role).toBe('admin');
    });

    it('should throw error for invalid token', async () => {
      await expect(authService.validateToken('invalid-token')).rejects.toThrow(
        'Ugyldig token'
      );
    });

    it('should throw error for expired token', async () => {
      const expiredToken = jwt.sign(
        { sub: 'test', email: 'test@example.com', role: 'admin', businessId: 'test' },
        process.env.JWT_SECRET!,
        { expiresIn: '-1h' }
      );

      await expect(authService.validateToken(expiredToken)).rejects.toThrow(
        'Token er udløbet'
      );
    });
  });

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      const { user } = await authService.register({
        email: 'getuser@example.com',
        password: 'SecurePassword123',
        name: 'Get User',
        businessName: 'Get Restaurant',
      });

      const result = await authService.getUserById(user.id);

      expect(result).toBeDefined();
      expect(result?.email).toBe('getuser@example.com');
    });

    it('should return null for non-existent user', async () => {
      const result = await authService.getUserById('507f1f77bcf86cd799439011');
      expect(result).toBeNull();
    });
  });

  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      const hash = await authService.hashPassword('TestPassword123');

      expect(hash).toBeDefined();
      expect(hash).not.toBe('TestPassword123');
      expect(hash).toMatch(/^\$2[aby]\$/);
    });

    it('should generate different hashes for same password', async () => {
      const hash1 = await authService.hashPassword('TestPassword123');
      const hash2 = await authService.hashPassword('TestPassword123');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const hash = await authService.hashPassword('TestPassword123');
      const result = await authService.comparePassword('TestPassword123', hash);

      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const hash = await authService.hashPassword('TestPassword123');
      const result = await authService.comparePassword('WrongPassword', hash);

      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate valid JWT token', () => {
      const token = authService.generateToken({
        sub: 'user-id',
        businessId: 'business-id',
        email: 'test@example.com',
        role: 'admin',
      });

      expect(token).toBeDefined();

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;
      expect(decoded.sub).toBe('user-id');
      expect(decoded.email).toBe('test@example.com');
    });
  });

  describe('refreshToken', () => {
    it('should refresh a valid token', async () => {
      const { token: oldToken } = await authService.register({
        email: 'refresh@example.com',
        password: 'SecurePassword123',
        name: 'Refresh User',
        businessName: 'Refresh Restaurant',
      });

      const newToken = authService.refreshToken(oldToken);

      expect(newToken).toBeDefined();
      // New token should be a valid JWT
      expect(newToken).toMatch(/^eyJ/);

      // Verify new token is valid and contains same user info
      const decoded = jwt.verify(newToken, process.env.JWT_SECRET!) as jwt.JwtPayload;
      expect(decoded.email).toBe('refresh@example.com');
    });
  });
});
