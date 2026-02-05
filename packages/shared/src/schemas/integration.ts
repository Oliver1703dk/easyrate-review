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
  event: z.enum(['order.created', 'order.approved', 'order.picked_up', 'order.cancelled']),
  orderId: z.string().min(1),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional(),
  totalAmount: z.number().optional(),
  timestamp: z.string().datetime(),
  restaurantId: z.string().min(1),
  cancelReason: z.string().optional(),
});

/**
 * EasyTable booking schema matching API v2 response
 * See: EasyTableBooking interface in types/integration.ts
 */
export const easyTableBookingSchema = z.object({
  bookingID: z.number().int().positive(),
  externalID: z.string().optional(),
  date: z.string(), // YYYY-MM-DD
  arrival: z.string(), // HH:MM
  duration: z.number().int().positive(), // minutes
  persons: z.number().int().positive(),
  children: z.number().int().optional(),
  status: z.enum(['1', '2', '3']), // 1=Active, 2=Cancelled, 3=No-show
  arrived: z.union([z.literal(0), z.literal(1)]),
  expired: z.union([z.literal(0), z.literal(1)]),
  customerID: z.number().int().optional(),
  customerExternalID: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  mobile: z.number().optional(),
  company: z.string().optional(),
  note: z.string().optional(),
  guestNote: z.string().optional(),
  tables: z
    .array(
      z.object({
        tableID: z.number().int(),
        externalID: z.string().optional(),
        tableName: z.string().optional(),
      })
    )
    .optional(),
  tags: z
    .array(
      z.object({
        tagID: z.number().int(),
        tagName: z.string(),
      })
    )
    .optional(),
});

export type OrderDataSchema = z.infer<typeof orderDataSchema>;
export type DullyWebhookPayloadSchema = z.infer<typeof dullyWebhookPayloadSchema>;
export type EasyTableBookingSchema = z.infer<typeof easyTableBookingSchema>;
