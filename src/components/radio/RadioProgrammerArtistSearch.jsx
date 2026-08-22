import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Filter, Music, Users, TrendingUp, MapPin, X, Check, Plus } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GenreSelect from '@/components/shared/GenreSelect';

export default function RadioProgrammerArtistSearch({ onAddToQueue, onMessageArtist, existingQueueIds = [] }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [fanCountFilter, setFanCountFilter] = useState('all');
  const [resonanceScoreFilter, setResonanceScoreFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('resonance_score');

  const { data: allArtists = [] } = useQuery({
    queryKey: ['all-artists-for-radio'],
    queryFn: () => base44.entities.ArtistProfile.list('-resonance_score', 200),
  });

  const addToQueueMutation = useMutation({
    mutationFn: async (artist) => {
      const programmer = await base44.entities.RadioProgrammer.filter({ user_id: (await base44.auth.me()).id });
      const programmerProfile = programmer?.[0];
      
      await base44.entities.RadioDownload.create({
        radio_programmer_id: programmerProfile.id,
        programmer_name: programmerProfile.station_name,
        artist_profile_id: artist.id,
        artist_name: artist.artist_name,
        song_id: 'pending',
        song_title: 'To be selected',
        activity_type: 'saved',
        radio_status: 'reviewing',
        review_priority: 'medium',
        review_status: 'pending',
        is_private: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-queue'] });
    },
  });

  const filteredArtists = useMemo(() => {
    let filtered = [...allArtists];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(artist => 
        artist.artist_name.toLowerCase().includes(query) ||
        artist.genre?.toLowerCase().includes(query) ||
        artist.location?.toLowerCase().includes(query)
      );
    }

    if (selectedGenres.length > 0) {
      filtered = filtered.filter(artist => selectedGenres.includes(artist.genre));
    }

    if (fanCountFilter !== 'all') {
      filtered = filtered.filter(artist => {
        const fans = artist.supporter_count || 0;
        if (fanCountFilter === 'emerging') return fans < 1000;
        if (fanCountFilter === 'growing') return fans >= 1000 && fans < 10000;
        if (fanCountFilter === 'established') return fans >= 10000 && fans < 50000;
        if (fanCountFilter === 'popular') return fans >= 50000;
        return true;
      });
    }

    if (resonanceScoreFilter !== 'all') {
      filtered = filtered.filter(artist => {
        const score = artist.resonance_score || 0;
        if (resonanceScoreFilter === 'low') return score < 50;
        if (resonanceScoreFilter === 'medium') return score >= 50 && score < 75;
        if (resonanceScoreFilter === 'high') return score >= 75 && score < 90;
        if (resonanceScoreFilter === 'very_high') return score >= 90;
        return true;
      });
    }

    if (locationFilter) {
      const locQuery = locationFilter.toLowerCase();
      filtered = filtered.filter(artist => artist.location?.toLowerCase().includes(locQuery));
    }

    if (sortBy === 'resonance_score') {
      filtered.sort((a, b) => (b.resonance_score || 0) - (a.resonance_score || 0));
    } else if (sortBy === 'supporter_count') {
      filtered.sort((a, b) => (b.supporter_count || 0) - (a.supporter_count || 0));
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => a.artist_name.localeCompare(b.artist_name));
    }

    return filtered;
  }, [allArtists, searchQuery, selectedGenres, fanCountFilter, resonanceScoreFilter, locationFilter, sortBy]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedGenres([]);
    setFanCountFilter('all');
    setResonanceScoreFilter('all');
    setLocationFilter('');
  };

  const hasActiveFilters = searchQuery || selectedGenres.length > 0 || fanCountFilter !== 'all' || resonanceScoreFilter !== 'all' || locationFilter;

  const handleAddToQueue = (artist) => {
    if (onAddToQueue) {
      onAddToQueue(artist);
    } else {
      addToQueueMutation.mutate(artist);
    }
  };

  const handleMessageArtist = (artist) => {
    if (onMessageArtist) {
      onMessageArtist(artist);
    }
  };

  const isInQueue = (artistId) => existingQueueIds.includes(artistId);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search artists by name, genre, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={`gap-2 ${showFilters || hasActiveFilters ? 'bg-secondary/50 border-neon-purple/30' : ''}`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-neon-purple" />}
        </Button>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
        >
          <option value="resonance_score">Sort by Score</option>
          <option value="supporter_count">Sort by Fans</option>
          <option value="name">Sort by Name</option>
        </select>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <GlassCard hover={false} className="p-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display font-semibold text-sm flex items-center gap-2">
              <Filter className="w-4 h-4 text-neon-purple" />
              Advanced Filters
            </h3>
            {hasActiveFilters && (
              <Button size="sm" variant="ghost" onClick={clearAllFilters} className="text-xs h-8">
                <X className="w-3 h-3 mr-1" /> Clear All
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Genre Filter */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Primary Genre</label>
              <GenreSelect
                value={selectedGenres}
                onChange={setSelectedGenres}
                placeholder="Select genres..."
                multiSelect={true}
              />
            </div>

            {/* Fan Count Filter */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Fan Count</label>
              <select
                value={fanCountFilter}
                onChange={(e) => setFanCountFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
              >
                <option value="all">All Levels</option>
                <option value="emerging">Emerging (&lt;1K fans)</option>
                <option value="growing">Growing (1K-10K fans)</option>
                <option value="established">Established (10K-50K fans)</option>
                <option value="popular">Popular (50K+ fans)</option>
              </select>
            </div>

            {/* Resonance Score Filter */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Resonance Score</label>
              <select
                value={resonanceScoreFilter}
                onChange={(e) => setResonanceScoreFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
              >
                <option value="all">All Scores</option>
                <option value="low">Low (&lt;50)</option>
                <option value="medium">Medium (50-74)</option>
                <option value="high">High (75-89)</option>
                <option value="very_high">Very High (90+)</option>
              </select>
            </div>

            {/* Location Filter */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <Input
                  placeholder="City, state, or country..."
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            {/* Results Info */}
            <div className="flex items-end">
              <div className="w-full p-3 bg-secondary/30 rounded-lg border border-border/30">
                <p className="text-xs text-muted-foreground mb-1">Showing</p>
                <p className="text-lg font-display font-bold text-neon-cyan">{filteredArtists.length}</p>
                <p className="text-xs text-muted-foreground">of {allArtists.length} artists</p>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Artist Grid */}
      {filteredArtists.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredArtists.map(artist => (
            <GlassCard key={artist.id} className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-secondary overflow-hidden flex-shrink-0">
                  <img
                    src={artist.profile_image || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=80&q=80'}
                    alt={artist.artist_name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{artist.artist_name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{artist.genre}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <NeonBadge color="purple">
                      <Users className="w-2.5 h-2.5 mr-0.5" />
                      {(artist.supporter_count || 0).toLocaleString()}
                    </NeonBadge>
                    <NeonBadge color="cyan">
                      <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                      {artist.resonance_score || 0}
                    </NeonBadge>
                  </div>
                </div>
              </div>
              
              {artist.location && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{artist.location}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  className={`flex-1 ${isInQueue(artist.id) ? 'bg-neon-purple/10 border-neon-purple/50 text-neon-purple' : ''}`}
                  onClick={() => handleAddToQueue(artist)}
                  disabled={isInQueue(artist.id)}
                >
                  {isInQueue(artist.id) ? (
                    <><Check className="w-3 h-3 mr-1" /> In Queue</>
                  ) : (
                    <><Plus className="w-3 h-3 mr-1" /> Save</>
                  )}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleMessageArtist(artist)}
                >
                  <Music className="w-3 h-3" />
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <GlassCard hover={false} className="p-12 text-center">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-20 text-neon-purple" />
          <p className="text-sm text-muted-foreground">No artists match your filters</p>
          <p className="text-xs text-muted-foreground mt-1">Try adjusting your search criteria</p>
          {hasActiveFilters && (
            <Button size="sm" variant="outline" onClick={clearAllFilters} className="mt-3">
              <X className="w-3 h-3 mr-1" /> Clear All Filters
            </Button>
          )}
        </GlassCard>
      )}
    </div>
  );
}