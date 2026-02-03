import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Switch,
  Label,
  Select,
  SelectOption,
} from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';
import { useGoogleAuth } from '../../../hooks/useGoogleAuth';
import { Check, X, RefreshCw, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';

interface GoogleBusinessSectionProps {
  isConfigured: boolean;
}

export function GoogleBusinessSection({ isConfigured }: GoogleBusinessSectionProps) {
  const {
    isConnected,
    settings,
    locations,
    isLoading,
    error,
    connect,
    disconnect,
    fetchLocations,
    saveLocations,
    updateSettings,
    refetch,
  } = useGoogleAuth();

  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSavingLocations, setIsSavingLocations] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    newReviews: number;
    updatedReviews: number;
  } | null>(null);

  const text = DASHBOARD_TEXT.settings.googleBusiness;

  // Load locations when connected
  useEffect(() => {
    if (isConnected && !isLoading) {
      fetchLocations().catch(console.error);
    }
  }, [isConnected, isLoading, fetchLocations]);

  // Initialize selected locations from settings
  useEffect(() => {
    if (settings?.locationIds) {
      setSelectedLocations(settings.locationIds);
    }
  }, [settings?.locationIds]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await connect('/dashboard/settings');
    } catch {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnect();
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSaveLocations = async () => {
    setIsSavingLocations(true);
    try {
      await saveLocations(selectedLocations);
    } finally {
      setIsSavingLocations(false);
    }
  };

  const handleToggleLocation = (locationId: string) => {
    setSelectedLocations((prev) =>
      prev.includes(locationId) ? prev.filter((id) => id !== locationId) : [...prev, locationId]
    );
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const response = await fetch('/api/v1/external-reviews/sync', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('easyrate_token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSyncResult({
          success: data.data.success,
          newReviews: data.data.newReviews,
          updatedReviews: data.data.updatedReviews,
        });
        await refetch();
      }
    } catch {
      setSyncResult({ success: false, newReviews: 0, updatedReviews: 0 });
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            {text.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5" />
          {text.title}
        </CardTitle>
        <CardDescription>{text.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Not configured warning */}
        {!isConfigured && (
          <div className="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-sm">{text.notConfigured}</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-red-800 dark:bg-red-900/20 dark:text-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Connection status and button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Check className="h-5 w-5 text-green-500" />
                <span className="font-medium text-green-700 dark:text-green-400">
                  {text.connected}
                </span>
              </>
            ) : (
              <>
                <X className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">{text.notConnected}</span>
              </>
            )}
          </div>
          {isConnected ? (
            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={isDisconnecting || !isConfigured}
            >
              {isDisconnecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {text.disconnectButton}
            </Button>
          ) : (
            <Button onClick={handleConnect} disabled={isConnecting || !isConfigured}>
              {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {text.connectButton}
            </Button>
          )}
        </div>

        {/* Settings (only show when connected) */}
        {isConnected && settings && (
          <>
            {/* Location selection */}
            <div className="space-y-3 rounded-lg border p-4">
              <div>
                <Label className="text-base">{text.selectLocations}</Label>
                <p className="text-sm text-muted-foreground">{text.selectLocationsDescription}</p>
              </div>
              {locations.length === 0 ? (
                <p className="text-sm text-muted-foreground">{text.noLocations}</p>
              ) : (
                <div className="space-y-2">
                  {locations.map((location) => (
                    <label
                      key={location.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-muted/50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedLocations.includes(location.id)}
                        onChange={() => handleToggleLocation(location.id)}
                        className="h-4 w-4"
                      />
                      <div>
                        <p className="font-medium">{location.name}</p>
                        {location.address && (
                          <p className="text-sm text-muted-foreground">{location.address}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
              {selectedLocations.length > 0 &&
                JSON.stringify(selectedLocations) !== JSON.stringify(settings.locationIds || []) && (
                  <Button onClick={handleSaveLocations} disabled={isSavingLocations} size="sm">
                    {isSavingLocations ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {DASHBOARD_TEXT.settings.save}
                  </Button>
                )}
            </div>

            {/* Sync settings */}
            <div className="space-y-4">
              <Label className="text-base">{text.syncSettings}</Label>

              {/* Sync enabled toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sync-enabled">{text.syncEnabled}</Label>
                  <p className="text-sm text-muted-foreground">{text.syncEnabledDescription}</p>
                </div>
                <Switch
                  id="sync-enabled"
                  checked={settings.syncEnabled}
                  onCheckedChange={(checked) => updateSettings({ syncEnabled: checked })}
                />
              </div>

              {/* Sync interval */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{text.syncInterval}</Label>
                  <p className="text-sm text-muted-foreground">{text.syncIntervalDescription}</p>
                </div>
                <Select
                  value={String(settings.syncIntervalHours || 2)}
                  onChange={(e) =>
                    updateSettings({ syncIntervalHours: parseInt(e.target.value, 10) })
                  }
                  disabled={!settings.syncEnabled}
                  className="w-24"
                >
                  <SelectOption value="1">1 {text.hours}</SelectOption>
                  <SelectOption value="2">2 {text.hours}</SelectOption>
                  <SelectOption value="4">4 {text.hours}</SelectOption>
                  <SelectOption value="6">6 {text.hours}</SelectOption>
                  <SelectOption value="12">12 {text.hours}</SelectOption>
                  <SelectOption value="24">24 {text.hours}</SelectOption>
                </Select>
              </div>

              {/* Reply enabled toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="reply-enabled">{text.replyEnabled}</Label>
                  <p className="text-sm text-muted-foreground">{text.replyEnabledDescription}</p>
                </div>
                <Switch
                  id="reply-enabled"
                  checked={settings.replyEnabled}
                  onCheckedChange={(checked) => updateSettings({ replyEnabled: checked })}
                />
              </div>

              {settings.replyEnabled && (
                <div className="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p className="text-sm">{text.replyWarning}</p>
                </div>
              )}

              {/* Attribution enabled toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="attribution-enabled">{text.attributionEnabled}</Label>
                  <p className="text-sm text-muted-foreground">
                    {text.attributionEnabledDescription}
                  </p>
                </div>
                <Switch
                  id="attribution-enabled"
                  checked={settings.attributionEnabled}
                  onCheckedChange={(checked) => updateSettings({ attributionEnabled: checked })}
                />
              </div>
            </div>

            {/* Sync status and manual sync */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {text.lastSync}:{' '}
                    {settings.lastSyncAt
                      ? new Date(settings.lastSyncAt).toLocaleString('da-DK')
                      : '-'}
                  </p>
                  {settings.lastSyncStatus && (
                    <p className="text-sm">
                      Status:{' '}
                      <span
                        className={
                          settings.lastSyncStatus === 'success'
                            ? 'text-green-600'
                            : settings.lastSyncStatus === 'error'
                              ? 'text-red-600'
                              : 'text-amber-600'
                        }
                      >
                        {settings.lastSyncStatus === 'success'
                          ? text.syncSuccess
                          : settings.lastSyncStatus === 'error'
                            ? text.syncFailed
                            : text.syncing}
                      </span>
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={handleSyncNow}
                  disabled={isSyncing || !settings.syncEnabled}
                >
                  {isSyncing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  {isSyncing ? text.syncing : text.syncNow}
                </Button>
              </div>

              {/* Sync result */}
              {syncResult && (
                <div
                  className={`rounded-md p-2 text-sm ${
                    syncResult.success
                      ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-200'
                      : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200'
                  }`}
                >
                  {syncResult.success
                    ? `${text.syncSuccess}: ${syncResult.newReviews} ${text.newReviews}, ${syncResult.updatedReviews} ${text.updatedReviews}`
                    : text.syncFailed}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
