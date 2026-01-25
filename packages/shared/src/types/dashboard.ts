export interface DashboardMetrics {
  totalReviews: number;
  avgRating: number;
  customersRequested: number;
  responseRate: number;
  smsSent: number;
  emailSent: number;
  trends: Record<string, number>; // percentage change vs last period
}

export interface ChannelPerformance {
  channel: 'email' | 'sms';
  sent: number;
  opened: number;
  reviews: number;
  conversionRate: number;
  avgResponseTime?: number; // in minutes
}

export interface InternalFeedbackMetrics {
  received: number;
  responded: number;
  responseRate: number;
  avgResponseTime: number; // in hours
  pending: number;
}

export interface ReviewStats {
  total: number;
  avgRating: number;
  byRating: Record<number, number>;
  bySource: Record<string, number>;
  recentTrend: number; // percentage change
}

export interface NotificationStats {
  smsSent: number;
  emailSent: number;
  smsDelivered: number;
  emailDelivered: number;
  smsOpened: number;
  emailOpened: number;
  smsClicked: number;
  emailClicked: number;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export type TimeRange = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
