import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellDot, CheckCheck, UserPlus, TrendingUp, CheckCircle2, Sparkles, ExternalLink, Music, Calendar, Award, Target, Trophy } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import NeonBadge from '@/components/shared/NeonBadge';
import BadgeUnlockModal from '@/components/shared/BadgeUnlockModal';

const TYPE_CONFIG = {
  new_referral_supporter: {
    icon: UserPlus,
    color: 'text-neon-cyan',
    ring: 'border-neon-cyan/30 bg-neon-cyan/5',
    badge: 'cyan',
  },
  artist_gained_support: {
    icon: TrendingUp,
    color: 'text-neon-purple',
    ring: 'border-neon-purple/30 bg-neon-purple/5',
    badge: 'purple',
  },
  spotlight_alert: {
    icon: Sparkles,
    color: 'text-neon-magenta',
    ring: 'border-neon-magenta/30 bg-neon-magenta/5',
    badge: 'magenta',
  },
  new_music: {
    icon: Music,
    color: 'text-neon-cyan',
    ring: 'border-neon-cyan/30 bg-neon-cyan/5',
    badge: 'cyan',
  },
  new_event: {
    icon: Calendar,
    color: 'text-neon-purple',
    ring: 'border-neon-purple/30 bg-neon-purple/5',
    badge: 'purple',
  },
  radio_rotation: {
    icon: Music,
    color: 'text-neon-cyan',
    ring: 'border-neon-cyan/30 bg-neon-cyan/5',
    badge: 'cyan',
  },
  badge_unlocked: {
    icon: Award,
    color: 'text-yellow-400',
    ring: 'border-yellow-400/30 bg-yellow-400/5',
    badge: 'cyan',
  },
  support_goal_update: {
    icon: Target,
    color: 'text-neon-turquoise',
    ring: 'border-neon-turquoise/30 bg-neon-turquoise/5',
    badge: 'cyan',
  },
  fan_milestone: {
    icon: Trophy,
    color: 'text-neon-magenta',
    ring: 'border-neon-magenta/30 bg-neon-magenta/5',
    badge: 'magenta',
  },
};

function NotificationItem({ notif, userId }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.artist_gained_support;
  const Icon = config.icon;

  const markRead = useMutation({
    mutationFn: () => base44.entities.FanNotification.update(notif.id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fan-notifications', userId] }),
  });

  const handleClick = () => {
    markRead.mutate();
    if (notif.type === 'spotlight_alert' && notif.spotlight_id) {
      navigate(`/discovery-partners`);
    } else if (notif.type === 'new_music' && notif.song_id) {
      navigate(`/song/${notif.song_id}`);
    } else if (notif.type === 'new_event' && notif.event_id) {
      navigate(`/event/${notif.event_id}`);
    } else if (notif.type === 'support_goal_update' && notif.artist_profile_id) {
      navigate(`/artist/${notif.artist_profile_id}`);
    } else if (notif.artist_profile_id) {
      navigate(`/artist/${notif.artist_profile_id}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={handleClick}
      className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
        notif.is_read ? 'border-border/20 bg-secondary/10 opacity-70' : config.ring
      }`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
        notif.is_read ? 'bg-secondary/30' : 'bg-secondary/50'
      }`}>
        <Icon className={`w-4 h-4 ${notif.is_read ? 'text-muted-foreground/50' : config.color}`} />
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold ${notif.is_read ? 'text-muted-foreground' : 'text-foreground'}`}>
          {notif.title}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{notif.body}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <p className="text-[10px] text-muted-foreground/60">
            {notif.created_date ? formatDistanceToNow(new Date(notif.created_date), { addSuffix: true }) : ''}
          </p>
          {!notif.is_read && (
            <span className="flex items-center gap-1 text-[10px] text-neon-magenta/80">
              Click to view <ExternalLink className="w-2.5 h-2.5" />
            </span>
          )}
        </div>
      </div>

      {!notif.is_read && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            markRead.mutate();
          }}
          className="flex-shrink-0 mt-0.5 p-1.5 rounded-lg hover:bg-secondary/50 transition-colors"
          title="Mark as read"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground hover:text-neon-cyan transition-colors" />
        </button>
      )}
    </motion.div>
  );
}

export default function FanNotifications({ userId }) {
  const queryClient = useQueryClient();
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);

  const { data: notifications = [] } = useQuery({
    queryKey: ['fan-notifications', userId],
    queryFn: () => base44.entities.FanNotification.filter({ fan_user_id: userId }, '-created_date', 30),
    enabled: !!userId,
    refetchInterval: 30000, // poll every 30s for new notifications
  });

  const unread = notifications.filter(n => !n.is_read);

  const markAllRead = useMutation({
    mutationFn: async () => {
      await Promise.all(
        unread.map(n => base44.entities.FanNotification.update(n.id, { is_read: true }))
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fan-notifications', userId] }),
  });

  return (
    <div className="space-y-4">
      {/* Badge Unlock Modal */}
      {showBadgeModal && selectedBadge && (
        <BadgeUnlockModal
          badgeType={selectedBadge.badge_type}
          badgeTier={selectedBadge.badge_tier}
          badgeName={selectedBadge.badge_name || selectedBadge.badge_type.replace(/_/g, ' ')}
          icon={selectedBadge.icon || '🎉'}
          onClose={() => {
            setShowBadgeModal(false);
            setSelectedBadge(null);
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {unread.length > 0
            ? <BellDot className="w-4 h-4 text-neon-magenta" />
            : <Bell className="w-4 h-4 text-muted-foreground" />
          }
          <h2 className="font-display font-semibold text-sm">Activity & Alerts</h2>
          {unread.length > 0 && <NeonBadge color="magenta">{unread.length} new</NeonBadge>}
        </div>
        {unread.length > 1 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <CheckCheck className="w-3 h-3" /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border/30 rounded-xl">
          <Bell className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No activity yet — support artists and discover new music!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <NotificationItem key={n.id} notif={n} userId={userId} />
          ))}
        </div>
      )}
    </div>
  );
}