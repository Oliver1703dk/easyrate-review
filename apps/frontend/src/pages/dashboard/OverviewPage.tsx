import { MessageSquare, Star, Users, Percent, MessageCircle, Mail } from 'lucide-react';
import { Spinner } from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';
import { Header } from '../../components/dashboard/layout';
import {
  MetricCard,
  ChannelPerformanceCard,
  InternalFeedbackCard,
} from '../../components/dashboard/overview';
import { InsightsCard } from '../../components/dashboard/insights';
import { useReviewStats, useNotificationStats } from '../../hooks';

export function OverviewPage() {
  const { stats: reviewStats, isLoading: reviewsLoading } = useReviewStats();
  const { stats: notificationStats, isLoading: notificationsLoading } = useNotificationStats();

  const isLoading = reviewsLoading || notificationsLoading;

  // Calculate metrics
  const totalReviews = reviewStats?.total ?? 0;
  const avgRating = reviewStats?.avgRating.toFixed(1) ?? '0.0';
  const smsSent = notificationStats?.smsSent ?? 0;
  const emailSent = notificationStats?.emailSent ?? 0;
  const customersRequested = smsSent + emailSent;
  const responseRate =
    customersRequested > 0 ? Math.round((totalReviews / customersRequested) * 100) : 0;

  // Channel performance data
  const emailData = {
    channel: DASHBOARD_TEXT.overview.email,
    sent: notificationStats?.emailSent ?? 0,
    opened: notificationStats?.emailClicked ?? 0,
    reviews: notificationStats?.emailConverted ?? 0,
    conversion:
      notificationStats?.emailSent && notificationStats.emailSent > 0
        ? Math.round((notificationStats.emailConverted / notificationStats.emailSent) * 100)
        : 0,
  };

  const smsData = {
    channel: DASHBOARD_TEXT.overview.sms,
    sent: notificationStats?.smsSent ?? 0,
    opened: notificationStats?.smsClicked ?? 0,
    reviews: notificationStats?.smsConverted ?? 0,
    conversion:
      notificationStats?.smsSent && notificationStats.smsSent > 0
        ? Math.round((notificationStats.smsConverted / notificationStats.smsSent) * 100)
        : 0,
  };

  // Internal feedback metrics (reviews with feedbackText = negative reviews)
  const internalFeedback = {
    received: reviewStats?.byRating
      ? (reviewStats.byRating[1] ?? 0) +
        (reviewStats.byRating[2] ?? 0) +
        (reviewStats.byRating[3] ?? 0)
      : 0,
    responded: 0, // Would need separate API for this
    avgResponseTime: 24, // Placeholder
    pending: 0, // Would need separate API
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title={DASHBOARD_TEXT.overview.title} />

      <div className="p-6">
        {/* Metric Cards Row */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <MetricCard
            label={DASHBOARD_TEXT.overview.totalReviews}
            value={totalReviews}
            trend={reviewStats?.recentTrend}
            icon={MessageSquare}
          />
          <MetricCard label={DASHBOARD_TEXT.overview.avgRating} value={avgRating} icon={Star} />
          <MetricCard
            label={DASHBOARD_TEXT.overview.customersRequested}
            value={customersRequested}
            icon={Users}
          />
          <MetricCard
            label={DASHBOARD_TEXT.overview.responseRate}
            value={`${String(responseRate)}%`}
            icon={Percent}
          />
          <MetricCard
            label={DASHBOARD_TEXT.overview.smsSent}
            value={smsSent}
            icon={MessageCircle}
          />
          <MetricCard label={DASHBOARD_TEXT.overview.emailSent} value={emailSent} icon={Mail} />
        </div>

        {/* Channel Performance & Internal Feedback */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ChannelPerformanceCard emailData={emailData} smsData={smsData} />
          <InternalFeedbackCard
            received={internalFeedback.received}
            responded={internalFeedback.responded}
            avgResponseTime={internalFeedback.avgResponseTime}
            pending={internalFeedback.pending}
          />
        </div>

        {/* AI Insights */}
        <div className="mt-6">
          <InsightsCard />
        </div>
      </div>
    </div>
  );
}
