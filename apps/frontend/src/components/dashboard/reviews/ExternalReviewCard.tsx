import { useState } from 'react';
import { MessageSquare, Send, X, CheckCircle, AlertCircle, ExternalLink, Link2 } from 'lucide-react';
import { Card, CardContent, Badge, Button, Textarea, Spinner } from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';
import type { ExternalReview } from '@easyrate/shared';
import { StarDisplay } from './StarDisplay';
import { useGoogleReviewReply } from '../../../hooks/useExternalReviews';
import { AttributionBadge } from './AttributionBadge';

interface ExternalReviewCardProps {
  review: ExternalReview;
  onReplySuccess?: () => void;
  onAttributionClick?: (reviewId: string) => void;
}

export function ExternalReviewCard({
  review,
  onReplySuccess,
  onAttributionClick,
}: ExternalReviewCardProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const { replyToReview, isReplying: isSending, error } = useGoogleReviewReply();

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

  const hasReply = Boolean(review.reply);
  const canReply = !hasReply;

  const handleSendReply = async () => {
    if (!replyText.trim()) return;

    try {
      await replyToReview(review.id, replyText.trim());
      setIsReplying(false);
      setReplyText('');
      onReplySuccess?.();
    } catch {
      // Error is handled by the hook
    }
  };

  const handleCancelReply = () => {
    setIsReplying(false);
    setReplyText('');
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {/* Header with rating and badges */}
            <div className="flex flex-wrap items-center gap-3">
              <StarDisplay rating={review.rating} size="md" />
              <Badge variant="default" className="bg-blue-600">
                <span className="flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />
                  {DASHBOARD_TEXT.externalReviews.badge}
                </span>
              </Badge>
              {review.attribution && (
                <AttributionBadge
                  attribution={review.attribution}
                  onClick={() => onAttributionClick?.(review.id)}
                />
              )}
            </div>

            {/* Reviewer info */}
            <div className="mt-2 flex items-center gap-2">
              {review.reviewerPhotoUrl && (
                <img
                  src={review.reviewerPhotoUrl}
                  alt={review.reviewerName}
                  className="h-6 w-6 rounded-full"
                />
              )}
              <span className="text-sm font-medium">{review.reviewerName}</span>
            </div>

            {/* Review text */}
            {review.reviewText && (
              <p className="mt-3 text-sm text-foreground">{review.reviewText}</p>
            )}

            {/* Timestamp and external link */}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span>{formatDate(review.reviewedAt)}</span>
              {review.externalUrl && (
                <a
                  href={review.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Se på Google
                </a>
              )}
            </div>

            {/* Existing reply display */}
            {hasReply && review.reply && (
              <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <Badge variant="success">
                    {review.reply.repliedBy === 'easyrate'
                      ? DASHBOARD_TEXT.externalReviews.replySent
                      : DASHBOARD_TEXT.reviews.replied}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(review.reply.repliedAt)}
                  </span>
                </div>
                <p className="text-sm text-foreground">{review.reply.text}</p>
              </div>
            )}

            {/* Attribution link button */}
            {!review.attribution && (
              <button
                onClick={() => onAttributionClick?.(review.id)}
                className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Link2 className="h-3 w-3" />
                {DASHBOARD_TEXT.externalReviews.attributionFindMatch}
              </button>
            )}

            {/* Reply button */}
            {canReply && !isReplying && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsReplying(true)}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {DASHBOARD_TEXT.externalReviews.replyButton}
                </Button>
              </div>
            )}

            {/* Reply form */}
            {isReplying && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 rounded-md bg-amber-50 p-2 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p className="text-xs">{DASHBOARD_TEXT.externalReviews.replyWarning}</p>
                </div>
                <Textarea
                  placeholder={DASHBOARD_TEXT.externalReviews.replyPlaceholder}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  maxLength={4096}
                  rows={4}
                  disabled={isSending}
                />
                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleSendReply}
                    disabled={!replyText.trim() || isSending}
                  >
                    {isSending ? (
                      <Spinner size="sm" className="mr-2" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    {DASHBOARD_TEXT.reviews.sendReply}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleCancelReply} disabled={isSending}>
                    <X className="mr-2 h-4 w-4" />
                    {DASHBOARD_TEXT.common.cancel}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
