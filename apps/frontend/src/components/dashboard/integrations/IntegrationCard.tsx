import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { Card, CardContent, Badge, Button } from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';

interface IntegrationCardProps {
  platform: 'dully' | 'easytable';
  isConnected: boolean;
}

const platformConfig = {
  dully: {
    name: DASHBOARD_TEXT.integrations.dully.name,
    description: DASHBOARD_TEXT.integrations.dully.description,
    logo: '/logos/dully.svg',
    color: 'bg-orange-500',
  },
  easytable: {
    name: DASHBOARD_TEXT.integrations.easytable.name,
    description: DASHBOARD_TEXT.integrations.easytable.description,
    logo: '/logos/easytable.svg',
    color: 'bg-blue-500',
  },
};

export function IntegrationCard({ platform, isConnected }: IntegrationCardProps) {
  const config = platformConfig[platform];

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Logo placeholder */}
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-lg ${config.color} text-white font-bold text-lg`}
            >
              {config.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold">{config.name}</h3>
              <p className="text-sm text-muted-foreground">{config.description}</p>
            </div>
          </div>
          <Badge variant={isConnected ? 'success' : 'secondary'}>
            {isConnected
              ? DASHBOARD_TEXT.integrations.connected
              : DASHBOARD_TEXT.integrations.notConnected}
          </Badge>
        </div>

        <div className="mt-4">
          <Link to={`/dashboard/integrations/${platform}`} className="block">
            <Button variant={isConnected ? 'outline' : 'default'} className="w-full">
              <Settings className="mr-2 h-4 w-4" />
              {DASHBOARD_TEXT.integrations.configure}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
