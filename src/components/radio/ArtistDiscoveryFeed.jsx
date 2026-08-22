import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  TrendingUp, Music, Users, MapPin, Clock, 
  Check, Plus, Filter, Search, Sparkles
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GenreSelect from '@/components/shared/GenreSelect';

export default function ArtistDiscoveryFeed({ onAddToQueue, existingQueueIds = [] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [minFanCount, setMinFanCount] = useState(0);
  const [sortBy, setSortBy] = useState('resonance');
  const queryClient = useQueryClient();

  const { data: artists = [], isLoading } = useQuery({
    queryKey: ['discovery-artists', selectedGenre, minFanCount, sortBy],
    queryFn: async () => {
      const allArtists = await base44.entities.ArtistProfile.list('-resonance_score', 200);
      
      let filtered = allArtists.filter(artist => {
        const matchesSearch = !searchQuery || 
          artist.artist_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          artist.genre.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesGenre = selectedGenre === 'all' || 
          artist.genre === selectedGenre || 
          artist.sub_genres?.includes(selectedGenre);
        
        return matchesSearch && matchesGenre;
      });

      if (minFanCount > 0) {
        const artistIds = filtered.map(a => a.id);
        const supporters = await base44.entities.SupportAllocation.filter({
          artist_profile_id: artistIds
        });
        
        const fanCounts = {};
        supporters.forEach(s => {
          fanCounts[s.artist_profile_id] = (fanCounts[s.artist_profile_id] || 0) + 1;
        });
        
        filtered = filtered.filter(artist => 
          (fanCounts[artist.id] || 0) >= minFanCount
        );
      }

      if (sortBy === 'resonance') {
        filtered.sort((a, b) => (b.resonance_score || 0) - (a.resonance_score || 0));
      } else if (sortBy === 'fans') {
        filtered.sort((a, b) => (b.supporter_count || 0) - (a.supporter_count || 0));
      } else if (sortBy === 'recent') {
        filtered.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      }

      return filtered;
    },
  });

  const addToQueueMutation = useMutation({
    mutationFn: async (artist) => {
      const programmer = await base44.entities.RadioProgrammer.filter({});
      if (!programmer || programmer.length === 0) {
        throw new Error('Radio programmer profile not found');
      }

      await base44.entities.RadioDownload.create({
        programmer_id: programmer[0].id,
        programmer_name: programmer[0].station_name,
        artist_profile_id: artist.id,
        artist_name: artist.artist_name,
        song_id: 'pending',
        song_title: 'To be selected',
        activity_type: 'saved',
        radio_status: 'reviewing',
        review_priority: 'medium',
        internal_notes: '',
        is_private: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discovery-artists'] });
      queryClient.invalidateQueries({ queryKey: ['evaluation-queue'] });
    },
  });

  const inQueue = (artistId) => existingQueueIds.includes(artistId);

  const filteredArtists = artists.filter(artist => {
    if (minFanCount === 0) return true;
    return (artist.supporter_count || 0) >= minFanCount;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-neon-magenta" />
          <h3 className="text-sm font-semibold">Discover Emerging Artists</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search artists or genres..."
                className="pl-9"
              />
            </div>
          </div>
          
          <GenreSelect
            value={selectedGenre}
            onChange={setSelectedGenre}
            placeholder="All Genres"
            className="w-full"
          />
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
          >
            <option value="resonance">Top Resonance</option>
            <option value="fans">Most Fans</option>
            <option value="recent">Recently Added</option>
          </select>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <label className="text-xs text-muted-foreground">Min Fans:</label>
          <select
            value={minFanCount}
            onChange={(e) => setMinFanCount(Number(e.target.value))}
            className="px-2 py-1 rounded-lg bg-secondary border border-border text-xs"
          >
            <option value={0}>Any</option>
            <option value={10}>10+</option>
            <option value={50}>50+</option>
            <option value={100}>100+</option>
            <option value={500}>500+</option>
            <option value={1000}>1K+</option>
          </select>
        </div>
      </GlassCard>

      {/* Artist Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <GlassCard key={i} className="p-4 animate-pulse">
              <div className="h-4 bg-secondary rounded w-3/4 mb-2" />
              <div className="h-3 bg-secondary rounded w-1/2 mb-4" />
              <div className="flex gap-2 mb-4">
                <div className="h-6 bg-secondary rounded w-16" />
                <div className="h-6 bg-secondary rounded w-16" />
              </div>
              <div className="h-9 bg-secondary rounded w-full" />
            </GlassCard>
          ))}
        </div>
      ) : filteredArtists.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredArtists.map((artist) => (
            <GlassCard key={artist.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">{artist.artist_name}</h3>
                  <p className="text-xs text-muted-foreground">{artist.genre}</p>
                </div>
                <NeonBadge color={
                  (artist.resonance_score || 0) >= 80 ? 'magenta' :
                  (artist.resonance_score || 0) >= 60 ? 'purple' : 'cyan'
                }>
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {artist.resonance_score || 0}
                </NeonBadge>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {artist.supporter_count || 0} fans
                </span>
                {artist.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {artist.location}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <NeonBadge color="purple">
                  <Music className="w-3 h-3 mr-1" />
                  {artist.verification_badge?.replace(/_/g, ' ')}
                </NeonBadge>
              </div>

              {inQueue(artist.id) ? (
                <Button className="w-full" variant="secondary" disabled>
                  <Check className="w-4 h-4 mr-2" />
                  In Queue
                </Button>
              ) : (
                <Button 
                  className="w-full" 
                  onClick={() => addToQueueMutation.mutate(artist)}
                  disabled={addToQueueMutation.isPending}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Queue
                </Button>
              )}
            </GlassCard>
          ))}
        </div>
      ) : (
        <GlassCard className="p-12 text-center">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-20 text-neon-magenta" />
          <p className="text-sm text-muted-foreground">No artists found</p>
          <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>
        </GlassCard>
      )}
    </div>
  );
}