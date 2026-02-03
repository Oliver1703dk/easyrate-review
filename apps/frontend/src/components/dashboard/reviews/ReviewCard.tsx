import { useState } from 'react';
import {
  ExternalLink,
  MessageSquare,
  Send,
  X,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, Badge, Button, Textarea, Spinner } from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';
import type { Review } from '@easyrate/shared';
import { StarDisplay } from './StarDisplay';
import { useReviewReply } from '../../../hooks/useReviewReply';
import { useGenerateResponse } from '../../../hooks/useGenerateResponse';

interface ReviewCardProps {
  review: Review;
  onReplySuccess?: (() => void) | undefined;
}

export function ReviewCard({ review, onReplySuccess }: ReviewCardProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const { sendReply, isSending, error, clearError } = useReviewReply();
  const {
    generate,
    isGenerating,
    error: generateError,
    clearError: clearGenerateError,
    status: generationStatus,
  } = useGenerateResponse();

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
  const hasFeedbackText = Boolean(review.feedbackText);
  const isPositiveReview = review.rating >= 4;
  const canReply = hasEmail && !hasResponse;
  // Allow AI response for: reviews with feedback text OR positive reviews (even without feedback)
  const canGenerateResponse =
    canReply && (hasFeedbackText || isPositiveReview) && (generationStatus?.canGenerate ?? true);

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
    clearGenerateError();
  };

  const handleGenerateResponse = async () => {
    try {
      const generatedText = await generate(review.id);
      setReplyText(generatedText);
      setIsReplying(true);
    } catch {
      // Error is handled by the hook
    }
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

            {/* Reply and Generate buttons */}
            {canReply && !isReplying && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsReplying(true)}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {DASHBOARD_TEXT.reviews.reply}
                </Button>
                {(hasFeedbackText || isPositiveReview) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateResponse}
                    disabled={isGenerating || !canGenerateResponse}
                  >
                    {isGenerating ? (
                      <Spinner size="sm" className="mr-2" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    {isGenerating
                      ? DASHBOARD_TEXT.reviews.generating
                      : DASHBOARD_TEXT.reviews.generateResponse}
                  </Button>
                )}
                {generationStatus && (
                  <span className="text-xs text-muted-foreground">
                    {generationStatus.canGenerate
                      ? `${DASHBOARD_TEXT.reviews.remainingGenerations}: ${generationStatus.remainingToday}`
                      : DASHBOARD_TEXT.reviews.rateLimitReached}
                  </span>
                )}
              </div>
            )}

            {/* Generation error display */}
            {generateError && !isReplying && (
              <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>{generateError}</span>
              </div>
            )}

            {/* Reply form */}
            {isReplying && (
              <div className="mt-4 space-y-3">
                {replyText && (
                  <p className="text-xs text-muted-foreground">
                    {DASHBOARD_TEXT.reviews.editBeforeSending}
                  </p>
                )}
                <Textarea
                  placeholder={DASHBOARD_TEXT.reviews.replyPlaceholder}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  maxLength={2000}
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
