import { useCallback, useEffect, useState, useRef } from 'react';
import type { InsightRun, InsightStatusResponse } from '@easyrate/shared';
import { useAuth } from '../contexts/AuthContext';

interface UseInsightsResult {
  insight: InsightRun | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  status: InsightStatusResponse | null;
  refetch: () => Promise<void>;
  refresh: () => Promise<void>;
}

// Polling interval when insight is being processed
const POLLING_INTERVAL_MS = 5000;

export function useInsights(): UseInsightsResult {
  const { token } = useAuth();
  const [insight, setInsight] = useState<InsightRun | null>(null);
  const [status, setStatus] = useState<InsightStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch the latest insight
  const fetchInsight = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/v1/insights', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Kunne ikke hente indsigt');
      }

      const json = (await response.json()) as { data?: { insight?: InsightRun | null } };
      setInsight(json.data?.insight ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Der opstod en fejl');
    }
  }, [token]);

  // Fetch the status
  const fetchStatus = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const response = await fetch('/api/v1/insights/status', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Kunne ikke hente status');
      }

      const json = await response.json();
      setStatus(json.data || null);
    } catch (err) {
      console.error('Failed to fetch insights status:', err);
    }
  }, [token]);

  // Initial fetch
  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([fetchInsight(), fetchStatus()]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchInsight, fetchStatus]);

  // Trigger a manual refresh
  const refresh = useCallback(async () => {
    if (!token || isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/insights/refresh', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: { message?: string } };
        throw new Error(errorData.error?.message ?? 'Kunne ikke generere indsigt');
      }

      const json = (await response.json()) as { data?: { insight?: InsightRun | null } };
      setInsight(json.data?.insight ?? null);

      // Refresh status after manual refresh
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Der opstod en fejl');
    } finally {
      setIsRefreshing(false);
    }
  }, [token, isRefreshing, fetchStatus]);

  // Start polling when insight is pending or processing
  useEffect(() => {
    // Clear any existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    // Start polling if insight is being processed
    if (status?.lastRunStatus === 'pending' || status?.lastRunStatus === 'processing') {
      pollingRef.current = setInterval(() => {
        fetchInsight();
        fetchStatus();
      }, POLLING_INTERVAL_MS);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [status?.lastRunStatus, fetchInsight, fetchStatus]);

  // Initial fetch on mount
  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    insight,
    isLoading,
    isRefreshing,
    error,
    status,
    refetch,
    refresh,
  };
}
