import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Headphones, Disc3, Music2, Filter, ArrowRight, Calendar } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Button } from '@/components/ui/button';
import { FirstReleasedBadge } from '@/components/shared/MainstreamFirstBadge';

export default function HeardFirstArchive() {
  const [selectedGenre, setSelectedGenre] = useState(null);

  // Fetch all Heard First songs (transitioned or permanently flagged)
  const { data: heardFirstSongs = [], isLoading } = useQuery({
    queryKey: ['heard-first-songs'],
    queryFn: () => base44.entities.Song.filter({
      mainstream_first_status: 'heard_first'
    }, '-first_release_date', 100),
  });

  const { data: permanentHeardFirst = [] } = useQuery({
    queryKey: ['permanent-heard-first-songs'],
    queryFn: () => base44.entities.Song.filter({
      is_heard_first: true
    }, '-first_release_date', 100),
  });

  // Merge and deduplicate
  const seen = new Set();
  const allSongs = [...heardFirstSongs, ...permanentHeardFirst].filter(s => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });

  // Dynamically group by each song's actual genre — covers ALL genres on the platform
  const songsByGenre = useMemo(() => {
    const groups = {};
    allSongs.forEach(song => {
      const genre = song.genre?.trim() || 'Other';
      if (!groups[genre]) groups[genre] = [];
      groups[genre].push(song);
    });
    return groups;
  }, [allSongs]);

  const filteredSongs = selectedGenre 
    ? (songsByGenre[selectedGenre] || [])
    : allSongs;

  // All genres that have at least one Heard First song, sorted alphabetically
  const genresWithSongs = Object.keys(songsByGenre).sort((a, b) => 
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 pb-24 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-secondary to-card border border-border/50 p-8 md:p-10">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-1/4 w-48 h-48 bg-neon-turquoise rounded-full blur-[100px]" />
            <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-neon-cyan rounded-full blur-[100px]" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Headphones className="w-5 h-5 text-neon-turquoise" />
              <span className="text-xs uppercase tracking-widest text-neon-turquoise font-semibold">The Mainstream Frequency Exclusive Discovery Archive</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">
              Heard First on The Mainstream™
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed mb-4">
              Every song released as a Mainstream First™ exclusive automatically enters this collection
              after its 12-week exclusive period ends. Each song permanently carries the distinction:
            </p>
            <FirstReleasedBadge size="md" />
          </div>
        </div>
      </motion.div>

      {/* Genre Filter Bar */}
      {genresWithSongs.length > 0 && (
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground mr-1" />
          <button
            onClick={() => setSelectedGenre(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              !selectedGenre
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-secondary/50 text-muted-foreground border-border/30 hover:border-primary/30'
            }`}
          >
            All Genres ({allSongs.length})
          </button>
          {genresWithSongs.map(genre => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selectedGenre === genre
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary/50 text-muted-foreground border-border/30 hover:border-primary/30'
              }`}
            >
              {genre} ({(songsByGenre[genre] || []).length})
            </button>
          ))}
        </div>
      )}

      {/* Songs Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filteredSongs.length === 0 ? (
        <GlassCard hover={false} className="p-12 text-center">
          <Disc3 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">
            No songs in the Heard First collection yet.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Songs will appear here after their 12-week Mainstream First™ exclusive period ends.
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredSongs.map((song, i) => (
            <motion.div
              key={song.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Link to={`/song/${song.id}`}>
                <GlassCard className="overflow-hidden h-full group">
                  <div className="aspect-square overflow-hidden relative">
                    <img
                      src={song.cover_art || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80'}
                      alt={song.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 left-2">
                      <NeonBadge color="turquoise">🟢 Heard First</NeonBadge>
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="font-semibold text-sm truncate">{song.title}</h4>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{song.artist_name}</p>
                    {song.genre && (
                      <p className="text-[10px] text-neon-cyan capitalize mt-1">{song.genre}</p>
                    )}
                    {song.first_release_date && (
                      <div className="flex items-center gap-1 mt-1">
                        <Calendar className="w-2.5 h-2.5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(song.first_release_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* How It Works Section */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-12">
        <GlassCard hover={false} className="p-6 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            <Music2 className="w-5 h-5 text-neon-cyan" />
            <h2 className="font-display font-bold text-lg">How It Works</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🟣</span>
                <h3 className="font-semibold text-sm">Week 1–12</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Badge displayed: <span className="font-medium text-neon-magenta">MAINSTREAM FIRST™</span>.
                Only available on The Mainstream Frequency.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🟢</span>
                <h3 className="font-semibold text-sm">Week 13</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The song automatically moves into <span className="font-medium text-neon-turquoise">Heard First on The Mainstream™</span>.
                The exclusive badge changes to the Heard First badge.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">✓</span>
                <h3 className="font-semibold text-sm">Permanent</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The song permanently carries <span className="font-medium text-neon-cyan">First Released on The Mainstream Frequency</span>.
                This designation can never be removed.
              </p>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-border/30">
            <p className="text-xs text-muted-foreground mb-3">
              <span className="font-medium text-foreground">Automatic Genre Playlists:</span> Songs are automatically added to permanent playlists based on their genres — covering every genre on the platform.
            </p>
            <div className="flex flex-wrap gap-2">
              {genresWithSongs.length > 0 ? genresWithSongs.map(genre => (
                <span key={genre} className="text-[10px] px-2 py-1 rounded-full bg-secondary/50 border border-border/30 text-muted-foreground capitalize">
                  Heard First on The Mainstream™ — {genre}
                </span>
              )) : (
                <span className="text-[10px] text-muted-foreground italic">Playlists appear as songs transition to Heard First.</span>
              )}
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Fan Badges Info */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-8">
        <GlassCard hover={false} className="p-6 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🏅</span>
            <h2 className="font-display font-bold text-lg">Fan Badges</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Fans who supported during the first 12 weeks receive permanent recognition. These badges remain even if the song later becomes a global hit.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { icon: '🥇', label: 'Original Supporter' },
              { icon: '🎧', label: 'First Listener' },
              { icon: '🌊', label: 'First Wave' },
              { icon: '⭐', label: 'Day One Supporter' },
              { icon: '🚀', label: 'Early Believer' },
            ].map(badge => (
              <div key={badge.label} className="text-center p-3 rounded-lg bg-secondary/30 border border-border/30">
                <span className="text-2xl block mb-1">{badge.icon}</span>
                <span className="text-xs font-medium text-foreground">{badge.label}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Link to Hall of Discovery */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8">
        <Link to="/hall-of-discovery">
          <GlassCard className="p-6 flex items-center justify-between hover:border-neon-cyan/30">
            <div>
              <h3 className="font-display font-bold text-lg">Hall of Discovery™</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Celebrating songs that first launched here and later achieved major milestones.
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-neon-cyan" />
          </GlassCard>
        </Link>
      </motion.div>
    </div>
  );
}