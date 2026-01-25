/**
 * GDPR-related types for consent tracking and data management
 */

/**
 * Consent record for reviews and other user-submitted data
 */
export interface ConsentRecord {
  given: boolean;
  timestamp: Date;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  version: string;
}

/**
 * GDPR settings for a business
 */
export interface GdprSettings {
  dataRetentionDays: number;
  privacyPolicyUrl?: string;
  autoDeleteEnabled: boolean;
  lastRetentionRun?: Date;
}

/**
 * Consent tracking for notifications
 */
export interface NotificationConsent {
  marketingOptIn: boolean;
  consentTimestamp?: Date;
  consentSource?: 'order' | 'signup' | 'manual';
}

/**
 * Request for presigned upload URL
 */
export interface PresignedUploadRequest {
  filename: string;
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
}

/**
 * Response with presigned upload URL
 */
export interface PresignedUploadResponse {
  uploadUrl: string;
  fileKey: string;
  expiresAt: string;
}

/**
 * Request for presigned download URL
 */
export interface PresignedDownloadRequest {
  fileKey: string;
}

/**
 * Response with presigned download URL
 */
export interface PresignedDownloadResponse {
  downloadUrl: string;
  expiresAt: string;
}

/**
 * Customer identifier for GDPR operations
 */
export interface CustomerIdentifier {
  email?: string;
  phone?: string;
}

/**
 * Result of GDPR export operation
 */
export interface GdprExportResponse {
  downloadUrl: string;
  expiresAt: string;
  message: string;
}

/**
 * Result of GDPR deletion operation
 */
export interface GdprDeletionResponse {
  reviewsDeleted: number;
  notificationsDeleted: number;
  filesDeleted: number;
  message: string;
}

/**
 * Result of retention policy application
 */
export interface RetentionPolicyResponse {
  reviewsDeleted: number;
  notificationsDeleted: number;
  filesDeleted: number;
  cutoffDate: string;
  message: string;
}

/**
 * Request to apply retention policy
 */
export interface ApplyRetentionRequest {
  retentionDays: number;
}
