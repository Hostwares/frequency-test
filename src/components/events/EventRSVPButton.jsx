import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Check, X, Clock, Users, QrCode, Calendar, MapPin, Video, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import EventQRCode from './EventQRCode';
import { format, parseISO } from 'date-fns';

export default function EventRSVPButton({ event, currentUser }) {
  const qc = useQueryClient();
  const [showQR, setShowQR] = useState(false);

  const { data: rsvp } = useQuery({
    queryKey: ['my-rsvp', event.id, currentUser?.id],
    queryFn: () => base44.entities.EventRSVP.filter({
      event_id: event.id,
      user_id: currentUser.id,
      status: { $ne: 'not_going' }
    }),
    select: (data) => data[0],
    enabled: !!currentUser,
  });

  const setRSVP = useMutation({
    mutationFn: async (status) => {
      const hash = `${event.id}-${currentUser.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      if (rsvp) {
        return base44.entities.EventRSVP.update(rsvp.id, { status });
      }
      return base44.entities.EventRSVP.create({
        event_id: event.id,
        event_title: event.title,
        user_id: currentUser.id,
        user_name: currentUser.full_name || currentUser.email,
        status,
        qr_code_hash: hash,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-rsvp', event.id, currentUser.id] });
      qc.invalidateQueries({ queryKey: ['event-rsvps', event.id] });
    },
  });

  if (!currentUser) {
    return <p className="text-xs text-muted-foreground">Log in to RSVP.</p>;
  }

  const streamStatus = event.stream_status || 'upcoming';
  const isLive = streamStatus === 'live';
  const hasReplay = streamStatus === 'replay_available' && event.replay_url;

  return (
    <div className="space-y-3">
      {/* RSVP / Ticket Status */}
      {rsvp ? (
        <div className="flex items-center gap-3 flex-wrap">
          <NeonBadge color="turquoise">
            <Check className="w-2.5 h-2.5 mr-0.5 inline" />
            {rsvp.status === 'going' ? 'Going' : 'Interested'}
          </NeonBadge>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowQR(true)}>
            <QrCode className="w-3 h-3" />
            {rsvp.checked_in ? 'Checked In' : 'Show Entry QR'}
          </Button>
          {rsvp.checked_in && <NeonBadge color="cyan">✓ Checked In</NeonBadge>}
          <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground"
            onClick={() => setRSVP.mutate('not_going')}>
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setRSVP.mutate('going')}
            disabled={setRSVP.isPending}>
            <Check className="w-3.5 h-3.5" /> Going
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setRSVP.mutate('interested')}
            disabled={setRSVP.isPending}>
            <Clock className="w-3.5 h-3.5" /> Interested
          </Button>
        </div>
      )}

      {/* Livestream / Replay */}
      {event.is_livestreamed && isLive && event.livestream_url && (
        <GlassCard hover={false} className="p-3 border-neon-magenta/30">
          <a href={event.livestream_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <Video className="w-4 h-4 text-neon-magenta" />
            <span className="font-medium text-neon-magenta">Live Now — Watch Stream</span>
            <PlayCircle className="w-4 h-4 ml-auto" />
          </a>
        </GlassCard>
      )}
      {hasReplay && (
        <GlassCard hover={false} className="p-3 border-neon-cyan/20">
          <a href={event.replay_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm">
            <PlayCircle className="w-4 h-4 text-neon-cyan" />
            <span className="font-medium text-neon-cyan">Watch Replay</span>
          </a>
        </GlassCard>
      )}

      {/* QR Code Modal */}
      {showQR && rsvp && (
        <EventQRCode rsvp={rsvp} event={event} onClose={() => setShowQR(false)} />
      )}
    </div>
  );
}