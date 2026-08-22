import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Users, UserCheck, Sparkles, TrendingUp, Share2 } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

const PIE_COLORS = ['#a855f7', '#06b6d4', '#d946ef', '#3b82f6', '#14b8a6'];

export default function ReferralSourceAnalytics({ artistProfileId }) {
  const { data: allocations = [] } = useQuery({
    queryKey: ['rsa-allocations', artistProfileId],
    queryFn: () => base44.entities.SupportAllocation.filter({ artist_profile_id: artistProfileId }, '-created_date', 500),
    enabled: !!artistProfileId,
  });

  const referredByArtistIds = useMemo(() =>
    [...new Set(allocations.map(a => a.referred_by_artist_id).filter(Boolean))], [allocations]);

  const referredByFanIds = useMemo(() =>
    [...new Set(allocations.map(a => a.referred_by_fan_id).filter(Boolean))], [allocations]);

  const { data: referringArtists = [] } = useQuery({
    queryKey: ['rsa-referring-artists', referredByArtistIds.join(',')],
    queryFn: () => base44.entities.ArtistProfile.list(),
    enabled: referredByArtistIds.length > 0,
    select: (list) => list.filter(a => referredByArtistIds.includes(a.id)),
  });

  const { data: referringFans = [] } = useQuery({
    queryKey: ['rsa-referring-fans', referredByFanIds.join(',')],
    queryFn: () => base44.entities.User.list(),
    enabled: referredByFanIds.length > 0,
    select: (list) => list.filter(u => referredByFanIds.includes(u.id)),
  });

  const analytics = useMemo(() => {
    const artistReferrals = allocations.filter(a => a.referred_by_artist_id);
    const fanReferrals = allocations.filter(a => a.referred_by_fan_id);
    const organic = allocations.filter(a => !a.referred_by_artist_id && !a.referred_by_fan_id);
    const total = allocations.length;

    const pieData = [
      { name: 'Artist Referrals', value: artistReferrals.length, color: PIE_COLORS[0] },
      { name: 'Fan Referrals', value: fanReferrals.length, color: PIE_COLORS[1] },
      { name: 'Organic / Direct', value: organic.length, color: PIE_COLORS[2] },
    ].filter(d => d.value > 0);

    // Top referring artists
    const artistRefCounts = {};
    artistReferrals.forEach(a => {
      const id = a.referred_by_artist_id;
      artistRefCounts[id] = (artistRefCounts[id] || 0) + 1;
    });
    const topArtists = Object.entries(artistRefCounts)
      .map(([id, count]) => {
        const artist = referringArtists.find(a => a.id === id);
        return { id, name: artist?.artist_name || 'Unknown Artist', count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top referring fans
    const fanRefCounts = {};
    fanReferrals.forEach(a => {
      const id = a.referred_by_fan_id;
      fanRefCounts[id] = (fanRefCounts[id] || 0) + 1;
    });
    const topFans = Object.entries(fanRefCounts)
      .map(([id, count]) => {
        const fan = referringFans.find(u => u.id === id);
        return { id, name: fan?.full_name || 'Anonymous Fan', count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const referralRevenue = [...artistReferrals, ...fanReferrals].reduce((sum, a) => sum + (a.amount || 0), 0);
    const referralRate = total > 0 ? Math.round(((artistReferrals.length + fanReferrals.length) / total) * 100) : 0;

    return { pieData, topArtists, topFans, artistReferrals: artistReferrals.length, fanReferrals: fanReferrals.length, organic: organic.length, total, referralRevenue, referralRate };
  }, [allocations, referringArtists, referringFans]);

  if (analytics.total === 0) {
    return (
      <GlassCard hover={false} className="p-12 text-center">
        <Share2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No referral data yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Referral source analytics will appear once you have supporters</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GlassCard hover={false} className="p-4 text-center">
          <Users className="w-5 h-5 text-neon-cyan mx-auto mb-2" />
          <p className="text-xl font-bold text-neon-cyan">{analytics.total}</p>
          <p className="text-xs text-muted-foreground">Total Supporters</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center">
          <Share2 className="w-5 h-5 text-neon-purple mx-auto mb-2" />
          <p className="text-xl font-bold text-neon-purple">{analytics.referralRate}%</p>
          <p className="text-xs text-muted-foreground">Referral Rate</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center">
          <UserCheck className="w-5 h-5 text-neon-magenta mx-auto mb-2" />
          <p className="text-xl font-bold text-neon-magenta">{analytics.artistReferrals + analytics.fanReferrals}</p>
          <p className="text-xs text-muted-foreground">Referred Fans</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center">
          <TrendingUp className="w-5 h-5 text-neon-turquoise mx-auto mb-2" />
          <p className="text-xl font-bold text-neon-turquoise">${analytics.referralRevenue.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">Referral Revenue/mo</p>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <GlassCard hover={false} className="p-5">
          <h4 className="font-display font-semibold text-sm mb-4">Supporter Sources</h4>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={analytics.pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {analytics.pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'hsl(260 20% 7%)', border: '1px solid hsl(260 15% 16%)', borderRadius: 8, fontSize: 11 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Top Referring Artists */}
        <GlassCard hover={false} className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-neon-purple" />
            <h4 className="font-display font-semibold text-sm">Top Referring Artists</h4>
          </div>
          {analytics.topArtists.length > 0 ? (
            <div className="space-y-2">
              {analytics.topArtists.map((artist, i) => (
                <div key={artist.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/20">
                  <span className="w-6 h-6 rounded-full bg-neon-purple/20 text-neon-purple text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="flex-1 text-sm truncate">{artist.name}</span>
                  <NeonBadge color="purple">{artist.count} fans</NeonBadge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No artist referrals yet</p>
          )}
        </GlassCard>
      </div>

      {/* Top Referring Fans */}
      <GlassCard hover={false} className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-neon-cyan" />
          <h4 className="font-display font-semibold text-sm">Top Referring Fans</h4>
        </div>
        {analytics.topFans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {analytics.topFans.map((fan, i) => (
              <div key={fan.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20 border border-border/30">
                <span className="w-7 h-7 rounded-full bg-neon-cyan/20 text-neon-cyan text-xs font-bold flex items-center justify-center">{i + 1}</span>
                <span className="flex-1 text-sm truncate">{fan.name}</span>
                <NeonBadge color="cyan">{fan.count} referrals</NeonBadge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No fan referrals yet</p>
        )}
      </GlassCard>
    </div>
  );
}