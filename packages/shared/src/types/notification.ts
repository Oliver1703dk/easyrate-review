export type NotificationType = 'sms' | 'email';

export type NotificationStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'bounced'
  | 'opened'
  | 'clicked';

export interface Notification {
  id: string;
  businessId: string;
  type: NotificationType;
  status: NotificationStatus;
  recipient: string;
  subject?: string; // For email
  content: string;
  reviewLink: string;
  orderId?: string;
  externalMessageId?: string;
  errorMessage?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  locationId?: string; // Reserved for future multi-location support
  metadata?: Record<string, unknown>; // Reserved for extensibility
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNotificationInput {
  businessId: string;
  type: NotificationType;
  recipient: string;
  subject?: string;
  content: string;
  reviewLink: string;
  orderId?: string;
}
