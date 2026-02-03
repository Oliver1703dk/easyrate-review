import { Card, CardContent, CardHeader, CardTitle, Button } from '@easyrate/ui';
import { DASHBOARD_TEXT, LANDING_PAGE_TEXT } from '@easyrate/shared';
import { ExternalLink, Star } from 'lucide-react';

export function ExternalReviewInfoPanel() {
  const sidebar = DASHBOARD_TEXT.flow.sidebar;
  const nodes = DASHBOARD_TEXT.flow.nodes;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{sidebar.externalInfo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg border bg-green-50 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <ExternalLink className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-sm">{nodes.external_review}</p>
            <p className="text-xs text-muted-foreground">{nodes.external_review_desc}</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{sidebar.externalDescription}</p>

        {/* Preview of Google review prompt */}
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Prompt preview</p>
          <div className="space-y-3 text-center">
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="h-5 w-5" fill="#facc15" stroke="#facc15" />
              ))}
            </div>
            <p className="text-sm font-medium">{LANDING_PAGE_TEXT.positivePromptTitle}</p>
            <p className="text-xs text-muted-foreground">
              {LANDING_PAGE_TEXT.positivePromptSubtitle}
            </p>
            <Button size="sm" className="w-full text-xs" disabled>
              {LANDING_PAGE_TEXT.positivePromptGoogle}
            </Button>
            <p className="text-[10px] text-muted-foreground">
              {LANDING_PAGE_TEXT.positivePromptFooter}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
