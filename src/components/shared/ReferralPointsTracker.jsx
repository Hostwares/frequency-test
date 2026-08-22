import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Trophy, Star, TrendingUp, Medal, Crown } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

const POINT_RULES = {
  perReferral: 100,
  tierBonus: {
    basic: 0,
    supporter: 10,
    patron: 25,
    champion: 50,
  },
  milestoneBonuses: [
    { threshold: 5, bonus: 250, label: 'Scout Milestone' },
    { threshold: 15, bonus: 750, label: 'Master Milestone' },
    { threshold: 50, bonus: 2500, label: 'Legend Milestone' },
  ],
};

const RANK_BADGES = [
  { min: 5000, icon: Crown, label: 'Legendary Scout', color: 'cyan' },
  { min: 2000, icon: Medal, label: 'Master Scout', color: 'magenta' },
  { min: 1000, icon: Trophy, label: 'Elite Scout', color: 'purple' },
  { min: 500, icon: Star, label: 'Pro Scout', color: 'blue' },
  { min: 100, icon: TrendingUp, label: 'Active Scout', color: 'turquoise' },
];

function PointsBreakdown({ referrals }) {
  const breakdown = useMemo(() => {
    let basePoints = 0;
    let tierBonuses = 0;
    let milestoneBonuses = 0;
    const milestones = [];

    referrals.forEach(r => {
      basePoints += POINT_RULES.perReferral;
      const tierMultiplier = POINT_RULES.tierBonus[r.tier] || 0;
      const tierBonus = Math.round(POINT_RULES.perReferral * (tierMultiplier / 100));
      tierBonuses += tierBonus;
    });

    const totalReferrals = referrals.length;
    POINT_RULES.milestoneBonuses.forEach(({ threshold, bonus, label }) => {
      if (totalReferrals >= threshold) {
        milestoneBonuses += bonus;
        milestones.push({ label, bonus });
      }
    });

    return { basePoints, tierBonuses, milestoneBonuses, milestones, total: basePoints + tierBonuses + milestoneBonuses };
  }, [referrals]);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs">
        <span className="text-muted-foreground">Base Points</span>
        <span className="font-semibold text-foreground">+{breakdown.basePoints}</span>
      </div>
      {breakdown.tierBonuses > 0 && (
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">Tier Bonuses</span>
          <span className="font-semibold text-neon-purple">+{breakdown.tierBonuses}</span>
        </div>
      )}
      {breakdown.milestones.map((m, i) => (
        <div key={i} className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">{m.label}</span>
          <span className="font-semibold text-neon-cyan">+{m.bonus}</span>
        </div>
      ))}
      <div className="border-t border-border/40 pt-2 mt-2 flex justify-between items-center text-sm font-bold">
        <span className="text-foreground">Total Points</span>
        <span className="text-neon-magenta">{breakdown.total.toLocaleString()}</span>
      </div>
    </div>
  );
}

