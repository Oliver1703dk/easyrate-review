import { Lightbulb } from 'lucide-react';
import { Card, CardContent } from '@easyrate/ui';
import { LANDING_PAGE_TEXT } from '@easyrate/shared';

interface ThankYouScreenProps {
  submittedExternalReview: boolean;
}

export function ThankYouScreen({
  submittedExternalReview: _submittedExternalReview,
}: ThankYouScreenProps) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-8 min-h-[100dvh] justify-center">
      {/* Title */}
      <h1 className="text-3xl font-bold text-foreground mb-4">
        {LANDING_PAGE_TEXT.thankYouTitle}{' '}
        <span role="img" aria-label="pray">
          🙏
        </span>
      </h1>

      {/* Message */}
      <p className="text-lg text-foreground mb-2">{LANDING_PAGE_TEXT.thankYouMessage}</p>
      <p className="text-muted-foreground mb-8">{LANDING_PAGE_TEXT.thankYouSubtext}</p>

      {/* Tip Card */}
      <Card className="max-w-sm w-full bg-muted/50 border-0">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <Lightbulb className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">{LANDING_PAGE_TEXT.thankYouTip}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {LANDING_PAGE_TEXT.thankYouTipText}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
