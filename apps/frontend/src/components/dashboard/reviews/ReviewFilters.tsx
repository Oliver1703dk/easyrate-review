import { Search } from 'lucide-react';
import { Input, Select, SelectOption } from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';
import type { ReviewRating } from '@easyrate/shared';

interface ReviewFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  rating: ReviewRating | undefined;
  onRatingChange: (value: ReviewRating | undefined) => void;
  source?: string | undefined;
  onSourceChange?: (value: string | undefined) => void;
  showSourceFilter?: boolean;
}

export function ReviewFilters({
  search,
  onSearchChange,
  rating,
  onRatingChange,
  source,
  onSourceChange,
  showSourceFilter = true,
}: ReviewFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={DASHBOARD_TEXT.reviews.search}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Rating Filter */}
      <Select
        value={rating?.toString() ?? ''}
        onChange={(e) => {
          const value = e.target.value;
          onRatingChange(value ? (Number(value) as ReviewRating) : undefined);
        }}
        className="w-40"
      >
        <SelectOption value="">{DASHBOARD_TEXT.reviews.allRatings}</SelectOption>
        <SelectOption value="5">5 {DASHBOARD_TEXT.reviews.stars}</SelectOption>
        <SelectOption value="4">4 {DASHBOARD_TEXT.reviews.stars}</SelectOption>
        <SelectOption value="3">3 {DASHBOARD_TEXT.reviews.stars}</SelectOption>
        <SelectOption value="2">2 {DASHBOARD_TEXT.reviews.stars}</SelectOption>
        <SelectOption value="1">1 {DASHBOARD_TEXT.reviews.star}</SelectOption>
      </Select>

      {/* Source Filter (only shown for internal reviews) */}
      {showSourceFilter && onSourceChange && (
        <Select
          value={source ?? ''}
          onChange={(e) => onSourceChange(e.target.value || undefined)}
          className="w-40"
        >
          <SelectOption value="">{DASHBOARD_TEXT.reviews.allSources}</SelectOption>
          <SelectOption value="dully">Dully</SelectOption>
          <SelectOption value="easytable">EasyTable</SelectOption>
          <SelectOption value="direct">Direkte</SelectOption>
        </Select>
      )}
    </div>
  );
}
