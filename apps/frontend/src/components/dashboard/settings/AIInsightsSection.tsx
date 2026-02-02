import { Card, CardContent, CardHeader, CardTitle, CardDescription, Switch, Label } from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';
import type { AIProviderType } from '@easyrate/shared';
import { Sparkles, AlertCircle } from 'lucide-react';

interface AIInsightsSectionProps {
  enabled: boolean;
  autoRefresh: boolean;
  provider: AIProviderType;
  isConfigured: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onAutoRefreshChange: (autoRefresh: boolean) => void;
  onProviderChange: (provider: AIProviderType) => void;
}

export function AIInsightsSection({
  enabled,
  autoRefresh,
  provider,
  isConfigured,
  onEnabledChange,
  onAutoRefreshChange,
  onProviderChange,
}: AIInsightsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {DASHBOARD_TEXT.settings.aiInsights.title}
        </CardTitle>
        <CardDescription>{DASHBOARD_TEXT.settings.aiInsights.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isConfigured && (
          <div className="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-sm">{DASHBOARD_TEXT.settings.aiInsights.notConfigured}</p>
          </div>
        )}

        {/* Enable AI Insights */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="ai-enabled" className="text-base">
              {DASHBOARD_TEXT.settings.aiInsights.enabledLabel}
            </Label>
            <p className="text-sm text-muted-foreground">
              {DASHBOARD_TEXT.settings.aiInsights.enabledDescription}
            </p>
          </div>
          <Switch
            id="ai-enabled"
            checked={enabled}
            onCheckedChange={onEnabledChange}
            disabled={!isConfigured}
          />
        </div>

        {/* Auto Refresh */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="ai-auto-refresh" className="text-base">
              {DASHBOARD_TEXT.settings.aiInsights.autoRefreshLabel}
            </Label>
            <p className="text-sm text-muted-foreground">
              {DASHBOARD_TEXT.settings.aiInsights.autoRefreshDescription}
            </p>
          </div>
          <Switch
            id="ai-auto-refresh"
            checked={autoRefresh}
            onCheckedChange={onAutoRefreshChange}
            disabled={!isConfigured || !enabled}
          />
        </div>

        {/* Provider Selection */}
        <div className="space-y-2">
          <Label className="text-base">{DASHBOARD_TEXT.settings.aiInsights.providerLabel}</Label>
          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="ai-provider"
                value="grok"
                checked={provider === 'grok'}
                onChange={() => {
                  onProviderChange('grok');
                }}
                disabled={!isConfigured || !enabled}
                className="h-4 w-4 text-primary focus:ring-primary disabled:opacity-50"
              />
              <span className={!isConfigured || !enabled ? 'opacity-50' : ''}>
                {DASHBOARD_TEXT.settings.aiInsights.providerGrok}
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="ai-provider"
                value="openai"
                checked={provider === 'openai'}
                onChange={() => {
                  onProviderChange('openai');
                }}
                disabled={!isConfigured || !enabled}
                className="h-4 w-4 text-primary focus:ring-primary disabled:opacity-50"
              />
              <span className={!isConfigured || !enabled ? 'opacity-50' : ''}>
                {DASHBOARD_TEXT.settings.aiInsights.providerOpenAI}
              </span>
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
