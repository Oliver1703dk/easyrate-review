import { Loader2, Check, X, Eye, MousePointerClick } from 'lucide-react';
import { Badge } from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

const statusConfig: Record<
  string,
  { label: string; variant: BadgeVariant; icon: React.ReactNode }
> = {
  pending: {
    label: DASHBOARD_TEXT.test.statusPending,
    variant: 'secondary',
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  sent: {
    label: DASHBOARD_TEXT.test.statusSent,
    variant: 'default',
    icon: <Check className="h-3 w-3" />,
  },
  delivered: {
    label: DASHBOARD_TEXT.test.statusDelivered,
    variant: 'default',
    icon: <Check className="h-3 w-3" />,
  },
  failed: {
    label: DASHBOARD_TEXT.test.statusFailed,
    variant: 'destructive',
    icon: <X className="h-3 w-3" />,
  },
  bounced: {
    label: DASHBOARD_TEXT.test.statusFailed,
    variant: 'destructive',
    icon: <X className="h-3 w-3" />,
  },
  opened: {
    label: DASHBOARD_TEXT.test.statusOpened,
    variant: 'default',
    icon: <Eye className="h-3 w-3" />,
  },
  clicked: {
    label: DASHBOARD_TEXT.test.statusClicked,
    variant: 'default',
    icon: <MousePointerClick className="h-3 w-3" />,
  },
};

interface NotificationStatusBadgeProps {
  status: string;
}

const DEFAULT_CONFIG: { label: string; variant: BadgeVariant; icon: React.ReactNode } = {
  label: DASHBOARD_TEXT.test.statusPending,
  variant: 'secondary',
  icon: <Loader2 className="h-3 w-3 animate-spin" />,
};

export function NotificationStatusBadge({ status }: NotificationStatusBadgeProps) {
  const config = statusConfig[status] ?? DEFAULT_CONFIG;
  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      {config.icon}
      {config.label}
    </Badge>
  );
}
