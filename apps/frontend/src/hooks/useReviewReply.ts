import { useCallback, useState } from 'react';
import type { Review } from '@easyrate/shared';
import { useAuth } from '../contexts/AuthContext';

interface UseReviewReplyResult {
  sendReply: (reviewId: string, text: string) => Promise<Review>;
  isSending: boolean;
  error: string | null;
  clearError: () => void;
}

export function useReviewReply(): UseReviewReplyResult {
  const { token } = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendReply = useCallback(
    async (reviewId: string, text: string): Promise<Review> => {
      if (!token) {
        throw new Error('Not authenticated');
      }

      setIsSending(true);
      setError(null);

      try {
        const response = await fetch(`/api/v1/reviews/${reviewId}/reply`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          const errorMessage = data.message || 'Kunne ikke sende svar';
          setError(errorMessage);
          throw new Error(errorMessage);
        }

        const data = await response.json();
        return data.data.review;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Kunne ikke sende svar';
        setError(message);
        throw err;
      } finally {
        setIsSending(false);
      }
    },
    [token]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    sendReply,
    isSending,
    error,
    clearError,
  };
}
