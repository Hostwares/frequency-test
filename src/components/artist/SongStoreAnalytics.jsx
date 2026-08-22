import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  ShoppingCart, DollarSign, TrendingUp, Users, Repeat, BarChart3, Music2, Loader2,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import GlassCard from '@/components/shared/GlassCard';

export default function SongStoreAnalytics({ artistProfileId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    base44.functions
      .invoke('getSongStoreAnalytics', { artist_profile_id: artistProfileId })
      .then((res) => {
        if (!active) return;
        setData(res.data);
        setError('');
      })
      .catch((e) => {
        if (!active) return;
        setError(e?.message || 'Failed to load analytics');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [artistProfileId]);

  if (loading) {
    return (
      <GlassCard hover={false} className="p-5 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading purchase analytics...
      </GlassCard>
    );
  }
  if (error) {
    return (
      <GlassCard hover={false} className="p-4 text-xs text-muted-foreground">
        Couldn&apos;t load analytics right now.
      </GlassCard>
    );
  }
  if (!data) return null;

  const stats = [
    { label: 'Total Song Sales', value: String(data.totalSales), icon: ShoppingCart, color: 'text-neon-cyan' },
    { label: 'Gross Revenue', value: `$${Number(data.grossRevenue).toFixed(2)}`, icon: DollarSign, color: 'text-neon-purple' },
    { label: 'Net Revenue', value: `$${Number(data.netRevenue).toFixed(2)}`, icon: TrendingUp, color: 'text-neon-turquoise' },
    { label: 'Avg. Purchase', value: `$${Number(data.avgPurchaseValue).toFixed(2)}`, icon: BarChart3, color: 'text-neon-blue' },
    { label: 'Unique Buyers', value: String(data.uniqueFans), icon: Users, color: 'text-neon-magenta' },
    { label: 'Repeat Purchasers', value: String(data.repeatPurchasers), icon: Repeat, color: 'text-neon-cyan' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Music2 className="w-4 h-4 text-neon-cyan" />
        <h3 className="font-display font-semibold text-sm">Purchase Analytics</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s) => (
          <GlassCard key={s.label} hover={false} className="p-3">
            <s.icon className={`w-4 h-4 mb-2 ${s.color}`} />
            <p className="text-lg font-bold font-display leading-none">{s.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">{s.label}</p>
          </GlassCard>
        ))}
      </div>

      {data.totalSales === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">
          No direct song sales yet. Once fans purchase your songs, analytics will appear here.
        </p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <GlassCard hover={false} className="p-4">
            <h4 className="text-xs font-semibold mb-3 uppercase tracking-wide text-muted-foreground">
              Best-Selling Songs
            </h4>
            <div className="space-y-2">
              {data.topSongs.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground w-4">{i + 1}</span>
                  <span className="flex-1 truncate">{s.title}</span>
                  <span className="text-muted-foreground text-xs">{s.sales}</span>
                  <span className="text-neon-cyan w-16 text-right text-xs">
                    ${Number(s.revenue).toFixed(2)}
                  </span>
                </div>
              ))}
              {data.topSongs.length === 0 && (
                <p className="text-xs text-muted-foreground">No song sales recorded yet.</p>
              )}
            </div>
          </GlassCard>

          <GlassCard hover={false} className="p-4">
            <h4 className="text-xs font-semibold mb-3 uppercase tracking-wide text-muted-foreground">
              Revenue by Month
            </h4>
            <div className="h-40">
              {data.revenueByMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.revenueByMonth} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <RechartsTooltip
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-muted-foreground h-full flex items-center justify-center">
                  No monthly data yet.
                </p>
              )}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}