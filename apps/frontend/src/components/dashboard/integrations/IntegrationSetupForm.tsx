import { useState } from 'react';
import { ArrowLeft, Check, X, Loader2, Copy, CheckCircle, Clock, Activity } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';
import type { IntegrationConfig } from '@easyrate/shared';
import { useIntegrations } from '../../../hooks';
import { useAuth } from '../../../contexts/AuthContext';

interface IntegrationSetupFormProps {
  platform: 'dully' | 'easytable';
  integration: IntegrationConfig | undefined;
}

export function IntegrationSetupForm({ platform, integration }: IntegrationSetupFormProps) {
  const navigate = useNavigate();
  const { business } = useAuth();
  const { updateIntegration, testIntegration } = useIntegrations();
  const [apiKey, setApiKey] = useState(integration?.apiKey ?? '');
  const [webhookSecret, setWebhookSecret] = useState(integration?.webhookSecret ?? '');
  const [placeToken, setPlaceToken] = useState((integration?.settings?.placeToken as string) ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);

  const isDully = platform === 'dully';
  const webhookUrl = `${window.location.origin}/api/v1/webhooks/${platform}/${business?.id ?? ''}`;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const configData: Partial<IntegrationConfig> = {
        platform,
        apiKey,
        enabled: true,
        settings: isDully ? {} : { placeToken },
      };
      if (isDully) {
        configData.webhookSecret = webhookSecret;
      }
      await updateIntegration(platform, configData);
      navigate('/dashboard/integrations');
    } catch (error) {
      console.error('Failed to save integration:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const success = await testIntegration(platform);
      setTestResult(success);
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  // Format date for display
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return null;
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get platform-specific config
  const dullyConfig = DASHBOARD_TEXT.integrations.dully;
  const easytableConfig = DASHBOARD_TEXT.integrations.easytable;
  const config = isDully ? dullyConfig : easytableConfig;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main Form */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Link to="/dashboard/integrations">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <CardTitle>{config.setupTitle}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="apiKey">{config.apiKeyLabel}</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder={config.apiKeyPlaceholder}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                }}
              />
            </div>

            {/* Webhook Secret (Dully only) */}
            {isDully && (
              <div className="space-y-2">
                <Label htmlFor="webhookSecret">{dullyConfig.webhookSecretLabel}</Label>
                <Input
                  id="webhookSecret"
                  type="password"
                  placeholder={dullyConfig.webhookSecretPlaceholder}
                  value={webhookSecret}
                  onChange={(e) => {
                    setWebhookSecret(e.target.value);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  {dullyConfig.webhookSecretDescription}
                </p>
              </div>
            )}

            {/* Place Token (EasyTable only) */}
            {!isDully && (
              <div className="space-y-2">
                <Label htmlFor="placeToken">{easytableConfig.placeTokenLabel}</Label>
                <Input
                  id="placeToken"
                  type="text"
                  placeholder={easytableConfig.placeTokenPlaceholder}
                  value={placeToken}
                  onChange={(e) => {
                    setPlaceToken(e.target.value);
                  }}
                />
              </div>
            )}

            {/* Webhook URL (Dully only) */}
            {isDully && (
              <div className="space-y-2">
                <Label>{dullyConfig.webhookUrlLabel}</Label>
                <div className="flex gap-2">
                  <Input value={webhookUrl} readOnly className="font-mono text-sm" />
                  <Button variant="outline" size="icon" onClick={handleCopyWebhook}>
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{dullyConfig.webhookUrlDescription}</p>
              </div>
            )}

            {/* Test Result */}
            {testResult !== null && (
              <div
                className={`flex items-center gap-2 rounded-md p-3 ${
                  testResult ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}
              >
                {testResult ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                {testResult
                  ? DASHBOARD_TEXT.integrations.testSuccess
                  : DASHBOARD_TEXT.integrations.testFailed}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={handleTest} variant="outline" disabled={!apiKey || isTesting}>
                {isTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {DASHBOARD_TEXT.integrations.testing}
                  </>
                ) : (
                  DASHBOARD_TEXT.integrations.testConnection
                )}
              </Button>
              <Button onClick={handleSave} disabled={!apiKey || isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {DASHBOARD_TEXT.settings.saving}
                  </>
                ) : (
                  DASHBOARD_TEXT.common.save
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Connection Status Card (Dully only, when connected) */}
        {isDully && integration?.enabled && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{dullyConfig.connectionStatus}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{dullyConfig.lastWebhook}</p>
                    <p className="text-sm text-muted-foreground">
                      {integration.lastWebhookAt
                        ? formatDate(integration.lastWebhookAt)
                        : dullyConfig.neverReceived}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Activity className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{dullyConfig.webhookCount}</p>
                    <p className="text-sm text-muted-foreground">{integration.webhookCount ?? 0}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Setup Instructions (Dully only) */}
        {isDully && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Opsætningsvejledning</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 list-decimal list-inside">
                {dullyConfig.setupInstructions.map((instruction, index) => (
                  <li key={index} className="text-sm text-muted-foreground">
                    {instruction}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}

        {/* Benefits */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fordele</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {config.benefits.map((benefit, index) => (
                <li key={index} className="flex gap-2 text-sm">
                  <Check className="h-4 w-4 shrink-0 text-green-500" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
