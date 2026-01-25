import { useParams, Navigate } from 'react-router-dom';
import { Spinner } from '@easyrate/ui';
import { Header } from '../../components/dashboard/layout';
import { IntegrationSetupForm } from '../../components/dashboard/integrations';
import { useIntegrations } from '../../hooks';
import { DASHBOARD_TEXT } from '@easyrate/shared';

export function IntegrationDetailPage() {
  const { platform } = useParams<{ platform: string }>();
  const { integrations, isLoading } = useIntegrations();

  // Validate platform
  if (platform !== 'dully' && platform !== 'easytable') {
    return <Navigate to="/dashboard/integrations" replace />;
  }

  const integration = integrations.find((i) => i.platform === platform);
  const config =
    platform === 'dully' ? DASHBOARD_TEXT.integrations.dully : DASHBOARD_TEXT.integrations.easytable;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title={config.setupTitle} />

      <div className="p-6">
        <IntegrationSetupForm platform={platform} integration={integration} />
      </div>
    </div>
  );
}
