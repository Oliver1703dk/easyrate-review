import { useCallback, useState, useEffect, useRef } from 'react';
import { DASHBOARD_TEXT, SMS_TEMPLATES, EMAIL_TEMPLATES } from '@easyrate/shared';
import type { Business } from '@easyrate/shared';
import { useBusinessSettings } from './useBusinessSettings';

interface ChannelSettings {
  smsEnabled: boolean;
  emailEnabled: boolean;
}

interface TemplateSettings {
  smsTemplate: string;
  emailTemplate: string;
  delayMinutes: number;
}

interface UseFlowSettingsResult {
  business: Business | null;
  channelSettings: ChannelSettings;
  templateSettings: TemplateSettings;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  validationError: string | null;
  toggleChannel: (channel: 'sms' | 'email', enabled: boolean) => void;
  updateTemplate: (channel: 'sms' | 'email', value: string) => void;
  updateDelay: (value: number) => void;
  clearValidationError: () => void;
}

export function useFlowSettings(): UseFlowSettingsResult {
  const { business, isLoading, isSaving, error, updateSettings } = useBusinessSettings();
  const [validationError, setValidationError] = useState<string | null>(null);

  // Local state for optimistic UI updates
  const [localSettings, setLocalSettings] = useState<{
    smsEnabled: boolean;
    emailEnabled: boolean;
  }>({
    smsEnabled: true,
    emailEnabled: false,
  });

  // Local state for templates and delay
  const [templateSettings, setTemplateSettings] = useState<TemplateSettings>({
    smsTemplate: SMS_TEMPLATES.reviewRequest,
    emailTemplate: EMAIL_TEMPLATES.reviewRequest.body,
    delayMinutes: 60,
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

      // Sync template settings
      setTemplateSettings({
        smsTemplate: business.messageTemplates?.sms || SMS_TEMPLATES.reviewRequest,
        emailTemplate: business.messageTemplates?.email || EMAIL_TEMPLATES.reviewRequest.body,
        delayMinutes: business.settings.defaultDelayMinutes || 60,
      });
    }
  }, [business?.settings, business?.messageTemplates, isLoading]);

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
        setValidationError(
          DASHBOARD_TEXT?.flow?.validation?.atLeastOneRequired || 'Mindst én kanal skal være aktiv'
        );
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

  const updateTemplate = useCallback(
    async (channel: 'sms' | 'email', value: string) => {
      // Store previous state for potential revert
      const previousSettings = { ...templateSettings };

      // Update local state immediately (optimistic update)
      setTemplateSettings((prev) => ({
        ...prev,
        [channel === 'sms' ? 'smsTemplate' : 'emailTemplate']: value,
      }));

      // Mark that we're saving
      isSavingRef.current = true;

      try {
        // Persist to backend
        const templateKey = channel === 'sms' ? 'sms' : 'email';
        await updateSettings({
          messageTemplates: { [templateKey]: value },
        });
      } catch (err) {
        console.error('[FlowSettings] Template save failed:', err);
        // Revert to previous state on failure
        setTemplateSettings(previousSettings);
        setValidationError('Kunne ikke gemme skabelon. Prøv igen.');
      } finally {
        isSavingRef.current = false;
      }
    },
    [templateSettings, updateSettings]
  );

  const updateDelay = useCallback(
    async (value: number) => {
      // Store previous state for potential revert
      const previousSettings = { ...templateSettings };

      // Update local state immediately (optimistic update)
      setTemplateSettings((prev) => ({
        ...prev,
        delayMinutes: value,
      }));

      // Mark that we're saving
      isSavingRef.current = true;

      try {
        // Persist to backend
        await updateSettings({
          settings: { defaultDelayMinutes: value },
        });
      } catch (err) {
        console.error('[FlowSettings] Delay save failed:', err);
        // Revert to previous state on failure
        setTemplateSettings(previousSettings);
        setValidationError('Kunne ikke gemme forsinkelse. Prøv igen.');
      } finally {
        isSavingRef.current = false;
      }
    },
    [templateSettings, updateSettings]
  );

  return {
    business,
    channelSettings,
    templateSettings,
    isLoading,
    isSaving,
    error,
    validationError,
    toggleChannel,
    updateTemplate,
    updateDelay,
    clearValidationError,
  };
}
