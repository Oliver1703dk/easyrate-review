import { useState, useEffect } from 'react';
import { Copy, ExternalLink, Check, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';
import { api } from '../../../lib/api';

interface TestLinkCardProps {
  businessId: string;
}

export function TestLinkCard({ businessId }: TestLinkCardProps) {
  const [copied, setCopied] = useState(false);
  const [testLink, setTestLink] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch JWT-based test link on mount
  useEffect(() => {
    async function fetchTestLink() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.getTestReviewLink();
        setTestLink(response.link);
      } catch (err) {
        // Fallback to simple link if API fails
        setTestLink(`${window.location.origin}/r/${businessId}?isTest=true`);
        setError(err instanceof Error ? err.message : 'Kunne ikke hente test link');
      } finally {
        setIsLoading(false);
      }
    }
    void fetchTestLink();
  }, [businessId]);

  const handleCopyLink = async () => {
    if (!testLink) return;
    await navigator.clipboard.writeText(testLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenLandingPage = () => {
    if (!testLink) return;
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
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <code className="flex-1 truncate text-sm">{testLink}</code>
          )}
        </div>

        {error && (
          <p className="text-sm text-yellow-600">{error}</p>
        )}

        <div className="flex gap-3">
          <Button onClick={handleOpenLandingPage} className="flex-1" disabled={isLoading || !testLink}>
            <ExternalLink className="mr-2 h-4 w-4" />
            {DASHBOARD_TEXT.test.openLandingPage}
          </Button>
          <Button variant="outline" onClick={handleCopyLink} className="flex-1" disabled={isLoading || !testLink}>
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
