import { Card, CardContent, CardHeader, CardTitle } from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';

interface InternalFeedbackCardProps {
  received: number;
  responded: number;
  avgResponseTime: number;
  pending: number;
}

export function InternalFeedbackCard({
  received,
  responded,
  avgResponseTime,
  pending,
}: InternalFeedbackCardProps) {
  const responseRate = received > 0 ? Math.round((responded / received) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{DASHBOARD_TEXT.overview.internalFeedback}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">
              {DASHBOARD_TEXT.overview.feedbackReceived}
            </p>
            <p className="mt-1 text-2xl font-bold">{received}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{DASHBOARD_TEXT.overview.responded}</p>
            <p className="mt-1 text-2xl font-bold">{responseRate}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {DASHBOARD_TEXT.overview.avgResponseTime}
            </p>
            <p className="mt-1 text-2xl font-bold">
              {avgResponseTime} {DASHBOARD_TEXT.overview.hours}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{DASHBOARD_TEXT.overview.pending}</p>
            <p className="mt-1 text-2xl font-bold">{pending}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
