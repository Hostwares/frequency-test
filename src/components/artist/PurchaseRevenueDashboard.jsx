import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  DollarSign, CalendarDays, Music2, Loader2, Trophy, TrendingUp,
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import DailyPurchasesChart from '@/components/artist/DailyPurchasesChart';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const monthLabel = (ym) => {
  if (!ym) return '';
  const [, m] = ym.split('-');
  return MONTH_NAMES[Number(m) - 1] || ym;
};

const dayLabel = (d) => {
  if (!d) return '';
  const [, m, dd] = d.split('-');
  return `${Number(m)}/${Number(dd)}`;
};

const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
};

export default function PurchaseRevenueDashboard({ artistProfileId }) {
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
        setError(e?.message || 'Failed to load');
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
      <GlassCard hover={false} className="p-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading revenue insights...
      </GlassCard>
    );
  }
  if (error || !data) {
    return (
      <GlassCard hover={false} className="p-4 text-sm text-muted-foreground">
        Couldn&apos;t load revenue insights right now.
      </GlassCard>
    );
  }

  const daily = data.revenueByDay || [];
  const monthly = data.revenueByMonth || [];
  const topSongs = data.topSongs || [];
  const countries = data.revenueByCountry || [];
  const conversionRate = Number(data.conversionRate || 0);
  const maxCountryRev = countries.reduce((mx, c) => Math.max(mx, c.revenue), 0);

  const todayRev = daily.length ? daily[daily.length - 1].revenue : 0;
  const monthRev = monthly.length ? monthly[monthly.length - 1].revenue : 0;
  const bestTrack = topSongs[0];
  const maxSongRev = topSongs.reduce((mx, s) => Math.max(mx, s.revenue), 0);

  const stats = [
    { label: 'Gross Revenue', value: `$${Number(data.grossRevenue).toFixed(2)}`, icon: DollarSign, color: 'text-neon-purple' },
    { label: 'Today', value: `$${Number(todayRev).toFixed(2)}`, icon: CalendarDays, color: 'text-neon-cyan' },
    { label: 'This Month', value: `$${Number(monthRev).toFixed(2)}`, icon: TrendingUp, color: 'text-neon-turquoise' },
    { label: 'Best Track', value: bestTrack ? bestTrack.title : '—', icon: Trophy, color: 'text-neon-magenta' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Music2 className="w-4 h-4 text-neon-cyan" />
        <h2 className="font-display font-semibold text-foreground">Purchase Revenue Insights</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <GlassCard key={s.label} hover={false} className="p-4">
            <s.icon className={`w-4 h-4 mb-2 ${s.color}`} />
            <p className="text-lg font-bold font-display leading-tight truncate">{s.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">{s.label}</p>
          </GlassCard>
        ))}
      </div>

      <GlassCard hover={false} className="p-5">
        <h3 className="text-sm font-semibold mb-4 text-foreground">Daily Revenue (Last 30 Days)</h3>
        <div className="h-56">
          {daily.some((d) => d.revenue > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id="dailyRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={dayLabel}
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                  interval={4}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => `$${v}`}
                />
                <RechartsTooltip
                  cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1 }}
                  contentStyle={tooltipStyle}
                  labelFormatter={dayLabel}
                  formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#dailyRev)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted-foreground h-full flex items-center justify-center">
              No sales in the last 30 days.
            </p>
          )}
        </div>
      </GlassCard>

      <DailyPurchasesChart daily={daily} />

      <GlassCard hover={false} className="p-5">
        <h3 className="text-sm font-semibold mb-4 text-foreground">Monthly Revenue</h3>
        <div className="h-56">
          {monthly.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v}`} />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={tooltipStyle}
                  labelFormatter={monthLabel}
                  formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted-foreground h-full flex items-center justify-center">
              No monthly data yet.
            </p>
          )}
        </div>
      </GlassCard>

      <GlassCard hover={false} className="p-5">
        <h3 className="text-sm font-semibold mb-4 text-foreground">Checkout Conversion</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold font-display text-neon-purple">{conversionRate}%</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">Conversion Rate</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-neon-cyan">{data.paidCheckouts || 0}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">Completed</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-neon-turquoise">{data.totalCheckouts || 0}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">Initiated</p>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          Conversion rate = completed song purchases &divide; initiated checkouts.
        </p>
      </GlassCard>

      <GlassCard hover={false} className="p-5">
        <h3 className="text-sm font-semibold mb-4 text-foreground">Revenue by Country</h3>
        {countries.length > 0 ? (
          <div className="space-y-3">
            {countries.map((c) => (
              <div key={c.country} className="flex items-center gap-3">
                <span className="text-sm w-32 truncate flex-shrink-0">{c.country}</span>
                <div className="flex-1">
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-gradient-neon rounded-full"
                      style={{ width: `${maxCountryRev ? (c.revenue / maxCountryRev) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-semibold text-neon-cyan w-16 text-right flex-shrink-0">
                  ${Number(c.revenue).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">
            No country data yet. Country is captured at checkout.
          </p>
        )}
      </GlassCard>

      <GlassCard hover={false} className="p-5">
        <h3 className="text-sm font-semibold mb-4 text-foreground">Top Performing Tracks</h3>
        {topSongs.length > 0 ? (
          <div className="space-y-3">
            {topSongs.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className={`w-5 text-sm font-bold flex-shrink-0 ${i === 0 ? 'text-neon-magenta' : 'text-muted-foreground'}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm truncate pr-2">{s.title}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {s.sales} {s.sales === 1 ? 'sale' : 'sales'}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-gradient-neon rounded-full"
                      style={{ width: `${maxSongRev ? (s.revenue / maxSongRev) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-semibold text-neon-cyan w-16 text-right flex-shrink-0">
                  ${Number(s.revenue).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">
            No track sales recorded yet.
          </p>
        )}
      </GlassCard>
    </div>
  );
}