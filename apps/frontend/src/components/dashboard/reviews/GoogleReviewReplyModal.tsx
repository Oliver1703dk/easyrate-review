import { useState, useEffect } from 'react';
import { Send, AlertCircle, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, Textarea, Spinner } from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';
import type { ExternalReview } from '@easyrate/shared';
import { StarDisplay } from './StarDisplay';
import { useGoogleReviewReply } from '../../../hooks/useExternalReviews';

interface GoogleReviewReplyModalProps {
  review: ExternalReview | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function GoogleReviewReplyModal({
  review,
  isOpen,
  onClose,
  onSuccess,
}: GoogleReviewReplyModalProps) {
  const [replyText, setReplyText] = useState('');
  const { replyToReview, isReplying, error } = useGoogleReviewReply();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setReplyText('');
    }
  }, [isOpen]);

  if (!review || !isOpen) return null;

  const handleSubmit = async () => {
    if (!replyText.trim()) return;

    try {
      await replyToReview(review.id, replyText.trim());
      setReplyText('');
      onSuccess?.();
      onClose();
    } catch {
      // Error is handled by the hook
    }
  };

  const handleClose = () => {
    if (!isReplying) {
      setReplyText('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{DASHBOARD_TEXT.externalReviews.replyButton}</CardTitle>
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={isReplying}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Svar på {review.reviewerName}&apos;s Google anmeldelse
          </p>

          {/* Review summary */}
          <div className="rounded-md border p-3">
            <div className="flex items-center gap-2 mb-2">
              <StarDisplay rating={review.rating} size="sm" />
              <span className="text-sm font-medium">{review.reviewerName}</span>
            </div>
            {review.reviewText && (
              <p className="text-sm text-muted-foreground line-clamp-3">{review.reviewText}</p>
            )}
          </div>

          {/* Warning */}
          <div className="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-sm">{DASHBOARD_TEXT.externalReviews.replyWarning}</p>
          </div>

          {/* Reply text area */}
          <Textarea
            placeholder={DASHBOARD_TEXT.externalReviews.replyPlaceholder}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            maxLength={4096}
            rows={6}
            disabled={isReplying}
          />

          {/* Error display */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isReplying}>
              {DASHBOARD_TEXT.common.cancel}
            </Button>
            <Button onClick={handleSubmit} disabled={!replyText.trim() || isReplying}>
              {isReplying ? (
                <Spinner size="sm" className="mr-2" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {DASHBOARD_TEXT.reviews.sendReply}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
