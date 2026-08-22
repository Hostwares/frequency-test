import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Users, DollarSign, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { format, subMonths, startOfMonth } from 'date-fns';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

function ChartTooltip({ active, payload, label, prefix = '', suffix = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 backdrop-blur border border-border/60 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="font-bold" style={{ color: entry.color || entry.stroke }}>
          {prefix}{entry.value?.toLocaleString()}{suffix}
        </p>
      ))}
    </div>
  );
}

export default function ArtistGrowthOverview({ artistProfileId, supporters = [] }) {
  const { data: allAllocations = [] } = useQuery({
    queryKey: ['growth-overview-allocations', artistProfileId],
    queryFn: () => base44.entities.SupportAllocation.filter({
      artist_profile_id: artistProfileId
    }, '-created_date'),
    enabled: !!artistProfileId,
  });

  const chartData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = startOfMonth(subMonths(new Date(), 5 - i));
      return {
        key: format(d, 'yyyy-MM'),
        label: format(d, 'MMM'),
        newFans: 0,
        cumulativeFans: 0,
        monthlySupport: 0,
        cumulativeSupport: 0,
      };
    });

    allAllocations.forEach(alloc => {
      const monthKey = alloc.created_date?.slice(0, 7);
      const monthData = months.find(m => m.key === monthKey);
      if (monthData) {
        monthData.newFans += 1;
        monthData.monthlySupport += alloc.amount || 0;
      }
    });

    let cumulativeFans = 0;
    let cumulativeSupport = 0;
    months.forEach(month => {
      cumulativeFans += month.newFans;
      cumulativeSupport += month.monthlySupport;
      month.cumulativeFans = cumulativeFans;
      month.cumulativeSupport = cumulativeSupport;
    });

    return months;
  }, [allAllocations]);

  const totalActiveFans = supporters.length;
  const totalMonthlySupport = supporters.reduce((sum, s) => sum + (s.amount || 0), 0);

  const thisMonth = chartData[chartData.length - 1] || {};
  const lastMonth = chartData[chartData.length - 2] || {};

  const fanGrowthRate = lastMonth.newFans > 0
    ? Math.round(((thisMonth.newFans - lastMonth.newFans) / lastMonth.newFans) * 100)
    : thisMonth.newFans > 0 ? 100 : 0;

  const supportGrowthRate = lastMonth.monthlySupport > 0
    ? Math.round(((thisMonth.monthlySupport - lastMonth.monthlySupport) / lastMonth.monthlySupport) * 100)
    : thisMonth.monthlySupport > 0 ? 100 : 0;

  // Fan Growth Score: weighted composite metric (0-100 scale)
  // Based on: cumulative fans, recent growth rate, and support velocity
  const fanGrowthScore = useMemo(() => {
    const fanBase = Math.min(totalActiveFans * 2, 40); // up to 40 pts from fanbase size
    const growth = Math.min(Math.max(fanGrowthRate, 0) * 0.3, 30); // up to 30 pts from growth rate
    const support = Math.min(totalMonthlySupport * 0.5, 30); // up to 30 pts from support volume
    return Math.round(fanBase + growth + support);
  }, [totalActiveFans, fanGrowthRate, totalMonthlySupport]);

  const hasData = chartData.some(m => m.newFans > 0 || m.monthlySupport > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <GlassCard hover={false} className="p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-neon-purple/10">
              <Sparkles className="w-4 h-4 text-neon-purple" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-sm">Growth Overview</h2>
              <p className="text-[10px] text-muted-foreground">Fan growth & support trends · last 6 months</p>
            </div>
          </div>
          <NeonBadge color="purple">
            <Sparkles className="w-3 h-3 mr-1 inline" />
            Score {fanGrowthScore}
          </NeonBadge>
        </div>

        {/* Summary stats row */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-secondary/20 rounded-xl p-3 border border-border/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-neon-cyan" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Fan Growth</span>
              </div>
              {fanGrowthRate !== 0 && (
                <span className={`text-[10px] font-medium flex items-center gap-0.5 ${fanGrowthRate > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {fanGrowthRate > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {fanGrowthRate > 0 ? '+' : ''}{fanGrowthRate}%
                </span>
              )}
            </div>
            <p className="text-xl font-bold text-neon-cyan mt-1">{totalActiveFans}</p>
            <p className="text-[10px] text-muted-foreground">+{thisMonth.newFans || 0} this month</p>
          </div>

          <div className="bg-secondary/20 rounded-xl p-3 border border-border/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-neon-magenta" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Monthly Support</span>
              </div>
              {supportGrowthRate !== 0 && (
                <span className={`text-[10px] font-medium flex items-center gap-0.5 ${supportGrowthRate > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {supportGrowthRate > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {supportGrowthRate > 0 ? '+' : ''}{supportGrowthRate}%
                </span>
              )}
            </div>
            <p className="text-xl font-bold text-neon-magenta mt-1">${totalMonthlySupport.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground">${(thisMonth.monthlySupport || 0).toFixed(0)} this month</p>
          </div>
        </div>

        {/* Charts */}
        {hasData ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Fan Growth Chart */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Users className="w-3.5 h-3.5 text-neon-cyan" />
                <span className="text-xs font-medium text-muted-foreground">Fan Growth</span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fanGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} width={24} />
                  <Tooltip content={<ChartTooltip suffix=" fans" />} />
                  <Area type="monotone" dataKey="cumulativeFans" stroke="#06b6d4" strokeWidth={2} fill="url(#fanGrowthGrad)" dot={{ r: 3, fill: '#06b6d4', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Support Trend Chart */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <DollarSign className="w-3.5 h-3.5 text-neon-magenta" />
                <span className="text-xs font-medium text-muted-foreground">Support Trend</span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="supportBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d946ef" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#d946ef" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} width={24} tickFormatter={(v) => `$${v}`} />
                  <Tooltip content={<ChartTooltip prefix="$" />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="monthlySupport" fill="url(#supportBarGrad)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="text-center py-10">
            <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-20 text-neon-cyan" />
            <p className="text-xs text-muted-foreground">No growth data yet</p>
            <p className="text-[10px] text-muted-foreground mt-1">Charts will appear as you gain supporters</p>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}