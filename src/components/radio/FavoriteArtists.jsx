import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Heart, Star, X } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import ArtistCard from '@/components/shared/ArtistCard';
import { Button } from '@/components/ui/button';

export default function FavoriteArtists({ programmerProfile }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: favorites = [] } = useQuery({
    queryKey: ['radio-favorites', programmerProfile?.id],
    queryFn: () => base44.entities.RadioDownload.filter({
      programmer_id: programmerProfile?.id,
      activity_type: 'favorited'
    }, '-created_date', 100),
    enabled: !!programmerProfile?.id,
  });

  const { data: allArtists = [] } = useQuery({
    queryKey: ['all-artists-radio'],
    queryFn: () => base44.entities.ArtistProfile.list('-resonance_score', 100),
  });

  const favoriteArtistIds = [...new Set(favorites.map(f => f.artist_profile_id))];
  const favoriteArtists = allArtists.filter(a => favoriteArtistIds.includes(a.id));

  const removeFavoriteMutation = useMutation({
    mutationFn: async (artistId) => {
      const favRecord = favorites.find(f => f.artist_profile_id === artistId);
      if (favRecord) {
        await base44.entities.RadioDownload.delete(favRecord.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['radio-favorites'] });
    },
  });

  const addFavoriteMutation = useMutation({
    mutationFn: async (artist) => {
      await base44.entities.RadioDownload.create({
        programmer_id: programmerProfile.id,
        programmer_name: programmerProfile.station_name,
        station_name: programmerProfile.station_name,
        artist_profile_id: artist.id,
        artist_name: artist.artist_name,
        song_id: 'favorite',
        song_title: '',
        activity_type: 'favorited',
        is_private: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['radio-favorites'] });
    },
  });

  const unfavoriteArtistIds = allArtists
    .filter(a => !favoriteArtistIds.includes(a.id))
    .slice(0, 8);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display font-semibold text-sm flex items-center gap-2">
          <Heart className="w-4 h-4 text-neon-magenta" />
          Favorite Artists
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">Artists you're tracking for new releases</p>
      </div>

      {favoriteArtists.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {favoriteArtists.map(artist => (
            <div key={artist.id} className="relative group">
              <ArtistCard artist={artist} />
              <button
                onClick={() => removeFavoriteMutation.mutate(artist.id)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <GlassCard hover={false} className="p-12 text-center">
          <Heart className="w-12 h-12 mx-auto mb-3 opacity-20 text-neon-magenta" />
          <p className="text-sm text-muted-foreground">No favorite artists yet</p>
          <p className="text-xs text-muted-foreground mt-1">Favorite artists to track their new releases</p>
        </GlassCard>
      )}

      {/* Add Favorites */}
      {unfavoriteArtistIds.length > 0 && (
        <div className="mt-6">
          <h3 className="font-display font-semibold text-xs text-muted-foreground mb-3 flex items-center gap-2">
            <Star className="w-3 h-3" /> Discover More Artists
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {unfavoriteArtistIds.map(artist => (
              <div key={artist.id} className="relative group">
                <ArtistCard artist={artist} />
                <button
                  onClick={() => addFavoriteMutation.mutate(artist)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-neon-magenta/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Heart className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}