export default function ReferralPointsTracker({ userId }) {
  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ['user-referrals-points', userId],
    queryFn: () => base44.entities.SupportAllocation.filter({ referred_by_fan_id: userId, is_active: true }),
    enabled: !!userId,
  });

  const { data: userBadges = [] } = useQuery({
    queryKey: ['user-fan-badges', userId],
    queryFn: () => base44.entities.FanBadge.filter({ fan_user_id: userId }),
    enabled: !!userId,
  });

  const stats = useMemo(() => {
    let totalPoints = 0;
    let monthlyPoints = 0;
    const currentMonth = new Date().toISOString().slice(0, 7);

    referrals.forEach(r => {
      const points = POINT_RULES.perReferral;
      const tierBonus = Math.round(points * ((POINT_RULES.tierBonus[r.tier] || 0) / 100));
      const referralPoints = points + tierBonus;
      
      totalPoints += referralPoints;
      if (r.month === currentMonth) {
        monthlyPoints += referralPoints;
      }
    });

    POINT_RULES.milestoneBonuses.forEach(({ threshold, bonus }) => {
      if (referrals.length >= threshold) {
        totalPoints += bonus;
      }
    });

    const rankBadge = RANK_BADGES.find(badge => totalPoints >= badge.min) || null;

    return {
      totalPoints,
      monthlyPoints,
      totalReferrals: referrals.length,
      rankBadge,
      avgPointsPerReferral: referrals.length > 0 ? Math.round(totalPoints / referrals.length) : 0,
    };
  }, [referrals]);

  if (isLoading) {
    return (
      <GlassCard hover={false} className="p-6">
        <div className="h-32 bg-secondary/30 rounded-xl animate-pulse" />
      </GlassCard>
    );
  }

  return (
    <GlassCard hover={false} className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-neon-magenta/10 border border-neon-magenta/20">
            <Trophy className="w-5 h-5 text-neon-magenta" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-base">Referral Points</h2>
            <p className="text-xs text-muted-foreground">Earn points for every successful referral</p>
          </div>
        </div>
        {stats.rankBadge && (
          <NeonBadge color={stats.rankBadge.color}>
            <stats.rankBadge.icon className="w-3 h-3 mr-1" />
            {stats.rankBadge.label}
          </NeonBadge>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-secondary/20 rounded-xl p-4 text-center border border-border/30">
          <p className="text-2xl font-bold text-neon-magenta">{stats.totalPoints.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Total Points</p>
        </div>
        <div className="bg-secondary/20 rounded-xl p-4 text-center border border-border/30">
          <p className="text-2xl font-bold text-neon-cyan">{stats.monthlyPoints}</p>
          <p className="text-[10px] text-muted-foreground mt-1">This Month</p>
        </div>
        <div className="bg-secondary/20 rounded-xl p-4 text-center border border-border/30">
          <p className="text-2xl font-bold text-neon-purple">{stats.totalReferrals}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Referrals</p>
        </div>
        <div className="bg-secondary/20 rounded-xl p-4 text-center border border-border/30">
          <p className="text-2xl font-bold text-neon-blue">{stats.avgPointsPerReferral}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Avg Points/Referral</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-secondary/10 rounded-xl p-4 border border-border/30">
          <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-neon-cyan" />
            Points Breakdown
          </h3>
          <PointsBreakdown referrals={referrals} />
        </div>

        <div className="bg-secondary/10 rounded-xl p-4 border border-border/30">
          <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
            <Medal className="w-3.5 h-3.5 text-neon-purple" />
            How to Earn Points
          </h3>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Per successful referral</span>
              <span className="text-foreground font-medium">+{POINT_RULES.perReferral} pts</span>
            </div>
            <div className="flex justify-between">
              <span>Supporter tier bonus</span>
              <span className="text-foreground font-medium">+10%</span>
            </div>
            <div className="flex justify-between">
              <span>Patron tier bonus</span>
              <span className="text-foreground font-medium">+25%</span>
            </div>
            <div className="flex justify-between">
              <span>Champion tier bonus</span>
              <span className="text-foreground font-medium">+50%</span>
            </div>
            <div className="border-t border-border/40 pt-2 mt-2">
              <p className="text-[10px] mb-1">Milestone Bonuses:</p>
              <div className="flex justify-between">
                <span>5 referrals (Scout)</span>
                <span className="text-neon-cyan font-medium">+250 pts</span>
              </div>
              <div className="flex justify-between">
                <span>15 referrals (Master)</span>
                <span className="text-neon-cyan font-medium">+750 pts</span>
              </div>
              <div className="flex justify-between">
                <span>50 referrals (Legend)</span>
                <span className="text-neon-cyan font-medium">+2,500 pts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {referrals.length === 0 && (
        <div className="mt-6 text-center py-8 border border-dashed border-border/40 rounded-xl">
          <Trophy className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Start referring to earn points!</p>
          <p className="text-xs text-muted-foreground mt-1">Share artist profiles and climb the leaderboard</p>
        </div>
      )}
    </GlassCard>
  );
}