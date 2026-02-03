import { useCallback, useEffect, useState } from 'react';
import type {
  ExternalReview,
  ExternalReviewStats,
  ReviewRating,
  ExternalReviewSource,
} from '@easyrate/shared';
import { useAuth } from '../contexts/AuthContext';

interface ExternalReviewFilters {
  sourcePlatform?: ExternalReviewSource;
  rating?: ReviewRating | ReviewRating[];
  hasReply?: boolean;
  hasAttribution?: boolean;
  locationId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
}

interface SyncStatus {
  lastSyncAt?: string;
  lastSyncStatus?: string;
  isRunning: boolean;
  nextSyncAt?: string;
}

interface SyncResult {
  success: boolean;
  newReviews: number;
  updatedReviews: number;
  errors: string[];
}

interface UseExternalReviewsResult {
  reviews: ExternalReview[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  error: string | null;
  stats: ExternalReviewStats | null;
  syncStatus: SyncStatus | null;
  setPage: (page: number) => void;
  setFilters: (filters: ExternalReviewFilters) => void;
  refetch: () => Promise<void>;
  fetchStats: (dateRange?: { from: string; to: string }) => Promise<void>;
  fetchSyncStatus: () => Promise<void>;
  triggerSync: () => Promise<SyncResult>;
}

export function useExternalReviews(initialFilters?: ExternalReviewFilters): UseExternalReviewsResult {
  const { token } = useAuth();
  const [reviews, setReviews] = useState<ExternalReview[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [filters, setFiltersState] = useState<ExternalReviewFilters>(initialFilters || {});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ExternalReviewStats | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  // Fetch reviews
  const fetchReviews = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));

      if (filters.sourcePlatform) {
        params.set('sourcePlatform', filters.sourcePlatform);
      }
      if (filters.rating) {
        const ratings = Array.isArray(filters.rating) ? filters.rating : [filters.rating];
        ratings.forEach((r) => params.append('rating', String(r)));
      }
      if (filters.hasReply !== undefined) {
        params.set('hasReply', String(filters.hasReply));
      }
      if (filters.hasAttribution !== undefined) {
        params.set('hasAttribution', String(filters.hasAttribution));
      }
      if (filters.locationId) {
        params.set('locationId', filters.locationId);
      }
      if (filters.fromDate) {
        params.set('fromDate', filters.fromDate);
      }
      if (filters.toDate) {
        params.set('toDate', filters.toDate);
      }
      if (filters.search) {
        params.set('search', filters.search);
      }

      const response = await fetch(`/api/v1/external-reviews?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Kunne ikke hente eksterne anmeldelser');

      const data = await response.json();
      setReviews(data.data || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'En fejl opstod');
    } finally {
      setIsLoading(false);
    }
  }, [token, page, pageSize, filters]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Fetch stats
  const fetchStats = useCallback(
    async (dateRange?: { from: string; to: string }) => {
      if (!token) return;

      try {
        const params = new URLSearchParams();
        if (dateRange) {
          params.set('fromDate', dateRange.from);
          params.set('toDate', dateRange.to);
        }

        const response = await fetch(`/api/v1/external-reviews/stats?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Kunne ikke hente statistik');

        const data = await response.json();
        setStats(data.data);
      } catch (err) {
        console.error('Error fetching external review stats:', err);
      }
    },
    [token]
  );

  // Fetch sync status
  const fetchSyncStatus = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/v1/external-reviews/sync/status', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Kunne ikke hente sync status');

      const data = await response.json();
      setSyncStatus(data.data);
    } catch (err) {
      console.error('Error fetching sync status:', err);
    }
  }, [token]);

  // Trigger manual sync
  const triggerSync = useCallback(async (): Promise<SyncResult> => {
    if (!token) {
      throw new Error('Ikke logget ind');
    }

    try {
      const response = await fetch('/api/v1/external-reviews/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Kunne ikke starte synkronisering');

      const data = await response.json();
      const result = data.data as SyncResult;

      // Refresh reviews and status after sync
      await Promise.all([fetchReviews(), fetchSyncStatus()]);

      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'En fejl opstod');
      throw err;
    }
  }, [token, fetchReviews, fetchSyncStatus]);

  const setFilters = useCallback((newFilters: ExternalReviewFilters) => {
    setFiltersState(newFilters);
    setPage(1);
  }, []);

  return {
    reviews,
    total,
    page,
    pageSize,
    isLoading,
    error,
    stats,
    syncStatus,
    setPage,
    setFilters,
    refetch: fetchReviews,
    fetchStats,
    fetchSyncStatus,
    triggerSync,
  };
}

// Hook for replying to Google reviews
interface UseGoogleReviewReplyResult {
  replyToReview: (reviewId: string, text: string) => Promise<ExternalReview>;
  isReplying: boolean;
  error: string | null;
}

export function useGoogleReviewReply(): UseGoogleReviewReplyResult {
  const { token } = useAuth();
  const [isReplying, setIsReplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const replyToReview = useCallback(
    async (reviewId: string, text: string): Promise<ExternalReview> => {
      if (!token) throw new Error('Ikke logget ind');

      setIsReplying(true);
      setError(null);

      try {
        const response = await fetch(`/api/v1/external-reviews/${reviewId}/reply`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Kunne ikke sende svar');
        }

        const data = await response.json();
        return data.data.review;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'En fejl opstod';
        setError(errorMessage);
        throw err;
      } finally {
        setIsReplying(false);
      }
    },
    [token]
  );

  return {
    replyToReview,
    isReplying,
    error,
  };
}

// Hook for review attribution
interface AttributionCandidate {
  reviewId: string;
  customerName?: string;
  reviewDate: string;
  rating: ReviewRating;
  confidence: number;
  matchReasons: string[];
}

interface AttributionResult {
  externalReviewId: string;
  matchedInternalReviewId?: string;
  confidence: number;
  matchMethod: string;
  candidates: AttributionCandidate[];
}

interface UseReviewAttributionResult {
  findMatches: (externalReviewId: string) => Promise<AttributionResult>;
  linkReviews: (externalReviewId: string, internalReviewId: string) => Promise<ExternalReview>;
  unlinkReview: (externalReviewId: string) => Promise<ExternalReview>;
  isLoading: boolean;
  error: string | null;
}

export function useReviewAttribution(): UseReviewAttributionResult {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findMatches = useCallback(
    async (externalReviewId: string): Promise<AttributionResult> => {
      if (!token) throw new Error('Ikke logget ind');

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/v1/external-reviews/${externalReviewId}/attribution`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Kunne ikke finde matches');

        const data = await response.json();
        return data.data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'En fejl opstod';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [token]
  );

  const linkReviews = useCallback(
    async (externalReviewId: string, internalReviewId: string): Promise<ExternalReview> => {
      if (!token) throw new Error('Ikke logget ind');

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/v1/external-reviews/${externalReviewId}/attribution`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ internalReviewId }),
        });

        if (!response.ok) throw new Error('Kunne ikke forbinde anmeldelser');

        const data = await response.json();
        return data.data.review;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'En fejl opstod';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [token]
  );

  const unlinkReview = useCallback(
    async (externalReviewId: string): Promise<ExternalReview> => {
      if (!token) throw new Error('Ikke logget ind');

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/v1/external-reviews/${externalReviewId}/attribution`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Kunne ikke fjerne forbindelse');

        const data = await response.json();
        return data.data.review;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'En fejl opstod';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [token]
  );

  return {
    findMatches,
    linkReviews,
    unlinkReview,
    isLoading,
    error,
  };
}
