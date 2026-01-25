import { vi } from 'vitest';

export interface MockUploadCall {
  bucket: string;
  key: string;
  contentType: string;
  timestamp: Date;
}

export interface MockDeleteCall {
  bucket: string;
  key: string;
  timestamp: Date;
}

export class MockS3Service {
  uploadCalls: MockUploadCall[] = [];
  deleteCalls: MockDeleteCall[] = [];
  private shouldFail = false;
  private failureMessage = '';

  generateUploadUrl = vi.fn(async (
    businessId: string,
    reviewId: string,
    filename: string,
    contentType: string
  ) => {
    const key = `uploads/${businessId}/${reviewId}/${Date.now()}-${filename}`;

    this.uploadCalls.push({
      bucket: process.env.S3_BUCKET_NAME || 'test-bucket',
      key,
      contentType,
      timestamp: new Date(),
    });

    if (this.shouldFail) {
      throw new Error(this.failureMessage || 'Mock S3 upload failure');
    }

    return {
      uploadUrl: `https://test-bucket.s3.eu-central-1.amazonaws.com/${key}?X-Amz-Algorithm=AWS4-HMAC-SHA256`,
      fileKey: key,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    };
  });

  getSignedUrl = vi.fn(async (key: string) => {
    return `https://test-bucket.s3.eu-central-1.amazonaws.com/${key}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=3600`;
  });

  deleteFile = vi.fn(async (key: string) => {
    this.deleteCalls.push({
      bucket: process.env.S3_BUCKET_NAME || 'test-bucket',
      key,
      timestamp: new Date(),
    });

    if (this.shouldFail) {
      throw new Error(this.failureMessage || 'Mock S3 delete failure');
    }

    return { success: true };
  });

  deleteFiles = vi.fn(async (keys: string[]) => {
    for (const key of keys) {
      this.deleteCalls.push({
        bucket: process.env.S3_BUCKET_NAME || 'test-bucket',
        key,
        timestamp: new Date(),
      });
    }

    if (this.shouldFail) {
      throw new Error(this.failureMessage || 'Mock S3 delete failure');
    }

    return { success: true, deletedCount: keys.length };
  });

  // Test helpers
  simulateFailure(message?: string): void {
    this.shouldFail = true;
    this.failureMessage = message || '';
  }

  simulateSuccess(): void {
    this.shouldFail = false;
    this.failureMessage = '';
  }

  reset(): void {
    this.uploadCalls = [];
    this.deleteCalls = [];
    this.shouldFail = false;
    this.failureMessage = '';
    this.generateUploadUrl.mockClear();
    this.getSignedUrl.mockClear();
    this.deleteFile.mockClear();
    this.deleteFiles.mockClear();
  }

  getUploadCount(): number {
    return this.uploadCalls.length;
  }

  getDeleteCount(): number {
    return this.deleteCalls.length;
  }
}

export const mockS3Service = new MockS3Service();
