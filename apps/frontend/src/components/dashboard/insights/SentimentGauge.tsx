import { Star } from 'lucide-react';
import { cn } from '@easyrate/ui/lib';
import { DASHBOARD_TEXT } from '@easyrate/shared';
import type { SentimentLabel } from '@easyrate/shared';

interface SentimentGaugeProps {
  score: number;
  label: SentimentLabel;
  summary: string;
}

const SENTIMENT_TEXT_COLORS: Record<SentimentLabel, string> = {
  very_negative: 'text-red-700',
  negative: 'text-orange-700',
  neutral: 'text-yellow-700',
  positive: 'text-green-700',
  very_positive: 'text-emerald-700',
};

/**
 * Convert 0-100 score to 1-5 star rating with full decimal precision
 */
function scoreToStars(score: number): number {
  // Map 0-100 to 1-5 range
  const stars = 1 + (score / 100) * 4;
  // Round to 1 decimal place for display
  return Math.round(stars * 10) / 10;
}

interface StarRatingDisplayProps {
  rating: number; // 1-5, supports decimals (e.g., 3.7)
  size?: 'sm' | 'md' | 'lg';
}

const starSizes = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

function StarRatingDisplay({ rating, size = 'lg' }: StarRatingDisplayProps) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((starIndex) => {
        // Calculate fill percentage for this star
        const fillAmount = Math.max(0, Math.min(1, rating - (starIndex - 1)));
        const fillPercent = fillAmount * 100;

        if (fillPercent >= 100) {
          // Full star
          return (
            <Star
              key={starIndex}
              className={cn(starSizes[size], 'fill-yellow-400 text-yellow-400')}
            />
          );
        } else if (fillPercent <= 0) {
          // Empty star
          return (
            <Star key={starIndex} className={cn(starSizes[size], 'fill-gray-200 text-gray-200')} />
          );
        } else {
          // Partial star
          return (
            <div key={starIndex} className={cn('relative', starSizes[size])}>
              <Star className={cn(starSizes[size], 'absolute fill-gray-200 text-gray-200')} />
              <div
                className="absolute overflow-hidden"
                style={{ width: `${String(fillPercent)}%` }}
              >
                <Star className={cn(starSizes[size], 'fill-yellow-400 text-yellow-400')} />
              </div>
            </div>
          );
        }
      })}
    </div>
  );
}

export function SentimentGauge({ score, label, summary }: SentimentGaugeProps) {
  const sentimentText = DASHBOARD_TEXT.insights.sentiment[label];
  const textColor = SENTIMENT_TEXT_COLORS[label];
  const starRating = scoreToStars(score);

  return (
    <div className="space-y-3">
      {/* Star rating display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StarRatingDisplay rating={starRating} size="lg" />
          <span className="text-2xl font-bold">{starRating.toFixed(1)}</span>
        </div>
        <span className={cn('text-sm font-medium', textColor)}>{sentimentText}</span>
      </div>

      {/* Summary text */}
      <p className="text-sm text-muted-foreground">{summary}</p>
    </div>
  );
}
