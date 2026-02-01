import { useState, useCallback } from 'react';
import { Spinner } from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';
import type { ReviewRating } from '@easyrate/shared';
import { Header } from '../../components/dashboard/layout';
import { ReviewFilters, ReviewList } from '../../components/dashboard/reviews';
import { useReviews } from '../../hooks';

export function ReviewsPage() {
  const [search, setSearch] = useState('');
  const [rating, setRating] = useState<ReviewRating | undefined>();
  const [source, setSource] = useState<string | undefined>();

  const { reviews, total, page, pageSize, isLoading, setPage, setFilters, refetch } = useReviews();

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      setFilters({ search: value || undefined, rating, sourcePlatform: source });
    },
    [rating, source, setFilters]
  );

  const handleRatingChange = useCallback(
    (value: ReviewRating | undefined) => {
      setRating(value);
      setFilters({ search: search || undefined, rating: value, sourcePlatform: source });
    },
    [search, source, setFilters]
  );

  const handleSourceChange = useCallback(
    (value: string | undefined) => {
      setSource(value);
      setFilters({ search: search || undefined, rating, sourcePlatform: value });
    },
    [search, rating, setFilters]
  );

  return (
    <div className="flex flex-col">
      <Header title={DASHBOARD_TEXT.reviews.title} />

      <div className="p-6">
        {/* Filters */}
        <div className="mb-6">
          <ReviewFilters
            search={search}
            onSearchChange={handleSearchChange}
            rating={rating}
            onRatingChange={handleRatingChange}
            source={source}
            onSourceChange={handleSourceChange}
          />
        </div>

        {/* Review List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <ReviewList
            reviews={reviews}
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onRefetch={refetch}
          />
        )}
      </div>
    </div>
  );
}
