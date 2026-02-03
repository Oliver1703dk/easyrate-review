import { Card, CardContent, CardHeader, CardTitle } from '@easyrate/ui';
import { DASHBOARD_TEXT, LANDING_PAGE_TEXT } from '@easyrate/shared';
import { MessageSquareText } from 'lucide-react';

export function InternalFeedbackInfoPanel() {
  const sidebar = DASHBOARD_TEXT.flow.sidebar;
  const nodes = DASHBOARD_TEXT.flow.nodes;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{sidebar.internalInfo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg border bg-red-50 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
            <MessageSquareText className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="font-medium text-sm">{nodes.internal_feedback}</p>
            <p className="text-xs text-muted-foreground">{nodes.internal_feedback_desc}</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{sidebar.internalDescription}</p>

        {/* Preview of feedback form */}
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Formular preview</p>
          <div className="space-y-3">
            <p className="text-sm font-medium">{LANDING_PAGE_TEXT.negativeFeedbackTitle}</p>
            <p className="text-xs text-muted-foreground">
              {LANDING_PAGE_TEXT.negativeFeedbackSubtitle}
            </p>
            <div className="rounded border bg-slate-50 p-2 text-xs text-muted-foreground">
              {LANDING_PAGE_TEXT.negativeFeedbackPlaceholder}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {LANDING_PAGE_TEXT.negativeFeedbackPrivacyNote}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
