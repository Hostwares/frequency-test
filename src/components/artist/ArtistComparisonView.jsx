import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GlassCard from '@/components/shared/GlassCard';
import { TrendingUp, Users, Star, Activity, Plus, X, BarChart3 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

export default function ArtistComparisonView({ currentArtistProfile }) {
  const [compareArtistIds, setCompareArtistIds] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all artists for comparison search
  const { data: allArtists = [] } = useQuery({
    queryKey: ['all-artists'],
    queryFn: () => base44.entities.ArtistProfile.list('-resonance_score', 100),
  });

  // Filter artists based on search
  const filteredArtists = allArtists.filter(
    artist =>
      artist.id !== currentArtistProfile?.id &&
      (artist.artist_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artist.genre?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Fetch data for comparison
  const { data: comparisonData } = useQuery({
    queryKey: ['artist-comparison', currentArtistProfile?.id, compareArtistIds],
    queryFn: async () => {
      const idsToFetch = [currentArtistProfile?.id, ...compareArtistIds].filter(Boolean);
      const artists = await base44.entities.ArtistProfile.filter({ id: { $in: idsToFetch } });
      
      // Get supporter counts over time (simulated with monthly data)
      const comparisonMetrics = artists.map(artist => ({
        id: artist.id,
        name: artist.artist_name,
        resonance_score: artist.resonance_score || 0,
        supporter_count: artist.supporter_count || 0,
        monthly_support_total: artist.monthly_support_total || 0,
        genre: artist.genre,
      }));

      return comparisonMetrics;
    },
    enabled: currentArtistProfile?.id !== undefined,
  });

  const handleAddArtist = (artist) => {
    if (compareArtistIds.length < 3 && !compareArtistIds.includes(artist.id)) {
      setCompareArtistIds([...compareArtistIds, artist.id]);
      setShowSearch(false);
      setSearchQuery('');
    }
  };

  const handleRemoveArtist = (artistId) => {
    setCompareArtistIds(compareArtistIds.filter(id => id !== artistId));
  };

  const currentArtist = comparisonData?.find(a => a.id === currentArtistProfile?.id);
  const comparisonArtists = comparisonData?.filter(a => a.id !== currentArtistProfile?.id) || [];

  // Prepare chart data
  const chartData = comparisonData?.map(artist => ({
    name: artist.name.length > 15 ? artist.name.substring(0, 15) + '...' : artist.name,
    resonance: artist.resonance_score,
    supporters: artist.supporter_count,
    monthly: artist.monthly_support_total,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-neon-purple" />
          <div>
            <h3 className="font-display font-semibold text-foreground">Compare Your Growth</h3>
            <p className="text-xs text-muted-foreground">Track against artists you admire</p>
          </div>
        </div>
        <Button
          onClick={() => setShowSearch(!showSearch)}
          variant="outline"
          size="sm"
          className="gap-2 border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10"
          disabled={compareArtistIds.length >= 3}
        >
          <Plus className="w-4 h-4" />
          Add Artist ({compareArtistIds.length}/3)
        </Button>
      </div>

      {/* Search Panel */}
      {showSearch && (
        <GlassCard className="p-4 border-neon-purple/30">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">Search artists to compare</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowSearch(false)}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Input
            placeholder="Search by name or genre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-3"
          />
          <div className="max-h-48 overflow-y-auto space-y-2">
            {filteredArtists.slice(0, 10).map(artist => (
              <div
                key={artist.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 cursor-pointer"
                onClick={() => handleAddArtist(artist)}
              >
                <div>
                  <p className="text-sm font-medium">{artist.artist_name}</p>
                  <p className="text-xs text-muted-foreground">{artist.genre}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-neon-purple font-semibold">
                    Score: {artist.resonance_score}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {artist.supporter_count} fans
                  </p>
                </div>
              </div>
            ))}
            {filteredArtists.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No artists found
              </p>
            )}
          </div>
        </GlassCard>
      )}

      {/* Selected Artists */}
      {compareArtistIds.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {comparisonArtists.map(artist => (
            <div
              key={artist.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border/30 flex-shrink-0"
            >
              <div>
                <p className="text-sm font-medium">{artist.name}</p>
                <p className="text-xs text-muted-foreground">{artist.genre}</p>
              </div>
              <button
                onClick={() => handleRemoveArtist(artist.id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Metrics Comparison */}
      {comparisonData && comparisonData.length > 0 && (
        <>
          {/* Resonance Score Comparison */}
          <GlassCard className="p-5">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-neon-magenta" />
                <h4 className="font-semibold text-sm">Resonance Score Comparison</h4>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                    <YAxis type="category" dataKey="name" stroke="#9CA3AF" fontSize={12} width={100} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(17, 24, 39, 0.9)',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="resonance" fill="#d946ef" name="Resonance Score" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              {comparisonData.map(artist => (
                <div
                  key={artist.id}
                  className={`p-3 rounded-lg border ${
                    artist.id === currentArtistProfile?.id
                      ? 'bg-neon-purple/10 border-neon-purple/30'
                      : 'bg-secondary/30 border-border/30'
                  }`}
                >
                  <p className="text-xs text-muted-foreground mb-1">{artist.name}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-neon-magenta">
                      {artist.resonance_score}
                    </span>
                    {artist.id === currentArtistProfile?.id && (
                      <span className="text-xs text-neon-purple">You</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Fan Growth Comparison */}
          <GlassCard className="p-5">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-neon-cyan" />
                <h4 className="font-semibold text-sm">Fan Count Comparison</h4>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} angle={-45} textAnchor="end" height={60} />
                    <YAxis stroke="#9CA3AF" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(17, 24, 39, 0.9)',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="supporters" fill="#06b6d4" name="Total Fans" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Fan Count Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              {comparisonData.map(artist => (
                <div
                  key={artist.id}
                  className={`p-3 rounded-lg border ${
                    artist.id === currentArtistProfile?.id
                      ? 'bg-neon-cyan/10 border-neon-cyan/30'
                      : 'bg-secondary/30 border-border/30'
                  }`}
                >
                  <p className="text-xs text-muted-foreground mb-1">{artist.name}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-neon-cyan">
                      {artist.supporter_count.toLocaleString()}
                    </span>
                    {artist.id === currentArtistProfile?.id && (
                      <span className="text-xs text-neon-cyan">You</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Monthly Support Comparison */}
          <GlassCard className="p-5">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-neon-purple" />
                <h4 className="font-semibold text-sm">Monthly Support Comparison</h4>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} angle={-45} textAnchor="end" height={60} />
                    <YAxis stroke="#9CA3AF" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(17, 24, 39, 0.9)',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                      }}
                      formatter={(value) => [`$${value}`, 'Monthly Support']}
                    />
                    <Legend />
                    <Bar dataKey="monthly" fill="#a855f7" name="Monthly Support ($)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly Support Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              {comparisonData.map(artist => (
                <div
                  key={artist.id}
                  className={`p-3 rounded-lg border ${
                    artist.id === currentArtistProfile?.id
                      ? 'bg-neon-purple/10 border-neon-purple/30'
                      : 'bg-secondary/30 border-border/30'
                  }`}
                >
                  <p className="text-xs text-muted-foreground mb-1">{artist.name}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-neon-purple">
                      ${artist.monthly_support_total.toFixed(2)}
                    </span>
                    {artist.id === currentArtistProfile?.id && (
                      <span className="text-xs text-neon-purple">You</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </>
      )}

      {/* Empty State */}
      {comparisonData && comparisonData.length === 1 && (
        <GlassCard className="p-8 text-center">
          <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-2">No artists selected for comparison</p>
          <p className="text-xs text-muted-foreground">
            Add up to 3 artists you admire to track your growth against theirs
          </p>
        </GlassCard>
      )}
    </div>
  );
}