import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellDot, ChevronDown, ChevronUp, CheckCheck } from 'lucide-react';
import NeonBadge from '@/components/shared/NeonBadge';
import { formatDistanceToNow } from 'date-fns';

function MessageItem({ msg, userId }) {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();
  const isRead = msg.read_by_fan_ids?.includes(userId);

  const markReadMutation = useMutation({
    mutationFn: () => base44.entities.ArtistMessage.update(msg.id, {
      read_by_fan_ids: [...(msg.read_by_fan_ids || []), userId],
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fan-inbox'] }),
  });

  const handleToggle = () => {
    setExpanded(v => !v);
    if (!isRead) markReadMutation.mutate();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border transition-all ${
        isRead ? 'border-border/30 bg-secondary/10' : 'border-neon-purple/30 bg-neon-purple/5'
      }`}
    >
      <button
        onClick={handleToggle}
        className="w-full flex items-start gap-3 p-3.5 text-left"
      >
        {/* Unread dot */}
        <div className="mt-1 flex-shrink-0">
          {isRead
            ? <CheckCheck className="w-4 h-4 text-muted-foreground/40" />
            : <div className="w-2 h-2 rounded-full bg-neon-purple mt-1" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm font-semibold truncate ${isRead ? 'text-muted-foreground' : 'text-foreground'}`}>
              {msg.subject}
            </p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[10px] text-muted-foreground">
                {msg.created_date ? formatDistanceToNow(new Date(msg.created_date), { addSuffix: true }) : ''}
              </span>
              {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{msg.artist_name}</p>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t border-border/20">
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap mt-3">{msg.body}</p>
              <div className="mt-3 flex items-center gap-2">
                <NeonBadge color="purple">{msg.recipient_type?.replace(/_/g, ' ')}</NeonBadge>
                <span className="text-[10px] text-muted-foreground">from {msg.artist_name}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ArtistInbox({ userId, artistIds = [] }) {
  const { data: messages = [] } = useQuery({
    queryKey: ['fan-inbox', userId],
    queryFn: async () => {
      if (!artistIds.length) return [];
      // Fetch messages from all supported artists
      const all = await Promise.all(
        artistIds.map(id =>
          base44.entities.ArtistMessage.filter({ artist_profile_id: id }, '-created_date', 10)
        )
      );
      return all.flat().sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!userId && artistIds.length > 0,
  });

  const unreadCount = messages.filter(m => !m.read_by_fan_ids?.includes(userId)).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {unreadCount > 0
            ? <BellDot className="w-4 h-4 text-neon-purple" />
            : <Bell className="w-4 h-4 text-muted-foreground" />
          }
          <h2 className="font-display font-semibold text-sm">Artist Updates</h2>
        </div>
        {unreadCount > 0 && (
          <NeonBadge color="purple">{unreadCount} new</NeonBadge>
        )}
      </div>

      {messages.length === 0 ? (
        <div className="py-8 text-center">
          <Bell className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No messages from your artists yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map(msg => (
            <MessageItem key={msg.id} msg={msg} userId={userId} />
          ))}
        </div>
      )}
    </div>
  );
}