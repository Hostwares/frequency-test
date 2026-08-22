import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts';
import { TrendingUp, Award, Target, Star } from 'lucide-react';
import { format, subMonths, startOfMonth } from 'date-fns';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { BADGE_DEFINITIONS } from '@/lib/badges';

// Custom tooltip for growth chart
function GrowthTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 backdrop-blur border border-border/60 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="text-muted-foreground mb-1 font-medium">{label}</p>
      <p className="text-neon-cyan font-bold text-sm">{payload[0]?.value} new listener{payload[0]?.value !== 1 ? 's' : ''}</p>
    </div>
  );
}

// Get next referral badge milestone
function getNextBadge(currentReferrals) {
  const referralBadges = BADGE_DEFINITIONS
    .filter(b => b.earned({ referrals: currentReferrals, allocations: [], totalSpent: 0 }))
    .map(b => ({ ...b, threshold: getBadgeThreshold(b.id) }))
    .sort((a, b) => b.threshold - a.threshold);

  const nextBadge = BADGE_DEFINITIONS
    .find(b => {
      const threshold = getBadgeThreshold(b.id);
      return threshold > currentReferrals && threshold <= 50;
    });

  if (!nextBadge) return null;

  const threshold = getBadgeThreshold(nextBadge.id);
  const progress = (currentReferrals / threshold) * 100;

  return {
    ...nextBadge,
    threshold,
    progress: Math.min(progress, 100),
    remaining: threshold - currentReferrals,
  };
}

function getBadgeThreshold(badgeId) {
  const thresholds = {
    connector: 1,
    amplifier: 3,
    fan_scout: 5,
    signal_booster: 10,
    referral_master: 15,
    movement_maker: 25,
    referral_legend: 50,
  };
  return thresholds[badgeId] || 0;
}

export default function ReferralMilestoneChart({ userId }) {
  // Fetch all allocations where this fan referred someone
  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ['fan-referrals-milestone', userId],
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

  const totalReferrals = referrals.length;
  const nextBadge = getNextBadge(totalReferrals);

  // Radial bar data for progress
  const radialData = nextBadge ? [
    { name: 'Progress', value: nextBadge.progress, fill: '#06b6d4' },
    { name: 'Remaining', value: 100 - nextBadge.progress, fill: 'rgba(255,255,255,0.05)' },
  ] : [];

  const lastMonth = chartData[chartData.length - 2]?.cumulative || 0;
  const growth = totalReferrals - lastMonth;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20">
            <Target className="w-4 h-4 text-neon-cyan" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-base">Referral Milestones</h2>
            <p className="text-xs text-muted-foreground">Track your progress to the next badge</p>
          </div>
        </div>
        {growth > 0 && (
          <NeonBadge color="cyan">
            <TrendingUp className="w-3 h-3 mr-1" />
            +{growth} this month
          </NeonBadge>
        )}
      </div>

      {/* Current Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <GlassCard hover={false} className="p-4 text-center border border-border/30">
          <Award className="w-5 h-5 text-neon-cyan mx-auto mb-2" />
          <p className="text-2xl font-bold text-neon-cyan">{totalReferrals}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Total Referred</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center border border-border/30">
          <Star className="w-5 h-5 text-neon-purple mx-auto mb-2" />
          <p className="text-2xl font-bold text-neon-purple">{chartData[chartData.length - 1]?.new ?? 0}</p>
          <p className="text-[10px] text-muted-foreground mt-1">This Month</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center border border-border/30 md:col-span-1">
          <TrendingUp className="w-5 h-5 text-neon-magenta mx-auto mb-2" />
          <p className="text-2xl font-bold text-neon-magenta">{totalReferrals > 0 ? chartData.reduce((s, d) => s + d.new, 0) : 0}</p>
          <p className="text-[10px] text-muted-foreground mt-1">6-Month Growth</p>
        </GlassCard>
      </div>

      {/* Growth Chart */}
      {isLoading ? (
        <GlassCard hover={false} className="p-6">
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
        </GlassCard>
      ) : totalReferrals === 0 ? (
        <GlassCard hover={false} className="p-8 text-center">
          <Target className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No referrals tracked yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Share artist profiles to start earning badges.</p>
        </GlassCard>
      ) : (
        <GlassCard hover={false} className="p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-neon-cyan" />
            Referral Growth Over Time
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<GrowthTooltip />} />
              <Area type="monotone" dataKey="cumulative" stroke="#06b6d4" strokeWidth={2}
                fill="url(#gradCyan)" dot={{ r: 3, fill: '#06b6d4', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Total" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>
      )}

      {/* Next Badge Progress */}
      {nextBadge && (
        <GlassCard hover={false} className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Award className="w-4 h-4 text-neon-purple" />
              Next Milestone
            </h3>
            <NeonBadge color={nextBadge.color}>
              {nextBadge.icon} {nextBadge.title}
            </NeonBadge>
          </div>

          <div className="flex items-center gap-6">
            {/* Radial Progress Chart */}
            <div className="w-32 h-32 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="80%" outerRadius="100%" data={radialData} startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar
                    background
                    dataKey="value"
                    cornerRadius={10}
                    animationDuration={1000}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>

            {/* Progress Info */}
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-2">{nextBadge.description}</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-bold text-neon-cyan">{totalReferrals} / {nextBadge.threshold}</span>
                </div>
                <div className="h-2 bg-secondary/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-neon-cyan to-neon-purple transition-all duration-500"
                    style={{ width: `${nextBadge.progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Remaining</span>
                  <span className="font-semibold text-neon-magenta">{nextBadge.remaining} more to go!</span>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Milestone Path */}
      <GlassCard hover={false} className="p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Award className="w-4 h-4 text-neon-magenta" />
          Your Badge Journey
        </h3>
        <div className="space-y-3">
          {BADGE_DEFINITIONS
            .filter(b => ['connector', 'amplifier', 'fan_scout', 'signal_booster', 'referral_master', 'movement_maker', 'referral_legend'].includes(b.id))
            .map(badge => {
              const threshold = getBadgeThreshold(badge.id);
              const earned = totalReferrals >= threshold;
              const isNext = nextBadge?.id === badge.id;

              return (
                <div
                  key={badge.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    earned
                      ? 'bg-neon-cyan/5 border-neon-cyan/20'
                      : isNext
                      ? 'bg-neon-purple/5 border-neon-purple/30 animate-pulse'
                      : 'bg-secondary/10 border-border/20 opacity-60'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      earned
                        ? 'bg-neon-cyan/20 border-2 border-neon-cyan/40'
                        : isNext
                        ? 'bg-neon-purple/20 border-2 border-neon-purple/40'
                        : 'bg-secondary/30 border-2 border-border/30'
                    }`}
                  >
                    <span className="text-lg">{badge.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${earned ? 'text-neon-cyan' : 'text-foreground'}`}>
                      {badge.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{badge.description}</p>
                  </div>
                  <div className="text-right">
                    {earned ? (
                      <NeonBadge color="cyan">✓ Earned</NeonBadge>
                    ) : (
                      <span className="text-xs text-muted-foreground">{threshold} referrals</span>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </GlassCard>
    </div>
  );
}