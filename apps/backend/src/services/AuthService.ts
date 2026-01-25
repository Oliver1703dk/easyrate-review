import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '@easyrate/shared';
import { User, UserDocument } from '../models/User.js';
import { Business } from '../models/Business.js';
import { UnauthorizedError, ConflictError, ValidationError } from '../utils/errors.js';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  businessName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name?: string;
    role: 'admin' | 'user';
    businessId: string;
  };
  business: {
    id: string;
    name: string;
  };
  token: string;
}

function toUserResponse(user: UserDocument): AuthResponse['user'] {
  const response: AuthResponse['user'] = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    businessId: user.businessId.toString(),
  };
  if (user.name) {
    response.name = user.name;
  }
  return response;
}

export class AuthService {
  async register(input: RegisterInput): Promise<AuthResponse> {
    // Validate password
    if (input.password.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(`Adgangskode skal være mindst ${MIN_PASSWORD_LENGTH} tegn`);
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: input.email.toLowerCase() });
    if (existingUser) {
      throw new ConflictError('En bruger med denne email eksisterer allerede');
    }

    // Create business first
    const business = new Business({
      name: input.businessName,
      email: input.email.toLowerCase(),
      settings: {},
      integrations: [],
      messageTemplates: {},
      branding: {},
    });
    await business.save();

    // Hash password and create user
    const passwordHash = await this.hashPassword(input.password);
    const user = new User({
      businessId: business._id,
      email: input.email.toLowerCase(),
      passwordHash,
      name: input.name,
      role: 'admin', // First user is always admin
    });
    await user.save();

    // Generate token
    const token = this.generateToken({
      sub: user._id.toString(),
      businessId: business._id.toString(),
      email: user.email,
      role: user.role,
    });

    return {
      user: toUserResponse(user),
      business: {
        id: business._id.toString(),
        name: business.name,
      },
      token,
    };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    // Find user
    const user = await User.findOne({ email: input.email.toLowerCase() });
    if (!user) {
      throw new UnauthorizedError('Ugyldig email eller adgangskode');
    }

    // Verify password
    const isValid = await this.comparePassword(input.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Ugyldig email eller adgangskode');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Get business
    const business = await Business.findById(user.businessId);
    if (!business) {
      throw new UnauthorizedError('Virksomhed ikke fundet');
    }

    // Generate token
    const token = this.generateToken({
      sub: user._id.toString(),
      businessId: business._id.toString(),
      email: user.email,
      role: user.role,
    });

    return {
      user: toUserResponse(user),
      business: {
        id: business._id.toString(),
        name: business.name,
      },
      token,
    };
  }

  async validateToken(token: string): Promise<JwtPayload> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Token er udløbet');
      }
      throw new UnauthorizedError('Ugyldig token');
    }
  }

  async getUserById(userId: string): Promise<AuthResponse['user'] | null> {
    const user = await User.findById(userId);
    return user ? toUserResponse(user) : null;
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
  }

  refreshToken(token: string): string {
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true }) as JwtPayload;
    return this.generateToken({
      sub: decoded.sub,
      businessId: decoded.businessId,
      email: decoded.email,
      role: decoded.role,
    });
  }
}

export const authService = new AuthService();
