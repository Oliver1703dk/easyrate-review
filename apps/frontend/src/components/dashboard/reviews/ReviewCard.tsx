import { useState } from 'react';
import { ExternalLink, MessageSquare, Send, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, Badge, Button, Textarea, Spinner } from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';
import type { Review } from '@easyrate/shared';
import { StarDisplay } from './StarDisplay';
import { useReviewReply } from '../../../hooks/useReviewReply';

interface ReviewCardProps {
  review: Review;
  onReplySuccess?: (() => void) | undefined;
}

export function ReviewCard({ review, onReplySuccess }: ReviewCardProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const { sendReply, isSending, error, clearError } = useReviewReply();

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

  const hasEmail = Boolean(review.customer?.email);
  const hasResponse = Boolean(review.response);
  const canReply = hasEmail && !hasResponse;

  const handleSendReply = async () => {
    if (!replyText.trim()) return;

    try {
      await sendReply(review.id, replyText.trim());
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
    clearError();
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

            {/* Existing response display */}
            {hasResponse && review.response && (
              <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <Badge variant="success">{DASHBOARD_TEXT.reviews.replied}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(review.response.sentAt)}
                  </span>
                </div>
                <p className="text-sm text-foreground">{review.response.text}</p>
              </div>
            )}

            {/* No email warning */}
            {!hasEmail && !hasResponse && (
              <p className="mt-3 text-xs text-muted-foreground italic">
                {DASHBOARD_TEXT.reviews.noEmailWarning}
              </p>
            )}

            {/* Reply button and form */}
            {canReply && !isReplying && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsReplying(true)}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {DASHBOARD_TEXT.reviews.reply}
                </Button>
              </div>
            )}

            {/* Reply form */}
            {isReplying && (
              <div className="mt-4 space-y-3">
                <Textarea
                  placeholder={DASHBOARD_TEXT.reviews.replyPlaceholder}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  maxLength={2000}
                  rows={3}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelReply}
                    disabled={isSending}
                  >
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
