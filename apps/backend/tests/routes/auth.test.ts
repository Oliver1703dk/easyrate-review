import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { authService } from '../../src/services/AuthService.js';
import authRoutes from '../../src/routes/auth.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';

describe('Auth Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);
    app.use(errorHandler);
  });

  describe('POST /auth/register', () => {
    it('should register a new user and business', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePassword123',
          name: 'New User',
          businessName: 'New Restaurant',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe('newuser@example.com');
      expect(response.body.data.business).toBeDefined();
      expect(response.body.data.business.name).toBe('New Restaurant');
      expect(response.body.data.token).toBeDefined();
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          password: 'SecurePassword123',
          name: 'New User',
          businessName: 'New Restaurant',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'not-an-email',
          password: 'SecurePassword123',
          name: 'New User',
          businessName: 'New Restaurant',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for short password', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'short',
          name: 'New User',
          businessName: 'New Restaurant',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      // Zod validation catches password length before service layer
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 for duplicate email', async () => {
      // First registration
      await request(app)
        .post('/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'SecurePassword123',
          name: 'First User',
          businessName: 'First Restaurant',
        });

      // Second registration with same email
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'SecurePassword456',
          name: 'Second User',
          businessName: 'Second Restaurant',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('email eksisterer allerede');
    });

    it('should handle Danish characters in business name', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'danish@example.com',
          password: 'SecurePassword123',
          name: 'Søren Ægesen',
          businessName: 'Café Ødegård',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.business.name).toBe('Café Ødegård');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await authService.register({
        email: 'login@example.com',
        password: 'SecurePassword123',
        name: 'Login User',
        businessName: 'Login Restaurant',
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'SecurePassword123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.token).toBeDefined();
    });

    it('should return 401 for invalid password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'WrongPassword123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Ugyldig email eller adgangskode');
    });

    it('should return 401 for non-existent email', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SecurePassword123',
        });

      expect(response.status).toBe(401);
      expect(response.body.error.message).toBe('Ugyldig email eller adgangskode');
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          password: 'SecurePassword123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /auth/me', () => {
    let token: string;

    beforeEach(async () => {
      const result = await authService.register({
        email: 'me@example.com',
        password: 'SecurePassword123',
        name: 'Me User',
        businessName: 'Me Restaurant',
      });
      token = result.token;
    });

    it('should return current user with valid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe('me@example.com');
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 with malformed authorization header', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'NotBearer token');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /auth/refresh', () => {
    let token: string;

    beforeEach(async () => {
      const result = await authService.register({
        email: 'refresh@example.com',
        password: 'SecurePassword123',
        name: 'Refresh User',
        businessName: 'Refresh Restaurant',
      });
      token = result.token;
    });

    it('should refresh token with valid token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      // New token should be valid JWT
      expect(response.body.data.token).toMatch(/^eyJ/);
    });

    it('should return 401 without token', async () => {
      const response = await request(app).post('/auth/refresh');

      expect(response.status).toBe(401);
    });
  });
});
