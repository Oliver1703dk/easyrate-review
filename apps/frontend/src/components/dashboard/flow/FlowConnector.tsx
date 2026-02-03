import { cn } from '@easyrate/ui/lib';

interface FlowConnectorProps {
  direction?: 'vertical' | 'horizontal';
  length?: 'short' | 'medium' | 'long';
  className?: string;
}

export function FlowConnector({
  direction = 'vertical',
  length = 'medium',
  className,
}: FlowConnectorProps) {
  const lengthMap = {
    short: direction === 'vertical' ? 'h-6' : 'w-6',
    medium: direction === 'vertical' ? 'h-10' : 'w-10',
    long: direction === 'vertical' ? 'h-16' : 'w-16',
  };

  return (
    <div
      className={cn(
        'relative flex items-center justify-center',
        direction === 'vertical' ? 'w-0.5' : 'h-0.5',
        lengthMap[length],
        className
      )}
    >
      <div
        className={cn(
          'border-dashed border-slate-300',
          direction === 'vertical' ? 'h-full border-l-2' : 'w-full border-t-2'
        )}
      />
      {/* Arrow at the end */}
      {direction === 'vertical' && (
        <div className="absolute -bottom-1 left-1/2 h-0 w-0 -translate-x-1/2 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-300" />
      )}
    </div>
  );
}

interface FlowConnectorWithLabelProps extends FlowConnectorProps {
  label: string;
}

export function FlowConnectorWithLabel({ label, ...props }: FlowConnectorWithLabelProps) {
  return (
    <div className="relative flex flex-col items-center">
      <FlowConnector {...props} />
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
        {label}
      </span>
    </div>
  );
}
