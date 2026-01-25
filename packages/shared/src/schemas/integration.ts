import { z } from 'zod';

export const orderDataSchema = z.object({
  orderId: z.string().min(1),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
  orderTotal: z.number().positive().optional(),
  orderDate: z.coerce.date(),
  completedAt: z.coerce.date().optional(),
  platform: z.enum(['dully', 'easytable']),
  metadata: z.record(z.unknown()).optional(),
});

export const dullyWebhookPayloadSchema = z.object({
  event: z.enum(['order.completed', 'order.picked_up']),
  orderId: z.string().min(1),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional(),
  totalAmount: z.number().optional(),
  timestamp: z.string().datetime(),
  restaurantId: z.string().min(1),
  signature: z.string().optional(),
});

export const easyTableBookingSchema = z.object({
  bookingId: z.string().min(1),
  guestName: z.string().min(1),
  guestEmail: z.string().email().optional(),
  guestPhone: z.string().optional(),
  partySize: z.number().int().positive(),
  bookingDate: z.string(),
  bookingTime: z.string(),
  completedAt: z.string().datetime().optional(),
  status: z.enum(['confirmed', 'seated', 'completed', 'cancelled', 'no_show']),
  restaurantId: z.string().min(1),
});

export type OrderDataSchema = z.infer<typeof orderDataSchema>;
export type DullyWebhookPayloadSchema = z.infer<typeof dullyWebhookPayloadSchema>;
export type EasyTableBookingSchema = z.infer<typeof easyTableBookingSchema>;
