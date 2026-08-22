import { useState, useEffect, useCallback } from 'react';

const PREFS_KEY = 'tmf_notif_prefs';

export const NOTIFICATION_CATEGORIES = [
  { key: 'new_releases', label: 'New releases' },
  { key: 'mainstream_first', label: 'Mainstream First™ exclusives' },
  { key: 'heard_first', label: 'Heard First on The Mainstream™ additions' },
  { key: 'artist_messages', label: 'Artist messages' },
  { key: 'community_updates', label: 'Community updates' },
  { key: 'event_reminders', label: 'Event reminders' },
  { key: 'merch_launches', label: 'Merchandise launches' },
  { key: 'ticket_sales', label: 'Ticket sales' },
  { key: 'awards_announcements', label: 'My Life Awards™ announcements' },
];

const defaultPrefs = () =>
  NOTIFICATION_CATEGORIES.reduce((acc, c) => ({ ...acc, [c.key]: true }), {});

export function usePushNotifications() {
  const [permission, setPermission] = useState(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [prefs, setPrefs] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null');
      return stored || defaultPrefs();
    } catch {
      return defaultPrefs();
    }
  });

  const supported = typeof Notification !== 'undefined' && 'serviceWorker' in navigator;

  useEffect(() => {
    if (supported) setPermission(Notification.permission);
  }, [supported]);

  const requestPermission = useCallback(async () => {
    if (!supported) return 'unsupported';
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, [supported]);

  const setCategory = useCallback((key, value) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isCategoryEnabled = useCallback((key) => !!prefs[key], [prefs]);

  const notify = useCallback(
    (title, body, opts = {}) => {
      if (!supported || permission !== 'granted') return false;
      if (opts.category && !prefs[opts.category]) return false;
      try {
        navigator.serviceWorker.ready.then((reg) =>
          reg.showNotification(title, {
            body,
            icon: '/icon.svg',
            badge: '/icon.svg',
            tag: opts.tag || 'tmf',
            data: { url: opts.url || '/' },
          })
        );
        return true;
      } catch {
        return false;
      }
    },
    [supported, permission, prefs]
  );

  return {
    supported,
    permission,
    prefs,
    requestPermission,
    setCategory,
    isCategoryEnabled,
    notify,
  };
}