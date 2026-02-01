import { MessageSquare } from 'lucide-react';
import { Button } from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';
import type { Review } from '@easyrate/shared';
import { ReviewCard } from './ReviewCard';

interface ReviewListProps {
  reviews: Review[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onRefetch?: () => void;
}

export function ReviewList({ reviews, total, page, pageSize, onPageChange, onRefetch }: ReviewListProps) {
  const totalPages = Math.ceil(total / pageSize);
  const hasMore = page < totalPages;
  const hasPrevious = page > 1;

  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4">
          <MessageSquare className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-medium">{DASHBOARD_TEXT.reviews.noReviews}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {DASHBOARD_TEXT.reviews.noReviewsSubtext}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} onReplySuccess={onRefetch} />
      ))}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} af {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={!hasPrevious}
            >
              {DASHBOARD_TEXT.common.back}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={!hasMore}
            >
              {DASHBOARD_TEXT.common.next}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
