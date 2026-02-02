import { Badge } from '@easyrate/ui';
import { cn } from '@easyrate/ui/lib';
import { DASHBOARD_TEXT } from '@easyrate/shared';
import type { InsightTheme, ThemeSeverity, ThemeSentiment } from '@easyrate/shared';
import { ChevronDown, ChevronUp, Lightbulb, Users, MessageSquare } from 'lucide-react';
import { useState } from 'react';

interface ThemeItemProps {
  theme: InsightTheme;
}

const SEVERITY_VARIANTS: Record<
  ThemeSeverity,
  'destructive' | 'warning' | 'secondary' | 'success'
> = {
  critical: 'destructive',
  high: 'warning',
  medium: 'secondary',
  low: 'success',
};

const SENTIMENT_COLORS: Record<ThemeSentiment, string> = {
  positive: 'text-green-600',
  negative: 'text-red-600',
  neutral: 'text-gray-600',
};

export function ThemeItem({ theme }: ThemeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const severityText = DASHBOARD_TEXT.insights.severity[theme.severity];
  const sentimentText = DASHBOARD_TEXT.insights.themeSentiment[theme.sentiment];

  return (
    <div className="border-b border-border pb-4 last:border-b-0 last:pb-0">
      {/* Header */}
      <button
        type="button"
        className="flex w-full items-start justify-between gap-2 text-left"
        onClick={() => {
          setIsExpanded(!isExpanded);
        }}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{theme.name}</h4>
            <Badge variant={SEVERITY_VARIANTS[theme.severity]}>{severityText}</Badge>
            <span className={cn('text-xs', SENTIMENT_COLORS[theme.sentiment])}>
              {sentimentText}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{theme.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Stats */}
      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {theme.customerCount} {DASHBOARD_TEXT.insights.customers}
        </span>
        <span className="flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          {theme.mentionCount} {DASHBOARD_TEXT.insights.mentions}
        </span>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-3 space-y-3">
          {/* Example quotes */}
          {theme.exampleQuotes.length > 0 && (
            <div className="space-y-2">
              {theme.exampleQuotes.map((quote, index) => (
                <blockquote
                  key={index}
                  className="border-l-2 border-muted pl-3 text-sm italic text-muted-foreground"
                >
                  "{quote}"
                </blockquote>
              ))}
            </div>
          )}

          {/* Suggestion */}
          {theme.suggestion && (
            <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3">
              <Lightbulb className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium text-foreground">
                  {DASHBOARD_TEXT.insights.suggestion}
                </p>
                <p className="text-sm text-muted-foreground">{theme.suggestion}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
