import React from 'react';
import { Video, PlayCircle, Radio, Clock, Calendar } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { format, parseISO } from 'date-fns';

export default function EventLivestream({ event }) {
  const status = event.stream_status || 'upcoming';
  const isLive = status === 'live';
  const hasReplay = status === 'replay_available' && event.replay_url;
  const isUpcoming = status === 'upcoming' && event.is_livestreamed;

  let streamStart = '';
  if (event.stream_start_time) {
    try { streamStart = format(parseISO(event.stream_start_time), 'EEEE, MMMM d · h:mm a'); } catch { streamStart = event.stream_start_time; }
  }

  if (!event.is_livestreamed && !hasReplay) return null;

  return (
    <div className="space-y-3">
      {/* Live Stream */}
      {isLive && event.livestream_url && (
        <GlassCard hover={false} className="p-0 overflow-hidden border-neon-magenta/30">
          <div className="relative aspect-video bg-black">
            {event.livestream_url.includes('youtube') || event.livestream_url.includes('youtu.be') ? (
              <iframe
                src={event.livestream_url.replace('watch?v=', 'embed/')}
                className="w-full h-full"
                allowFullScreen
                allow="autoplay; encrypted-media"
              />
            ) : (
              <a href={event.livestream_url} target="_blank" rel="noopener noreferrer"
                className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <PlayCircle className="w-12 h-12 text-neon-magenta mx-auto mb-2" />
                  <p className="text-sm text-neon-magenta">Open Livestream</p>
                </div>
              </a>
            )}
          </div>
          <div className="p-3 flex items-center gap-2">
            <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/20 border border-red-500/30 rounded text-[10px] font-bold text-red-400">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />LIVE
            </span>
            <span className="text-sm font-medium">{event.title}</span>
          </div>
        </GlassCard>
      )}

      {/* Upcoming Stream */}
      {isUpcoming && (
        <GlassCard hover={false} className="p-4 border-neon-cyan/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neon-cyan/10 flex items-center justify-center flex-shrink-0">
              <Radio className="w-5 h-5 text-neon-cyan animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <NeonBadge color="cyan">Livestream Coming Soon</NeonBadge>
              </div>
              {streamStart && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />{streamStart}
                </p>
              )}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Replay */}
      {hasReplay && (
        <GlassCard hover={false} className="p-0 overflow-hidden border-neon-cyan/20">
          <div className="relative aspect-video bg-black">
            {event.replay_url.includes('youtube') || event.replay_url.includes('youtu.be') ? (
              <iframe
                src={event.replay_url.replace('watch?v=', 'embed/')}
                className="w-full h-full"
                allowFullScreen
                allow="autoplay; encrypted-media"
              />
            ) : (
              <a href={event.replay_url} target="_blank" rel="noopener noreferrer"
                className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <PlayCircle className="w-12 h-12 text-neon-cyan mx-auto mb-2" />
                  <p className="text-sm text-neon-cyan">Watch Replay</p>
                </div>
              </a>
            )}
          </div>
          <div className="p-3 flex items-center gap-2">
            <NeonBadge color="turquoise">Replay Available</NeonBadge>
            <span className="text-sm font-medium">{event.title}</span>
          </div>
        </GlassCard>
      )}

      {/* Ended but no replay */}
      {status === 'ended' && !hasReplay && event.is_livestreamed && (
        <GlassCard hover={false} className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Video className="w-4 h-4" />
            <span className="text-sm">Stream ended. Replay coming soon.</span>
          </div>
        </GlassCard>
      )}
    </div>
  );
}