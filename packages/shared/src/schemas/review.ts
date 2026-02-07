import { z } from 'zod';

export const reviewRatingSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const reviewCustomerSchema = z.object({
  name: z.string().max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(8).max(20).optional(),
});

export const createReviewSchema = z.object({
  businessId: z.string().min(1),
  rating: reviewRatingSchema,
  feedbackText: z.string().max(5000).optional(),
  customer: reviewCustomerSchema.optional(),
  sourcePlatform: z.enum(['dully', 'easytable', 'direct', 'test']),
  orderId: z.string().optional(),
  photos: z.array(z.string().url()).max(5).optional(),
});

export const reviewFiltersSchema = z.object({
  businessId: z.string().min(1),
  rating: z.union([reviewRatingSchema, z.array(reviewRatingSchema)]).optional(),
  sourcePlatform: z.enum(['dully', 'easytable', 'direct', 'test']).optional(),
  isPublic: z.boolean().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  search: z.string().max(255).optional(),
});

export type ReviewRatingSchema = z.infer<typeof reviewRatingSchema>;
export type ReviewCustomerSchema = z.infer<typeof reviewCustomerSchema>;
export type CreateReviewSchema = z.infer<typeof createReviewSchema>;
export type ReviewFiltersSchema = z.infer<typeof reviewFiltersSchema>;
