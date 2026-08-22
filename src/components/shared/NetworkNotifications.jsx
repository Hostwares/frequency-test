import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Network, Mail, Check, Clock, UserPlus } from 'lucide-react';

export default function NetworkNotifications({ artistProfileId }) {
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['network-notifications', artistProfileId],
    queryFn: () => base44.entities.NetworkNotification.filter({ 
      artist_profile_id: artistProfileId 
    }, '-created_date', 50),
    enabled: !!artistProfileId,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      await base44.entities.NetworkNotification.update(notificationId, { is_read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network-notifications'] });
    },
  });

  const markAllAsRead = () => {
    notifications.forEach(notification => {
      if (!notification.is_read) {
        markAsReadMutation.mutate(notification.id);
      }
    });
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (notifications.length === 0) {
    return (
      <GlassCard className="p-8 text-center">
        <Network className="w-12 h-12 mx-auto mb-3 opacity-20 text-neon-cyan" />
        <p className="text-sm text-muted-foreground">No network notifications yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          You'll be notified when artists add you to their networks
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-neon-cyan" />
          <h3 className="font-display font-semibold">Network Notifications</h3>
          {unreadCount > 0 && (
            <NeonBadge color="cyan">{unreadCount} New</NeonBadge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="outline" onClick={markAllAsRead}>
            <Check className="w-3 h-3 mr-1" />
            Mark All Read
          </Button>
        )}
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {notifications.map(notification => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-3 rounded-lg border ${
              notification.is_read 
                ? 'bg-secondary/20 border-border/50' 
                : 'bg-neon-cyan/5 border-neon-cyan/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${
                notification.is_read ? 'bg-secondary/50' : 'bg-neon-cyan/10'
              }`}>
                <UserPlus className={`w-4 h-4 ${
                  notification.is_read ? 'text-muted-foreground' : 'text-neon-cyan'
                }`} />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`text-sm font-semibold ${
                    notification.is_read ? 'text-foreground' : 'text-neon-cyan'
                  }`}>
                    {notification.title}
                  </h4>
                  {!notification.is_read && (
                    <NeonBadge color="cyan">New</NeonBadge>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground mb-2">
                  {notification.body}
                </p>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Network className="w-3 h-3" />
                    {notification.network_name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(notification.created_date).toLocaleDateString()}
                  </span>
                </div>

                {!notification.is_read && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2 h-7 text-xs"
                    onClick={() => markAsReadMutation.mutate(notification.id)}
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Mark as Read
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );
}