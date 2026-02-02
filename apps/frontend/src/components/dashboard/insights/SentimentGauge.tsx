import { cn } from '@easyrate/ui/lib';
import { DASHBOARD_TEXT } from '@easyrate/shared';
import type { SentimentLabel } from '@easyrate/shared';

interface SentimentGaugeProps {
  score: number;
  label: SentimentLabel;
  summary: string;
}

const SENTIMENT_COLORS: Record<SentimentLabel, string> = {
  very_negative: 'bg-red-500',
  negative: 'bg-orange-500',
  neutral: 'bg-yellow-500',
  positive: 'bg-green-500',
  very_positive: 'bg-emerald-500',
};

const SENTIMENT_TEXT_COLORS: Record<SentimentLabel, string> = {
  very_negative: 'text-red-700',
  negative: 'text-orange-700',
  neutral: 'text-yellow-700',
  positive: 'text-green-700',
  very_positive: 'text-emerald-700',
};

export function SentimentGauge({ score, label, summary }: SentimentGaugeProps) {
  const sentimentText = DASHBOARD_TEXT.insights.sentiment[label];
  const barColor = SENTIMENT_COLORS[label];
  const textColor = SENTIMENT_TEXT_COLORS[label];

  return (
    <div className="space-y-3">
      {/* Score display */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold">{score}</span>
          <span className="text-muted-foreground">/100</span>
        </div>
        <span className={cn('text-sm font-medium', textColor)}>{sentimentText}</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Summary text */}
      <p className="text-sm text-muted-foreground">{summary}</p>
    </div>
  );
}
