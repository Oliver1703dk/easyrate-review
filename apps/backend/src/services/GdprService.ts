import mongoose from 'mongoose';
import archiver from 'archiver';
import { PassThrough } from 'stream';
import { Upload } from '@aws-sdk/lib-storage';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Review } from '../models/Review.js';
import { Notification } from '../models/Notification.js';
import { Business } from '../models/Business.js';
import { storageService } from './StorageService.js';
import { NotFoundError } from '../utils/errors.js';

const EXPORT_URL_EXPIRY = 3600; // 1 hour

export interface CustomerIdentifier {
  email?: string;
  phone?: string;
}

export interface GdprExportResult {
  downloadUrl: string;
  expiresAt: Date;
  fileKey: string;
}

export interface DeletionResult {
  reviewsDeleted: number;
  notificationsDeleted: number;
  filesDeleted: number;
}

export interface RetentionResult {
  reviewsDeleted: number;
  notificationsDeleted: number;
  filesDeleted: number;
  cutoffDate: Date;
}

export class GdprService {
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
   * Export all business data as a ZIP file
   * @param businessId - The business ID
   * @returns Download URL for the export
   */
  async exportBusinessData(businessId: string): Promise<GdprExportResult> {
    // Verify business exists
    const business = await Business.findById(businessId);
    if (!business) {
      throw new NotFoundError('Virksomheden blev ikke fundet');
    }

    // Fetch all data
    const [reviews, notifications] = await Promise.all([
      Review.find({ businessId: new mongoose.Types.ObjectId(businessId) }).lean(),
      Notification.find({ businessId: new mongoose.Types.ObjectId(businessId) }).lean(),
    ]);

    // Create export data structure
    const exportData = {
      exportedAt: new Date().toISOString(),
      business: {
        id: business._id.toString(),
        name: business.name,
        email: business.email,
        phone: business.phone,
        address: business.address,
        settings: business.settings,
        branding: business.branding,
        messageTemplates: business.messageTemplates,
        createdAt: business.createdAt,
        updatedAt: business.updatedAt,
      },
      reviews: reviews.map((r) => ({
        id: r._id.toString(),
        rating: r.rating,
        feedbackText: r.feedbackText,
        customer: r.customer,
        sourcePlatform: r.sourcePlatform,
        orderId: r.orderId,
        photos: r.photos,
        isPublic: r.isPublic,
        submittedExternalReview: r.submittedExternalReview,
        consent: r.consent,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      notifications: notifications.map((n) => ({
        id: n._id.toString(),
        type: n.type,
        status: n.status,
        recipient: n.recipient,
        subject: n.subject,
        content: n.content,
        orderId: n.orderId,
        consent: n.consent,
        sentAt: n.sentAt,
        deliveredAt: n.deliveredAt,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      })),
      summary: {
        totalReviews: reviews.length,
        totalNotifications: notifications.length,
      },
    };

    // Create ZIP archive
    const timestamp = Date.now();
    const fileKey = `_system/exports/${businessId}/gdpr-export-${timestamp}.zip`;

    const archive = archiver('zip', { zlib: { level: 9 } });
    const passThrough = new PassThrough();

    archive.pipe(passThrough);

    // Add data.json to archive
    archive.append(JSON.stringify(exportData, null, 2), { name: 'data.json' });

    // Finalize archive
    archive.finalize();

    // Upload to S3
    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: this.bucketName,
        Key: fileKey,
        Body: passThrough,
        ContentType: 'application/zip',
        ServerSideEncryption: 'AES256',
      },
    });

    await upload.done();

    // Generate download URL
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
    });

    const downloadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: EXPORT_URL_EXPIRY,
    });

    const expiresAt = new Date(Date.now() + EXPORT_URL_EXPIRY * 1000);

    return {
      downloadUrl,
      expiresAt,
      fileKey,
    };
  }

  /**
   * Export customer-specific data
   * @param businessId - The business ID
   * @param identifier - Customer email or phone
   * @returns Download URL for the export
   */
  async exportCustomerData(
    businessId: string,
    identifier: CustomerIdentifier
  ): Promise<GdprExportResult> {
    if (!identifier.email && !identifier.phone) {
      throw new NotFoundError('Email eller telefonnummer er påkrævet');
    }

    // Build query for customer data
    const customerQuery: Record<string, unknown> = {
      businessId: new mongoose.Types.ObjectId(businessId),
    };

    if (identifier.email) {
      customerQuery['customer.email'] = identifier.email.toLowerCase();
    }
    if (identifier.phone) {
      customerQuery['customer.phone'] = identifier.phone;
    }

    // Build notification query
    const notificationQuery: Record<string, unknown> = {
      businessId: new mongoose.Types.ObjectId(businessId),
      recipient: identifier.email || identifier.phone,
    };

    const [reviews, notifications] = await Promise.all([
      Review.find(customerQuery).lean(),
      Notification.find(notificationQuery).lean(),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      customerIdentifier: identifier,
      reviews: reviews.map((r) => ({
        id: r._id.toString(),
        rating: r.rating,
        feedbackText: r.feedbackText,
        customer: r.customer,
        sourcePlatform: r.sourcePlatform,
        photos: r.photos,
        consent: r.consent,
        createdAt: r.createdAt,
      })),
      notifications: notifications.map((n) => ({
        id: n._id.toString(),
        type: n.type,
        status: n.status,
        recipient: n.recipient,
        consent: n.consent,
        sentAt: n.sentAt,
        deliveredAt: n.deliveredAt,
        createdAt: n.createdAt,
      })),
      summary: {
        totalReviews: reviews.length,
        totalNotifications: notifications.length,
      },
    };

    const timestamp = Date.now();
    const fileKey = `_system/exports/${businessId}/customer-export-${timestamp}.zip`;

    const archive = archiver('zip', { zlib: { level: 9 } });
    const passThrough = new PassThrough();

    archive.pipe(passThrough);
    archive.append(JSON.stringify(exportData, null, 2), { name: 'customer-data.json' });
    archive.finalize();

    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: this.bucketName,
        Key: fileKey,
        Body: passThrough,
        ContentType: 'application/zip',
        ServerSideEncryption: 'AES256',
      },
    });

    await upload.done();

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
    });

    const downloadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: EXPORT_URL_EXPIRY,
    });

    const expiresAt = new Date(Date.now() + EXPORT_URL_EXPIRY * 1000);

    return {
      downloadUrl,
      expiresAt,
      fileKey,
    };
  }

  /**
   * Delete all data for a specific customer
   * @param businessId - The business ID
   * @param identifier - Customer email or phone
   * @returns Deletion statistics
   */
  async deleteCustomerData(
    businessId: string,
    identifier: CustomerIdentifier
  ): Promise<DeletionResult> {
    if (!identifier.email && !identifier.phone) {
      throw new NotFoundError('Email eller telefonnummer er påkrævet');
    }

    const businessObjId = new mongoose.Types.ObjectId(businessId);

    // Build query for reviews
    const reviewQuery: Record<string, unknown> = { businessId: businessObjId };
    if (identifier.email) {
      reviewQuery['customer.email'] = identifier.email.toLowerCase();
    }
    if (identifier.phone) {
      reviewQuery['customer.phone'] = identifier.phone;
    }

    // Find reviews to delete their files
    const reviewsToDelete = await Review.find(reviewQuery).lean();

    // Delete files for each review
    let filesDeleted = 0;
    for (const review of reviewsToDelete) {
      if (review.photos && review.photos.length > 0) {
        for (const fileKey of review.photos) {
          try {
            await storageService.deleteFile(fileKey);
            filesDeleted++;
          } catch {
            // Continue even if file deletion fails
          }
        }
      }
    }

    // Delete reviews
    const reviewResult = await Review.deleteMany(reviewQuery);

    // Delete notifications
    const notificationQuery: Record<string, unknown> = {
      businessId: businessObjId,
      recipient: identifier.email || identifier.phone,
    };
    const notificationResult = await Notification.deleteMany(notificationQuery);

    return {
      reviewsDeleted: reviewResult.deletedCount,
      notificationsDeleted: notificationResult.deletedCount,
      filesDeleted,
    };
  }

  /**
   * Delete entire business account and all associated data
   * @param businessId - The business ID
   * @returns Deletion statistics
   */
  async deleteBusinessData(businessId: string): Promise<DeletionResult> {
    const businessObjId = new mongoose.Types.ObjectId(businessId);

    // Verify business exists
    const business = await Business.findById(businessId);
    if (!business) {
      throw new NotFoundError('Virksomheden blev ikke fundet');
    }

    // Delete all files from S3
    const filesDeleted = await storageService.deleteBusinessFiles(businessId);

    // Delete all reviews
    const reviewResult = await Review.deleteMany({ businessId: businessObjId });

    // Delete all notifications
    const notificationResult = await Notification.deleteMany({ businessId: businessObjId });

    // Delete the business itself
    await Business.findByIdAndDelete(businessId);

    return {
      reviewsDeleted: reviewResult.deletedCount,
      notificationsDeleted: notificationResult.deletedCount,
      filesDeleted,
    };
  }

  /**
   * Apply data retention policy - delete data older than specified days
   * @param businessId - The business ID
   * @param retentionDays - Number of days to retain data
   * @returns Retention statistics
   */
  async applyRetentionPolicy(
    businessId: string,
    retentionDays: number
  ): Promise<RetentionResult> {
    const businessObjId = new mongoose.Types.ObjectId(businessId);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Find old reviews with photos
    const oldReviews = await Review.find({
      businessId: businessObjId,
      createdAt: { $lt: cutoffDate },
    }).lean();

    // Delete files for old reviews
    let filesDeleted = 0;
    for (const review of oldReviews) {
      if (review.photos && review.photos.length > 0) {
        for (const fileKey of review.photos) {
          try {
            await storageService.deleteFile(fileKey);
            filesDeleted++;
          } catch {
            // Continue even if file deletion fails
          }
        }
      }
    }

    // Delete old reviews
    const reviewResult = await Review.deleteMany({
      businessId: businessObjId,
      createdAt: { $lt: cutoffDate },
    });

    // Delete old notifications
    const notificationResult = await Notification.deleteMany({
      businessId: businessObjId,
      createdAt: { $lt: cutoffDate },
    });

    // Update lastRetentionRun on business
    await Business.findByIdAndUpdate(businessId, {
      'settings.gdpr.lastRetentionRun': new Date(),
    });

    return {
      reviewsDeleted: reviewResult.deletedCount,
      notificationsDeleted: notificationResult.deletedCount,
      filesDeleted,
      cutoffDate,
    };
  }
}

// Export singleton instance
export const gdprService = new GdprService();
