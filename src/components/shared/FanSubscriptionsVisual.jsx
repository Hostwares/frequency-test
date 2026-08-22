import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Music2, Heart, Sparkles, X } from 'lucide-react';
import NeonBadge from '@/components/shared/NeonBadge';
import SubscriberGrowthChart from '@/components/shared/SubscriberGrowthChart';
import { getDefaultArtistsNotAllocated, dismissDefaultArtist } from '@/lib/defaultArtists';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

const TIER_COLORS = {
  patron:    { badge: 'magenta', bar: 'bg-neon-magenta' },
  champion:  { badge: 'purple',  bar: 'bg-neon-purple' },
  supporter: { badge: 'cyan',    bar: 'bg-neon-cyan' },
  basic:     { badge: 'blue',    bar: 'bg-neon-blue' },
};

export default function FanSubscriptionsVisual({ userId, allocations = [], defaultArtists = [] }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch artist profiles for richer display
  const artistIds = [...new Set(allocations.map(a => a.artist_profile_id).filter(Boolean))];
  const { data: artistProfiles = [] } = useQuery({
    queryKey: ['fan-sub-artists', artistIds.join(',')],
    queryFn: () => base44.entities.ArtistProfile.list('-resonance_score', 50),
    enabled: artistIds.length > 0,
  });

  // Default artists not explicitly allocated — shown but excluded from counts/totals
  const unallocatedDefaults = getDefaultArtistsNotAllocated(allocations, defaultArtists);

  const handleDismissDefault = async (artistId, artistName) => {
    try {
      const dismissed = user?.dismissed_default_artist_ids || [];
      await dismissDefaultArtist(artistId, dismissed);
      toast.success(`${artistName} removed from your defaults`);
      queryClient.invalidateQueries({ queryKey: ['default-platform-artists'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
    } catch {
      toast.error('Could not remove default artist');
    }
  };

  const totalSpend = allocations.reduce((s, a) => s + (a.amount || 0), 0);
  const tierCounts = allocations.reduce((acc, a) => { acc[a.tier] = (acc[a.tier] || 0) + 1; return acc; }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-1">
        <Heart className="w-4 h-4 text-neon-magenta" />
        <h2 className="font-display font-semibold text-sm">My Subscriptions</h2>
      </div>

      {/* Tier breakdown bar */}
      {allocations.length > 0 && (
        <div className="space-y-2">
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            {Object.entries(tierCounts).map(([tier, count]) => {
              const pct = (count / allocations.length) * 100;
              const cfg = TIER_COLORS[tier] || TIER_COLORS.basic;
              return (
                <div key={tier} className={`${cfg.bar} transition-all`} style={{ width: `${pct}%` }} title={`${tier}: ${count}`} />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
            {Object.entries(tierCounts).map(([tier, count]) => (
              <span key={tier} className="capitalize">{tier}: {count}</span>
            ))}
            <span className="ml-auto font-medium text-neon-cyan">${totalSpend.toFixed(2)}/mo total</span>
          </div>
        </div>
      )}

      {/* Artist grid */}
      {allocations.length === 0 && unallocatedDefaults.length === 0 ? (
        <div className="py-8 text-center">
          <Music2 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Not subscribed to any artists yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Fan's explicit allocations */}
          {allocations.map(alloc => {
            const artist = artistProfiles.find(a => a.id === alloc.artist_profile_id);
            const cfg = TIER_COLORS[alloc.tier] || TIER_COLORS.basic;
            return (
              <div key={alloc.id}
                onClick={() => alloc.artist_profile_id && navigate(`/artist/${alloc.artist_profile_id}`)}
                className="bg-secondary/20 rounded-xl p-3 border border-border/30 cursor-pointer hover:border-primary/30 transition-colors group">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                    {artist?.profile_image
                      ? <img src={artist.profile_image} alt={alloc.artist_name} className="w-full h-full object-cover" />
                      : <Music2 className="w-4 h-4 text-muted-foreground m-2" />}
                  </div>
                  <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">{alloc.artist_name}</p>
                </div>
                <div className="flex items-center justify-between">
                  <NeonBadge color={cfg.badge}>{alloc.tier}</NeonBadge>
                  <span className="text-xs font-bold text-neon-cyan">${alloc.amount}/mo</span>
                </div>
                {artist?.genre && <p className="text-[10px] text-muted-foreground mt-1 truncate">{artist.genre}</p>}
              </div>
            );
          })}

          {/* Default platform artists (not counted toward slots/budget) */}
          {unallocatedDefaults.map(artist => (
            <div key={artist.id}
              onClick={() => navigate(`/artist/${artist.id}`)}
              className="relative bg-primary/5 rounded-xl p-3 border border-primary/20 cursor-pointer hover:border-primary/40 transition-colors group">
              <button
                onClick={(e) => { e.stopPropagation(); handleDismissDefault(artist.id, artist.artist_name); }}
                className="absolute top-1.5 right-1.5 p-0.5 rounded text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors z-10"
                title="Remove from your defaults"
              >
                <X className="w-3 h-3" />
              </button>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                  {artist.profile_image
                    ? <img src={artist.profile_image} alt={artist.artist_name} className="w-full h-full object-cover" />
                    : <Music2 className="w-4 h-4 text-muted-foreground m-2" />}
                </div>
                <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors pr-4">{artist.artist_name}</p>
              </div>
              <div className="flex items-center justify-between">
                <NeonBadge color="cyan"><Sparkles className="w-2.5 h-2.5 mr-0.5 inline" />Default</NeonBadge>
                <span className="text-[10px] text-muted-foreground">Included</span>
              </div>
              {artist.genre && <p className="text-[10px] text-muted-foreground mt-1 truncate">{artist.genre}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Growth chart */}
      {allocations.length > 0 && (
        <div className="pt-2 border-t border-border/30">
          <SubscriberGrowthChart
            allocations={allocations}
            label="Subscription Activity"
            color="#d946ef"
            fillId="gradMagenta"
          />
        </div>
      )}
    </div>
  );
}