import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { TrendingUp, Sparkles, Users, Star, Activity } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

import { buildResonanceTrajectory, DEFAULT_MONTHS_BACK as MONTHS_BACK } from '@/lib/resonanceTrend';

export default function ResonanceScoreTrend({ artistProfileId, currentResonanceScore = 0 }) {
  const { data: supporters = [] } = useQuery({
    queryKey: ['resonance-trend-supporters', artistProfileId],
    queryFn: () => base44.entities.SupportAllocation.filter({ artist_profile_id: artistProfileId }, '-created_date', 500),
    enabled: !!artistProfileId,
  });

  const { data: ratings = [] } = useQuery({
    queryKey: ['resonance-trend-ratings', artistProfileId],
    queryFn: () => base44.entities.SongRating.filter({ artist_profile_id: artistProfileId }, '-created_date', 500),
    enabled: !!artistProfileId,
  });

  const { data: songs = [] } = useQuery({
    queryKey: ['resonance-trend-songs', artistProfileId],
    queryFn: () => base44.entities.Song.filter({ artist_profile_id: artistProfileId }, '-play_count', 50),
    enabled: !!artistProfileId,
  });

  const chartData = useMemo(
    () =>
      buildResonanceTrajectory({
        supporters,
        ratings,
        currentResonanceScore,
        monthsBack: MONTHS_BACK,
      }),
    [supporters, ratings, currentResonanceScore]
  );

  const latest = chartData[chartData.length - 1]?.resonance_score || 0;
  const first = chartData[0]?.resonance_score || 0;
  const change = latest - first;
  const changePct = first > 0 ? ((change / first) * 100).toFixed(1) : '0.0';

  const totalNewSupporters = chartData.reduce((sum, m) => {
    const prev = chartData[chartData.indexOf(m) - 1]?.active_supporters ?? 0;
    return sum + Math.max(0, m.active_supporters - prev);
  }, 0);
  const totalRatings = chartData.reduce((sum, m) => sum + m.new_ratings, 0);
  const peakMonth = chartData.reduce((max, m) => (m.resonance_score > max.resonance_score ? m : max), chartData[0]);

  return (
    <GlassCard hover={false} className="p-6">
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-neon-magenta/10 border border-neon-magenta/20">
            <Activity className="w-5 h-5 text-neon-magenta" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-base">Resonance Score Trend</h2>
            <p className="text-xs text-muted-foreground">Last {MONTHS_BACK} months · community engagement growth</p>
          </div>
        </div>
        <NeonBadge color="magenta">
          <Sparkles className="w-3 h-3 mr-1" />
          {latest}
        </NeonBadge>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="p-3 rounded-xl bg-secondary/20 border border-border/30">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className={`w-3.5 h-3.5 ${change >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            <span className="text-xs text-muted-foreground">6-Month Change</span>
          </div>
          <p className={`text-xl font-bold ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {change >= 0 ? '+' : ''}{change}
          </p>
          <p className={`text-xs ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {change >= 0 ? '+' : ''}{changePct}%
          </p>
        </div>
        <div className="p-3 rounded-xl bg-secondary/20 border border-border/30">
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-neon-cyan" />
            <span className="text-xs text-muted-foreground">Active Supporters</span>
          </div>
          <p className="text-xl font-bold text-neon-cyan">
            {chartData[chartData.length - 1]?.active_supporters || 0}
          </p>
          <p className="text-xs text-muted-foreground">Now</p>
        </div>
        <div className="p-3 rounded-xl bg-secondary/20 border border-border/30">
          <div className="flex items-center gap-1.5 mb-1">
            <Star className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs text-muted-foreground">Ratings (6mo)</span>
          </div>
          <p className="text-xl font-bold text-yellow-400">{totalRatings}</p>
          <p className="text-xs text-muted-foreground">{totalNewSupporters} new supporters</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="resonanceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#d946ef" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#d946ef" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
            formatter={(value, name) => {
              if (name === 'resonance_score') return [value, 'Resonance Score'];
              return [value, name];
            }}
          />
          <Area
            type="monotone"
            dataKey="resonance_score"
            stroke="#d946ef"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#resonanceGrad)"
            dot={{ r: 3, fill: '#d946ef', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-4 pt-4 border-t border-border/30">
        <p className="text-xs text-muted-foreground">
          {change > 0
            ? `Your Resonance Score grew ${changePct}% over the last ${MONTHS_BACK} months — peaking at ${peakMonth.resonance_score} in ${peakMonth.month}. Keep engaging your community to climb higher.`
            : change < 0
              ? `Your Resonance Score dipped ${Math.abs(changePct)}% over the last ${MONTHS_BACK} months. Try releasing new music or messaging supporters to re-engage your community.`
              : `Your Resonance Score has held steady at ${latest} over the last ${MONTHS_BACK} months. New supporters and ratings will push it higher.`}
        </p>
      </div>
    </GlassCard>
  );
}