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

/**
 * EasyTable booking data from API v2
 * See: /system_overview/integrations/easytable_integration.md
 */
export interface EasyTableBooking {
  bookingID: number;
  externalID?: string;
  date: string; // YYYY-MM-DD
  arrival: string; // HH:MM
  duration: number; // minutes
  persons: number;
  children?: number;
  status: '1' | '2' | '3'; // 1=Active, 2=Cancelled, 3=No-show
  arrived: 0 | 1; // Guest has arrived
  expired: 0 | 1; // Booking has expired/no-show processed
  customerID?: number;
  customerExternalID?: string;
  name?: string;
  email?: string;
  mobile?: number;
  company?: string;
  note?: string;
  guestNote?: string;
  tables?: {
    tableID: number;
    externalID?: string;
    tableName?: string;
  }[];
  tags?: { tagID: number; tagName: string }[];
}
