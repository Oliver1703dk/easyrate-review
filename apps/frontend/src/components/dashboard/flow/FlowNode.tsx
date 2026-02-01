import {
  ShoppingBag,
  MessageSquare,
  Mail,
  Star,
  GitBranch,
  MessageCircle,
  ExternalLink,
  CheckCircle,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@easyrate/ui';
import { Badge } from '@easyrate/ui';
import { cn } from '@easyrate/ui/lib';
import { DASHBOARD_TEXT } from '@easyrate/shared';
import type { FlowNode as FlowNodeType, FlowNodeType as NodeType } from '@easyrate/shared';

const iconMap: Record<string, LucideIcon> = {
  ShoppingBag,
  MessageSquare,
  Mail,
  Star,
  GitBranch,
  MessageCircle,
  ExternalLink,
  CheckCircle,
};

const borderColors: Record<NodeType, string> = {
  trigger: 'border-l-blue-500',
  channel: 'border-l-green-500',
  page: 'border-l-purple-500',
  branch: 'border-l-yellow-500',
  outcome: 'border-l-orange-500',
};

const iconBgColors: Record<NodeType, string> = {
  trigger: 'bg-blue-100 text-blue-600',
  channel: 'bg-green-100 text-green-600',
  page: 'bg-purple-100 text-purple-600',
  branch: 'bg-yellow-100 text-yellow-600',
  outcome: 'bg-orange-100 text-orange-600',
};

interface FlowNodeProps {
  node: FlowNodeType;
  isActive?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}

export function FlowNode({ node, isActive = true, isSelected, onClick, children }: FlowNodeProps) {
  const Icon = iconMap[node?.icon] || CheckCircle;
  const flowText = DASHBOARD_TEXT?.flow?.nodes || {};
  const title = flowText[node?.title as keyof typeof flowText] || node?.title || '';
  const description = flowText[node?.description as keyof typeof flowText] || node?.description || '';

  const nodeType = node?.type || 'trigger';

  return (
    <Card
      className={cn(
        'relative w-64 cursor-pointer border-l-4 transition-all hover:shadow-md',
        borderColors[nodeType] || 'border-l-slate-500',
        isSelected && 'ring-2 ring-primary ring-offset-2',
        !isActive && 'opacity-50'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3 p-4">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', iconBgColors[nodeType] || 'bg-slate-100 text-slate-600')}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-medium text-foreground">{title}</h3>
            <Badge variant={isActive ? 'success' : 'secondary'} className="shrink-0 text-[10px]">
              {isActive ? (DASHBOARD_TEXT?.flow?.status?.active || 'Aktiv') : (DASHBOARD_TEXT?.flow?.status?.inactive || 'Inaktiv')}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {children && (
        <div
          className="relative z-10 border-t px-4 py-3"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      )}
    </Card>
  );
}
