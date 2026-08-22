import React, { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { format, subMonths, startOfMonth } from 'date-fns';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 backdrop-blur border border-border/60 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="text-muted-foreground mb-1 font-medium">{label}</p>
      <p className="text-neon-purple font-bold text-sm">{payload[0]?.value} subscriber{payload[0]?.value !== 1 ? 's' : ''}</p>
    </div>
  );
}

/**
 * Generic subscriber growth chart.
 * Pass `allocations` — array of SupportAllocation records.
 * Pass `label` — e.g. "Your Supporters" or "Your Subscriptions"
 */
export default function SubscriberGrowthChart({ allocations = [], label = 'Subscriber Growth', color = '#a855f7', fillId = 'gradPurple' }) {
  const chartData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = startOfMonth(subMonths(new Date(), 5 - i));
      return { key: format(d, 'yyyy-MM'), label: format(d, 'MMM yy') };
    });

    let cumulative = 0;
    return months.map(({ key, labelStr = format(new Date(key + '-01'), 'MMM yy'), ...rest }) => {
      const monthLabel = rest.label;
      const count = allocations.filter(a => {
        const m = a.month || (a.created_date ? a.created_date.slice(0, 7) : null);
        return m === key;
      }).length;
      cumulative += count;
      return { label: monthLabel, new: count, cumulative };
    });
  }, [allocations]);

  const total = allocations.length;
  const thisMonth = chartData[chartData.length - 1]?.new ?? 0;
  const prev = chartData[chartData.length - 2]?.cumulative ?? 0;
  const growth = total - prev;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" style={{ color }} />
          <h2 className="font-display font-semibold text-sm">{label}</h2>
        </div>
        {growth > 0 && (
          <span className="text-xs font-medium flex items-center gap-1" style={{ color }}>
            <TrendingUp className="w-3 h-3" /> +{growth} this month
          </span>
        )}
      </div>

      {/* Pills */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { l: 'Total', v: total },
          { l: 'This Month', v: thisMonth },
          { l: 'Peak Month', v: Math.max(...chartData.map(d => d.new), 0) },
        ].map(({ l, v }) => (
          <div key={l} className="bg-secondary/20 rounded-xl p-3 text-center border border-border/30">
            <p className="text-base font-bold" style={{ color }}>{v}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{l}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey="cumulative" stroke={color} strokeWidth={2}
            fill={`url(#${fillId})`} dot={{ r: 3, fill: color, strokeWidth: 0 }} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}