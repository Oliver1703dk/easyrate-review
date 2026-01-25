import { Card, CardContent, CardHeader, CardTitle, Input, Label } from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';

interface GoogleReviewSectionProps {
  googleReviewUrl: string;
  onGoogleReviewUrlChange: (value: string) => void;
}

export function GoogleReviewSection({
  googleReviewUrl,
  onGoogleReviewUrlChange,
}: GoogleReviewSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{DASHBOARD_TEXT.settings.googleReview.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="googleReviewUrl">{DASHBOARD_TEXT.settings.googleReview.urlLabel}</Label>
          <Input
            id="googleReviewUrl"
            type="url"
            value={googleReviewUrl}
            onChange={(e) => onGoogleReviewUrlChange(e.target.value)}
            placeholder={DASHBOARD_TEXT.settings.googleReview.urlPlaceholder}
          />
          <p className="text-xs text-muted-foreground">
            {DASHBOARD_TEXT.settings.googleReview.urlHelp}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
