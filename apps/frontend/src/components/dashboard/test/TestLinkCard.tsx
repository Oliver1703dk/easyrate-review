import { useState } from 'react';
import { Copy, ExternalLink, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';

interface TestLinkCardProps {
  businessId: string;
}

export function TestLinkCard({ businessId }: TestLinkCardProps) {
  const [copied, setCopied] = useState(false);

  const testLink = `${window.location.origin}/r/${businessId}?isTest=true`;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(testLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenLandingPage = () => {
    window.open(testLink, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{DASHBOARD_TEXT.test.linkCardTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {DASHBOARD_TEXT.test.linkCardDescription}
        </p>

        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
          <code className="flex-1 truncate text-sm">{testLink}</code>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleOpenLandingPage} className="flex-1">
            <ExternalLink className="mr-2 h-4 w-4" />
            {DASHBOARD_TEXT.test.openLandingPage}
          </Button>
          <Button variant="outline" onClick={handleCopyLink} className="flex-1">
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                {DASHBOARD_TEXT.test.linkCopied}
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                {DASHBOARD_TEXT.test.copyLink}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
