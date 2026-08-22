import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Music, ExternalLink, ShoppingBag, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Button } from '@/components/ui/button';

export default function PurchasedSongs({ userId }) {
  const navigate = useNavigate();

  const { data: grants = [], isLoading } = useQuery({
    queryKey: ['fan-purchased-songs', userId],
    queryFn: async () => {
      const user = userId ? { id: userId } : await base44.auth.me();
      return base44.entities.CatalogAccessGrant.filter(
        { fan_user_id: user.id, is_active: true },
        '-granted_date',
        50
      );
    },
    enabled: !!userId,
  });

  const songIds = [...new Set(grants.map((g) => g.source_song_id).filter(Boolean))];
  const artistIds = [...new Set(grants.map((g) => g.artist_profile_id).filter(Boolean))];

  const { data: songsMap = {} } = useQuery({
    queryKey: ['purchased-songs-map', songIds],
    queryFn: async () => {
      const map = {};
      await Promise.all(
        songIds.map((id) =>
          base44.entities.Song.get(id).then((s) => { map[id] = s; }).catch(() => {})
        )
      );
      return map;
    },
    enabled: songIds.length > 0,
  });

  const { data: artistsMap = {} } = useQuery({
    queryKey: ['purchased-artists-map', artistIds],
    queryFn: async () => {
      const map = {};
      await Promise.all(
        artistIds.map((id) =>
          base44.entities.ArtistProfile.get(id).then((a) => { map[id] = a; }).catch(() => {})
        )
      );
      return map;
    },
    enabled: artistIds.length > 0,
  });

  return (
    <GlassCard hover={false} className="p-5 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <ShoppingBag className="w-4 h-4 text-neon-cyan" />
        <h2 className="font-display font-semibold text-foreground">Purchased Songs</h2>
        {grants.length > 0 && <NeonBadge color="cyan">{grants.length}</NeonBadge>}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading purchases...
        </div>
      ) : grants.length === 0 ? (
        <div className="text-center py-6">
          <Music className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">You haven&rsquo;t purchased any songs yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Direct song purchases unlock Current Catalog Access to an artist&rsquo;s eligible catalog.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {grants.map((g) => {
            const song = songsMap[g.source_song_id];
            const artist = artistsMap[g.artist_profile_id];
            const cover =
              song?.cover_art ||
              artist?.profile_image ||
              'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=80&q=80';
            return (
              <div
                key={g.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/40 transition-colors"
              >
                <div className="w-11 h-11 rounded-md overflow-hidden flex-shrink-0">
                  <img src={cover} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {g.source_song_title || song?.title || 'Untitled'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {g.artist_name || artist?.artist_name}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs flex-shrink-0"
                  onClick={() => navigate(`/artist/${g.artist_profile_id}`)}
                >
                  View Artist <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}