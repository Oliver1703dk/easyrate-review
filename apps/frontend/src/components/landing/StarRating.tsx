import { useState } from 'react';
import { Star } from 'lucide-react';
import type { ReviewRating } from '@easyrate/shared';

interface StarRatingProps {
  value: ReviewRating | null;
  onChange: (rating: ReviewRating) => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

export function StarRating({ value, onChange, size = 'lg', disabled = false }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const displayValue = hoverValue ?? value ?? 0;

  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Rating">
      {([1, 2, 3, 4, 5] as const).map((rating) => {
        const isFilled = rating <= displayValue;
        return (
          <button
            key={rating}
            type="button"
            role="radio"
            aria-checked={value === rating}
            aria-label={`${String(rating)} star${rating > 1 ? 's' : ''}`}
            disabled={disabled}
            className={`
              ${sizeClasses[size]}
              transition-all duration-150 ease-out
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
              disabled:cursor-not-allowed disabled:opacity-50
              ${!disabled ? 'cursor-pointer hover:scale-110 active:scale-95' : ''}
            `}
            onClick={() => {
              if (!disabled) onChange(rating);
            }}
            onMouseEnter={() => {
              if (!disabled) setHoverValue(rating);
            }}
            onMouseLeave={() => {
              if (!disabled) setHoverValue(null);
            }}
            onTouchStart={() => {
              if (!disabled) setHoverValue(rating);
            }}
            onTouchEnd={() => {
              if (!disabled) setHoverValue(null);
            }}
          >
            <Star
              className={`
                w-full h-full transition-colors duration-150
                ${isFilled ? 'fill-primary text-primary' : 'fill-transparent text-muted-foreground'}
              `}
              strokeWidth={1.5}
            />
          </button>
        );
      })}
    </div>
  );
}
