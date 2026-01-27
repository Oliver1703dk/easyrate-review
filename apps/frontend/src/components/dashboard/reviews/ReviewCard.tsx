import { ExternalLink, MessageSquare } from 'lucide-react';
import { Card, CardContent, Badge } from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';
import type { Review } from '@easyrate/shared';
import { StarDisplay } from './StarDisplay';

interface ReviewCardProps {
  review: Review;
}

export function ReviewCard({ review }: ReviewCardProps) {
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const sourceLabels: Record<string, string> = {
    dully: 'Dully',
    easytable: 'EasyTable',
    direct: 'Direkte',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {/* Header with rating and badges */}
            <div className="flex flex-wrap items-center gap-3">
              <StarDisplay rating={review.rating} size="md" />
              <Badge variant={review.submittedExternalReview ? 'success' : 'secondary'}>
                {review.submittedExternalReview ? (
                  <span className="flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    {DASHBOARD_TEXT.reviews.externalReview}
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {DASHBOARD_TEXT.reviews.internalFeedback}
                  </span>
                )}
              </Badge>
              <Badge variant="outline">{sourceLabels[review.sourcePlatform]}</Badge>
              {review.metadata?.isTest === true && (
                <Badge variant="outline" className="border-yellow-300 bg-yellow-50 text-yellow-700">
                  {DASHBOARD_TEXT.test.testBadge}
                </Badge>
              )}
            </div>

            {/* Feedback text */}
            {review.feedbackText && (
              <p className="mt-3 text-sm text-foreground">{review.feedbackText}</p>
            )}

            {/* Customer info and timestamp */}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              {review.customer?.name && (
                <span>
                  {DASHBOARD_TEXT.reviews.from}: {review.customer.name}
                </span>
              )}
              {review.customer?.email && <span>{review.customer.email}</span>}
              {review.customer?.phone && <span>{review.customer.phone}</span>}
              <span>{formatDate(review.createdAt)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
