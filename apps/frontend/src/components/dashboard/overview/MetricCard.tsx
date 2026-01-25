import { type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@easyrate/ui';
import { cn } from '@easyrate/ui/lib';
import { DASHBOARD_TEXT } from '@easyrate/shared';

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: number | undefined;
  icon?: LucideIcon;
  className?: string;
}

export function MetricCard({ label, value, trend, icon: Icon, className }: MetricCardProps) {
  const formattedTrend = trend !== undefined ? (trend > 0 ? `+${trend}%` : `${trend}%`) : null;
  const trendColor = trend !== undefined ? (trend >= 0 ? 'text-green-600' : 'text-red-600') : '';

  return (
    <Card className={cn('', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
            {formattedTrend && (
              <p className={cn('mt-1 text-xs', trendColor)}>
                {formattedTrend} {DASHBOARD_TEXT.overview.vsLast}
              </p>
            )}
          </div>
          {Icon && (
            <div className="rounded-md bg-primary/10 p-2">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
