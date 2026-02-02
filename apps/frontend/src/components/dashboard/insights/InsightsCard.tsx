import { useState } from 'react';
import { RefreshCw, AlertTriangle, Sparkles, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, Spinner, Switch, Label } from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';
import { useInsights, useBusinessSettings } from '../../../hooks';
import { SentimentGauge } from './SentimentGauge';
import { ThemeItem } from './ThemeItem';

export function InsightsCard() {
  const { insight, isLoading, isRefreshing, error, status, refresh, refetch } = useInsights();
  const { business, updateSettings } = useBusinessSettings();
  const [isToggling, setIsToggling] = useState(false);

  const aiEnabled = business?.settings?.aiSettings?.enabled ?? false;

  const handleToggleAI = async (enabled: boolean) => {
    setIsToggling(true);
    try {
      await updateSettings({
        settings: {
          aiSettings: {
            enabled,
            autoRefresh: business?.settings?.aiSettings?.autoRefresh ?? true,
            provider: business?.settings?.aiSettings?.provider ?? 'grok',
          },
        },
      });
      // Refetch insights status after toggling
      await refetch();
    } catch (err) {
      console.error('Failed to toggle AI insights:', err);
    } finally {
      setIsToggling(false);
    }
  };

  // Format date helper
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format time until next refresh
  const formatTimeUntil = (date: Date | string) => {
    const now = new Date();
    const target = new Date(date);
    const diffMs = target.getTime() - now.getTime();
    if (diffMs <= 0) return null;
    const diffMinutes = Math.ceil(diffMs / (1000 * 60));
    if (diffMinutes < 60) {
      return `${diffMinutes} min`;
    }
    return `${Math.ceil(diffMinutes / 60)} time${Math.ceil(diffMinutes / 60) > 1 ? 'r' : ''}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {DASHBOARD_TEXT.insights.title}
          </CardTitle>
          <div className="flex items-center gap-3">
            <Label htmlFor="ai-toggle-loading" className="text-sm text-muted-foreground">
              {DASHBOARD_TEXT.insights.toggleLabel}
            </Label>
            <Switch
              id="ai-toggle-loading"
              checked={aiEnabled}
              onCheckedChange={handleToggleAI}
              disabled={isToggling || !status?.configured}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center">
            <Spinner size="lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not enabled state
  if (status && !status.enabled) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {DASHBOARD_TEXT.insights.title}
          </CardTitle>
          <div className="flex items-center gap-3">
            <Label htmlFor="ai-toggle-disabled" className="text-sm text-muted-foreground">
              {DASHBOARD_TEXT.insights.toggleLabel}
            </Label>
            <Switch
              id="ai-toggle-disabled"
              checked={aiEnabled}
              onCheckedChange={handleToggleAI}
              disabled={isToggling || !status?.configured}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Sparkles className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="font-medium">{DASHBOARD_TEXT.insights.enableAI}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {DASHBOARD_TEXT.insights.enableAIDescription}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Processing state
  if (status?.lastRunStatus === 'pending' || status?.lastRunStatus === 'processing') {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {DASHBOARD_TEXT.insights.title}
          </CardTitle>
          <div className="flex items-center gap-3">
            <Label htmlFor="ai-toggle-processing" className="text-sm text-muted-foreground">
              {DASHBOARD_TEXT.insights.toggleLabel}
            </Label>
            <Switch
              id="ai-toggle-processing"
              checked={aiEnabled}
              onCheckedChange={handleToggleAI}
              disabled={isToggling}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Spinner size="lg" className="mb-4" />
            <p className="font-medium">{DASHBOARD_TEXT.insights.processing}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {DASHBOARD_TEXT.insights.title}
          </CardTitle>
          <div className="flex items-center gap-3">
            <Label htmlFor="ai-toggle-error" className="text-sm text-muted-foreground">
              {DASHBOARD_TEXT.insights.toggleLabel}
            </Label>
            <Switch
              id="ai-toggle-error"
              checked={aiEnabled}
              onCheckedChange={handleToggleAI}
              disabled={isToggling}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => refresh()}
              disabled={isRefreshing || !status?.canRequestNew}
            >
              {isRefreshing ? (
                <Spinner size="sm" className="mr-2" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {isRefreshing ? DASHBOARD_TEXT.insights.regenerating : DASHBOARD_TEXT.insights.regenerate}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
            <p className="font-medium text-destructive">{DASHBOARD_TEXT.insights.failed}</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No insights yet
  if (!insight) {
    const canRefresh = status?.canRequestNew;
    const timeUntilRefresh = status?.nextAvailableAt ? formatTimeUntil(status.nextAvailableAt) : null;

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {DASHBOARD_TEXT.insights.title}
          </CardTitle>
          <div className="flex items-center gap-3">
            <Label htmlFor="ai-toggle-empty" className="text-sm text-muted-foreground">
              {DASHBOARD_TEXT.insights.toggleLabel}
            </Label>
            <Switch
              id="ai-toggle-empty"
              checked={aiEnabled}
              onCheckedChange={handleToggleAI}
              disabled={isToggling}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => refresh()}
              disabled={isRefreshing || !canRefresh}
            >
              {isRefreshing ? (
                <Spinner size="sm" className="mr-2" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {isRefreshing ? DASHBOARD_TEXT.insights.regenerating : DASHBOARD_TEXT.insights.regenerate}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Sparkles className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="font-medium">{DASHBOARD_TEXT.insights.noInsights}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {DASHBOARD_TEXT.insights.noInsightsDescription}
            </p>
            {!canRefresh && timeUntilRefresh && (
              <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {DASHBOARD_TEXT.insights.rateLimited} {timeUntilRefresh}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Main insight display
  const canRefresh = status?.canRequestNew;
  const timeUntilRefresh = status?.nextAvailableAt ? formatTimeUntil(status.nextAvailableAt) : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {DASHBOARD_TEXT.insights.title}
        </CardTitle>
        <div className="flex items-center gap-3">
          <Label htmlFor="ai-toggle-main" className="text-sm text-muted-foreground">
            {DASHBOARD_TEXT.insights.toggleLabel}
          </Label>
          <Switch
            id="ai-toggle-main"
            checked={aiEnabled}
            onCheckedChange={handleToggleAI}
            disabled={isToggling}
          />
          {!canRefresh && timeUntilRefresh && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {timeUntilRefresh}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refresh()}
            disabled={isRefreshing || !canRefresh}
          >
            {isRefreshing ? (
              <Spinner size="sm" className="mr-2" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {isRefreshing ? DASHBOARD_TEXT.insights.regenerating : DASHBOARD_TEXT.insights.regenerate}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Top improvement point */}
        {insight.topImprovementPoint && (
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              {DASHBOARD_TEXT.insights.topImprovement}
            </h3>
            <p className="mt-2 text-muted-foreground">{insight.topImprovementPoint}</p>
          </div>
        )}

        {/* Sentiment gauge */}
        {insight.overallSentiment && (
          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
              {DASHBOARD_TEXT.insights.customerSummary}
            </h3>
            <SentimentGauge
              score={insight.overallSentiment.score}
              label={insight.overallSentiment.label}
              summary={insight.overallSentiment.summary}
            />
          </div>
        )}

        {/* Customer satisfaction summary */}
        {insight.customerSatisfactionSummary && (
          <p className="text-sm text-muted-foreground">{insight.customerSatisfactionSummary}</p>
        )}

        {/* Themes */}
        {insight.themes.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
              {DASHBOARD_TEXT.insights.themes}
            </h3>
            <div className="space-y-4">
              {insight.themes.map((theme, index) => (
                <ThemeItem key={index} theme={theme} />
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
          <span>
            {DASHBOARD_TEXT.insights.lastUpdated}: {formatDate(insight.createdAt)}
          </span>
          <span>
            {insight.reviewCount} {DASHBOARD_TEXT.insights.reviewsAnalyzed}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
