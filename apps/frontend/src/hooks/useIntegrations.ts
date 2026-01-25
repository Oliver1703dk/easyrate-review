import { useCallback, useEffect, useState } from 'react';
import type { IntegrationConfig } from '@easyrate/shared';
import { useAuth } from '../contexts/AuthContext';

interface UseIntegrationsResult {
  integrations: IntegrationConfig[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateIntegration: (platform: string, config: Partial<IntegrationConfig>) => Promise<void>;
  testIntegration: (platform: string) => Promise<boolean>;
}

export function useIntegrations(): UseIntegrationsResult {
  const { token } = useAuth();
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIntegrations = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/businesses/me/integrations', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch integrations');
      }

      const data = await response.json();
      setIntegrations(data.integrations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const updateIntegration = useCallback(
    async (platform: string, config: Partial<IntegrationConfig>) => {
      if (!token) return;

      const response = await fetch(`/api/v1/businesses/me/integrations/${platform}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error('Failed to update integration');
      }

      await fetchIntegrations();
    },
    [token, fetchIntegrations]
  );

  const testIntegration = useCallback(
    async (platform: string): Promise<boolean> => {
      if (!token) return false;

      try {
        const response = await fetch(`/api/v1/businesses/me/integrations/${platform}/test`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          return false;
        }

        const data = await response.json();
        return data.success === true;
      } catch {
        return false;
      }
    },
    [token]
  );

  return {
    integrations,
    isLoading,
    error,
    refetch: fetchIntegrations,
    updateIntegration,
    testIntegration,
  };
}
