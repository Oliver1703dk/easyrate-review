import { z } from 'zod';

export const notificationTypeSchema = z.enum(['sms', 'email']);

export const notificationStatusSchema = z.enum([
  'pending',
  'sent',
  'delivered',
  'failed',
  'bounced',
  'opened',
  'clicked',
  'converted',
]);

export const createNotificationSchema = z.object({
  businessId: z.string().min(1),
  type: notificationTypeSchema,
  recipient: z.string().min(1),
  subject: z.string().max(255).optional(),
  content: z.string().min(1).max(5000),
  reviewLink: z.string().url(),
  orderId: z.string().optional(),
});

export type NotificationTypeSchema = z.infer<typeof notificationTypeSchema>;
export type NotificationStatusSchema = z.infer<typeof notificationStatusSchema>;
export type CreateNotificationSchema = z.infer<typeof createNotificationSchema>;
