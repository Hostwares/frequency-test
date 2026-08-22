import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Music, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ArtistCard from '@/components/shared/ArtistCard';
import GlassCard from '@/components/shared/GlassCard';
import GenreFilterBar from '@/components/shared/GenreFilterBar';

export default function Artists() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('resonance');
  const [genreFilter, setGenreFilter] = useState('');

  const { data: artists = [] } = useQuery({
    queryKey: ['all-artists'],
    queryFn: () => base44.entities.ArtistProfile.list('-resonance_score', 50),
  });

  const handleSearch = search.replace(/^!/, '').toLowerCase().trim();
  const isHandleSearch = search.startsWith('!') && handleSearch.length > 0;

  const filtered = artists.filter(a => {
    if (isHandleSearch) {
      return a.artist_handle?.toLowerCase() === handleSearch ||
        a.artist_handle?.toLowerCase().includes(handleSearch);
    }
    const matchSearch = a.artist_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.genre?.toLowerCase().includes(search.toLowerCase()) ||
      a.artist_handle?.toLowerCase().includes(search.toLowerCase());
    const matchGenre = !genreFilter || a.genre?.toLowerCase() === genreFilter.toLowerCase();
    return matchSearch && matchGenre;
  });

  useEffect(() => {
    if (isHandleSearch && artists.length > 0) {
      const exactMatch = artists.find(a => a.artist_handle?.toLowerCase() === handleSearch);
      if (exactMatch) {
        navigate(`/artist/${exactMatch.artist_handle}`);
      }
    }
  }, [isHandleSearch, handleSearch, artists, navigate]);

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'resonance') return (b.resonance_score || 0) - (a.resonance_score || 0);
    if (sortBy === 'supporters') return (b.supporter_count || 0) - (a.supporter_count || 0);
    if (sortBy === 'newest') return new Date(b.created_date) - new Date(a.created_date);
    return 0;
  });

  return (
    <div className="p-4 md:p-8 pb-24 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
        <h1 className="text-2xl md:text-3xl font-display font-bold mb-1">Discover Artists</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Found through fans, not algorithms. No paid placement, ever.
        </p>

        <div className="space-y-4 mb-8">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search artists or @handle..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-secondary/50 border-border/50"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-40 bg-secondary/50 border-border/50">
                <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resonance">Resonance</SelectItem>
                <SelectItem value="supporters">Supporters</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <GenreFilterBar value={genreFilter} onChange={setGenreFilter} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sorted.map(artist => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>

        {sorted.length === 0 && (
          <GlassCard hover={false} className="p-12 text-center">
            <Music className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-display font-semibold text-foreground mb-1">No Artists Found</h3>
            <p className="text-sm text-muted-foreground">
              {search ? 'Try a different search' : 'No artists have joined yet.'}
            </p>
          </GlassCard>
        )}
      </motion.div>
    </div>
  );
}