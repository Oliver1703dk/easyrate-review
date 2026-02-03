import { useCallback, useEffect, useState } from 'react';
import type { GoogleLocation } from '@easyrate/shared';
import { useAuth } from '../contexts/AuthContext';

interface GoogleConnectionStatus {
  connected: boolean;
  accountId?: string;
  locationIds?: string[];
  syncEnabled: boolean;
  lastSyncAt?: string;
  lastSyncStatus?: string;
}

interface GoogleSettings {
  enabled: boolean;
  accountId?: string;
  locationIds?: string[];
  syncEnabled: boolean;
  syncIntervalHours: number;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  replyEnabled: boolean;
  attributionEnabled: boolean;
}

interface GoogleAccount {
  id: string;
  name: string;
  accountName: string;
}

interface UseGoogleAuthResult {
  isConnected: boolean;
  connectionStatus: GoogleConnectionStatus | null;
  settings: GoogleSettings | null;
  locations: GoogleLocation[];
  accounts: GoogleAccount[];
  isLoading: boolean;
  error: string | null;
  connect: (redirectUri?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  fetchLocations: () => Promise<void>;
  fetchAccounts: () => Promise<void>;
  saveLocations: (locationIds: string[]) => Promise<void>;
  saveAccount: (accountId: string) => Promise<void>;
  updateSettings: (settings: Partial<GoogleSettings>) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useGoogleAuth(): UseGoogleAuthResult {
  const { token } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<GoogleConnectionStatus | null>(null);
  const [settings, setSettings] = useState<GoogleSettings | null>(null);
  const [locations, setLocations] = useState<GoogleLocation[]>([]);
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch connection status
  const fetchConnectionStatus = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/v1/google/auth/status', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Kunne ikke hente Google status');

      const data = await response.json();
      setConnectionStatus(data.data);
    } catch (err) {
      console.error('Error fetching Google status:', err);
    }
  }, [token]);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/v1/google/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Kunne ikke hente Google indstillinger');

      const data = await response.json();
      setSettings(data.data);
    } catch (err) {
      console.error('Error fetching Google settings:', err);
    }
  }, [token]);

  // Initial fetch
  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([fetchConnectionStatus(), fetchSettings()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'En fejl opstod');
    } finally {
      setIsLoading(false);
    }
  }, [fetchConnectionStatus, fetchSettings]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Start OAuth flow
  const connect = useCallback(
    async (redirectUri?: string) => {
      if (!token) return;

      try {
        const params = redirectUri ? `?redirectUri=${encodeURIComponent(redirectUri)}` : '';
        const response = await fetch(`/api/v1/google/auth/url${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Kunne ikke starte Google forbindelse');

        const data = await response.json();
        // Redirect to Google OAuth
        window.location.href = data.data.authorizationUrl;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'En fejl opstod');
        throw err;
      }
    },
    [token]
  );

  // Disconnect Google account
  const disconnect = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/v1/google/auth/revoke', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Kunne ikke afbryde Google forbindelse');

      // Refresh status
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'En fejl opstod');
      throw err;
    }
  }, [token, refetch]);

  // Fetch available Google Business locations
  const fetchLocations = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/v1/google/locations', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Kunne ikke hente Google lokationer');

      const data = await response.json();
      setLocations(data.data.locations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'En fejl opstod');
      throw err;
    }
  }, [token]);

  // Fetch available Google Business accounts
  const fetchAccounts = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/v1/google/accounts', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Kunne ikke hente Google konti');

      const data = await response.json();
      setAccounts(data.data.accounts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'En fejl opstod');
      throw err;
    }
  }, [token]);

  // Save selected locations
  const saveLocations = useCallback(
    async (locationIds: string[]) => {
      if (!token) return;

      try {
        const response = await fetch('/api/v1/google/locations', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ locationIds }),
        });

        if (!response.ok) throw new Error('Kunne ikke gemme lokationer');

        await refetch();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'En fejl opstod');
        throw err;
      }
    },
    [token, refetch]
  );

  // Save selected account
  const saveAccount = useCallback(
    async (accountId: string) => {
      if (!token) return;

      try {
        const response = await fetch('/api/v1/google/accounts', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ accountId }),
        });

        if (!response.ok) throw new Error('Kunne ikke gemme konto');

        await refetch();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'En fejl opstod');
        throw err;
      }
    },
    [token, refetch]
  );

  // Update settings
  const updateSettings = useCallback(
    async (newSettings: Partial<GoogleSettings>) => {
      if (!token) return;

      try {
        const response = await fetch('/api/v1/google/settings', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newSettings),
        });

        if (!response.ok) throw new Error('Kunne ikke opdatere indstillinger');

        await refetch();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'En fejl opstod');
        throw err;
      }
    },
    [token, refetch]
  );

  return {
    isConnected: connectionStatus?.connected ?? false,
    connectionStatus,
    settings,
    locations,
    accounts,
    isLoading,
    error,
    connect,
    disconnect,
    fetchLocations,
    fetchAccounts,
    saveLocations,
    saveAccount,
    updateSettings,
    refetch,
  };
}
