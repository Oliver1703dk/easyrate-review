import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { authenticateJwt } from '../middleware/auth.js';
import { storageService, ALLOWED_CONTENT_TYPES } from '../services/StorageService.js';
import { sendSuccess } from '../utils/response.js';

const router = Router();

// Schema for presigned upload request
const presignedUploadSchema = z.object({
  businessId: z.string().min(1),
  reviewId: z.string().min(1),
  filename: z.string().min(1).max(100),
  contentType: z.enum(ALLOWED_CONTENT_TYPES as unknown as [string, ...string[]]),
});

// Schema for download URL request
const downloadUrlSchema = z.object({
  fileKey: z.string().min(1),
});

/**
 * POST /api/v1/uploads/presigned
 * Get a presigned URL for uploading a file to S3
 * Note: This endpoint is public for landing page uploads
 * The businessId is validated against the review token in the client
 */
router.post(
  '/presigned',
  validateBody(presignedUploadSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessId, reviewId, filename, contentType } = req.body;

      const result = await storageService.generateUploadUrl(
        businessId,
        reviewId,
        filename,
        contentType
      );

      sendSuccess(res, {
        uploadUrl: result.uploadUrl,
        fileKey: result.fileKey,
        expiresAt: result.expiresAt.toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/uploads/download-url
 * Get a presigned URL for downloading/viewing a file
 * Requires authentication
 */
router.post(
  '/download-url',
  authenticateJwt,
  validateBody(downloadUrlSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fileKey } = req.body;

      // Verify the file key belongs to the authenticated business
      // File keys are structured as: {businessId}/...
      const businessId = req.businessId as string;
      if (!fileKey.startsWith(`${businessId}/`)) {
        // Allow access to exports in _system folder for this business
        if (!fileKey.startsWith(`_system/exports/${businessId}/`)) {
          return res.status(403).json({
            error: { message: 'Adgang nægtet', code: 'FORBIDDEN' },
          });
        }
      }

      const result = await storageService.generateDownloadUrl(fileKey);

      sendSuccess(res, {
        downloadUrl: result.downloadUrl,
        expiresAt: result.expiresAt.toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
