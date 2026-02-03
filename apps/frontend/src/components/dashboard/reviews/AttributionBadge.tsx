import { Link2 } from 'lucide-react';
import { Badge } from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';
import type { ReviewAttribution } from '@easyrate/shared';

interface AttributionBadgeProps {
  attribution: ReviewAttribution;
  onClick?: () => void;
}

export function AttributionBadge({ attribution, onClick }: AttributionBadgeProps) {
  const confidencePercent = Math.round(attribution.confidence * 100);
  const isHighConfidence = attribution.confidence >= 0.8;
  const isMediumConfidence = attribution.confidence >= 0.6;

  const confidenceColor = isHighConfidence
    ? 'bg-green-100 text-green-700 border-green-300'
    : isMediumConfidence
      ? 'bg-amber-100 text-amber-700 border-amber-300'
      : 'bg-gray-100 text-gray-700 border-gray-300';

  return (
    <Badge
      variant="outline"
      className={`cursor-pointer ${confidenceColor}`}
      onClick={onClick}
    >
      <Link2 className="mr-1 h-3 w-3" />
      {DASHBOARD_TEXT.externalReviews.attributionLinked}
      <span className="ml-1 text-xs opacity-75">({confidencePercent}%)</span>
    </Badge>
  );
}
