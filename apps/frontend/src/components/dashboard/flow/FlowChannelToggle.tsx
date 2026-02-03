import { cn } from '@easyrate/ui/lib';

interface FlowChannelToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export function FlowChannelToggle({ enabled, onChange, disabled }: FlowChannelToggleProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent Card's onClick from firing
    console.log(
      `[Toggle] Clicked - enabled: ${enabled}, disabled: ${disabled}, will change to: ${!enabled}`
    );
    if (!disabled) {
      onChange(!enabled);
    } else {
      console.log('[Toggle] Click ignored - toggle is disabled');
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        enabled ? 'bg-green-500' : 'bg-slate-200',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <span
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform',
          enabled ? 'translate-x-4' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}
