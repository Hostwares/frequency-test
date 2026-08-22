import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Activity, Loader2 } from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { buildResonanceTrajectory, DEFAULT_MONTHS_BACK } from '@/lib/resonanceTrend';

// Compares the artist's monthly Resonance Score trajectory against their total
// direct song sales per month — showing how community engagement and purchases
// move together.
export default function ResonanceVsSalesChart({ artistProfileId, currentResonanceScore = 0 }) {
  const { data: supporters = [] } = useQuery({
    queryKey: ['resonance-trend-supporters', artistProfileId],
    queryFn: () =>
      base44.entities.SupportAllocation.filter(
        { artist_profile_id: artistProfileId },
        '-created_date',
        500
      ),
    enabled: !!artistProfileId,
  });

  const { data: ratings = [] } = useQuery({
    queryKey: ['resonance-trend-ratings', artistProfileId],
    queryFn: () =>
      base44.entities.SongRating.filter(
        { artist_profile_id: artistProfileId },
        '-created_date',
        500
      ),
    enabled: !!artistProfileId,
  });

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    base44.functions
      .invoke('getSongStoreAnalytics', { artist_profile_id: artistProfileId })
      .then((res) => {
        if (!active) return;
        setAnalytics(res.data);
        setError('');
      })
      .catch((e) => {
        if (!active) return;
        setError(e?.message || 'Failed to load');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [artistProfileId]);

  const chartData = useMemo(() => {
    const trajectory = buildResonanceTrajectory({
      supporters,
      ratings,
      currentResonanceScore,
      monthsBack: DEFAULT_MONTHS_BACK,
    });
    const salesByMonth = analytics?.salesByMonth || [];
    const salesMap = {};
    for (const s of salesByMonth) salesMap[s.month] = s.sales || 0;
    return trajectory.map((m) => ({
      month: m.month,
      resonance_score: m.resonance_score,
      song_sales: salesMap[m.month_key] || 0,
    }));
  }, [supporters, ratings, currentResonanceScore, analytics]);

  const totalSales = chartData.reduce((s, m) => s + m.song_sales, 0);
  const latestRes = chartData[chartData.length - 1]?.resonance_score || 0;
  const firstRes = chartData[0]?.resonance_score || 0;
  const resChange = latestRes - firstRes;

  return (
    <GlassCard hover={false} className="p-6">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-neon-purple/10 border border-neon-purple/20">
            <Activity className="w-5 h-5 text-neon-purple" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-base">Resonance vs. Song Sales</h2>
            <p className="text-xs text-muted-foreground">
              Last {DEFAULT_MONTHS_BACK} months · monthly Resonance Score vs. total songs sold
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <NeonBadge color="magenta">
            {resChange >= 0 ? '+' : ''}
            {resChange} resonance
          </NeonBadge>
          <NeonBadge color="cyan">{totalSales} sales</NeonBadge>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading...
        </div>
      ) : error ? (
        <p className="text-xs text-muted-foreground text-center py-8">
          Couldn&apos;t load sales data right now.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="resonance"
              tick={{ fontSize: 10, fill: '#d946ef' }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <YAxis
              yAxisId="sales"
              orientation="right"
              tick={{ fontSize: 10, fill: '#06b6d4' }}
              axisLine={false}
              tickLine={false}
              width={36}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value, name) => {
                if (name === 'resonance_score') return [value, 'Resonance Score'];
                if (name === 'song_sales') return [value, 'Songs Sold'];
                return [value, name];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              formatter={(value) =>
                value === 'resonance_score'
                  ? 'Resonance Score'
                  : value === 'song_sales'
                  ? 'Songs Sold'
                  : value
              }
            />
            <Bar yAxisId="sales" dataKey="song_sales" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={22} />
            <Line
              yAxisId="resonance"
              type="monotone"
              dataKey="resonance_score"
              stroke="#d946ef"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#d946ef', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      <div className="mt-4 pt-4 border-t border-border/30">
        <p className="text-xs text-muted-foreground">
          {totalSales > 0
            ? `You sold ${totalSales} songs over the last ${DEFAULT_MONTHS_BACK} months while your Resonance Score ${resChange >= 0 ? 'grew' : 'changed'} by ${resChange >= 0 ? '+' : ''}${resChange}. Direct sales and community engagement move together — keep both growing.`
            : `No direct song sales recorded yet. Resonance Score is estimated from community engagement (supporters and ratings).`}
        </p>
      </div>
    </GlassCard>
  );
}