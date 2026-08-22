import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Inbox, Music, Clock, Check, X, Star, MessageSquare } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Button } from '@/components/ui/button';

const STATUS_CONFIG = {
  pending: { color: 'purple', label: 'Pending' },
  saved_for_later: { color: 'blue', label: 'Saved' },
  accepted: { color: 'turquoise', label: 'Accepted' },
  rejected: { color: 'magenta', label: 'Rejected' },
  featured: { color: 'cyan', label: 'Featured' },
  recommended: { color: 'purple', label: 'Recommended' },
};

export default function SubmissionInbox({ programmerProfile }) {
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ['radio-submission-messages', programmerProfile?.id],
    queryFn: () => base44.entities.RadioMessage.filter({
      recipient_user_id: programmerProfile?.user_id,
      recipient_type: 'radio_programmer',
      message_type: { $in: ['additional_music_request', 'promotional_request', 'general'] }
    }, '-created_date', 100),
    enabled: !!programmerProfile?.user_id,
  });

  const { data: queueItems = [] } = useQuery({
    queryKey: ['radio-queue-submissions', programmerProfile?.id],
    queryFn: () => base44.entities.RadioDownload.filter({
      programmer_id: programmerProfile?.id,
      activity_type: 'saved'
    }, '-created_date', 100),
    enabled: !!programmerProfile?.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ itemId, status }) => {
      await base44.entities.RadioDownload.update(itemId, {
        review_status: status === 'accepted' ? 'shortlist' : status === 'rejected' ? 'rejected' : 'pending',
        radio_status: status === 'accepted' ? 'added' : status === 'rejected' ? 'reviewing' : 'reviewing',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['radio-queue-submissions'] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (msgId) => {
      await base44.entities.RadioMessage.update(msgId, { is_read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['radio-submission-messages'] });
    },
  });

  const filteredMessages = filter === 'all'
    ? messages
    : filter === 'unread'
      ? messages.filter(m => !m.is_read)
      : messages.filter(m => m.message_type === filter);

  const unreadCount = messages.filter(m => !m.is_read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-sm flex items-center gap-2">
            <Inbox className="w-4 h-4 text-neon-blue" />
            Submission Inbox
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Artist submissions & music requests {unreadCount > 0 && `· ${unreadCount} unread`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {['all', 'unread', 'additional_music_request', 'promotional_request'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                filter === f ? 'bg-primary/20 text-primary' : 'bg-secondary/30 text-muted-foreground'
              }`}
            >
              {f === 'all' ? 'All' : f === 'unread' ? 'Unread' : f === 'additional_music_request' ? 'Music' : 'Promo'}
            </button>
          ))}
        </div>
      </div>

      {/* Artist Messages/Submissions */}
      {filteredMessages.length > 0 ? (
        <div className="space-y-3">
          {filteredMessages.map(msg => (
            <GlassCard key={msg.id} className={`p-4 ${!msg.is_read ? 'border-neon-blue/30 bg-neon-blue/5' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {!msg.is_read && <NeonBadge color="blue">New</NeonBadge>}
                    <NeonBadge color="purple">{msg.message_type?.replace(/_/g, ' ')}</NeonBadge>
                    <h3 className="font-semibold text-sm">{msg.subject || 'No subject'}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    From: {msg.sender_type === 'artist' ? 'Artist' : 'Programmer'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{msg.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(msg.created_date).toLocaleString()}
                  </p>
                </div>
                {!msg.is_read && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => markReadMutation.mutate(msg.id)}
                  >
                    <Check className="w-3 h-3 mr-1" /> Mark Read
                  </Button>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <GlassCard hover={false} className="p-12 text-center">
          <Inbox className="w-12 h-12 mx-auto mb-3 opacity-20 text-neon-blue" />
          <p className="text-sm text-muted-foreground">
            {filter === 'unread' ? 'No unread messages' : 'No submissions yet'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Artist submissions and music requests will appear here
          </p>
        </GlassCard>
      )}

      {/* Saved Artist Queue */}
      <div className="mt-6">
        <h3 className="font-display font-semibold text-xs text-muted-foreground mb-3 flex items-center gap-2">
          <Star className="w-3 h-3" /> Saved for Review ({queueItems.length})
        </h3>
        {queueItems.length > 0 ? (
          <div className="space-y-2">
            {queueItems.map(item => (
              <GlassCard key={item.id} className="p-3 flex items-center gap-3">
                <Music className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.artist_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Saved {new Date(item.created_date).toLocaleDateString()}
                  </p>
                </div>
                <NeonBadge color={item.review_status === 'shortlist' ? 'turquoise' : item.review_status === 'rejected' ? 'magenta' : 'purple'}>
                  {item.review_status || 'pending'}
                </NeonBadge>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatusMutation.mutate({ itemId: item.id, status: 'accepted' })}
                  >
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => updateStatusMutation.mutate({ itemId: item.id, status: 'rejected' })}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </GlassCard>
            ))}
          </div>
        ) : (
          <GlassCard hover={false} className="p-8 text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">No saved items for review</p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}