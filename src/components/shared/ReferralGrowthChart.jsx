import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Share2, Music, Users } from 'lucide-react';
import { format, subMonths, startOfMonth } from 'date-fns';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

// Custom tooltip for growth chart
function GrowthTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 backdrop-blur border border-border/60 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="text-muted-foreground mb-1 font-medium">{label}</p>
      <p className="text-neon-cyan font-bold text-sm">{payload[0]?.value} new listener{payload[0]?.value !== 1 ? 's' : ''}</p>
      {payload[1] && <p className="text-neon-purple mt-0.5">{payload[1]?.value} total referred</p>}
    </div>
  );
}

export default function ReferralGrowthChart({ userId }) {
  // Fetch all allocations where this fan referred someone
  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ['fan-referrals-over-time', userId],
    queryFn: () => base44.entities.SupportAllocation.filter({ referred_by_fan_id: userId, is_active: true }),
    enabled: !!userId,
  });

  // Build monthly time-series for the last 6 months
  const chartData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = startOfMonth(subMonths(new Date(), 5 - i));
      return { key: format(d, 'yyyy-MM'), label: format(d, 'MMM yy') };
    });

    let cumulative = 0;
    return months.map(({ key, label }) => {
      const count = referrals.filter(r => {
        const month = r.month || (r.created_date ? r.created_date.slice(0, 7) : null);
        return month === key;
      }).length;
      cumulative += count;
      return { label, new: count, cumulative };
    });
  }, [referrals]);

  // Group referrals by artist to show impact
  const artistBreakdown = useMemo(() => {
    const byArtist = {};
    referrals.forEach(r => {
      const key = r.artist_name || r.artist_profile_id;
      if (!byArtist[key]) {
        byArtist[key] = { artist_name: key, count: 0, total: 0 };
      }
      byArtist[key].count++;
      byArtist[key].total += r.amount || 0;
    });
    return Object.values(byArtist).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [referrals]);

  const totalReferrals = referrals.length;
  const lastMonth = chartData[chartData.length - 2]?.cumulative || 0;
  const growth = totalReferrals - lastMonth;
  const uniqueArtists = new Set(referrals.map(r => r.artist_profile_id)).size;
  const totalSupportGenerated = referrals.reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20">
            <Share2 className="w-4 h-4 text-neon-cyan" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-base">Your Referral Impact</h2>
            <p className="text-xs text-muted-foreground">Growing the independent music community</p>
          </div>
        </div>
        {growth > 0 && (
          <NeonBadge color="cyan">
            <TrendingUp className="w-3 h-3 mr-1" />
            +{growth} this month
          </NeonBadge>
        )}
      </div>

      {/* Impact Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GlassCard hover={false} className="p-4 text-center border border-border/30">
          <Users className="w-5 h-5 text-neon-cyan mx-auto mb-2" />
          <p className="text-2xl font-bold text-neon-cyan">{totalReferrals}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Listeners Referred</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center border border-border/30">
          <Music className="w-5 h-5 text-neon-purple mx-auto mb-2" />
          <p className="text-2xl font-bold text-neon-purple">{uniqueArtists}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Artists Helped</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center border border-border/30">
          <TrendingUp className="w-5 h-5 text-neon-magenta mx-auto mb-2" />
          <p className="text-2xl font-bold text-neon-magenta">${totalSupportGenerated.toFixed(0)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Support Generated/mo</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center border border-border/30">
          <Share2 className="w-5 h-5 text-neon-blue mx-auto mb-2" />
          <p className="text-2xl font-bold text-neon-blue">{chartData[chartData.length - 1]?.new ?? 0}</p>
          <p className="text-[10px] text-muted-foreground mt-1">This Month</p>
        </GlassCard>
      </div>

      {/* Growth Chart */}
      {isLoading ? (
        <GlassCard hover={false} className="p-6">
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
        </GlassCard>
      ) : totalReferrals === 0 ? (
        <GlassCard hover={false} className="p-8 text-center">
          <Share2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No referrals tracked yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Share artist profiles to start growing your impact.</p>
        </GlassCard>
      ) : (
        <GlassCard hover={false} className="p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-neon-cyan" />
            Referral Growth Over Time
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradPurple" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#a855f7" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<GrowthTooltip />} />
              <Area type="monotone" dataKey="cumulative" stroke="#a855f7" strokeWidth={1.5}
                fill="url(#gradPurple)" dot={false} name="Total referred" />
              <Area type="monotone" dataKey="new" stroke="#06b6d4" strokeWidth={2}
                fill="url(#gradCyan)" dot={{ r: 3, fill: '#06b6d4', strokeWidth: 0 }} activeDot={{ r: 5 }} name="New listeners" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-neon-cyan" />
              <span>New listeners per month</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-neon-purple" />
              <span>Cumulative total</span>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Artist Impact Breakdown */}
      {artistBreakdown.length > 0 && (
        <GlassCard hover={false} className="p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Music className="w-4 h-4 text-neon-purple" />
            Artists You've Helped Grow
          </h3>
          <div className="space-y-3">
            {artistBreakdown.map((artist, index) => (
              <div key={artist.artist_name} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/10 border border-border/30">
                <div className="w-8 h-8 rounded-full bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-neon-purple">#{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{artist.artist_name}</p>
                  <p className="text-[10px] text-muted-foreground">{artist.count} referred listener{artist.count !== 1 ? 's' : ''}</p>
                </div>
                <div className="text-right">
                  <NeonBadge color="cyan">{artist.count} fans</NeonBadge>
                  <p className="text-[10px] text-neon-magenta font-semibold mt-1">${artist.total}/mo</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}