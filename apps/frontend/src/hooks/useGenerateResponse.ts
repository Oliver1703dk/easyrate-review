import { useCallback, useState, useEffect } from 'react';
import type { ResponseGenerationStatus } from '@easyrate/shared';
import { useAuth } from '../contexts/AuthContext';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface GenerateResponseData {
  responseText: string;
  remainingToday: number;
}

interface UseGenerateResponseResult {
  generate: (reviewId: string) => Promise<string>;
  isGenerating: boolean;
  error: string | null;
  clearError: () => void;
  status: ResponseGenerationStatus | null;
  refreshStatus: () => Promise<void>;
}

export function useGenerateResponse(): UseGenerateResponseResult {
  const { token } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ResponseGenerationStatus | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/v1/reviews/generation-status', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = (await response.json()) as ApiResponse<ResponseGenerationStatus>;
        setStatus(data.data);
      }
    } catch {
      // Silently fail - status is optional
    }
  }, [token]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const generate = useCallback(
    async (reviewId: string): Promise<string> => {
      if (!token) {
        throw new Error('Not authenticated');
      }

      setIsGenerating(true);
      setError(null);

      try {
        const response = await fetch(`/api/v1/reviews/${reviewId}/generate-response`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { message?: string };
          const errorMessage = data.message ?? 'Kunne ikke generere svar';
          setError(errorMessage);
          throw new Error(errorMessage);
        }

        const data = (await response.json()) as ApiResponse<GenerateResponseData>;

        // Update local status with new remaining count
        if (status && typeof data.data.remainingToday === 'number') {
          setStatus({
            ...status,
            remainingToday: data.data.remainingToday,
            canGenerate: data.data.remainingToday > 0,
          });
        }

        return data.data.responseText;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Kunne ikke generere svar';
        setError(message);
        throw err;
      } finally {
        setIsGenerating(false);
      }
    },
    [token, status]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    generate,
    isGenerating,
    error,
    clearError,
    status,
    refreshStatus,
  };
}
