import { Spinner } from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';
import { Header } from '../../components/dashboard/layout';
import { IntegrationGrid } from '../../components/dashboard/integrations';
import { useIntegrations } from '../../hooks';

export function IntegrationsPage() {
  const { integrations, isLoading } = useIntegrations();

  return (
    <div className="flex flex-col">
      <Header title={DASHBOARD_TEXT.integrations.title} />

      <div className="p-6">
        <p className="mb-6 text-muted-foreground">{DASHBOARD_TEXT.integrations.subtitle}</p>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <IntegrationGrid integrations={integrations} />
        )}
      </div>
    </div>
  );
}
