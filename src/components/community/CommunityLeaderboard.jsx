import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Trophy, Medal, Award, Users, TrendingUp, Crown, Star, DollarSign, Music } from 'lucide-react';

export default function CommunityLeaderboard({ communityId }) {
  const { data: community } = useQuery({
    queryKey: ['community', communityId],
    queryFn: () => base44.entities.FrequencyCommunity.filter({ id: communityId }),
    select: (data) => data?.[0],
    enabled: !!communityId,
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['community-allocations', communityId],
    queryFn: () => base44.entities.SupportAllocation.filter({ 
      is_active: true 
    }),
    enabled: !!communityId,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['community-supporter-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: allocations.length > 0,
  });

  const topSupporters = useMemo(() => {
    const fanMap = {};

    allocations.forEach(alloc => {
      if (!alloc.fan_user_id) return;
      
      if (!fanMap[alloc.fan_user_id]) {
        fanMap[alloc.fan_user_id] = {
          fan_user_id: alloc.fan_user_id,
          total_support: 0,
          total_referrals: 0,
          artists_supported: new Set(),
          allocation_count: 0,
        };
      }

      fanMap[alloc.fan_user_id].total_support += alloc.amount || 0;
      fanMap[alloc.fan_user_id].artists_supported.add(alloc.artist_profile_id);
      fanMap[alloc.fan_user_id].allocation_count += 1;
      
      if (alloc.referred_by_fan_id) {
        fanMap[alloc.fan_user_id].total_referrals += 1;
      }
    });

    // Calculate combined score: 60% support amount + 40% referrals
    const scored = Object.values(fanMap).map(fan => ({
      ...fan,
      score: (fan.total_support * 0.6) + (fan.total_referrals * 10 * 0.4),
    }));

    return scored.sort((a, b) => b.score - a.score).slice(0, 10);
  }, [allocations]);

  const userMap = useMemo(() => {
    return Object.fromEntries(users.map(u => [u.id, u]));
  }, [users]);

  const getRankIcon = (index) => {
    switch (index) {
      case 0:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 1:
        return <Trophy className="w-6 h-6 text-gray-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return <Award className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getRankBadge = (index) => {
    switch (index) {
      case 0:
        return 'bg-yellow-500/15 border-yellow-500/30 text-yellow-500';
      case 1:
        return 'bg-gray-400/15 border-gray-400/30 text-gray-400';
      case 2:
        return 'bg-amber-600/15 border-amber-600/30 text-amber-600';
      default:
        return 'bg-secondary/50 border-border/30 text-muted-foreground';
    }
  };

  const getSupporterBadge = (support) => {
    if (support >= 50) return { label: 'Mega Supporter', color: 'magenta' };
    if (support >= 25) return { label: 'Super Supporter', color: 'purple' };
    if (support >= 10) return { label: 'Active Supporter', color: 'cyan' };
    return { label: 'Supporter', color: 'turquoise' };
  };

  if (topSupporters.length === 0) {
    return (
      <GlassCard hover={false} className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-neon-purple/10 border border-neon-purple/20">
            <Trophy className="w-5 h-5 text-neon-purple" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-base">Community Leaderboard</h2>
            <p className="text-xs text-muted-foreground">Top supporters of {community?.name || 'this community'}</p>
          </div>
        </div>
        
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">No supporters yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Be the first to support artists and earn your spot on the leaderboard!
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard hover={false} className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-neon-purple/10 border border-neon-purple/20">
            <Trophy className="w-5 h-5 text-neon-purple" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-base">Community Leaderboard</h2>
            <p className="text-xs text-muted-foreground">
              Top 10 supporters this month
            </p>
          </div>
        </div>
        <NeonBadge color="purple">
          <Trophy className="w-3 h-3 mr-1" />
          Top 10
        </NeonBadge>
      </div>

      <div className="space-y-3">
        {topSupporters.map((supporter, index) => {
          const user = userMap[supporter.fan_user_id];
          const isTopThree = index < 3;
          const badge = getSupporterBadge(supporter.total_support);

          return (
            <motion.div
              key={supporter.fan_user_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 rounded-xl border transition-all ${
                isTopThree 
                  ? 'bg-gradient-to-r from-neon-purple/5 to-transparent border-neon-purple/20' 
                  : 'bg-secondary/10 border-border/20'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Rank */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${getRankBadge(index)}`}>
                  {isTopThree ? getRankIcon(index) : <span className="text-sm font-bold">{index + 1}</span>}
                </div>

                {/* Supporter Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm truncate">
                      {user?.full_name || user?.email?.split('@')[0] || 'Fan'}
                    </span>
                    {isTopThree && (
                      <Star className="w-3 h-3 text-neon-purple fill-neon-purple" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <NeonBadge color={badge.color}>{badge.label}</NeonBadge>
                    <span className="flex items-center gap-1">
                      <Music className="w-3 h-3" />
                      {supporter.artists_supported.size} artists
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="text-right flex-shrink-0">
                  <div className="text-lg font-bold text-neon-purple flex items-center justify-end gap-1">
                    <DollarSign className="w-4 h-4" />
                    {supporter.total_support.toFixed(0)}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {supporter.total_referrals > 0 ? `${supporter.total_referrals} referrals` : 'No referrals'}
                  </p>
                </div>
              </div>

              {/* Score Bar */}
              <div className="mt-3 pt-3 border-t border-border/20">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Impact Score</span>
                  <span className="text-neon-purple font-medium">
                    {supporter.score.toFixed(0)}
                  </span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-neon-purple to-neon-cyan rounded-full transition-all duration-500"
                    style={{ width: `${(supporter.score / (topSupporters[0]?.score || 1)) * 100}%` }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-border/30">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-neon-purple">
              ${topSupporters.reduce((sum, s) => sum + s.total_support, 0).toFixed(0)}
            </p>
            <p className="text-[10px] text-muted-foreground">Total Support</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-neon-cyan">
              {topSupporters.reduce((sum, s) => sum + s.total_referrals, 0)}
            </p>
            <p className="text-[10px] text-muted-foreground">Referrals Made</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-neon-magenta">
              {(topSupporters.reduce((sum, s) => sum + s.total_support, 0) / topSupporters.length).toFixed(0)}
            </p>
            <p className="text-[10px] text-muted-foreground">Avg Support/Fan</p>
          </div>
        </div>
      </div>

      {/* Gamification Tip */}
      <div className="mt-4 p-4 rounded-xl bg-neon-purple/5 border border-neon-purple/20">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-neon-purple">💡 Pro Tip:</span> Support more artists and invite friends to climb the leaderboard and unlock exclusive community rewards!
        </p>
      </div>
    </GlassCard>
  );
}