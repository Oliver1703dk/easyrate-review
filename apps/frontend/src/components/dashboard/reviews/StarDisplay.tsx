import { Star } from 'lucide-react';
import { cn } from '@easyrate/ui/lib';

interface StarDisplayProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export function StarDisplay({ rating, size = 'md', className }: StarDisplayProps) {
  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            sizes[size],
            star <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'
          )}
        />
      ))}
    </div>
  );
}
