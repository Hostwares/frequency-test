import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bell, Music, Calendar, Mail, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import PushNotificationSetup from '@/components/pwa/PushNotificationSetup';
import { toast } from 'sonner';

export default function NotificationSettings() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: fanNotifications = [] } = useQuery({
    queryKey: ['fan-notification-settings', user?.id],
    queryFn: () => base44.entities.FanNotification.filter({ 
      fan_user_id: user?.id 
    }, '-created_date', 10),
    enabled: !!user?.id,
  });

  // Get user's notification preferences (stored in user entity or separate settings)
  const { data: userSettings } = useQuery({
    queryKey: ['user-settings', user?.id],
    queryFn: async () => {
      const currentUser = await base44.auth.me();
      return currentUser;
    },
    enabled: !!user?.id,
  });

  // Default preferences
  const defaultPreferences = {
    new_music_releases: true,
    tour_announcements: true,
    artist_messages: true,
    referral_updates: false,
    spotlight_alerts: false,
    council_meetings: false,
  };

  // Get current preferences from user data or use defaults
  const preferences = {
    new_music_releases: userSettings?.notify_new_music ?? defaultPreferences.new_music_releases,
    tour_announcements: userSettings?.notify_tour_announcements ?? defaultPreferences.tour_announcements,
    artist_messages: userSettings?.notify_artist_messages ?? defaultPreferences.artist_messages,
    referral_updates: userSettings?.notify_referral_updates ?? defaultPreferences.referral_updates,
    spotlight_alerts: userSettings?.notify_spotlight_alerts ?? defaultPreferences.spotlight_alerts,
    council_meetings: userSettings?.notify_council_meetings ?? defaultPreferences.council_meetings,
  };

  const updatePreferenceMutation = useMutation({
    mutationFn: async ({ key, value }) => {
      const updateData = {};
      updateData[`notify_${key}`] = value;
      await base44.auth.updateMe(updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      toast.success('Preference updated');
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const handleToggle = (key, currentValue) => {
    updatePreferenceMutation.mutate({ key, value: !currentValue });
  };

  const notificationTypes = [
    {
      key: 'new_music_releases',
      icon: <Music className="w-5 h-5" />,
      title: 'New Music Releases',
      description: 'Get notified when artists you support release new songs or albums',
      color: 'neon-purple',
    },
    {
      key: 'tour_announcements',
      icon: <Calendar className="w-5 h-5" />,
      title: 'Tour Announcements',
      description: 'Receive alerts about upcoming shows and tour dates from your supported artists',
      color: 'neon-cyan',
    },
    {
      key: 'artist_messages',
      icon: <Mail className="w-5 h-5" />,
      title: 'Messages from Artists',
      description: 'Get notified when artists you support send direct messages or updates',
      color: 'neon-magenta',
    },
    {
      key: 'referral_updates',
      icon: <Bell className="w-5 h-5" />,
      title: 'Referral Updates',
      description: 'Receive notifications when someone joins through your referral',
      color: 'neon-turquoise',
    },
    {
      key: 'spotlight_alerts',
      icon: <Bell className="w-5 h-5" />,
      title: 'Spotlight Alerts',
      description: 'Get notified when Discovery Partners spotlight artists you follow',
      color: 'neon-purple',
    },
    {
      key: 'council_meetings',
      icon: <Bell className="w-5 h-5" />,
      title: 'Fan Council Meetings',
      description: 'Receive reminders about upcoming fan council meetings',
      color: 'neon-cyan',
    },
  ];

  const recentNotifications = fanNotifications.slice(0, 5);

  return (
    <div className="p-4 md:p-8 pb-24 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-neon-purple/10">
            <Bell className="w-5 h-5 text-neon-purple" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Notification Settings</h1>
            <p className="text-xs text-muted-foreground">Manage your alert preferences</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <GlassCard hover={false} className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs text-muted-foreground">Enabled</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {Object.values(preferences).filter(Boolean).length}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Notifications active</p>
          </GlassCard>

          <GlassCard hover={false} className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs text-muted-foreground">Disabled</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {Object.values(preferences).filter(v => !v).length}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Notifications off</p>
          </GlassCard>

          <GlassCard hover={false} className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-4 h-4 text-neon-magenta" />
              <span className="text-xs text-muted-foreground">Recent</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {recentNotifications.filter(n => !n.is_read).length}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Unread alerts</p>
          </GlassCard>

          <GlassCard hover={false} className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Check className="w-4 h-4 text-neon-cyan" />
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {fanNotifications.length}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">All notifications</p>
          </GlassCard>
        </div>

        {/* PWA Push Notifications */}
        <div className="mb-8">
          <PushNotificationSetup />
        </div>

        {/* Notification Toggles */}
        <GlassCard hover={false} className="p-6 mb-8">
          <h2 className="font-display font-semibold text-base mb-6">Alert Preferences</h2>
          <div className="space-y-4">
            {notificationTypes.map((notification) => {
              const isEnabled = preferences[notification.key];
              const isUpdating = updatePreferenceMutation.isPending && 
                updatePreferenceMutation.variables?.key === notification.key;

              return (
                <div
                  key={notification.key}
                  className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-border/30 hover:border-border/50 transition-all"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-2.5 rounded-lg bg-${notification.color}/10 border border-${notification.color}/20`}>
                      <div className={`text-${notification.color}`}>
                        {notification.icon}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">{notification.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {notification.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isUpdating && (
                      <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    )}
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => handleToggle(notification.key, isEnabled)}
                      disabled={isUpdating}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Recent Notifications */}
        <GlassCard hover={false} className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-semibold text-base">Recent Notifications</h2>
            {recentNotifications.length > 0 && (
              <span className="text-xs text-muted-foreground">
                Last {recentNotifications.length} alerts
              </span>
            )}
          </div>

          <div className="space-y-3">
            {recentNotifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your recent alerts will appear here
                </p>
              </div>
            ) : (
              recentNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border transition-all ${
                    notification.is_read
                      ? 'bg-secondary/10 border-border/20'
                      : 'bg-secondary/20 border-border/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {!notification.is_read && (
                          <div className="w-2 h-2 rounded-full bg-neon-purple" />
                        )}
                        <h3 className="font-medium text-sm">{notification.title}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notification.body}
                      </p>
                      {notification.artist_name && (
                        <p className="text-[10px] text-muted-foreground mt-2">
                          From: {notification.artist_name}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(notification.created_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}