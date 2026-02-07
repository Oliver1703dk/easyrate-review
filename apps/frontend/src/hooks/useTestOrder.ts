import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../lib/api';

interface NotificationStatus {
  id: string;
  type: 'sms' | 'email';
  status: string;
  recipient: string;
  sentAt?: string;
  deliveredAt?: string;
  errorMessage?: string;
}

const TERMINAL_STATUSES = ['delivered', 'failed', 'bounced', 'opened', 'clicked'];

export function useTestOrder() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notifications, setNotifications] = useState<NotificationStatus[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reviewLink, setReviewLink] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (ids: string[]) => {
      stopPolling();

      pollIntervalRef.current = setInterval(() => {
        api
          .getNotificationBatchStatus(ids)
          .then((result) => {
            setNotifications(result.notifications);

            // Stop polling if all notifications are in terminal status
            const allTerminal = result.notifications.every((n) =>
              TERMINAL_STATUSES.includes(n.status)
            );
            if (allTerminal) {
              stopPolling();
            }
          })
          .catch((err: unknown) => {
            console.error('Failed to poll status:', err);
          });
      }, 3000);
    },
    [stopPolling]
  );

  const submit = useCallback(
    async (input: { phone?: string; email?: string; customerName?: string }) => {
      setIsSubmitting(true);
      setError(null);
      setNotifications([]);
      setReviewLink(null);

      try {
        const result = await api.sendTestOrder(input);
        setNotifications(
          result.notifications.map((n) => ({
            ...n,
            type: n.type as 'sms' | 'email',
            status: 'pending',
          }))
        );
        setReviewLink(result.reviewLink ?? null);

        // Start polling for status updates
        startPolling(result.notifications.map((n) => n.id));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send test');
      } finally {
        setIsSubmitting(false);
      }
    },
    [startPolling]
  );

  const reset = useCallback(() => {
    stopPolling();
    setNotifications([]);
    setError(null);
    setReviewLink(null);
  }, [stopPolling]);

  useEffect(() => stopPolling, [stopPolling]);

  return { submit, reset, notifications, isSubmitting, error, reviewLink };
}
