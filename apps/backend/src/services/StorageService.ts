import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { ValidationError } from '../utils/errors.js';

// File validation constants
const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_PHOTOS_PER_REVIEW = 5;
const MAX_FILENAME_LENGTH = 50;

// URL expiry times (in seconds)
const UPLOAD_URL_EXPIRY = parseInt(process.env.S3_UPLOAD_URL_EXPIRY || '300', 10); // 5 minutes
const DOWNLOAD_URL_EXPIRY = parseInt(process.env.S3_DOWNLOAD_URL_EXPIRY || '3600', 10); // 1 hour

export type AllowedContentType = typeof ALLOWED_CONTENT_TYPES[number];

export interface PresignedUploadResult {
  uploadUrl: string;
  fileKey: string;
  expiresAt: Date;
}

export interface PresignedDownloadResult {
  downloadUrl: string;
  expiresAt: Date;
}

/**
 * Sanitize filename to only allow alphanumeric and underscore characters
 */
function sanitizeFilename(filename: string): string {
  // Remove path separators and dangerous characters
  const basename = filename.split(/[/\\]/).pop() || filename;
  // Remove extension
  const parts = basename.split('.');
  const ext = parts.length > 1 ? parts.pop() : '';
  const name = parts.join('.');

  // Replace non-alphanumeric (except underscore) with underscore
  const sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, MAX_FILENAME_LENGTH);

  return ext ? `${sanitized}.${ext}` : sanitized;
}

/**
 * Get file extension from content type
 */
function getExtensionFromContentType(contentType: AllowedContentType): string {
  const mapping: Record<AllowedContentType, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  return mapping[contentType];
}

export class StorageService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    const region = process.env.AWS_REGION || 'eu-central-1';

    // Build S3Client config
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      this.s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
    } else {
      // Use default credential provider chain (IAM roles, etc.)
      this.s3Client = new S3Client({ region });
    }

    this.bucketName = process.env.S3_BUCKET_NAME || 'easyrate-uploads-eu';
  }

  /**
   * Validate content type is allowed
   */
  private validateContentType(contentType: string): contentType is AllowedContentType {
    return ALLOWED_CONTENT_TYPES.includes(contentType as AllowedContentType);
  }

  /**
   * Generate a presigned URL for uploading a file to S3
   * @param businessId - The business ID for scoping
   * @param reviewId - The review ID for organizing files (can be 'pending' for new reviews)
   * @param filename - Original filename
   * @param contentType - MIME type of the file
   * @returns Presigned upload URL and file key
   */
  async generateUploadUrl(
    businessId: string,
    reviewId: string,
    filename: string,
    contentType: string
  ): Promise<PresignedUploadResult> {
    // Validate content type
    if (!this.validateContentType(contentType)) {
      throw new ValidationError(
        'Ugyldig filtype. Kun JPG, PNG og WebP er tilladt.',
        { code: 'INVALID_FILE_TYPE', allowedTypes: ALLOWED_CONTENT_TYPES }
      );
    }

    // Generate unique file key
    const sanitizedFilename = sanitizeFilename(filename);
    const ext = getExtensionFromContentType(contentType);
    const uniqueId = uuidv4();
    const fileKey = `${businessId}/reviews/${reviewId}/${uniqueId}-${sanitizedFilename || `photo.${ext}`}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
      ContentType: contentType,
      // Server-side encryption
      ServerSideEncryption: 'AES256',
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: UPLOAD_URL_EXPIRY,
    });

    const expiresAt = new Date(Date.now() + UPLOAD_URL_EXPIRY * 1000);

    return {
      uploadUrl,
      fileKey,
      expiresAt,
    };
  }

  /**
   * Generate a presigned URL for downloading/viewing a file from S3
   * @param fileKey - The S3 object key
   * @returns Presigned download URL
   */
  async generateDownloadUrl(fileKey: string): Promise<PresignedDownloadResult> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
    });

    const downloadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: DOWNLOAD_URL_EXPIRY,
    });

    const expiresAt = new Date(Date.now() + DOWNLOAD_URL_EXPIRY * 1000);

    return {
      downloadUrl,
      expiresAt,
    };
  }

  /**
   * Delete a single file from S3
   * @param fileKey - The S3 object key to delete
   */
  async deleteFile(fileKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
    });

    await this.s3Client.send(command);
  }

  /**
   * Delete all files for a specific review
   * @param businessId - The business ID
   * @param reviewId - The review ID
   */
  async deleteReviewFiles(businessId: string, reviewId: string): Promise<number> {
    const prefix = `${businessId}/reviews/${reviewId}/`;
    return this.deleteFilesByPrefix(prefix);
  }

  /**
   * Delete all files for a business (for GDPR account deletion)
   * @param businessId - The business ID
   */
  async deleteBusinessFiles(businessId: string): Promise<number> {
    const prefix = `${businessId}/`;
    return this.deleteFilesByPrefix(prefix);
  }

  /**
   * Delete all files with a given prefix
   * @param prefix - The S3 key prefix
   * @returns Number of files deleted
   */
  private async deleteFilesByPrefix(prefix: string): Promise<number> {
    let deletedCount = 0;
    let continuationToken: string | undefined;

    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      });

      const listResponse = await this.s3Client.send(listCommand);
      const objects = listResponse.Contents || [];

      // Delete each object
      for (const obj of objects) {
        if (obj.Key) {
          await this.deleteFile(obj.Key);
          deletedCount++;
        }
      }

      continuationToken = listResponse.NextContinuationToken;
    } while (continuationToken);

    return deletedCount;
  }

  /**
   * Generate upload URL for branding assets (logos)
   * @param businessId - The business ID
   * @param _filename - Original filename (unused, but kept for API consistency)
   * @param contentType - MIME type
   */
  async generateBrandingUploadUrl(
    businessId: string,
    _filename: string,
    contentType: string
  ): Promise<PresignedUploadResult> {
    if (!this.validateContentType(contentType)) {
      throw new ValidationError(
        'Ugyldig filtype. Kun JPG, PNG og WebP er tilladt.',
        { code: 'INVALID_FILE_TYPE', allowedTypes: ALLOWED_CONTENT_TYPES }
      );
    }

    const ext = getExtensionFromContentType(contentType);
    const timestamp = Date.now();
    const fileKey = `${businessId}/branding/logo-${timestamp}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: UPLOAD_URL_EXPIRY,
    });

    const expiresAt = new Date(Date.now() + UPLOAD_URL_EXPIRY * 1000);

    return {
      uploadUrl,
      fileKey,
      expiresAt,
    };
  }
}

// Export singleton instance
export const storageService = new StorageService();

// Export constants for validation
export { ALLOWED_CONTENT_TYPES, MAX_FILE_SIZE_BYTES, MAX_PHOTOS_PER_REVIEW };
