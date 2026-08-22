import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { ShoppingBag } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';

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

// New chart: daily song PURCHASE counts over the last 30 days as bars, so the
// busiest days are immediately visible. The peak day is highlighted; the
// tooltip also shows that day's revenue.
export default function DailyPurchasesChart({ daily = [] }) {
  const maxSales = daily.reduce((mx, d) => Math.max(mx, d.sales || 0), 0);
  const bestDay = daily.find((d) => (d.sales || 0) === maxSales && maxSales > 0);

  return (
    <GlassCard hover={false} className="p-5">
      <div className="flex items-center justify-between mb-1 gap-2">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-neon-cyan" />
          <h3 className="text-sm font-semibold text-foreground">Daily Song Purchases (Last 30 Days)</h3>
        </div>
        {bestDay && (
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
            Peak: {dayLabel(bestDay.date)} \u2014 {bestDay.sales} {bestDay.sales === 1 ? 'purchase' : 'purchases'}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Each bar is one day; taller bars mean more purchases. The busiest day is highlighted.
      </p>
      <div className="h-56">
        {maxSales > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={dayLabel}
                tick={{ fontSize: 10 }}
                stroke="hsl(var(--muted-foreground))"
                interval={4}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <RechartsTooltip
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={tooltipStyle}
                labelFormatter={dayLabel}
                formatter={(value, _name, props) => {
                  const row = props?.payload || {};
                  return [
                    [`${value} ${value === 1 ? 'purchase' : 'purchases'}`, 'Purchases'],
                    [`$${Number(row.revenue || 0).toFixed(2)}`, 'Revenue'],
                  ];
                }}
              />
              <Bar dataKey="sales" radius={[3, 3, 0, 0]}>
                {daily.map((d) => (
                  <Cell
                    key={d.date}
                    fill={(d.sales || 0) === maxSales ? 'hsl(var(--chart-3))' : 'hsl(var(--chart-2))'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs text-muted-foreground h-full flex items-center justify-center">
            No purchases in the last 30 days.
          </p>
        )}
      </div>
    </GlassCard>
  );
}