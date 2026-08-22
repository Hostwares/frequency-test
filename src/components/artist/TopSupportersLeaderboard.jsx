import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Trophy, Crown, Medal, Star, Users, Heart } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import SubscriberTierBadge from '@/components/shared/SubscriberTierBadge';

export default function TopSupportersLeaderboard({ artistProfileId, artistName }) {
  // Fetch all supporters (including historical)
  const { data: allAllocations = [] } = useQuery({
    queryKey: ['artist-all-supporters', artistProfileId],
    queryFn: () => base44.entities.SupportAllocation.filter({ 
      artist_profile_id: artistProfileId 
    }, '-created_date'),
    enabled: !!artistProfileId,
  });

  // Fetch user profiles for all supporters
  const supporterUserIds = useMemo(() => {
    return [...new Set(allAllocations.map(s => s.fan_user_id).filter(Boolean))];
  }, [allAllocations]);

  const { data: supporterUsers = [] } = useQuery({
    queryKey: ['supporter-users-leaderboard', supporterUserIds.join(',')],
    queryFn: () => base44.entities.User.list(),
    enabled: supporterUserIds.length > 0,
    select: (users) => users.filter(u => supporterUserIds.includes(u.id)),
  });

  // Calculate lifetime Resonance Score for each supporter
  const supporterScores = useMemo(() => {
    const userMap = Object.fromEntries(supporterUsers.map(u => [u.id, u]));
    const fanScores = {};

    allAllocations.forEach(alloc => {
      const fanId = alloc.fan_user_id;
      if (!fanId) return;

      if (!fanScores[fanId]) {
        fanScores[fanId] = {
          fan_user_id: fanId,
          fan_name: userMap[fanId]?.full_name || userMap[fanId]?.display_name || 'Anonymous Fan',
          fan_email: userMap[fanId]?.email,
          total_amount: 0,
          months_supported: 0,
          first_support_date: alloc.created_date,
          current_tier: alloc.tier || 'basic',
        };
      }

      fanScores[fanId].total_amount += (alloc.amount || 0);
      fanScores[fanId].months_supported += 1;
      
      // Keep the highest tier
      const tierOrder = { basic: 0, supporter: 1, champion: 2, patron: 3 };
      if (tierOrder[alloc.tier] > tierOrder[fanScores[fanId].current_tier]) {
        fanScores[fanId].current_tier = alloc.tier;
      }

      // Track earliest support date
      if (alloc.created_date && alloc.created_date < fanScores[fanId].first_support_date) {
        fanScores[fanId].first_support_date = alloc.created_date;
      }
    });

    // Calculate Resonance Score: (total_amount * 1.5) + (months_supported * 10) + loyalty_bonus
    const scored = Object.values(fanScores).map(fan => {
      const months = fan.months_supported;
      const loyaltyBonus = months >= 12 ? 100 : months >= 6 ? 50 : months >= 3 ? 25 : 0;
      const resonanceScore = Math.round((fan.total_amount * 1.5) + (months * 10) + loyaltyBonus);

      return {
        ...fan,
        resonance_score: resonanceScore,
        months_supported: months,
      };
    });

    // Sort by resonance score (descending) and take top 10
    return scored
      .sort((a, b) => b.resonance_score - a.resonance_score)
      .slice(0, 10);
  }, [allAllocations, supporterUsers]);

  const getRankIcon = (index) => {
    if (index === 0) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-300" />;
    if (index === 2) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">{index + 1}</span>;
  };

  const getTierBadge = (tier) => {
    const colors = {
      basic: 'cyan',
      supporter: 'purple',
      champion: 'magenta',
      patron: 'blue',
    };
    return colors[tier] || 'cyan';
  };

  return (
    <GlassCard hover={false} className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border border-yellow-400/30">
            <Trophy className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-base">Top Supporters Leaderboard</h2>
            <p className="text-xs text-muted-foreground">Your biggest fans by lifetime Resonance Score</p>
          </div>
        </div>
        {supporterScores.length > 0 && (
          <NeonBadge color="purple">
            <Star className="w-3 h-3 mr-1" />
            Top 10
          </NeonBadge>
        )}
      </div>

      {supporterScores.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border/40 rounded-xl">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No supporters yet</p>
          <p className="text-xs text-muted-foreground mt-1">Fans will appear here once they start supporting you</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Top 3 Podium */}
          {supporterScores.slice(0, 3).map((supporter, idx) => (
            <motion.div
              key={supporter.fan_user_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`relative p-4 rounded-xl border ${
                idx === 0 
                  ? 'bg-gradient-to-r from-yellow-400/10 via-orange-500/10 to-yellow-400/10 border-yellow-400/30' 
                  : idx === 1 
                    ? 'bg-gradient-to-r from-gray-400/10 to-gray-300/10 border-gray-400/30'
                    : 'bg-gradient-to-r from-amber-600/10 to-amber-500/10 border-amber-600/30'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Rank */}
                <div className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center flex-shrink-0">
                  {getRankIcon(idx)}
                </div>

                {/* Fan Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm truncate">{supporter.fan_name}</h3>
                    {idx === 0 && (
                      <Crown className="w-4 h-4 text-yellow-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <SubscriberTierBadge userId={supporter.fan_user_id} size="sm" showLabel={false} />
                    <NeonBadge color={getTierBadge(supporter.current_tier)}>
                      {supporter.current_tier}
                    </NeonBadge>
                    <span className="text-xs text-muted-foreground">
                      {supporter.months_supported} months
                    </span>
                  </div>
                </div>

                {/* Resonance Score */}
                <div className="text-right">
                  <div className="flex items-center gap-1 mb-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-lg font-bold text-yellow-400">{supporter.resonance_score}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Resonance Score</p>
                </div>
              </div>

              {/* Lifetime Support Amount */}
              <div className="mt-3 pt-3 border-t border-border/20">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Lifetime Support</span>
                  <span className="font-bold text-neon-cyan">${supporter.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Ranks 4-10 */}
          {supporterScores.slice(3).map((supporter, idx) => (
            <motion.div
              key={supporter.fan_user_id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: (idx + 3) * 0.05 }}
              className="p-3 rounded-lg bg-secondary/10 border border-border/30 flex items-center gap-3"
            >
              {/* Rank */}
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                {getRankIcon(idx + 3)}
              </div>

              {/* Fan Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{supporter.fan_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <SubscriberTierBadge userId={supporter.fan_user_id} size="sm" showLabel={false} />
                  <NeonBadge color={getTierBadge(supporter.current_tier)} className="text-[10px]">
                    {supporter.current_tier}
                  </NeonBadge>
                  <span className="text-xs text-muted-foreground">
                    {supporter.months_supported} months
                  </span>
                </div>
              </div>

              {/* Resonance Score */}
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-bold text-yellow-400">{supporter.resonance_score}</span>
                </div>
                <p className="text-xs text-muted-foreground">${supporter.total_amount.toFixed(2)}</p>
              </div>
            </motion.div>
          ))}

          {/* Summary Stats */}
          <div className="mt-6 pt-4 border-t border-border/30">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-neon-purple">{supporterScores[0]?.resonance_score || 0}</p>
                <p className="text-xs text-muted-foreground">Top Score</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-neon-cyan">
                  ${supporterScores.reduce((sum, s) => sum + s.total_amount, 0).toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">Total from Top 10</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-neon-magenta">
                  {supporterScores.reduce((sum, s) => sum + s.months_supported, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Combined Months</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  );
}