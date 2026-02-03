import { Card, CardContent, CardHeader, CardTitle } from '@easyrate/ui';
import { DASHBOARD_TEXT, LANDING_PAGE_TEXT } from '@easyrate/shared';
import { CheckCircle2 } from 'lucide-react';

export function ThankYouInfoPanel() {
  const sidebar = DASHBOARD_TEXT.flow.sidebar;
  const nodes = DASHBOARD_TEXT.flow.nodes;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{sidebar.thankYouInfo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg border bg-blue-50 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-sm">{nodes.thank_you}</p>
            <p className="text-xs text-muted-foreground">{nodes.thank_you_desc}</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{sidebar.thankYouDescription}</p>

        {/* Preview of thank you page */}
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Side preview</p>
          <div className="space-y-3 text-center">
            <div className="flex justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <p className="text-lg font-semibold">{LANDING_PAGE_TEXT.thankYouTitle}</p>
            <p className="text-sm text-muted-foreground">{LANDING_PAGE_TEXT.thankYouMessage}</p>
            <p className="text-xs text-muted-foreground">{LANDING_PAGE_TEXT.thankYouSubtext}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
