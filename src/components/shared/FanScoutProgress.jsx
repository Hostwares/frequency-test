import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Eye, Users, CheckCircle2 } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Progress } from '@/components/ui/progress';

export default function FanScoutProgress({ userId }) {
  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ['user-referrals-scout-progress', userId],
    queryFn: () => base44.entities.SupportAllocation.filter({ referred_by_fan_id: userId, is_active: true }),
    enabled: !!userId,
  });

  const { data: existingBadges = [] } = useQuery({
    queryKey: ['user-fan-scout-badge', userId],
    queryFn: () => base44.entities.FanBadge.filter({ fan_user_id: userId, badge_type: 'fan_scout' }),
    enabled: !!userId,
  });

  const stats = useMemo(() => {
    const uniqueReferrals = new Set(referrals.map(r => r.fan_user_id)).size;
    const progress = Math.min((uniqueReferrals / 5) * 100, 100);
    const hasScoutBadge = existingBadges.some(b => b.badge_type === 'fan_scout');
    const nextMilestone = 15; // Referral Master
    const progressToNext = Math.min((uniqueReferrals / nextMilestone) * 100, 100);

    return {
      uniqueReferrals,
      progress,
      hasScoutBadge,
      nextMilestone,
      progressToNext,
    };
  }, [referrals, existingBadges]);

  if (isLoading) {
    return (
      <GlassCard hover={false} className="p-6">
        <div className="h-24 bg-secondary/30 rounded-xl animate-pulse" />
      </GlassCard>
    );
  }

  return (
    <GlassCard hover={false} className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20">
            <Eye className="w-5 h-5 text-neon-cyan" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-base">Fan Scout Progress</h2>
            <p className="text-xs text-muted-foreground">Track your referral milestones</p>
          </div>
        </div>
        {stats.hasScoutBadge && (
          <NeonBadge color="blue">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Fan Scout Earned
          </NeonBadge>
        )}
      </div>

      <div className="space-y-4">
        {/* Fan Scout Milestone */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-neon-cyan" />
              <span className="text-xs font-semibold text-foreground">Fan Scout Badge</span>
            </div>
            <span className="text-xs text-muted-foreground">{stats.uniqueReferrals} / 5 referrals</span>
          </div>
          <Progress value={stats.progress} className="h-2 mb-2" />
          {stats.hasScoutBadge ? (
            <p className="text-xs text-neon-cyan font-medium">✓ Badge earned! Keep referring for more milestones.</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {5 - stats.uniqueReferrals} more referral{5 - stats.uniqueReferrals !== 1 ? 's' : ''} to earn Fan Scout badge
            </p>
          )}
        </div>

        {/* Next Milestone Preview */}
        {!stats.hasScoutBadge && stats.uniqueReferrals > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-secondary/10 rounded-lg p-3 border border-border/30"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground">Next: Referral Master</span>
              <span className="text-xs text-muted-foreground">{stats.uniqueReferrals} / 15</span>
            </div>
            <Progress value={stats.progressToNext} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground mt-2">
              Reach 15 referrals to earn the Referral Master badge (+750 points)
            </p>
          </motion.div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/40">
          <div className="text-center">
            <p className="text-lg font-bold text-neon-cyan">{stats.uniqueReferrals}</p>
            <p className="text-[9px] text-muted-foreground">Unique Referrals</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-neon-purple">{referrals.length}</p>
            <p className="text-[9px] text-muted-foreground">Total Allocations</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-neon-magenta">
              ${referrals.reduce((s, r) => s + (r.amount || 0), 0).toFixed(0)}
            </p>
            <p className="text-[9px] text-muted-foreground">Support Generated</p>
          </div>
        </div>
      </div>

      {stats.uniqueReferrals === 0 && (
        <div className="mt-4 text-center py-6 border border-dashed border-border/40 rounded-xl">
          <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Start referring to earn badges!</p>
          <p className="text-xs text-muted-foreground mt-1">Share artist profiles with friends</p>
        </div>
      )}
    </GlassCard>
  );
}