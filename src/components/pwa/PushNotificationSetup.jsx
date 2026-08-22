import React, { useState } from 'react';
import { usePushNotifications, NOTIFICATION_CATEGORIES } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import GlassCard from '@/components/shared/GlassCard';
import { Bell, BellOff, Check } from 'lucide-react';

export default function PushNotificationSetup() {
  const { supported, permission, requestPermission, prefs, setCategory } = usePushNotifications();
  const [requesting, setRequesting] = useState(false);

  if (!supported) {
    return (
      <GlassCard hover={false} className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <BellOff className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-display font-semibold text-base">Push Notifications</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Push notifications aren't supported in this browser. You'll still receive in-app notifications.
        </p>
      </GlassCard>
    );
  }

  const handleRequest = async () => {
    setRequesting(true);
    await requestPermission();
    setRequesting(false);
  };

  const granted = permission === 'granted';

  return (
    <GlassCard hover={false} className="p-5">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {granted ? <Bell className="w-5 h-5 text-neon-cyan" /> : <BellOff className="w-5 h-5 text-muted-foreground" />}
          <h2 className="font-display font-semibold text-base">Push Notifications</h2>
        </div>
        {granted ? (
          <span className="text-xs font-medium text-neon-cyan flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Enabled</span>
        ) : (
          <Button size="sm" onClick={handleRequest} disabled={requesting || permission === 'denied'}>
            {permission === 'denied' ? 'Blocked in browser' : 'Enable Notifications'}
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Get notified for new releases, exclusives, artist messages, events, and more. Choose what you receive.
      </p>

      {granted && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {NOTIFICATION_CATEGORIES.map((c) => (
            <div key={c.key} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/30">
              <span className="text-sm">{c.label}</span>
              <Switch checked={!!prefs[c.key]} onCheckedChange={(v) => setCategory(c.key, v)} />
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}