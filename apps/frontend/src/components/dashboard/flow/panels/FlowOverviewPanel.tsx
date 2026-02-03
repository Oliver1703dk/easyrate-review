import { Card, CardContent, CardHeader, CardTitle } from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';
import { MessageSquare, Mail, Workflow } from 'lucide-react';
import { cn } from '@easyrate/ui/lib';

interface FlowOverviewPanelProps {
  smsEnabled: boolean;
  emailEnabled: boolean;
}

export function FlowOverviewPanel({ smsEnabled, emailEnabled }: FlowOverviewPanelProps) {
  const sidebar = DASHBOARD_TEXT.flow.sidebar;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{sidebar.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg border bg-slate-50 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <Workflow className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <p className="font-medium text-sm">Anmeldelsesflow</p>
            <p className="text-xs text-muted-foreground">Automatisk kundefeedback</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">{sidebar.channelsActive}</p>
          <div className="flex gap-2">
            <div
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                smsEnabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
              )}
            >
              <MessageSquare className="h-3 w-3" />
              SMS
            </div>
            <div
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                emailEnabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
              )}
            >
              <Mail className="h-3 w-3" />
              Email
            </div>
          </div>
        </div>

        <div className="rounded-md border border-dashed bg-slate-50 p-4 text-center">
          <p className="text-sm text-muted-foreground">{sidebar.selectNode}</p>
        </div>
      </CardContent>
    </Card>
  );
}
