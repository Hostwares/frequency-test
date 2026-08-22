import { useState, useEffect, useCallback } from 'react';

const VISIT_KEY = 'tmf_pwa_visits';
const REMIND_KEY = 'tmf_pwa_remind_at';
const DISMISS_KEY = 'tmf_pwa_dismissed';
const INSTALL_FLAG = 'tmf_pwa_installed';

const VISIT_THRESHOLD = 3;        // visits before prompting
const REMIND_DAYS = 7;             // days to wait after "Remind Me Later"

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches || localStorage.getItem(INSTALL_FLAG) === '1'
  );
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');
  const [remindAt, setRemindAt] = useState(() => Number(localStorage.getItem(REMIND_KEY) || 0));

  // Track visits on mount.
  useEffect(() => {
    if (installed) return;
    const visits = Number(localStorage.getItem(VISIT_KEY) || 0) + 1;
    localStorage.setItem(VISIT_KEY, String(visits));
  }, [installed]);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const installedHandler = () => {
      setInstalled(true);
      localStorage.setItem(INSTALL_FLAG, '1');
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const visits = Number(localStorage.getItem(VISIT_KEY) || 0);
  const pastRemind = remindAt ? Date.now() > remindAt : true;
  const shouldShowPrompt =
    !installed && !dismissed && !!deferredPrompt && pastRemind && visits >= VISIT_THRESHOLD;

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    try {
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        setInstalled(true);
        localStorage.setItem(INSTALL_FLAG, '1');
      }
    } catch { /* ignore */ }
    setDeferredPrompt(null);
    return true;
  }, [deferredPrompt]);

  const remindLater = useCallback(() => {
    const at = Date.now() + REMIND_DAYS * 24 * 3600 * 1000;
    localStorage.setItem(REMIND_KEY, String(at));
    setRemindAt(at);
  }, []);

  const dontShowAgain = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }, []);

  return {
    canInstall: !!deferredPrompt,
    installed,
    shouldShowPrompt,
    promptInstall,
    remindLater,
    dontShowAgain,
  };
}