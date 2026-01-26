import { useCallback, useState, useEffect, useRef } from 'react';
import { DASHBOARD_TEXT } from '@easyrate/shared';
import type { Business } from '@easyrate/shared';
import { useBusinessSettings } from './useBusinessSettings';

interface ChannelSettings {
  smsEnabled: boolean;
  emailEnabled: boolean;
}

interface UseFlowSettingsResult {
  business: Business | null;
  channelSettings: ChannelSettings;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  validationError: string | null;
  toggleChannel: (channel: 'sms' | 'email', enabled: boolean) => void;
  clearValidationError: () => void;
}

export function useFlowSettings(): UseFlowSettingsResult {
  const { business, isLoading, isSaving, error, updateSettings } = useBusinessSettings();
  const [validationError, setValidationError] = useState<string | null>(null);

  // Local state for optimistic UI updates
  const [localSettings, setLocalSettings] = useState<{ smsEnabled: boolean; emailEnabled: boolean }>({
    smsEnabled: true,
    emailEnabled: false,
  });

  // Track if we're in the middle of a save to prevent useEffect from overwriting
  const isSavingRef = useRef(false);

  // Sync with server data when it loads (server is source of truth)
  useEffect(() => {
    if (business?.settings && !isLoading && !isSavingRef.current) {
      const serverSms = business.settings.smsEnabled;
      const serverEmail = business.settings.emailEnabled;

      // Only update if server has valid boolean values
      if (typeof serverSms === 'boolean' && typeof serverEmail === 'boolean') {
        setLocalSettings({
          smsEnabled: serverSms,
          emailEnabled: serverEmail,
        });
      }
    }
  }, [business?.settings, isLoading]);

  const clearValidationError = useCallback(() => {
    setValidationError(null);
  }, []);

  const channelSettings: ChannelSettings = localSettings;

  const toggleChannel = useCallback(
    async (channel: 'sms' | 'email', newValue: boolean) => {

      // Calculate what the new state would be
      const newSms = channel === 'sms' ? newValue : localSettings.smsEnabled;
      const newEmail = channel === 'email' ? newValue : localSettings.emailEnabled;

      console.log(`[FlowSettings] New state would be: SMS=${newSms}, Email=${newEmail}`);

      // Validate: at least one must remain active
      if (!newSms && !newEmail) {
        console.log('[FlowSettings] Blocked: At least one channel required');
        setValidationError(DASHBOARD_TEXT?.flow?.validation?.atLeastOneRequired || 'Mindst én kanal skal være aktiv');
        return;
      }

      // Clear validation error
      setValidationError(null);

      // Store previous state for potential revert
      const previousSettings = { ...localSettings };

      // Update local state immediately (optimistic update)
      const newSettings = { smsEnabled: newSms, emailEnabled: newEmail };
      setLocalSettings(newSettings);

      // Mark that we're saving
      isSavingRef.current = true;

      try {
        // Persist to backend - this is the source of truth
        const settingsKey = channel === 'sms' ? 'smsEnabled' : 'emailEnabled';
        await updateSettings({ settings: { [settingsKey]: newValue } });
      } catch (err) {
        console.error('[FlowSettings] Backend save failed:', err);

        // Revert to previous state on failure
        setLocalSettings(previousSettings);

        // Show error to user
        setValidationError('Kunne ikke gemme indstillinger. Prøv igen.');
      } finally {
        isSavingRef.current = false;
      }
    },
    [localSettings, updateSettings]
  );

  return {
    business,
    channelSettings,
    isLoading,
    isSaving,
    error,
    validationError,
    toggleChannel,
    clearValidationError,
  };
}
