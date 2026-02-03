import { useState, useCallback, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { Spinner, Button, Tabs, TabsList, TabsTrigger } from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';
import type { ReviewRating, Review, ExternalReview } from '@easyrate/shared';
import { Header } from '../../components/dashboard/layout';
import { ReviewFilters, ReviewList, ExternalReviewCard } from '../../components/dashboard/reviews';
import { useReviews } from '../../hooks';
import { useExternalReviews } from '../../hooks/useExternalReviews';

type SourceTab = 'all' | 'internal' | 'google';

export function ReviewsPage() {
  const [search, setSearch] = useState('');
  const [rating, setRating] = useState<ReviewRating | undefined>();
  const [source, setSource] = useState<string | undefined>();
  const [sourceTab, setSourceTab] = useState<SourceTab>('all');

  // Internal reviews hook
  const {
    reviews: internalReviews,
    total: internalTotal,
    page: internalPage,
    pageSize: internalPageSize,
    isLoading: internalLoading,
    setPage: setInternalPage,
    setFilters: setInternalFilters,
    refetch: refetchInternal,
  } = useReviews();

  // External reviews hook
  const {
    reviews: externalReviews,
    total: externalTotal,
    page: externalPage,
    pageSize: externalPageSize,
    isLoading: externalLoading,
    syncStatus,
    setPage: setExternalPage,
    setFilters: setExternalFilters,
    refetch: refetchExternal,
    triggerSync,
    fetchSyncStatus,
  } = useExternalReviews();

  const [isSyncing, setIsSyncing] = useState(false);

  // Combine reviews for "all" tab
  const combinedReviews = useMemo(() => {
    if (sourceTab === 'internal') return [];
    if (sourceTab === 'google') return [];

    // For "all" tab, interleave reviews by date
    const allItems: Array<{ type: 'internal' | 'external'; item: Review | ExternalReview; date: Date }> =
      [];

    internalReviews.forEach((r) => {
      allItems.push({ type: 'internal', item: r, date: new Date(r.createdAt) });
    });

    externalReviews.forEach((r) => {
      allItems.push({ type: 'external', item: r, date: new Date(r.reviewedAt) });
    });

    allItems.sort((a, b) => b.date.getTime() - a.date.getTime());
    return allItems;
  }, [sourceTab, internalReviews, externalReviews]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      setInternalFilters({ search: value || undefined, rating, sourcePlatform: source });
      const externalFilters: Record<string, unknown> = {};
      if (value) externalFilters.search = value;
      if (rating) externalFilters.rating = rating;
      setExternalFilters(externalFilters);
    },
    [rating, source, setInternalFilters, setExternalFilters]
  );

  const handleRatingChange = useCallback(
    (value: ReviewRating | undefined) => {
      setRating(value);
      setInternalFilters({ search: search || undefined, rating: value, sourcePlatform: source });
      const externalFilters: Record<string, unknown> = {};
      if (search) externalFilters.search = search;
      if (value) externalFilters.rating = value;
      setExternalFilters(externalFilters);
    },
    [search, source, setInternalFilters, setExternalFilters]
  );

  const handleSourceChange = useCallback(
    (value: string | undefined) => {
      setSource(value);
      setInternalFilters({ search: search || undefined, rating, sourcePlatform: value });
    },
    [search, rating, setInternalFilters]
  );

  const handleTabChange = useCallback((value: string) => {
    setSourceTab(value as SourceTab);
    // Reset pages when switching tabs
    setInternalPage(1);
    setExternalPage(1);
  }, [setInternalPage, setExternalPage]);

  const handleSyncGoogle = async () => {
    setIsSyncing(true);
    try {
      await triggerSync();
      await fetchSyncStatus();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRefetch = useCallback(() => {
    refetchInternal();
    refetchExternal();
  }, [refetchInternal, refetchExternal]);

  const isLoading =
    sourceTab === 'all'
      ? internalLoading || externalLoading
      : sourceTab === 'internal'
        ? internalLoading
        : externalLoading;

  const currentTotal =
    sourceTab === 'all'
      ? internalTotal + externalTotal
      : sourceTab === 'internal'
        ? internalTotal
        : externalTotal;

  return (
    <div className="flex flex-col">
      <Header title={DASHBOARD_TEXT.reviews.title} />

      <div className="p-6">
        {/* Source Tabs */}
        <div className="mb-4 flex items-center justify-between">
          <Tabs value={sourceTab} onValueChange={handleTabChange}>
            <TabsList>
              <TabsTrigger value="all">{DASHBOARD_TEXT.reviews.sourceAll}</TabsTrigger>
              <TabsTrigger value="internal">{DASHBOARD_TEXT.reviews.sourceInternal}</TabsTrigger>
              <TabsTrigger value="google">{DASHBOARD_TEXT.reviews.sourceGoogle}</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Sync button for Google tab */}
          {sourceTab === 'google' && (
            <div className="flex items-center gap-2">
              {syncStatus?.lastSyncAt && (
                <span className="text-xs text-muted-foreground">
                  {DASHBOARD_TEXT.settings.googleBusiness.lastSync}:{' '}
                  {new Date(syncStatus.lastSyncAt).toLocaleString('da-DK')}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncGoogle}
                disabled={isSyncing || syncStatus?.isRunning}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing
                  ? DASHBOARD_TEXT.settings.googleBusiness.syncing
                  : DASHBOARD_TEXT.settings.googleBusiness.syncNow}
              </Button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="mb-6">
          <ReviewFilters
            search={search}
            onSearchChange={handleSearchChange}
            rating={rating}
            onRatingChange={handleRatingChange}
            source={sourceTab === 'internal' ? source : undefined}
            onSourceChange={sourceTab === 'internal' ? handleSourceChange : () => {}}
            showSourceFilter={sourceTab === 'internal'}
          />
        </div>

        {/* Review List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : sourceTab === 'all' ? (
          // Combined list for "all" tab
          <div className="space-y-4">
            {combinedReviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <h3 className="mt-4 text-lg font-medium">{DASHBOARD_TEXT.reviews.noReviews}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {DASHBOARD_TEXT.reviews.noReviewsSubtext}
                </p>
              </div>
            ) : (
              combinedReviews.map((item) =>
                item.type === 'internal' ? (
                  <ReviewList
                    key={`internal-${(item.item as Review).id}`}
                    reviews={[item.item as Review]}
                    total={1}
                    page={1}
                    pageSize={1}
                    onPageChange={() => {}}
                    onRefetch={handleRefetch}
                  />
                ) : (
                  <ExternalReviewCard
                    key={`external-${(item.item as ExternalReview).id}`}
                    review={item.item as ExternalReview}
                    onReplySuccess={handleRefetch}
                  />
                )
              )
            )}

            {/* Pagination for combined view */}
            {currentTotal > 20 && (
              <div className="flex items-center justify-center pt-4 text-sm text-muted-foreground">
                Viser de seneste 20 anmeldelser. Skift til en specifik fane for at se alle.
              </div>
            )}
          </div>
        ) : sourceTab === 'google' ? (
          // External reviews list
          <div className="space-y-4">
            {externalReviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <h3 className="mt-4 text-lg font-medium">{DASHBOARD_TEXT.reviews.noReviews}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ingen Google anmeldelser fundet. Forbind din Google Business Profile i indstillinger.
                </p>
              </div>
            ) : (
              <>
                {externalReviews.map((review) => (
                  <ExternalReviewCard
                    key={review.id}
                    review={review}
                    onReplySuccess={refetchExternal}
                  />
                ))}

                {/* Pagination */}
                {Math.ceil(externalTotal / externalPageSize) > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-muted-foreground">
                      {(externalPage - 1) * externalPageSize + 1} -{' '}
                      {Math.min(externalPage * externalPageSize, externalTotal)} af {externalTotal}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExternalPage(externalPage - 1)}
                        disabled={externalPage <= 1}
                      >
                        {DASHBOARD_TEXT.common.back}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExternalPage(externalPage + 1)}
                        disabled={externalPage >= Math.ceil(externalTotal / externalPageSize)}
                      >
                        {DASHBOARD_TEXT.common.next}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          // Internal reviews list
          <ReviewList
            reviews={internalReviews}
            total={internalTotal}
            page={internalPage}
            pageSize={internalPageSize}
            onPageChange={setInternalPage}
            onRefetch={refetchInternal}
          />
        )}
      </div>
    </div>
  );
}
