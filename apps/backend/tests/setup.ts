import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  vi.clearAllMocks();
});

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-purposes-only';
process.env.JWT_EXPIRES_IN = '7d';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.SMS_API_KEY = 'test-sms-api-key';
process.env.SMS_API_SECRET = 'test-sms-api-secret';
process.env.SMS_SENDER_ID = 'EasyRate';
process.env.RESEND_API_KEY = 'test-resend-api-key';
process.env.EMAIL_FROM = 'test@easyrate.app';
process.env.EMAIL_FROM_NAME = 'EasyRate Test';
process.env.AWS_REGION = 'eu-central-1';
process.env.AWS_ACCESS_KEY_ID = 'test-aws-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-aws-secret-key';
process.env.S3_BUCKET_NAME = 'test-bucket';
