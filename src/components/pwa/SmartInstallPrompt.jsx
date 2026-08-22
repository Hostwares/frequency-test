import React, { useState } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { X, Download, Bell, Clock } from 'lucide-react';

export default function SmartInstallPrompt() {
  const { shouldShowPrompt, promptInstall, remindLater, dontShowAgain } = usePWAInstall();
  const [busy, setBusy] = useState(false);

  if (!shouldShowPrompt) return null;

  const handleInstall = async () => {
    setBusy(true);
    await promptInstall();
    setBusy(false);
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md px-4">
      <div className="bg-card/95 backdrop-blur-md border border-neon-purple/30 rounded-2xl shadow-2xl glow-purple p-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-neon-purple/15 border border-neon-purple/30 flex-shrink-0">
            <Download className="w-5 h-5 text-neon-purple" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold font-display pr-6">
              Take The Mainstream Frequency with you.
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Install it to your device for faster access and an app-like experience.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={handleInstall}
                disabled={busy}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                Install Now
              </button>
              <button
                onClick={remindLater}
                className="px-3 py-1.5 rounded-lg border border-border/50 text-xs font-medium hover:bg-secondary/40 flex items-center gap-1"
              >
                <Clock className="w-3.5 h-3.5" /> Remind Me Later
              </button>
              <button
                onClick={dontShowAgain}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Don't Show Again
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}