import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { GitBranch, UserPlus, TrendingUp, Users } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

/**
 * mode="artist"  — shows fans who were referred to this artist by other fans
 * mode="fan"     — shows artists the current fan has referred others to (fan-originated referrals)
 */
export default function FanReferralNetwork({ mode = 'artist', artistProfileId, fanUserId }) {
  // For artist mode: fetch all supporters of this artist that have a referred_by_fan_id
  const { data: artistReferrals = [], isLoading: loadingArtist } = useQuery({
    queryKey: ['artist-referrals', artistProfileId],
    queryFn: () => base44.entities.SupportAllocation.filter({ artist_profile_id: artistProfileId, is_active: true }),
    enabled: mode === 'artist' && !!artistProfileId,
    select: (data) => data.filter(s => !!s.referred_by_fan_id),
  });

  // For fan mode: fetch all allocations that this fan originated as a referrer
  const { data: fanReferrals = [], isLoading: loadingFan } = useQuery({
    queryKey: ['fan-referrals', fanUserId],
    queryFn: () => base44.entities.SupportAllocation.filter({ referred_by_fan_id: fanUserId, is_active: true }),
    enabled: mode === 'fan' && !!fanUserId,
  });

  const isLoading = mode === 'artist' ? loadingArtist : loadingFan;
  const referrals = mode === 'artist' ? artistReferrals : fanReferrals;

  // Group fan referrals by artist
  const groupedByArtist = React.useMemo(() => {
    if (mode !== 'fan') return {};
    return fanReferrals.reduce((acc, r) => {
      const key = r.artist_name || r.artist_profile_id;
      if (!acc[key]) acc[key] = { name: key, count: 0, total: 0 };
      acc[key].count++;
      acc[key].total += r.amount || 0;
      return acc;
    }, {});
  }, [fanReferrals, mode]);

  // Monthly growth: group artist referrals by month
  const monthlyGrowth = React.useMemo(() => {
    if (mode !== 'artist') return [];
    const map = {};
    artistReferrals.forEach(r => {
      const month = r.month || r.created_date?.slice(0, 7) || 'Unknown';
      map[month] = (map[month] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6);
  }, [artistReferrals, mode]);

  const maxMonthCount = Math.max(...monthlyGrowth.map(([, v]) => v), 1);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-neon-cyan" />
        <h2 className="font-display font-semibold text-sm">
          {mode === 'artist' ? 'Fan Referral Network' : 'Your Referral Impact'}
        </h2>
        <NeonBadge color="cyan">{referrals.length} referred</NeonBadge>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {mode === 'artist' ? (
          <>
            <div className="bg-secondary/30 rounded-xl p-3 text-center border border-border/30">
              <UserPlus className="w-4 h-4 text-neon-cyan mx-auto mb-1" />
              <p className="text-lg font-bold text-neon-cyan">{referrals.length}</p>
              <p className="text-[10px] text-muted-foreground">Fan Referrals</p>
            </div>
            <div className="bg-secondary/30 rounded-xl p-3 text-center border border-border/30">
              <TrendingUp className="w-4 h-4 text-neon-purple mx-auto mb-1" />
              <p className="text-lg font-bold text-neon-purple">
                {referrals.reduce((s, r) => s + (r.amount || 0), 0).toFixed(0)}
              </p>
              <p className="text-[10px] text-muted-foreground">$ via Referrals</p>
            </div>
            <div className="bg-secondary/30 rounded-xl p-3 text-center border border-border/30">
              <Users className="w-4 h-4 text-neon-magenta mx-auto mb-1" />
              <p className="text-lg font-bold text-neon-magenta">
                {new Set(referrals.map(r => r.referred_by_fan_id)).size}
              </p>
              <p className="text-[10px] text-muted-foreground">Referrers</p>
            </div>
          </>
        ) : (
          <>
            <div className="bg-secondary/30 rounded-xl p-3 text-center border border-border/30">
              <UserPlus className="w-4 h-4 text-neon-cyan mx-auto mb-1" />
              <p className="text-lg font-bold text-neon-cyan">{referrals.length}</p>
              <p className="text-[10px] text-muted-foreground">Fans Brought In</p>
            </div>
            <div className="bg-secondary/30 rounded-xl p-3 text-center border border-border/30">
              <TrendingUp className="w-4 h-4 text-neon-purple mx-auto mb-1" />
              <p className="text-lg font-bold text-neon-purple">
                {Object.keys(groupedByArtist).length}
              </p>
              <p className="text-[10px] text-muted-foreground">Artists Helped</p>
            </div>
            <div className="bg-secondary/30 rounded-xl p-3 text-center border border-border/30">
              <Users className="w-4 h-4 text-neon-magenta mx-auto mb-1" />
              <p className="text-lg font-bold text-neon-magenta">
                ${referrals.reduce((s, r) => s + (r.amount || 0), 0).toFixed(0)}
              </p>
              <p className="text-[10px] text-muted-foreground">Support Generated</p>
            </div>
          </>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-secondary/30 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : referrals.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-border/40 rounded-xl">
          <GitBranch className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">
            {mode === 'artist'
              ? 'No fan-to-fan referrals yet. As fans share your music, they\'ll appear here.'
              : 'Share artist profiles with friends to build your referral network.'}
          </p>
        </div>
      ) : mode === 'artist' ? (
        <>
          {/* Monthly growth bar chart */}
          {monthlyGrowth.length > 1 && (
            <div className="bg-secondary/20 rounded-xl p-4 border border-border/30">
              <p className="text-xs text-muted-foreground mb-3 font-medium">Monthly Referral Growth</p>
              <div className="flex items-end gap-2 h-16">
                {monthlyGrowth.map(([month, count]) => (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(count / maxMonthCount) * 100}%` }}
                      transition={{ duration: 0.5 }}
                      className="w-full bg-neon-cyan/60 rounded-t-sm min-h-[4px]"
                      style={{ height: `${(count / maxMonthCount) * 100}%` }}
                    />
                    <span className="text-[9px] text-muted-foreground">{month.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Referral list */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Recent Referrals</p>
            {referrals.slice(0, 8).map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary/20 border border-border/30"
              >
                <div className="w-7 h-7 rounded-full bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center">
                  <UserPlus className="w-3 h-3 text-neon-cyan" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">New fan</p>
                  <p className="text-[10px] text-muted-foreground">Referred by fan · {r.tier} tier</p>
                </div>
                <span className="text-xs font-semibold text-neon-cyan">${r.amount}/mo</span>
              </motion.div>
            ))}
          </div>
        </>
      ) : (
        // Fan mode: grouped by artist
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Artists You've Grown</p>
          {Object.values(groupedByArtist).sort((a, b) => b.count - a.count).map((group, i) => (
            <motion.div
              key={group.name}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-secondary/20 border border-border/30"
            >
              <div className="w-8 h-8 rounded-full bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-neon-purple" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{group.name}</p>
                <p className="text-[10px] text-muted-foreground">{group.count} fan{group.count !== 1 ? 's' : ''} referred</p>
              </div>
              <NeonBadge color="purple">${group.total}/mo</NeonBadge>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}