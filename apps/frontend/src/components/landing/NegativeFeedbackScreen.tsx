import { useState } from 'react';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { Button, Textarea } from '@easyrate/ui';
import { LANDING_PAGE_TEXT, ERROR_MESSAGES } from '@easyrate/shared';
import type { LandingPageBusiness, ReviewRating } from '@easyrate/shared';
import { StarRating } from './StarRating';
import { PhotoUpload } from './PhotoUpload';
import { ConsentCheckbox } from './ConsentCheckbox';

interface NegativeFeedbackScreenProps {
  business: LandingPageBusiness;
  rating: ReviewRating;
  onSubmit: (feedbackText: string, photos: string[], consentGiven: boolean) => void;
  onExternalReviewClick?: (() => void) | undefined;
  isSubmitting?: boolean;
}

export function NegativeFeedbackScreen({
  business,
  rating,
  onSubmit,
  onExternalReviewClick,
  isSubmitting = false,
}: NegativeFeedbackScreenProps) {
  const [feedbackText, setFeedbackText] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [consentGiven, setConsentGiven] = useState(false);
  const [consentError, setConsentError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate consent
    if (!consentGiven) {
      setConsentError(true);
      return;
    }

    setConsentError(false);
    onSubmit(feedbackText, photos, consentGiven);
  };

  const handleConsentChange = (checked: boolean) => {
    setConsentGiven(checked);
    if (checked) {
      setConsentError(false);
    }
  };

  return (
    <div className="flex flex-col items-center px-6 py-8 min-h-[100dvh]">
      {/* Header with rating display */}
      <div className="mb-6">
        <StarRating
          value={rating}
          onChange={() => {
            // noop - rating is read-only here
          }}
          size="sm"
          disabled
        />
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-foreground mb-2 text-center">
        {LANDING_PAGE_TEXT.negativeFeedbackTitle}{' '}
        <span role="img" aria-label="heart">
          💙
        </span>
      </h1>

      {/* Subtitle */}
      <p className="text-muted-foreground mb-6 text-center">
        {LANDING_PAGE_TEXT.negativeFeedbackSubtitle}
      </p>

      {/* Feedback Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-md flex flex-col gap-4">
        <Textarea
          value={feedbackText}
          onChange={(e) => {
            setFeedbackText(e.target.value);
          }}
          placeholder={LANDING_PAGE_TEXT.negativeFeedbackPlaceholder}
          rows={5}
          className="resize-none"
          disabled={isSubmitting}
        />

        {/* Photo Upload */}
        <PhotoUpload
          businessId={business.id}
          photos={photos}
          onPhotosChange={setPhotos}
          disabled={isSubmitting}
        />

        {/* Consent Checkbox */}
        <div className="mt-2">
          <ConsentCheckbox
            checked={consentGiven}
            onChange={handleConsentChange}
            privacyPolicyUrl={business.privacyPolicyUrl}
            disabled={isSubmitting}
            error={consentError}
          />
          {consentError && (
            <p className="mt-1 text-sm text-destructive">
              {ERROR_MESSAGES.consentRequired}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full bg-foreground text-background hover:bg-foreground/90"
          disabled={isSubmitting || !consentGiven}
        >
          {isSubmitting ? 'Sender...' : LANDING_PAGE_TEXT.negativeFeedbackSubmit}
        </Button>
      </form>

      {/* Privacy Note */}
      <div className="flex items-start gap-2 mt-6 text-sm text-muted-foreground max-w-md">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>{LANDING_PAGE_TEXT.negativeFeedbackPrivacyNote}</span>
      </div>

      {/* Legal requirement: Option to leave external review */}
      {business.googleReviewUrl && onExternalReviewClick && (
        <button
          type="button"
          onClick={onExternalReviewClick}
          className="mt-8 flex items-center gap-2 text-sm text-primary hover:underline"
          disabled={isSubmitting}
        >
          <ExternalLink className="w-4 h-4" />
          {LANDING_PAGE_TEXT.negativeFeedbackExternalOption}
        </button>
      )}
    </div>
  );
}
