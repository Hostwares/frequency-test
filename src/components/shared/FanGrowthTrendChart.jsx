import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { TrendingUp, Users, Target } from 'lucide-react';
import { format, subMonths, startOfMonth } from 'date-fns';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 backdrop-blur border border-border/60 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="text-muted-foreground mb-1 font-medium">{label}</p>
      <p className="text-neon-cyan font-bold text-sm">{payload[0]?.value} fans</p>
      <p className="text-neon-purple text-[10px] mt-1">
        +{payload[0]?.payload?.new || 0} new this month
      </p>
    </div>
  );
}

export default function FanGrowthTrendChart({ artistProfileId }) {
  // Fetch all support allocations for this artist
  const { data: allAllocations = [] } = useQuery({
    queryKey: ['fan-growth-allocations', artistProfileId],
    queryFn: () => base44.entities.SupportAllocation.filter({ 
      artist_profile_id: artistProfileId 
    }, '-created_date'),
    enabled: !!artistProfileId,
  });

  // Calculate last 12 months of fan growth
  const chartData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = startOfMonth(subMonths(new Date(), 11 - i));
      return { 
        key: format(d, 'yyyy-MM'), 
        label: format(d, 'MMM yy'),
        new: 0,
        cumulative: 0
      };
    });

    // Count new fans per month (based on created_date)
    allAllocations.forEach(allocation => {
      const monthKey = allocation.created_date?.slice(0, 7);
      const monthData = months.find(m => m.key === monthKey);
      if (monthData) {
        monthData.new += 1;
      }
    });

    // Calculate cumulative totals
    let cumulative = 0;
    months.forEach(month => {
      cumulative += month.new;
      month.cumulative = cumulative;
    });

    return months;
  }, [allAllocations]);

  // Calculate key metrics
  const totalFans = allAllocations.filter(a => a.is_active !== false).length;
  const thisMonthGrowth = chartData[chartData.length - 1]?.new || 0;
  const lastMonthGrowth = chartData[chartData.length - 2]?.new || 0;
  const growthRate = lastMonthGrowth > 0 
    ? Math.round(((thisMonthGrowth - lastMonthGrowth) / lastMonthGrowth) * 100)
    : thisMonthGrowth > 0 ? 100 : 0;

  // Calculate milestone progress
  const milestones = [20000, 30000, 40000, 50000, 60000, 70000, 80000, 90000, 100000];
  const currentFans = totalFans;
  const nextMilestone = milestones.find(m => m > currentFans) || 100000;
  const previousMilestone = milestones.filter(m => m <= currentFans).pop() || 0;
  const fansNeeded = nextMilestone - currentFans;
  const milestoneProgress = previousMilestone > 0 
    ? Math.round(((currentFans - previousMilestone) / (nextMilestone - previousMilestone)) * 100)
    : Math.round((currentFans / nextMilestone) * 100);

  // Find peak growth month
  const peakMonth = chartData.reduce((max, month) => 
    month.new > max.new ? month : max, 
    { new: 0, label: 'N/A' }
  );

  if (!artistProfileId) {
    return null;
  }

  return (
    <GlassCard hover={false} className="p-5">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-neon-cyan" />
            <h2 className="font-display font-semibold text-sm">Fan Growth Trend</h2>
            <NeonBadge color="cyan">{totalFans} total fans</NeonBadge>
          </div>
          {thisMonthGrowth > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-neon-cyan">
              <TrendingUp className="w-3.5 h-3.5" />
              +{thisMonthGrowth} this month
              {growthRate !== 0 && (
                <span className={`text-[10px] ${growthRate > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ({growthRate > 0 ? '+' : ''}{growthRate}%)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Key Metrics Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-secondary/20 rounded-xl p-3 text-center border border-border/30">
            <p className="text-lg font-bold text-neon-cyan">{totalFans}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Total Fans</p>
          </div>
          <div className="bg-secondary/20 rounded-xl p-3 text-center border border-border/30">
            <p className="text-lg font-bold text-neon-purple">{thisMonthGrowth}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">This Month</p>
          </div>
          <div className="bg-secondary/20 rounded-xl p-3 text-center border border-border/30">
            <p className="text-lg font-bold text-neon-magenta">{peakMonth.new}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Peak ({peakMonth.label})</p>
          </div>
          <div className="bg-secondary/20 rounded-xl p-3 text-center border border-border/30">
            <div className="flex items-center justify-center gap-1">
              <Target className="w-3 h-3 text-neon-blue" />
              <p className="text-lg font-bold text-neon-blue">{fansNeeded.toLocaleString()}</p>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">To Next Milestone</p>
          </div>
        </div>

        {/* Milestone Progress Bar */}
        <div className="bg-gradient-to-r from-neon-purple/10 to-neon-cyan/10 rounded-xl p-4 border border-neon-purple/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-neon-purple" />
              <span className="text-xs font-semibold text-muted-foreground">
                Progress to {nextMilestone.toLocaleString()} Fans
              </span>
            </div>
            <span className="text-xs font-bold text-neon-purple">{milestoneProgress}%</span>
          </div>
          <div className="h-3 bg-secondary/40 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-neon-purple via-neon-cyan to-neon-magenta rounded-full transition-all duration-700"
              style={{ width: `${milestoneProgress}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            {previousMilestone > 0 
              ? `${previousMilestone.toLocaleString()} → ${currentFans.toLocaleString()} → ${nextMilestone.toLocaleString()}`
              : `${currentFans.toLocaleString()} / ${nextMilestone.toLocaleString()}`
            }
          </p>
        </div>

        {/* Growth Chart */}
        {chartData.some(m => m.new > 0) ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="fanGrowthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 10, fill: '#64748b' }} 
                axisLine={false} 
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: '#64748b' }} 
                axisLine={false} 
                tickLine={false}
                allowDecimals={false}
                width={24}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="cumulative" 
                stroke="#06b6d4" 
                strokeWidth={2}
                fill="url(#fanGrowthGradient)" 
                dot={{ r: 3, fill: '#06b6d4', strokeWidth: 0 }} 
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-20 text-neon-cyan" />
            <p className="text-sm text-muted-foreground">No fans yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start building your fanbase to see growth trends
            </p>
          </div>
        )}
      </div>
    </GlassCard>
  );
}