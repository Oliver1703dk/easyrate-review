import { useState, useEffect, useCallback } from 'react';
import { ERROR_MESSAGES } from '@easyrate/shared';
import type { LandingPageBusiness } from '@easyrate/shared';
import { api } from '../lib/api';

interface UseBusinessDataResult {
  business: LandingPageBusiness | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useBusinessData(token: string | undefined): UseBusinessDataResult {
  const [business, setBusiness] = useState<LandingPageBusiness | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBusiness = useCallback(async () => {
    if (!token) {
      setError(ERROR_MESSAGES.invalidToken);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.getLandingPageData(token);
      setBusiness(response.business);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(ERROR_MESSAGES.generic);
      }
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchBusiness();
  }, [fetchBusiness]);

  return {
    business,
    isLoading,
    error,
    refetch: fetchBusiness,
  };
}
