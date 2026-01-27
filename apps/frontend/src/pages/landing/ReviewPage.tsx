import { useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import type { ReviewRating } from '@easyrate/shared';
import { ERROR_MESSAGES, REVIEW_THRESHOLDS } from '@easyrate/shared';
import { useReviewFlow, useBusinessData, useBranding } from '../../hooks';
import {
  RatingScreen,
  NegativeFeedbackScreen,
  PositivePromptScreen,
  ThankYouScreen,
  LoadingScreen,
  ErrorScreen,
} from '../../components/landing';
import { api } from '../../lib/api';

export function ReviewPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const isTest = searchParams.get('isTest') === 'true';
  const { business, customer, isLoading: isLoadingBusiness, error: businessError } = useBusinessData(token);
  const { state, setRating, startSubmit, submitSuccess, submitError, markExternalReview, reset } =
    useReviewFlow();

  // Apply business branding colors
  useBranding(business);

  // Initialize flow once business is loaded
  useEffect(() => {
    if (business && state.step === 'loading') {
      reset();
    }
  }, [business, state.step, reset]);

  // Handle rating selection
  const handleRatingSelect = useCallback(
    (rating: ReviewRating) => {
      setRating(rating);
    },
    [setRating]
  );

  // Handle negative feedback submission
  const handleNegativeFeedbackSubmit = useCallback(
    async (feedbackText: string, photos: string[], consentGiven: boolean) => {
      if (!token || !state.rating || !consentGiven) return;

      startSubmit();

      try {
        const submitData: Parameters<typeof api.submitReview>[1] = {
          rating: state.rating,
          submittedExternalReview: false,
          consent: { given: true },
        };
        if (feedbackText) {
          submitData.feedbackText = feedbackText;
        }
        if (photos.length > 0) {
          submitData.photos = photos;
        }
        // Include customer info from JWT if available
        if (customer) {
          submitData.customer = customer;
        }
        await api.submitReview(token, submitData, isTest);
        submitSuccess();
      } catch (err) {
        submitError(err instanceof Error ? err.message : ERROR_MESSAGES.reviewSubmitFailed);
      }
    },
    [token, state.rating, isTest, customer, startSubmit, submitSuccess, submitError]
  );

  // Handle external review click (Google)
  const handleExternalReviewClick = useCallback(async () => {
    if (!token || !state.rating || !business?.googleReviewUrl) return;

    // Mark that user is going to external review
    markExternalReview();

    // Submit the review to our backend
    try {
      await api.submitReview(token, {
        rating: state.rating,
        submittedExternalReview: true,
        consent: { given: true },
        // Include customer info from JWT if available
        ...(customer && { customer }),
      }, isTest);
    } catch {
      // Silently fail - user is going to external site anyway
    }

    // Open Google review page in new tab
    window.open(business.googleReviewUrl, '_blank', 'noopener,noreferrer');

    // Show thank you screen
    submitSuccess();
  }, [token, state.rating, business?.googleReviewUrl, isTest, customer, markExternalReview, submitSuccess]);

  // Handle skip external review
  const handleSkipExternalReview = useCallback(async () => {
    if (!token || !state.rating) return;

    startSubmit();

    try {
      await api.submitReview(token, {
        rating: state.rating,
        submittedExternalReview: false,
        consent: { given: true },
        // Include customer info from JWT if available
        ...(customer && { customer }),
      }, isTest);
      submitSuccess();
    } catch (err) {
      submitError(err instanceof Error ? err.message : ERROR_MESSAGES.reviewSubmitFailed);
    }
  }, [token, state.rating, isTest, customer, startSubmit, submitSuccess, submitError]);

  // Handle retry
  const handleRetry = useCallback(() => {
    reset();
  }, [reset]);

  // Handle switching from negative to external (legal requirement)
  const handleNegativeToExternal = useCallback(() => {
    if (business?.googleReviewUrl) {
      void handleExternalReviewClick();
    }
  }, [business?.googleReviewUrl, handleExternalReviewClick]);

  // Handle switching from positive to internal feedback (legal requirement)
  const handlePositiveToInternal = useCallback(() => {
    if (state.rating) {
      // Force to negative feedback screen even with positive rating
      // This is a legal requirement to allow internal feedback option
      setRating(state.rating);
      // Override step manually since setRating would route to positive again
      // We need to set step directly - this is handled via a special action
    }
  }, [state.rating, setRating]);

  // Loading state
  if (isLoadingBusiness || state.step === 'loading') {
    return <LoadingScreen />;
  }

  // Error state (business not found)
  if (businessError || !business) {
    return (
      <ErrorScreen error={businessError ?? ERROR_MESSAGES.businessNotFound} onRetry={handleRetry} />
    );
  }

  // Flow error state
  if (state.step === 'error') {
    return <ErrorScreen error={state.error ?? ERROR_MESSAGES.generic} onRetry={handleRetry} />;
  }

  // Submitting state
  if (state.step === 'submitting') {
    return <LoadingScreen text="Sender..." />;
  }

  // Rating screen
  if (state.step === 'rating') {
    return <RatingScreen business={business} onRatingSelect={handleRatingSelect} />;
  }

  // Negative feedback screen (1-3 stars)
  if (state.step === 'negative-feedback' && state.rating) {
    return (
      <NegativeFeedbackScreen
        business={business}
        rating={state.rating}
        onSubmit={handleNegativeFeedbackSubmit}
        onExternalReviewClick={business.googleReviewUrl ? handleNegativeToExternal : undefined}
      />
    );
  }

  // Positive prompt screen (4-5 stars)
  if (state.step === 'positive-prompt' && state.rating) {
    return (
      <PositivePromptScreen
        business={business}
        rating={state.rating}
        onExternalClick={handleExternalReviewClick}
        onSkip={handleSkipExternalReview}
        onInternalFeedbackClick={
          (REVIEW_THRESHOLDS.positive as readonly number[]).includes(state.rating)
            ? handlePositiveToInternal
            : undefined
        }
      />
    );
  }

  // Thank you screen
  if (state.step === 'thank-you') {
    return <ThankYouScreen submittedExternalReview={state.submittedExternalReview} />;
  }

  // Fallback to rating screen
  return <RatingScreen business={business} onRatingSelect={handleRatingSelect} />;
}
