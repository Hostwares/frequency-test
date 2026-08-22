import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Music2, ChevronDown, ChevronUp, Play, ArrowRight, Disc3, Calendar,
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Button } from '@/components/ui/button';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80';

export default function ArtistSpotlightShowcase({ spotlight }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const hasArtistLink = !!spotlight.artist_profile_id;

  // Fetch the linked artist's profile
  const { data: artist } = useQuery({
    queryKey: ['spotlight-artist', spotlight.artist_profile_id],
    queryFn: () => base44.entities.ArtistProfile.get(spotlight.artist_profile_id),
    enabled: hasArtistLink,
  });

  // Fetch the artist's recent songs (sorted by created_date)
  const { data: recentSongs = [] } = useQuery({
    queryKey: ['spotlight-artist-songs', spotlight.artist_profile_id],
    queryFn: () =>
      base44.entities.Song.filter(
        { artist_profile_id: spotlight.artist_profile_id, is_active_version: true },
        '-created_date',
        5
      ),
    enabled: hasArtistLink,
  });

  const displayGenre = artist?.genre || spotlight.genre;
  const displayName = artist?.artist_name || spotlight.artist_name;
  const displayImage = spotlight.cover_image || artist?.profile_image || PLACEHOLDER_IMG;

  const goToArtist = () => {
    if (hasArtistLink) navigate(`/artist/${spotlight.artist_profile_id}`);
  };

  return (
    <GlassCard hover={false} className="overflow-hidden flex flex-col h-full">
      {/* Cover image */}
      <div className="relative">
        <img src={displayImage} alt={spotlight.title} className="w-full h-36 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
        {hasArtistLink && (
          <div className="absolute top-2 right-2">
            <NeonBadge color="magenta"><Disc3 className="w-2.5 h-2.5 mr-0.5 inline" />Artist Spotlight</NeonBadge>
          </div>
        )}
        <div className="absolute bottom-2 left-3 right-3">
          <p className="font-display font-bold text-sm line-clamp-1 text-foreground">{spotlight.title}</p>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        {/* Artist header */}
        <button
          onClick={goToArtist}
          disabled={!hasArtistLink}
          className={`flex items-center gap-3 mb-3 ${hasArtistLink ? 'text-left group cursor-pointer' : 'cursor-default'}`}
        >
          <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary flex-shrink-0 border border-border/50">
            <img src={artist?.profile_image || PLACEHOLDER_IMG} alt={displayName} className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold truncate ${hasArtistLink ? 'group-hover:text-neon-cyan transition-colors' : ''}`}>
              {displayName}
            </p>
            {displayGenre && <p className="text-[11px] text-muted-foreground truncate">{displayGenre}</p>}
          </div>
          {hasArtistLink && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-neon-cyan transition-colors flex-shrink-0" />}
        </button>

        {/* Genre badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {displayGenre && <NeonBadge color="cyan">{displayGenre}</NeonBadge>}
          {artist?.sub_genres?.slice(0, 2).map((g) => (
            <NeonBadge key={g} color="purple">{g}</NeonBadge>
          ))}
        </div>

        {/* Spotlight body */}
        {spotlight.body && (
          <>
            <p className={`text-xs text-muted-foreground leading-relaxed mb-2 ${!expanded ? 'line-clamp-3' : ''}`}>
              {spotlight.body}
            </p>
            {spotlight.body.length > 150 && (
              <button
                onClick={() => setExpanded((e) => !e)}
                className="text-[11px] text-neon-purple mb-3 flex items-center gap-1 hover:text-neon-magenta transition-colors"
              >
                {expanded ? <><ChevronUp className="w-3 h-3" />Show less</> : <><ChevronDown className="w-3 h-3" />Read more</>}
              </button>
            )}
          </>
        )}

        {/* Recent work */}
        {hasArtistLink && recentSongs.length > 0 && (
          <div className="mt-auto pt-3 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2 flex items-center gap-1">
              <Music2 className="w-3 h-3" /> Recent Work
            </p>
            <div className="space-y-1.5">
              {recentSongs.slice(0, 3).map((song) => (
                <div
                  key={song.id}
                  onClick={() => navigate(`/song/${song.id}`)}
                  className="flex items-center gap-2 cursor-pointer group/song rounded-md px-1.5 py-1 hover:bg-secondary/40 transition-colors"
                >
                  <div className="w-6 h-6 rounded bg-secondary/60 flex items-center justify-center flex-shrink-0">
                    {song.cover_art
                      ? <img src={song.cover_art} alt="" className="w-full h-full rounded object-cover" />
                      : <Play className="w-3 h-3 text-muted-foreground" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate group-hover/song:text-neon-cyan transition-colors">{song.title}</p>
                    {song.release_date && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Calendar className="w-2.5 h-2.5" />
                        {new Date(song.release_date).getFullYear()}
                      </p>
                    )}
                  </div>
                  {song.is_featured && <NeonBadge color="magenta" className="text-[9px]">Featured</NeonBadge>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View artist button */}
        {hasArtistLink && (
          <Button
            variant="outline"
            size="sm"
            className="mt-3 h-8 text-xs gap-1.5 border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10"
            onClick={goToArtist}
          >
            View Artist Profile <ArrowRight className="w-3 h-3" />
          </Button>
        )}
      </div>
    </GlassCard>
  );
}