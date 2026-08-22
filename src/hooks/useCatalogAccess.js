import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

/**
 * Catalog access gating.
 *
 * A song is "free to play" when it is NOT listed for direct purchase
 * (song.is_purchasable === false). Purchasable songs may only be played
 * or added to playlists by users who hold an active CatalogAccessGrant
 * for that artist, by the artist themselves, or by admins.
 */
export function useCatalogAccess() {
  const { user } = useAuth();

  const grantsQuery = useQuery({
    queryKey: ['catalog-access-grants', user?.id],
    queryFn: () =>
      base44.entities.CatalogAccessGrant.filter({
        fan_user_id: user.id,
        is_active: true,
      }),
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const myProfilesQuery = useQuery({
    queryKey: ['my-artist-profiles', user?.id],
    queryFn: () => base44.entities.ArtistProfile.filter({ user_id: user.id }),
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const grants = grantsQuery.data || [];
  const myProfileIds = new Set((myProfilesQuery.data || []).map((p) => p.id));
  const grantedArtistIds = new Set(grants.map((g) => g.artist_profile_id));
  const isAdmin = user?.role === 'admin' || user?.role === 'master_admin';
  const loading = grantsQuery.isLoading || myProfilesQuery.isLoading;

  const hasAccess = (artistProfileId) => {
    if (!artistProfileId) return true;
    return grantedArtistIds.has(artistProfileId) || myProfileIds.has(artistProfileId);
  };

  const canPlay = (song) => {
    if (!song) return true;
    if (loading) return true; // don't block legitimate users during the brief initial load
    if (isAdmin) return true;
    if (!song.is_purchasable) return true; // free to play
    return hasAccess(song.artist_profile_id);
  };

  return { canPlay, hasAccess, isAdmin, grantedArtistIds, loading };
}