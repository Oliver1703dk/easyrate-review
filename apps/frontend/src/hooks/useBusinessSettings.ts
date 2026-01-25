import { useCallback, useEffect, useState } from 'react';
import type { Business, UpdateBusinessInput } from '@easyrate/shared';
import { useAuth } from '../contexts/AuthContext';

interface UseBusinessSettingsResult {
  business: Business | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateSettings: (data: UpdateBusinessInput) => Promise<void>;
}

export function useBusinessSettings(): UseBusinessSettingsResult {
  const { token } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBusiness = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/businesses/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch business');
      }

      const data = await response.json();
      setBusiness(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  const updateSettings = useCallback(
    async (data: UpdateBusinessInput) => {
      if (!token) return;

      setIsSaving(true);
      setError(null);

      try {
        const response = await fetch('/api/v1/businesses/me', {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error('Failed to update settings');
        }

        const updatedBusiness = await response.json();
        setBusiness(updatedBusiness);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [token]
  );

  return {
    business,
    isLoading,
    isSaving,
    error,
    refetch: fetchBusiness,
    updateSettings,
  };
}
