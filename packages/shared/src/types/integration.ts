export interface OrderData {
  orderId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  orderTotal?: number;
  orderDate: Date;
  completedAt?: Date;
  platform: 'dully' | 'easytable';
  metadata?: Record<string, unknown>;
}

export type OrderHandler = (order: OrderData) => Promise<void>;

import type { IntegrationConfig } from './business.js';

export interface IntegrationAdapter {
  name: string;
  connect(config: IntegrationConfig): Promise<void>;
  disconnect(): Promise<void>;
  testConnection(): Promise<boolean>;
  onOrderComplete(handler: OrderHandler): void;
}

export interface DullyWebhookPayload {
  event: 'order.completed' | 'order.picked_up';
  orderId: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  totalAmount?: number;
  timestamp: string;
  restaurantId: string;
  signature?: string;
}

export interface EasyTableBooking {
  bookingId: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  partySize: number;
  bookingDate: string;
  bookingTime: string;
  completedAt?: string;
  status: 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
  restaurantId: string;
}
