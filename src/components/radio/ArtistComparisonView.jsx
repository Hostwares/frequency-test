import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { X, TrendingUp, Users, Radio, Award, Music, Calendar, Trophy } from 'lucide-react';

export default function ArtistComparisonView({ onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArtist1, setSelectedArtist1] = useState(null);
  const [selectedArtist2, setSelectedArtist2] = useState(null);

  const { data: allArtists = [] } = useQuery({
    queryKey: ['all-artists-comparison'],
    queryFn: () => base44.entities.ArtistProfile.list('-resonance_score', 200),
  });

  const filteredArtists = allArtists.filter(artist =>
    artist.artist_name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 10);

  const handleSelectArtist = (artist, slot) => {
    if (slot === 1) {
      setSelectedArtist1(artist);
    } else {
      setSelectedArtist2(artist);
    }
    setSearchQuery('');
  };

  const canCompare = selectedArtist1 && selectedArtist2;

  const { data: artist1Data } = useQuery({
    queryKey: ['artist-comparison-data-1', selectedArtist1?.id],
    queryFn: async () => {
      if (!selectedArtist1) return null;
      
      const [songs, rotations, supporters] = await Promise.all([
        base44.entities.Song.filter({ artist_profile_id: selectedArtist1.id }),
        base44.entities.RadioDownload.filter({ artist_profile_id: selectedArtist1.id }),
        base44.entities.SupportAllocation.filter({ artist_profile_id: selectedArtist1.id }),
      ]);

      const totalSupport = supporters.reduce((sum, s) => sum + (s.amount || 0), 0);
      const uniqueSupporters = new Set(supporters.map(s => s.fan_user_id)).size;

      return {
        songs: songs.length,
        rotations: rotations.filter(r => ['light_rotation', 'medium_rotation', 'heavy_rotation', 'featured'].includes(r.radio_status)).length,
        totalSupport,
        uniqueSupporters,
        avgPlayCount: songs.length > 0 
          ? songs.reduce((sum, s) => sum + (s.play_count || 0), 0) / songs.length 
          : 0,
      };
    },
    enabled: !!selectedArtist1,
  });

  const { data: artist2Data } = useQuery({
    queryKey: ['artist-comparison-data-2', selectedArtist2?.id],
    queryFn: async () => {
      if (!selectedArtist2) return null;
      
      const [songs, rotations, supporters] = await Promise.all([
        base44.entities.Song.filter({ artist_profile_id: selectedArtist2.id }),
        base44.entities.RadioDownload.filter({ artist_profile_id: selectedArtist2.id }),
        base44.entities.SupportAllocation.filter({ artist_profile_id: selectedArtist2.id }),
      ]);

      const totalSupport = supporters.reduce((sum, s) => sum + (s.amount || 0), 0);
      const uniqueSupporters = new Set(supporters.map(s => s.fan_user_id)).size;

      return {
        songs: songs.length,
        rotations: rotations.filter(r => ['light_rotation', 'medium_rotation', 'heavy_rotation', 'featured'].includes(r.radio_status)).length,
        totalSupport,
        uniqueSupporters,
        avgPlayCount: songs.length > 0 
          ? songs.reduce((sum, s) => sum + (s.play_count || 0), 0) / songs.length 
          : 0,
      };
    },
    enabled: !!selectedArtist2,
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl my-8"
      >
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-neon-cyan" />
              Artist Comparison Report
            </h2>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Artist Selection */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="relative">
              <label className="text-xs text-muted-foreground mb-2 block">Artist 1</label>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search artist..."
                className="pr-10"
              />
              {selectedArtist1 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute right-1 top-1 h-7 w-7 p-0"
                  onClick={() => setSelectedArtist1(null)}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
              
              {searchQuery && !selectedArtist1 && filteredArtists.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredArtists.map(artist => (
                    <div
                      key={artist.id}
                      className="p-3 hover:bg-secondary/50 cursor-pointer border-b border-border/50 last:border-b-0"
                      onClick={() => handleSelectArtist(artist, 1)}
                    >
                      <p className="text-sm font-semibold">{artist.artist_name}</p>
                      <p className="text-xs text-muted-foreground">{artist.genre}</p>
                    </div>
                  ))}
                </div>
              )}

              {selectedArtist1 && (
                <div className="mt-2 p-3 bg-secondary/30 rounded-lg">
                  <p className="text-sm font-semibold">{selectedArtist1.artist_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedArtist1.genre}</p>
                </div>
              )}
            </div>

            <div className="relative">
              <label className="text-xs text-muted-foreground mb-2 block">Artist 2</label>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search artist..."
                className="pr-10"
              />
              {selectedArtist2 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute right-1 top-1 h-7 w-7 p-0"
                  onClick={() => setSelectedArtist2(null)}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}

              {selectedArtist2 && (
                <div className="mt-2 p-3 bg-secondary/30 rounded-lg">
                  <p className="text-sm font-semibold">{selectedArtist2.artist_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedArtist2.genre}</p>
                </div>
              )}
            </div>
          </div>

          {canCompare && artist1Data && artist2Data ? (
            <div className="space-y-4">
              {/* Comparison Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Metric</th>
                      <th className="text-center py-3 px-4 text-xs text-muted-foreground font-medium">
                        {selectedArtist1.artist_name}
                      </th>
                      <th className="text-center py-3 px-4 text-xs text-muted-foreground font-medium">
                        {selectedArtist2.artist_name}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/50">
                      <td className="py-3 px-4 flex items-center gap-2">
                        <Award className="w-4 h-4 text-neon-purple" />
                        <span className="text-sm">Resonance Score</span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <NeonBadge color="purple">{selectedArtist1.resonance_score || 0}</NeonBadge>
                      </td>
                      <td className="text-center py-3 px-4">
                        <NeonBadge color="purple">{selectedArtist2.resonance_score || 0}</NeonBadge>
                      </td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-3 px-4 flex items-center gap-2">
                        <Users className="w-4 h-4 text-neon-cyan" />
                        <span className="text-sm">Total Fans</span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="text-sm font-semibold">{artist1Data.uniqueSupporters}</span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="text-sm font-semibold">{artist2Data.uniqueSupporters}</span>
                      </td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-3 px-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-neon-magenta" />
                        <span className="text-sm">Monthly Support</span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="text-sm font-semibold text-neon-magenta">${artist1Data.totalSupport.toFixed(2)}</span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="text-sm font-semibold text-neon-magenta">${artist2Data.totalSupport.toFixed(2)}</span>
                      </td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-3 px-4 flex items-center gap-2">
                        <Radio className="w-4 h-4 text-neon-blue" />
                        <span className="text-sm">Radio Rotations</span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <NeonBadge color="blue">{artist1Data.rotations}</NeonBadge>
                      </td>
                      <td className="text-center py-3 px-4">
                        <NeonBadge color="blue">{artist2Data.rotations}</NeonBadge>
                      </td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-3 px-4 flex items-center gap-2">
                        <Music className="w-4 h-4 text-neon-turquoise" />
                        <span className="text-sm">Total Songs</span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="text-sm">{artist1Data.songs}</span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="text-sm">{artist2Data.songs}</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-neon-cyan" />
                        <span className="text-sm">Avg Play Count</span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="text-sm">{Math.round(artist1Data.avgPlayCount).toLocaleString()}</span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="text-sm">{Math.round(artist2Data.avgPlayCount).toLocaleString()}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Visual Comparison Bars */}
              <div className="space-y-3 mt-6">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Resonance Score</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-neon-purple to-neon-magenta h-full rounded-full"
                        style={{ width: `${Math.min(100, (selectedArtist1.resonance_score / 100) * 100)}%` }}
                      />
                    </div>
                    <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-neon-cyan to-neon-blue h-full rounded-full"
                        style={{ width: `${Math.min(100, (selectedArtist2.resonance_score / 100) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Fan Support</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-neon-magenta to-neon-purple h-full rounded-full"
                        style={{ width: `${Math.min(100, (artist1Data.uniqueSupporters / Math.max(artist1Data.uniqueSupporters, artist2Data.uniqueSupporters, 1)) * 100)}%` }}
                      />
                    </div>
                    <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-neon-cyan to-neon-turquoise h-full rounded-full"
                        style={{ width: `${Math.min(100, (artist2Data.uniqueSupporters / Math.max(artist1Data.uniqueSupporters, artist2Data.uniqueSupporters, 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20 text-neon-cyan" />
              <p className="text-sm text-muted-foreground">
                {selectedArtist1 && !selectedArtist2 
                  ? 'Select a second artist to compare'
                  : selectedArtist2 && !selectedArtist1
                  ? 'Select a first artist to compare'
                  : 'Select two artists to see their comparison'}
              </p>
            </div>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}