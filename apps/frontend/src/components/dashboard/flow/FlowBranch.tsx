import { cn } from '@easyrate/ui/lib';
import { DASHBOARD_TEXT } from '@easyrate/shared';

interface FlowBranchProps {
  leftNode: React.ReactNode;
  rightNode: React.ReactNode;
  className?: string;
}

export function FlowBranch({ leftNode, rightNode, className }: FlowBranchProps) {
  return (
    <div className={cn('relative', className)}>
      {/* Branch lines SVG */}
      <svg
        className="absolute left-1/2 top-0 h-12 w-64 -translate-x-1/2"
        viewBox="0 0 256 48"
        fill="none"
      >
        {/* Left branch */}
        <path
          d="M128 0 L128 16 Q128 24 120 24 L64 24 Q56 24 56 32 L56 48"
          stroke="#cbd5e1"
          strokeWidth="2"
          strokeDasharray="6 4"
          fill="none"
        />
        {/* Right branch */}
        <path
          d="M128 0 L128 16 Q128 24 136 24 L192 24 Q200 24 200 32 L200 48"
          stroke="#cbd5e1"
          strokeWidth="2"
          strokeDasharray="6 4"
          fill="none"
        />
      </svg>

      {/* Branch labels */}
      <div className="absolute left-1/2 top-3 flex w-64 -translate-x-1/2 justify-between px-4">
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
          {DASHBOARD_TEXT?.flow?.branches?.negative || '1-3 stjerner'}
        </span>
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
          {DASHBOARD_TEXT?.flow?.branches?.positive || '4-5 stjerner'}
        </span>
      </div>

      {/* Child nodes container */}
      <div className="flex justify-center gap-8 pt-14">
        <div className="flex flex-col items-center">{leftNode}</div>
        <div className="flex flex-col items-center">{rightNode}</div>
      </div>
    </div>
  );
}
