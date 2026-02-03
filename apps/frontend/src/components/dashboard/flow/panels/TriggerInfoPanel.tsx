import { Card, CardContent, CardHeader, CardTitle } from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';
import { Zap } from 'lucide-react';

export function TriggerInfoPanel() {
  const sidebar = DASHBOARD_TEXT.flow.sidebar;
  const nodes = DASHBOARD_TEXT.flow.nodes;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{sidebar.triggerInfo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg border bg-amber-50 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
            <Zap className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="font-medium text-sm">{nodes.order_complete}</p>
            <p className="text-xs text-muted-foreground">{nodes.order_complete_desc}</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{sidebar.triggerDescription}</p>

        <div className="rounded-md border bg-slate-50 p-3">
          <p className="text-xs font-medium mb-2">Understøttede integrationer</p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>Dully - Takeaway ordrer</li>
            <li>EasyTable - Bordreservationer</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
