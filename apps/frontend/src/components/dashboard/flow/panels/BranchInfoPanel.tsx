import { Card, CardContent, CardHeader, CardTitle } from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';
import { GitBranch, ThumbsDown, ThumbsUp } from 'lucide-react';

export function BranchInfoPanel() {
  const sidebar = DASHBOARD_TEXT.flow.sidebar;
  const branches = DASHBOARD_TEXT.flow.branches;
  const nodes = DASHBOARD_TEXT.flow.nodes;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{sidebar.branchInfo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg border bg-slate-50 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <GitBranch className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <p className="font-medium text-sm">{nodes.rating_branch}</p>
            <p className="text-xs text-muted-foreground">{nodes.rating_branch_desc}</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{sidebar.branchExplanation}</p>

        <div className="space-y-2">
          <div className="flex items-center gap-3 rounded-md border border-red-200 bg-red-50 p-3">
            <ThumbsDown className="h-4 w-4 text-red-500" />
            <div>
              <p className="text-sm font-medium text-red-700">{branches.negative}</p>
              <p className="text-xs text-red-600">→ Intern feedback formular</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-md border border-green-200 bg-green-50 p-3">
            <ThumbsUp className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-sm font-medium text-green-700">{branches.positive}</p>
              <p className="text-xs text-green-600">→ Google Review prompt</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
