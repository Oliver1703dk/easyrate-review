import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils.js';

const spinnerVariants = cva('animate-spin rounded-full border-2 border-current border-t-transparent', {
  variants: {
    size: {
      sm: 'h-4 w-4',
      default: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-12 w-12',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

export interface SpinnerProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {}

const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(({ className, size, ...props }, ref) => (
  <div
    ref={ref}
    role="status"
    aria-label="Loading"
    className={cn(spinnerVariants({ size, className }))}
    {...props}
  >
    <span className="sr-only">Loading...</span>
  </div>
));
Spinner.displayName = 'Spinner';

export { Spinner, spinnerVariants };
