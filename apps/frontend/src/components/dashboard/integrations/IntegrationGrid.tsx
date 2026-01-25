import type { IntegrationConfig } from '@easyrate/shared';
import { IntegrationCard } from './IntegrationCard';

interface IntegrationGridProps {
  integrations: IntegrationConfig[];
}

export function IntegrationGrid({ integrations }: IntegrationGridProps) {
  const platforms: Array<'dully' | 'easytable'> = ['dully', 'easytable'];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {platforms.map((platform) => {
        const integration = integrations.find((i) => i.platform === platform);
        return (
          <IntegrationCard
            key={platform}
            platform={platform}
            isConnected={integration?.enabled ?? false}
          />
        );
      })}
    </div>
  );
}
