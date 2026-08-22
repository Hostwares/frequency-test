import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePlayer } from '@/context/PlayerContext';
import { History } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';

export default function RecentlyPlayed() {
  const { currentTrack, isPlaying, togglePlay, playTrack } = usePlayer();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['listening-history', user?.id],
    queryFn: () => base44.entities.ListeningHistory.filter({ user_id: user.id }, '-played_at', 20),
    enabled: !!user?.id,
  });

  // Deduplicate by song_id, keep most recent
  const unique = history.filter((h, i, arr) =>
    arr.findIndex(x => x.song_id === h.song_id) === i
  ).slice(0, 10);

  if (isLoading || unique.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <History className="w-4 h-4 text-neon-cyan" />
        <h2 className="text-lg md:text-xl font-display font-bold text-foreground">Recently Played</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {unique.map(item => {
          const isCurrent = currentTrack?.id === item.song_id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (isCurrent) togglePlay();
                else playTrack({
                  id: item.song_id,
                  title: item.song_title,
                  artist_name: item.artist_name,
                  audio_url: item.audio_url,
                  cover_art: item.cover_art,
                  duration_seconds: item.duration_seconds,
                  artist_profile_id: item.artist_profile_id,
                });
              }}
              className="flex-shrink-0 w-36 text-left group"
            >
              <GlassCard className="overflow-hidden">
                <div className="h-32 overflow-hidden relative">
                  <img
                    src={item.cover_art || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&q=80'}
                    alt={item.song_title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  {isCurrent && (
                    <div className="absolute bottom-1 right-1 flex items-end gap-[2px] h-4 bg-black/50 rounded px-1">
                      {[0, 1, 2].map(j => (
                        <div
                          key={j}
                          className={`w-[2px] bg-neon-cyan rounded-full ${isPlaying ? 'animate-waveform' : ''}`}
                          style={{ animationDelay: `${j * 0.15}s`, height: '100%' }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className={`text-xs font-medium truncate ${isCurrent ? 'text-primary' : ''}`}>{item.song_title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{item.artist_name}</p>
                </div>
              </GlassCard>
            </button>
          );
        })}
      </div>
    </div>
  );
}