import { Zap } from 'lucide-react';
import { LANDING_PAGE_TEXT } from '@easyrate/shared';
import type { LandingPageBusiness, ReviewRating } from '@easyrate/shared';
import { StarRating } from './StarRating';

interface RatingScreenProps {
  business: LandingPageBusiness;
  onRatingSelect: (rating: ReviewRating) => void;
}

export function RatingScreen({ business, onRatingSelect }: RatingScreenProps) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-8 min-h-[100dvh] justify-center">
      {/* Business Logo */}
      <div className="mb-6">
        {business.branding.logoUrl ? (
          <img
            src={business.branding.logoUrl}
            alt={`${business.name} logo`}
            className="w-20 h-20 rounded-full object-cover border-2 border-border shadow-sm"
          />
        ) : (
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-sm"
            style={{ backgroundColor: business.branding.primaryColor }}
          >
            {business.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Business Name */}
      <h2 className="text-lg font-medium text-muted-foreground mb-6">{business.name}</h2>

      {/* Title */}
      <h1 className="text-2xl font-bold text-foreground mb-2">{LANDING_PAGE_TEXT.ratingTitle}</h1>

      {/* Subtitle */}
      <p className="text-muted-foreground mb-8">{LANDING_PAGE_TEXT.ratingSubtitle}</p>

      {/* Star Rating */}
      <div className="mb-12">
        <StarRating value={null} onChange={onRatingSelect} size="lg" />
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Zap className="w-4 h-4" />
        <span>{LANDING_PAGE_TEXT.ratingFooter}</span>
      </div>
    </div>
  );
}
