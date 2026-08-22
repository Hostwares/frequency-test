import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Users, UserCheck, TrendingUp, Award, Gift, Crown, Medal,
  Sparkles, UserPlus, Loader2
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ArtistReferralDashboard({ artistProfileId, artistName }) {
  const { data: allocations = [], isLoading } = useQuery({
    queryKey: ['artist-referral-allocations', artistProfileId],
    queryFn: () => base44.entities.SupportAllocation.filter(
      { artist_profile_id: artistProfileId },
      '-created_date'
    ),
    enabled: !!artistProfileId,
  });

  const referrerIds = useMemo(() => {
    return [...new Set(
      allocations
        .map(a => a.referred_by_fan_id)
        .filter(Boolean)
    )];
  }, [allocations]);

  const { data: users = [] } = useQuery({
    queryKey: ['referrer-users', referrerIds.join(',')],
    queryFn: () => base44.entities.User.list(),
    enabled: referrerIds.length > 0,
    select: (users) => users.filter(u => referrerIds.includes(u.id)),
  });

  const userMap = useMemo(() => {
    return Object.fromEntries(users.map(u => [u.id, u]));
  }, [users]);

  const fanReferred = useMemo(() => {
    return allocations.filter(a => a.referred_by_fan_id);
  }, [allocations]);

  const stats = useMemo(() => {
    const totalSupporters = allocations.length;
    const referredCount = fanReferred.length;
    const referralRate = totalSupporters > 0 ? (referredCount / totalSupporters) * 100 : 0;
    const uniqueReferrers = new Set(fanReferred.map(a => a.referred_by_fan_id)).size;
    const referredRevenue = fanReferred.reduce((sum, a) => sum + (a.amount || 0), 0);

    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

    const thisMonthCount = fanReferred.filter(a => {
      const d = new Date(a.created_date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === thisMonth;
    }).length;
    const lastMonthCount = fanReferred.filter(a => {
      const d = new Date(a.created_date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === lastMonth;
    }).length;
    const monthGrowth = lastMonthCount > 0
      ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100)
      : thisMonthCount > 0 ? 100 : 0;

    return { totalSupporters, referredCount, referralRate, uniqueReferrers, referredRevenue, thisMonthCount, monthGrowth };
  }, [allocations, fanReferred]);

  const topReferrers = useMemo(() => {
    const map = {};
    fanReferred.forEach(a => {
      const id = a.referred_by_fan_id;
      if (!id) return;
      if (!map[id]) map[id] = { userId: id, count: 0, totalAmount: 0, supporters: [] };
      map[id].count++;
      map[id].totalAmount += a.amount || 0;
      map[id].supporters.push(a);
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [fanReferred]);

  const monthlyTrend = useMemo(() => {
    const months = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { month: MONTH_LABELS[d.getMonth()], count: 0, total: 0 };
    }
    fanReferred.forEach(a => {
      const d = new Date(a.created_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (months[key]) {
        months[key].count++;
        months[key].total += a.amount || 0;
      }
    });
    return Object.values(months);
  }, [fanReferred]);

  const getUserName = (userId) => {
    const u = userMap[userId];
    return u?.full_name || u?.email?.split('@')[0] || `Fan ${userId.slice(0, 6)}`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-neon-cyan" />
        <h3 className="font-display font-bold text-lg">Fan Referral Dashboard</h3>
        <NeonBadge color="cyan" className="ml-auto">
          {stats.uniqueReferrers} active referrers
        </NeonBadge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Users, label: 'Total Supporters', value: stats.totalSupporters, color: 'text-neon-cyan' },
          { icon: UserCheck, label: 'Fan-Referred', value: stats.referredCount, color: 'text-neon-turquoise' },
          { icon: TrendingUp, label: 'Referral Rate', value: `${stats.referralRate.toFixed(0)}%`, color: 'text-neon-purple' },
          { icon: Award, label: 'Unique Referrers', value: stats.uniqueReferrers, color: 'text-neon-magenta' },
        ].map(({ icon: Icon, label, value, color }) => (
          <GlassCard key={label} hover={false} className="p-4 text-center">
            <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Growth Trend Chart */}
      <GlassCard hover={false} className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-medium">Fan Referral Growth — Last 12 Months</h4>
          {stats.monthGrowth !== 0 && (
            <NeonBadge color={stats.monthGrowth > 0 ? 'turquoise' : 'magenta'} className="ml-auto">
              {stats.monthGrowth > 0 ? '+' : ''}{stats.monthGrowth}% vs last month
            </NeonBadge>
          )}
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={monthlyTrend}>
            <defs>
              <linearGradient id="referralGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 16%)" />
            <XAxis dataKey="month" tick={{ fill: 'hsl(260 10% 55%)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'hsl(260 10% 55%)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: 'hsl(260 20% 7%)',
                border: '1px solid hsl(260 15% 16%)',
                borderRadius: '0.5rem',
                fontSize: '12px',
              }}
              labelStyle={{ color: 'hsl(0 0% 95%)' }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#06b6d4"
              strokeWidth={2}
              fill="url(#referralGradient)"
              name="New fan-referred"
            />
          </AreaChart>
        </ResponsiveContainer>
      </GlassCard>

      {/* Top Referrers Leaderboard */}
      <GlassCard hover={false} className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Crown className="w-4 h-4 text-neon-magenta" />
          <h4 className="text-sm font-medium">Top Fan Referrers</h4>
        </div>
        {topReferrers.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No fan referrals yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Encourage your fans to share your music — referrals will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {topReferrers.map((referrer, idx) => (
              <div key={referrer.userId}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs ${
                  idx === 0 ? 'bg-neon-magenta/20 text-neon-magenta' :
                  idx === 1 ? 'bg-neon-purple/20 text-neon-purple' :
                  idx === 2 ? 'bg-neon-cyan/20 text-neon-cyan' :
                  'bg-secondary text-muted-foreground'
                }`}>
                  {idx === 0 ? <Crown className="w-4 h-4" /> :
                   idx === 1 ? <Medal className="w-4 h-4" /> :
                   idx === 2 ? <Award className="w-4 h-4" /> :
                   idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{getUserName(referrer.userId)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Brought in {referrer.count} {referrer.count === 1 ? 'supporter' : 'supporters'}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-neon-turquoise">${referrer.totalAmount.toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground">supported</p>
                </div>
                <NeonBadge color={
                  idx === 0 ? 'magenta' :
                  idx === 1 ? 'purple' :
                  idx === 2 ? 'cyan' : 'blue'
                }>
                  {referrer.count} {referrer.count === 1 ? 'ref' : 'refs'}
                </NeonBadge>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Revenue from referrals */}
      {stats.referredRevenue > 0 && (
        <GlassCard hover={false} className="p-4 flex items-center gap-3 border-neon-turquoise/20">
          <div className="p-2 rounded-lg bg-neon-turquoise/10">
            <Gift className="w-4 h-4 text-neon-turquoise" />
          </div>
          <div>
            <p className="text-sm font-medium">Revenue from Fan Referrals</p>
            <p className="text-[10px] text-muted-foreground">
              ${stats.referredRevenue.toFixed(2)} generated from fan-referred supporters
            </p>
          </div>
          <p className="text-lg font-bold text-neon-turquoise ml-auto">${stats.referredRevenue.toFixed(2)}</p>
        </GlassCard>
      )}
    </div>
  );
}