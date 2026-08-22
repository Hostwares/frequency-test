import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { DollarSign, Network, Info, AlertTriangle, Sparkles, Users } from 'lucide-react';

const MAX_NETWORKS = 3;
const MIN_PER_ARTIST = 0.01;

export default function MyMonthlyArtistDistribution({ userId }) {
  const { data: sub } = useQuery({
    queryKey: ['my-active-subscription', userId],
    queryFn: async () => {
      const subs = await base44.entities.UserSubscription.filter({
        user_id: userId,
        status: 'active',
      });
      return subs?.[0];
    },
    enabled: !!userId,
  });

  const { data: playlists = [] } = useQuery({
    queryKey: ['my-playlists-for-distribution', userId],
    queryFn: async () => {
      const all = await base44.entities.Playlist.filter({ owner_user_id: userId });
      return all || [];
    },
    enabled: !!userId,
  });

  const { data: settings = {} } = useQuery({
    queryKey: ['distribution-platform-settings'],
    queryFn: async () => {
      const recs = await base44.entities.PlatformSetting.filter({});
      const map = {};
      for (const r of recs) {
        map[r.setting_key] = r.setting_type === 'string' ? r.setting_value : Number(r.setting_value);
      }
      return map;
    },
  });

  const artistPct = settings.fan_subscription_artist_share_pct || 95;
  const opsPct = settings.fan_subscription_ops_share_pct || 5;
  const minPerArtist = settings.min_artist_payment_per_network || MIN_PER_ARTIST;
  const maxNetworks = settings.max_funded_networks || MAX_NETWORKS;

  const fundedNetworks = (playlists || []).filter((p) => p.is_funded_network).slice(0, maxNetworks);
  const monthlyFee = sub?.monthly_price || 0;
  const artistPool = (monthlyFee * artistPct) / 100;
  const opsAmount = monthlyFee - artistPool;

  // Calculate network allocations (equal or custom)
  let networkAllocs = [];
  if (fundedNetworks.length > 0 && monthlyFee > 0) {
    const customPcts = fundedNetworks.map((p) => Number(p.network_funding_percentage) || 0);
    const hasCustom = customPcts.some((p) => p > 0);
    if (hasCustom) {
      const totalPct = customPcts.reduce((s, p) => s + p, 0);
      if (totalPct > 0) {
        networkAllocs = customPcts.map((p) => (artistPool * p) / totalPct);
      }
    }
    if (networkAllocs.length === 0) {
      const per = artistPool / fundedNetworks.length;
      networkAllocs = fundedNetworks.map(() => per);
    }
  }

  // Per-network details
  const networkDetails = fundedNetworks.map((net, i) => {
    const allocation = networkAllocs[i] || 0;
    const artistCount = (net.artist_allocations || []).length || (net.song_ids || []).length;
    const minRequired = artistCount * minPerArtist;
    const remaining = Math.max(0, allocation - minRequired);
    const insufficient = allocation > 0 && allocation < minRequired;
    return {
      id: net.id,
      name: net.name,
      allocation,
      artistCount,
      minRequired,
      remaining,
      insufficient,
      method: net.artist_allocation_method || 'automatic',
      hasCustomPct: !!net.network_funding_percentage,
    };
  });

  const totalArtists = networkDetails.reduce((s, n) => s + n.artistCount, 0);
  const totalMinRequired = networkDetails.reduce((s, n) => s + n.minRequired, 0);
  const totalRemaining = networkDetails.reduce((s, n) => s + n.remaining, 0);

  // No subscription
  if (!sub || monthlyFee === 0) {
    return (
      <GlassCard hover={false} className="p-6 mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-foreground">My Monthly Artist Distribution</h2>
            <p className="text-xs text-muted-foreground">How your subscription funds artists</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Subscribe to a paid plan to activate your Artist Distribution Pool and fund your favorite artists.
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard hover={false} className="p-6 mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <DollarSign className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display font-semibold text-foreground">My Monthly Artist Distribution</h2>
          <p className="text-xs text-muted-foreground">How your ${monthlyFee.toFixed(2)}/mo subscription funds artists</p>
        </div>
      </div>

      {/* 95/5 split */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-secondary/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-neon-cyan" />
            <span className="text-xs text-muted-foreground">Artist Distribution Pool ({artistPct}%)</span>
          </div>
          <p className="text-2xl font-bold text-neon-cyan">${artistPool.toFixed(2)}</p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-neon-purple" />
            <span className="text-xs text-muted-foreground">Platform Operations ({opsPct}%)</span>
          </div>
          <p className="text-2xl font-bold text-neon-purple">${opsAmount.toFixed(2)}</p>
        </div>
      </div>

      {/* Funded Networks */}
      {fundedNetworks.length === 0 ? (
        <div className="text-center py-6 bg-secondary/30 rounded-lg">
          <Network className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-1">No Funded Networks yet</p>
          <p className="text-xs text-muted-foreground">
            Mark up to {maxNetworks} playlists as Funded Networks to direct your Artist Distribution Pool to artists.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Funded Networks</span>
              <NeonBadge color="purple">{fundedNetworks.length} / {maxNetworks}</NeonBadge>
            </div>
            <div className="space-y-3">
              {networkDetails.map((net) => (
                <div key={net.id} className="bg-secondary/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Network className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="font-medium text-sm truncate">{net.name}</span>
                      <NeonBadge color="cyan" className="text-xs flex-shrink-0">{net.method}</NeonBadge>
                    </div>
                    <span className="text-neon-cyan font-bold text-sm flex-shrink-0 ml-2">${net.allocation.toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" /> Artists
                      </p>
                      <p className="font-semibold">{net.artistCount}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Min. Required</p>
                      <p className="font-semibold">${net.minRequired.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Customizable</p>
                      <p className="font-semibold text-neon-cyan">${net.remaining.toFixed(2)}</p>
                    </div>
                  </div>
                  {net.insufficient && (
                    <div className="flex items-start gap-2 mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      <span>
                        This network's allocation (${net.allocation.toFixed(2)}) can't cover the ${minPerArtist.toFixed(2)} minimum for all {net.artistCount} artists. Increase funding, reduce artists, or convert to a Listening Playlist.
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
            <div className="text-center">
              <p className="text-muted-foreground text-xs mb-1">Eligible Artists</p>
              <p className="text-neon-purple font-bold text-lg">{totalArtists}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground text-xs mb-1">Min. Guaranteed</p>
              <p className="text-neon-cyan font-bold text-lg">${totalMinRequired.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground text-xs mb-1">Customizable</p>
              <p className="text-neon-turquoise font-bold text-lg">${totalRemaining.toFixed(2)}</p>
            </div>
          </div>
        </>
      )}

      {/* Explanation */}
      <div className="flex items-start gap-2 mt-4 p-3 bg-primary/5 rounded-lg">
        <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Ninety-five percent of your eligible membership fee supports artists. Every eligible artist in
          each of your funded networks receives a share, with a minimum of ${minPerArtist.toFixed(2)} from
          each funded network every month. You control how the remaining support is divided. Each unique
          artist is counted once per funded network, regardless of the number of songs included.
        </p>
      </div>
    </GlassCard>
  );
}