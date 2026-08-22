import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Calendar, Zap, Headphones, CheckCircle2, Music2 } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import MainstreamFirstBadge from '@/components/shared/MainstreamFirstBadge';

const TWELVE_WEEKS_MS = 12 * 7 * 24 * 60 * 60 * 1000;

/**
 * "First Released on The Mainstream™ — Song Timeline"
 * Shows a chronological timeline of every Mainstream First / Heard First song by this artist.
 * Each entry includes the permanent history panel with exclusive period info.
 */
export default function ArtistFirstReleaseTimeline({ artistProfileId }) {
  const { data: songs = [], isLoading } = useQuery({
    queryKey: ['artist-mainstream-songs', artistProfileId],
    queryFn: () => base44.entities.Song.filter({
      artist_profile_id: artistProfileId,
      mainstream_first_status: { $ne: 'none' }
    }, '-first_release_date', 50),
    enabled: !!artistProfileId,
  });

  // Also check is_heard_first for songs that may have the permanent flag without status
  const { data: heardFirstSongs = [] } = useQuery({
    queryKey: ['artist-heard-first-songs', artistProfileId],
    queryFn: () => base44.entities.Song.filter({
      artist_profile_id: artistProfileId,
      is_heard_first: true
    }, '-first_release_date', 50),
    enabled: !!artistProfileId,
  });

  // Merge and deduplicate
  const seen = new Set();
  const allSongs = [...songs, ...heardFirstSongs].filter(s => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  }).sort((a, b) => {
    const dateA = new Date(a.first_release_date || a.mainstream_first_start_date || 0).getTime();
    const dateB = new Date(b.first_release_date || b.mainstream_first_start_date || 0).getTime();
    return dateB - dateA;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (allSongs.length === 0) {
    return (
      <GlassCard hover={false} className="p-8 text-center">
        <Music2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          No Mainstream First™ releases yet. Songs released exclusively on The Mainstream Frequency will appear here.
        </p>
      </GlassCard>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <CheckCircle2 className="w-5 h-5 text-neon-turquoise" />
        <h3 className="font-display font-bold text-lg">First Released on The Mainstream™ — Song Timeline</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-6">Each song includes a permanent history panel.</p>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-neon-magenta via-neon-cyan to-neon-turquoise opacity-30" />

        <div className="space-y-6">
          {allSongs.map((song) => {
            const startDate = song.first_release_date || song.mainstream_first_start_date;
            const endDate = song.mainstream_first_end_date;
            const isTransitioned = song.mainstream_first_status === 'heard_first' || song.is_heard_first;
            const isWithinExclusive = startDate && (Date.now() - new Date(startDate).getTime() < TWELVE_WEEKS_MS);

            return (
              <div key={song.id} className="relative pl-12">
                {/* Timeline dot */}
                <div className={`absolute left-2.5 top-2 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isTransitioned
                    ? 'bg-neon-turquoise/20 border-neon-turquoise'
                    : 'bg-neon-magenta/20 border-neon-magenta'
                }`}>
                  {isTransitioned
                    ? <Headphones className="w-2.5 h-2.5 text-neon-turquoise" />
                    : <Zap className="w-2.5 h-2.5 text-neon-magenta" />
                  }
                </div>

                <GlassCard hover={false} className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Cover art */}
                    <Link to={`/song/${song.id}`}>
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
                        <img
                          src={song.cover_art || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&q=80'}
                          alt={song.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link to={`/song/${song.id}`} className="block">
                        <h4 className="font-semibold text-sm text-foreground hover:text-neon-cyan transition-colors truncate">
                          {song.title}
                        </h4>
                      </Link>
                      {song.genre && (
                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">{song.genre}</p>
                      )}
                      <div className="mt-2">
                        <MainstreamFirstBadge
                          status={song.mainstream_first_status}
                          startDate={startDate}
                          isHeardFirst={song.is_heard_first}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* History Panel */}
                  <div className="mt-4 pt-4 border-t border-border/30 space-y-2 text-xs">
                    {startDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-neon-cyan" />
                        <span className="text-muted-foreground">Released exclusively:</span>
                        <span className="font-medium text-foreground">
                          {new Date(startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-neon-magenta" />
                      <span className="text-muted-foreground">Exclusive Period:</span>
                      <span className="font-medium text-foreground">12 Weeks</span>
                    </div>
                    {isTransitioned && (
                      <>
                        <div className="flex items-center gap-2">
                          <Headphones className="w-3 h-3 text-neon-turquoise" />
                          <span className="text-muted-foreground">Added to:</span>
                          <span className="font-medium text-neon-turquoise">Heard First on The Mainstream™</span>
                        </div>
                        {endDate && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-neon-turquoise" />
                            <span className="text-muted-foreground">Released Worldwide:</span>
                            <span className="font-medium text-foreground">
                              {new Date(endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                    {isWithinExclusive && !isTransitioned && (
                      <div className="flex items-center gap-2">
                        <Zap className="w-3 h-3 text-neon-magenta animate-pulse" />
                        <span className="text-neon-magenta font-medium">
                          Currently exclusive — only available on The Mainstream Frequency
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <CheckCircle2 className="w-3 h-3 text-neon-cyan" />
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-medium text-neon-cyan">✓ First Released on The Mainstream Frequency</span>
                    </div>
                  </div>
                </GlassCard>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}