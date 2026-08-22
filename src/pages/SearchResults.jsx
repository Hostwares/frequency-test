import React from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Mic2, Music, Disc3, Radio, Users, Compass,
  Music2, FileText, Gauge, Guitar, ArrowLeft, Search,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import GlassCard from '@/components/shared/GlassCard';
import ArtistCard from '@/components/shared/ArtistCard';
import SongRow from '@/components/shared/SongRow';
import FrequencyCard from '@/components/shared/FrequencyCard';
import NeonBadge from '@/components/shared/NeonBadge';

const SECTIONS = [
  { key: 'artists', label: 'Artists', icon: Mic2 },
  { key: 'songs', label: 'Songs', icon: Music },
  { key: 'albums', label: 'Albums', icon: Disc3 },
  { key: 'genres', label: 'Genres', icon: Music2 },
  { key: 'communities', label: 'Communities', icon: Radio },
  { key: 'discovery_partners', label: 'Discovery Partners', icon: Compass },
  { key: 'radio_stations', label: 'Radio Stations', icon: Radio },
  { key: 'radio_programmers', label: 'Radio Programmers', icon: Users },
  { key: 'moods', label: 'Moods', icon: Music2 },
  { key: 'lyrics_matches', label: 'Lyrics Matches', icon: FileText },
  { key: 'bpm_matches', label: 'BPM Matches', icon: Gauge },
  { key: 'instrument_matches', label: 'Instruments / Credits', icon: Guitar },
];

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const navigate = useNavigate();

  const { data: results, isLoading } = useQuery({
    queryKey: ['search-full', query],
    queryFn: async () => {
      const res = await base44.functions.invoke('search', { query, autocomplete: false });
      return res.data;
    },
    enabled: query.length >= 1,
  });

  return (
    <div className="p-4 md:p-8 pb-24 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-secondary/30 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            <h1 className="text-xl md:text-2xl font-display font-bold">
              {query ? `"${query}"` : 'Search'}
            </h1>
          </div>
          {results && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {results.total_results} result{results.total_results !== 1 ? 's' : ''} found
            </p>
          )}
        </div>
      </div>

      {isLoading ? (
        <GlassCard hover={false} className="p-8">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Searching across the platform...</p>
          </div>
        </GlassCard>
      ) : !results || results.total_results === 0 ? (
        <GlassCard hover={false} className="p-12 text-center">
          <Search className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">No results found for "{query}".</p>
          <p className="text-xs text-muted-foreground/60 mt-2">Try a different search term or browse the catalog.</p>
          <Link to="/catalog" className="inline-block mt-4 text-xs text-primary hover:text-primary/80 font-medium">
            Browse Catalog →
          </Link>
        </GlassCard>
      ) : (
        SECTIONS.map((section, idx) => {
          const items = results[section.key] || [];
          if (items.length === 0) return null;
          const Icon = section.icon;

          return (
            <motion.section
              key={section.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Icon className="w-4 h-4 text-primary" />
                <h2 className="text-lg font-display font-bold">{section.label}</h2>
                <NeonBadge color="purple" className="ml-1">{items.length}</NeonBadge>
              </div>

              {section.key === 'artists' && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {items.map(item => <ArtistCard key={item.id} artist={item} />)}
                </div>
              )}

              {section.key === 'songs' && (
                <GlassCard hover={false} className="divide-y divide-border/30">
                  {items.map((song, i) => <SongRow key={song.id} song={song} index={i} queue={items} />)}
                </GlassCard>
              )}

              {section.key === 'albums' && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {items.map(item => (
                    <Link key={item.id} to="/catalog">
                      <GlassCard className="p-3">
                        <div className="w-full aspect-square rounded-lg overflow-hidden mb-2 bg-secondary/30">
                          {item.cover_art ? (
                            <img src={item.cover_art} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Disc3 className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <p className="text-sm font-semibold truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.artist_name}</p>
                        {item.release_type && <NeonBadge color="cyan" className="mt-1">{item.release_type}</NeonBadge>}
                      </GlassCard>
                    </Link>
                  ))}
                </div>
              )}

              {section.key === 'communities' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map(item => <FrequencyCard key={item.id} community={item} />)}
                </div>
              )}

              {section.key === 'discovery_partners' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map(item => (
                    <Link key={item.id} to={`/discovery-partner/${item.id}`}>
                      <GlassCard className="p-4 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-secondary/30 flex-shrink-0">
                          {item.profile_image ? (
                            <img src={item.profile_image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Compass className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.location}</p>
                          {item.partner_type && <NeonBadge color="turquoise" className="mt-1">{item.partner_type}</NeonBadge>}
                        </div>
                      </GlassCard>
                    </Link>
                  ))}
                </div>
              )}

              {section.key === 'radio_stations' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map(item => (
                    <Link key={item.id} to="/radio-programmer-dashboard">
                      <GlassCard className="p-4 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary/30 flex-shrink-0">
                          {item.logo ? (
                            <img src={item.logo} alt={item.station_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Radio className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{item.station_name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {[item.format, item.location].filter(Boolean).join(' · ')}
                          </p>
                          {item.frequency && <span className="text-xs text-neon-cyan">{item.frequency}</span>}
                        </div>
                      </GlassCard>
                    </Link>
                  ))}
                </div>
              )}

              {section.key === 'radio_programmers' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map(item => (
                    <Link key={item.id} to="/radio-programmer-dashboard">
                      <GlassCard className="p-4 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center flex-shrink-0">
                          <Users className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{item.station_name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {[item.role, item.location].filter(Boolean).join(' · ')}
                          </p>
                          {item.is_verified && <NeonBadge color="cyan" className="mt-1">Verified</NeonBadge>}
                        </div>
                      </GlassCard>
                    </Link>
                  ))}
                </div>
              )}

              {section.key === 'genres' && (
                <div className="flex flex-wrap gap-2">
                  {items.map(item => (
                    <Link key={item} to={`/artists?genre=${encodeURIComponent(item)}`}>
                      <NeonBadge color="purple" className="px-4 py-2 text-sm cursor-pointer hover:bg-neon-purple/25">
                        {item}
                      </NeonBadge>
                    </Link>
                  ))}
                </div>
              )}

              {section.key === 'moods' && (
                <div className="flex flex-wrap gap-2">
                  {items.map(item => (
                    <Link key={item} to={`/catalog?mood=${encodeURIComponent(item)}`}>
                      <NeonBadge color="cyan" className="px-4 py-2 text-sm cursor-pointer hover:bg-neon-cyan/25">
                        {item}
                      </NeonBadge>
                    </Link>
                  ))}
                </div>
              )}

              {(section.key === 'lyrics_matches' || section.key === 'bpm_matches' || section.key === 'instrument_matches') && (
                <GlassCard hover={false} className="divide-y divide-border/30">
                  {items.map((song, i) => (
                    <SongRow key={song.id} song={song} index={i} queue={items} />
                  ))}
                </GlassCard>
              )}
            </motion.section>
          );
        })
      )}
    </div>
  );
}