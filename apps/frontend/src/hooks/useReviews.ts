import { useCallback, useEffect, useState } from 'react';
import type { Review, ReviewRating } from '@easyrate/shared';
import { useAuth } from '../contexts/AuthContext';

interface ReviewFilters {
  rating?: ReviewRating | ReviewRating[] | undefined;
  sourcePlatform?: string | undefined;
  isPublic?: boolean | undefined;
  fromDate?: string | undefined;
  toDate?: string | undefined;
  search?: string | undefined;
}

interface UseReviewsResult {
  reviews: Review[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  error: string | null;
  setPage: (page: number) => void;
  setFilters: (filters: ReviewFilters) => void;
  refetch: () => Promise<void>;
}

export function useReviews(initialFilters?: ReviewFilters): UseReviewsResult {
  const { token } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [filters, setFilters] = useState<ReviewFilters>(initialFilters || {});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      params.set('pageSize', String(pageSize));

      if (filters.rating) {
        const ratings = Array.isArray(filters.rating) ? filters.rating : [filters.rating];
        ratings.forEach((r) => params.append('rating', String(r)));
      }
      if (filters.sourcePlatform) {
        params.set('sourcePlatform', filters.sourcePlatform);
      }
      if (filters.isPublic !== undefined) {
        params.set('isPublic', String(filters.isPublic));
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

      const response = await fetch(`/api/v1/reviews?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }

      const data = await response.json();
      setReviews(data.data || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [token, page, pageSize, filters]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSetFilters = useCallback((newFilters: ReviewFilters) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  }, []);

  return {
    reviews,
    total,
    page,
    pageSize,
    isLoading,
    error,
    setPage,
    setFilters: handleSetFilters,
    refetch: fetchReviews,
  };
}
