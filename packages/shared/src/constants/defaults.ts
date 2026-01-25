export const INTEGRATION_DELAYS = {
  dully: 60, // 1 hour after pickup
  easytable: 120, // 2 hours after booking
} as const;

export const PAGINATION = {
  defaultLimit: 20,
  maxLimit: 100,
} as const;

export const REVIEW_THRESHOLDS = {
  negative: [1, 2, 3] as const, // Private feedback form
  positive: [4, 5] as const, // Google review prompt
} as const;

export const DEFAULT_BUSINESS_SETTINGS = {
  defaultDelayMinutes: 60,
  smsEnabled: true,
  emailEnabled: false,
  primaryColor: '#3B82F6', // Blue-500
} as const;

export const DEFAULT_BRANDING = {
  primaryColor: '#3B82F6',
} as const;

export const SMS_LIMITS = {
  maxLength: 160,
  maxLengthWithLink: 140, // Leave room for short URLs
} as const;

export const FILE_UPLOAD = {
  maxPhotoSizeMb: 5,
  maxPhotosPerReview: 5,
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
} as const;

export const API_VERSIONS = {
  current: 'v1',
} as const;
