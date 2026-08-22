import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Radio, Search, GitBranch, LayoutGrid } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import FrequencyCard from '@/components/shared/FrequencyCard';
import GlassCard from '@/components/shared/GlassCard';
import WaveformBar from '@/components/layout/WaveformBar';
import ArtistNetworkGraph from '@/components/graph/ArtistNetworkGraph';
import GenreFilterBar from '@/components/shared/GenreFilterBar';
import HeroBannerCarousel from '@/components/hero/HeroBannerCarousel';

export default function Frequencies() {
  const [search, setSearch] = React.useState('');
  const [genreFilter, setGenreFilter] = React.useState('');
  const [view, setView] = React.useState('communities'); // 'communities' | 'graph'

  const { data: communities = [] } = useQuery({
    queryKey: ['all-communities'],
    queryFn: () => base44.entities.FrequencyCommunity.list('-member_count', 50),
  });

  const { data: artists = [] } = useQuery({
    queryKey: ['all-artists-graph'],
    queryFn: () => base44.entities.ArtistProfile.list('-resonance_score', 80),
  });

  const filtered = communities.filter(c => {
    const matchSearch = c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.genre?.toLowerCase().includes(search.toLowerCase());
    const matchGenre = !genreFilter || c.genre?.toLowerCase() === genreFilter.toLowerCase();
    return matchSearch && matchGenre;
  });

  return (
    <div className="p-4 md:p-8 pb-24 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <HeroBannerCarousel />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <WaveformBar count={5} color="bg-neon-cyan" />
          <h1 className="text-2xl md:text-3xl font-display font-bold">Frequencies</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Music communities built by fans, powered by artists. Find your frequency.
        </p>

        {/* View Toggle */}
        <div className="flex items-center gap-2 mb-6">
          <Button
            variant={view === 'communities' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('communities')}
            className={view === 'communities' ? 'bg-primary text-white' : 'border-border/50 text-muted-foreground'}
          >
            <LayoutGrid className="w-3.5 h-3.5 mr-1.5" /> Communities
          </Button>
          <Button
            variant={view === 'graph' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('graph')}
            className={view === 'graph' ? 'bg-primary text-white' : 'border-border/50 text-muted-foreground'}
          >
            <GitBranch className="w-3.5 h-3.5 mr-1.5" /> Artist Network
          </Button>
        </div>

        {view === 'graph' ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <GlassCard hover={false} className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <GitBranch className="w-4 h-4 text-neon-purple" />
                <h2 className="font-display font-semibold text-sm">Artist Network Graph</h2>
              </div>
              <p className="text-xs text-muted-foreground">
                Interactive map of {artists.length} artists and their connections. Lines show recommended networks. Click any artist to explore.
              </p>
            </GlassCard>
            <div className="w-full" style={{ height: '600px' }}>
              <ArtistNetworkGraph artists={artists} />
            </div>
          </motion.div>
        ) : (
          <>
            {/* Search + Genre Filter */}
            <div className="space-y-4 mb-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search communities by name or genre..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border/50"
                />
              </div>
              <GenreFilterBar value={genreFilter} onChange={setGenreFilter} />
            </div>

            {/* Communities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(c => (
                <FrequencyCard key={c.id} community={c} />
              ))}
            </div>

            {filtered.length === 0 && (
              <GlassCard hover={false} className="p-12 text-center mt-4">
                <Radio className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-display font-semibold text-foreground mb-1">No Frequencies Found</h3>
                <p className="text-sm text-muted-foreground">
                  {search ? 'Try a different search term' : 'Be the first to create a community!'}
                </p>
              </GlassCard>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}