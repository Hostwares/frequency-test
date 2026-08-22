import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, Users, Sparkles, Star, Activity } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 backdrop-blur border border-border/60 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-muted-foreground mb-1.5 font-medium">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="font-bold flex items-center gap-1.5" style={{ color: entry.color || entry.stroke }}>
          {entry.name === 'Resonance Score' && <Sparkles className="w-3 h-3" />}
          {entry.name === 'Fan Network' && <Users className="w-3 h-3" />}
          {entry.name}:
          <span className="ml-auto">
            {entry.name === 'Resonance Score' ? entry.value : entry.value?.toLocaleString()}
          </span>
        </p>
      ))}
    </div>
  );
}

export default function GrowthTrendsChart({ artistProfileId, supporters = [], resonanceScore = 0 }) {
  const { data: allAllocations = [] } = useQuery({
    queryKey: ['growth-trends-allocations', artistProfileId],
    queryFn: () => base44.entities.SupportAllocation.filter(
      { artist_profile_id: artistProfileId },
      '-created_date'
    ),
    enabled: !!artistProfileId,
  });

  const { data: songs = [] } = useQuery({
    queryKey: ['growth-trends-songs', artistProfileId],
    queryFn: () => base44.entities.Song.filter({ artist_profile_id: artistProfileId }),
    enabled: !!artistProfileId,
  });

  const songIds = useMemo(() => songs.map(s => s.id), [songs]);

  const { data: allRatings = [] } = useQuery({
    queryKey: ['growth-trends-ratings', artistProfileId],
    queryFn: async () => {
      const results = await Promise.all(
        songIds.map(id => base44.entities.SongRating.filter({ song_id: id }))
      );
      return results.flat();
    },
    enabled: songIds.length > 0,
  });

  const chartData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({
        key,
        label: MONTH_LABELS[d.getMonth()],
        newFans: 0,
        cumulativeFans: 0,
        cumulativeRatings: 0,
        resonanceScore: 0,
        monthlyRatingCount: 0,
      });
    }

    // Tally fan allocations by month
    allAllocations.forEach(alloc => {
      if (!alloc.created_date) return;
      const monthKey = alloc.created_date.slice(0, 7);
      const monthData = months.find(m => m.key === monthKey);
      if (monthData) monthData.newFans += 1;
    });

    // Tally ratings by month
    allRatings.forEach(rating => {
      if (!rating.created_date) return;
      const monthKey = rating.created_date.slice(0, 7);
      const monthData = months.find(m => m.key === monthKey);
      if (monthData) monthData.monthlyRatingCount += 1;
    });

    // Compute cumulative values and resonance score per month
    let cumulativeFans = 0;
    let cumulativeRatings = 0;
    const cutoffDate = new Date();

    months.forEach(month => {
      cumulativeFans += month.newFans;
      month.cumulativeFans = cumulativeFans;

      // Cumulative ratings up to end of this month
      const [year, mon] = month.key.split('-').map(Number);
      const monthEnd = new Date(year, mon, 0, 23, 59, 59);
      const ratingsUpTo = allRatings.filter(r => {
        if (!r.created_date) return false;
        return new Date(r.created_date) <= monthEnd;
      });
      cumulativeRatings = ratingsUpTo.length;
      month.cumulativeRatings = cumulativeRatings;

      // Resonance score: avg rating * log factor
      const avgRating = cumulativeRatings > 0
        ? ratingsUpTo.reduce((sum, r) => sum + (r.rating || 0), 0) / cumulativeRatings
        : 0;
      month.resonanceScore = Math.round(avgRating * 20 * (1 + Math.log10(cumulativeRatings + 1)));

      // For future months, don't show data yet
      if (monthEnd > cutoffDate) {
        month.cumulativeFans = null;
        month.resonanceScore = null;
      }
    });

    return months;
  }, [allAllocations, allRatings]);

  const currentFans = chartData.find(m => m.cumulativeFans !== null)?.cumulativeFans ?? 0;
  const lastMonthData = [...chartData].reverse().find(m => m.cumulativeFans !== null) || {};
  const prevMonthData = [...chartData].reverse().slice(1).find(m => m.cumulativeFans !== null) || {};

  const fanGrowth = (lastMonthData.cumulativeFans || 0) - (prevMonthData.cumulativeFans || 0);
  const currentResonance = lastMonthData.resonanceScore || 0;
  const prevResonance = prevMonthData.resonanceScore || 0;
  const resonanceChange = currentResonance - prevResonance;

  const hasData = allAllocations.length > 0 || allRatings.length > 0;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
      <GlassCard hover={false} className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-neon-magenta/10">
              <Activity className="w-4 h-4 text-neon-magenta" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-sm">Growth Trends</h2>
              <p className="text-[10px] text-muted-foreground">Resonance Score &amp; fan network · last 12 months</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NeonBadge color="purple">
              <Sparkles className="w-3 h-3 mr-0.5 inline" />
              {currentResonance}
            </NeonBadge>
            <NeonBadge color="cyan">
              <Users className="w-3 h-3 mr-0.5 inline" />
              {currentFans}
            </NeonBadge>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-secondary/20 rounded-xl p-3 border border-border/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-neon-purple" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Resonance</span>
              </div>
              <span className={`text-[10px] font-medium ${resonanceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {resonanceChange >= 0 ? '+' : ''}{resonanceChange}
              </span>
            </div>
            <p className="text-xl font-bold text-neon-purple mt-1">{currentResonance}</p>
            <p className="text-[10px] text-muted-foreground">
              {resonanceChange >= 0 ? 'Growing' : 'Declining'} vs last month
            </p>
          </div>

          <div className="bg-secondary/20 rounded-xl p-3 border border-border/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-neon-cyan" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Fan Network</span>
              </div>
              <span className={`text-[10px] font-medium ${fanGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {fanGrowth >= 0 ? '+' : ''}{fanGrowth}
              </span>
            </div>
            <p className="text-xl font-bold text-neon-cyan mt-1">{currentFans}</p>
            <p className="text-[10px] text-muted-foreground">
              {fanGrowth > 0 ? `+${fanGrowth} new` : 'No change'} this month
            </p>
          </div>
        </div>

        {/* Combined Chart */}
        {hasData ? (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="fanNetworkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="fans"
                tick={{ fontSize: 10, fill: '#06b6d4' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={32}
              />
              <YAxis
                yAxisId="resonance"
                orientation="right"
                tick={{ fontSize: 10, fill: '#a855f7' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={32}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                iconType="circle"
              />
              <Area
                yAxisId="fans"
                type="monotone"
                dataKey="cumulativeFans"
                name="Fan Network"
                stroke="#06b6d4"
                strokeWidth={2}
                fill="url(#fanNetworkGrad)"
                connectNulls
                dot={{ r: 3, fill: '#06b6d4', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="resonance"
                type="monotone"
                dataKey="resonanceScore"
                name="Resonance Score"
                stroke="#a855f7"
                strokeWidth={2.5}
                connectNulls
                dot={{ r: 3, fill: '#a855f7', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12">
            <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-20 text-neon-purple" />
            <p className="text-xs text-muted-foreground">No trend data yet</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Charts will appear as you gain supporters and ratings
            </p>
          </div>
        )}

        {/* Legend hint */}
        {hasData && (
          <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-border/30">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-neon-cyan" />
              <span className="text-[10px] text-muted-foreground">Fan Network (cumulative)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-neon-purple" />
              <span className="text-[10px] text-muted-foreground">Resonance Score</span>
            </div>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}