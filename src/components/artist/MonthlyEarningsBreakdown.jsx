import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { DollarSign, ShoppingBag, Calendar, Heart } from 'lucide-react';
import { format, subMonths, startOfMonth } from 'date-fns';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

function EarningsTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  const total = (data.merchSales || 0) + (data.eventRevenue || 0) + (data.fanSupport || 0);
  
  return (
    <div className="bg-card/95 backdrop-blur border border-border/60 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="text-muted-foreground mb-2 font-medium">{label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-neon-purple" />
            <span className="text-muted-foreground">Fan Support</span>
          </div>
          <span className="font-semibold text-neon-purple">${data.fanSupport?.toFixed(2) || '0.00'}</span>
        </div>
        <div className="flex items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-neon-cyan" />
            <span className="text-muted-foreground">Merch Sales</span>
          </div>
          <span className="font-semibold text-neon-cyan">${data.merchSales?.toFixed(2) || '0.00'}</span>
        </div>
        <div className="flex items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-neon-magenta" />
            <span className="text-muted-foreground">Events</span>
          </div>
          <span className="font-semibold text-neon-magenta">${data.eventRevenue?.toFixed(2) || '0.00'}</span>
        </div>
        <div className="border-t border-border/50 pt-1.5 mt-1.5">
          <div className="flex items-center justify-between gap-8">
            <span className="font-medium">Total</span>
            <span className="font-bold text-foreground">${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MonthlyEarningsBreakdown({ artistProfileId }) {
  const { data: orders = [] } = useQuery({
    queryKey: ['artist-orders-earnings', artistProfileId],
    queryFn: () => base44.entities.Order.filter({ artist_profile_id: artistProfileId, payment_status: 'paid' }),
    enabled: !!artistProfileId,
  });

  const { data: merchOrders = [] } = useQuery({
    queryKey: ['artist-merch-orders', artistProfileId],
    queryFn: () => base44.entities.Order.filter({ 
      artist_profile_id: artistProfileId, 
      payment_status: 'paid',
      items: { $exists: true }
    }),
    enabled: !!artistProfileId,
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['artist-allocations-earnings', artistProfileId],
    queryFn: () => base44.entities.SupportAllocation.filter({ artist_profile_id: artistProfileId, is_active: true }),
    enabled: !!artistProfileId,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['artist-events', artistProfileId],
    queryFn: () => base44.entities.Event.filter({ artist_profile_id: artistProfileId }),
    enabled: !!artistProfileId,
  });

  const chartData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = startOfMonth(subMonths(new Date(), 5 - i));
      return { key: format(d, 'yyyy-MM'), label: format(d, 'MMM yy') };
    });

    return months.map(({ key, label }) => {
      const monthOrders = merchOrders.filter(order => {
        const orderMonth = order.created_date?.slice(0, 7);
        return orderMonth === key;
      });
      const merchSales = monthOrders.reduce((sum, o) => sum + (o.artist_earnings || 0), 0);

      const monthAllocations = allocations.filter(alloc => {
        return alloc.month === key || (alloc.created_date?.slice(0, 7) === key);
      });
      const fanSupport = monthAllocations.reduce((sum, a) => sum + (a.amount || 0), 0);

      const monthEvents = events.filter(event => {
        const eventMonth = event.date?.slice(0, 7);
        return eventMonth === key;
      });
      const eventRevenue = monthEvents.reduce((sum, e) => sum + ((e.ticket_price || 0) * (e.attendee_count || 0)), 0);

      return {
        label,
        fanSupport,
        merchSales,
        eventRevenue,
        total: fanSupport + merchSales + eventRevenue,
      };
    });
  }, [merchOrders, allocations, events]);

  const totalEarnings = chartData.reduce((sum, m) => sum + m.total, 0);
  const totalFanSupport = chartData.reduce((sum, m) => sum + m.fanSupport, 0);
  const totalMerch = chartData.reduce((sum, m) => sum + m.merchSales, 0);
  const totalEvents = chartData.reduce((sum, m) => sum + m.eventRevenue, 0);

  return (
    <GlassCard hover={false} className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20">
            <DollarSign className="w-5 h-5 text-neon-cyan" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-base">Monthly Earnings Breakdown</h2>
            <p className="text-xs text-muted-foreground">Track your revenue streams</p>
          </div>
        </div>
        <NeonBadge color="cyan">
          <DollarSign className="w-3 h-3 mr-1" />
          ${totalEarnings.toFixed(0)} total
        </NeonBadge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <Heart className="w-5 h-5 text-neon-purple mb-2" />
          <p className="text-2xl font-bold text-neon-purple">${totalFanSupport.toFixed(0)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Fan Support</p>
        </div>
        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
          <ShoppingBag className="w-5 h-5 text-neon-cyan mb-2" />
          <p className="text-2xl font-bold text-neon-cyan">${totalMerch.toFixed(0)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Merch Sales</p>
        </div>
        <div className="p-4 rounded-xl bg-magenta-500/10 border border-magenta-500/20">
          <Calendar className="w-5 h-5 text-neon-magenta mb-2" />
          <p className="text-2xl font-bold text-neon-magenta">${totalEvents.toFixed(0)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Events</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.every(m => m.total === 0) ? (
        <div className="h-64 flex flex-col items-center justify-center text-center border border-dashed border-border/40 rounded-xl">
          <DollarSign className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No earnings yet</p>
          <p className="text-xs text-muted-foreground mt-1">Start selling and supporting to see your growth</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
            <Tooltip content={<EarningsTooltip />} />
            <Bar dataKey="fanSupport" stackId="a" fill="#a855f7" radius={[0, 0, 4, 4]} name="Fan Support" />
            <Bar dataKey="merchSales" stackId="a" fill="#06b6d4" name="Merch Sales" />
            <Bar dataKey="eventRevenue" stackId="a" fill="#d946ef" radius={[4, 4, 0, 0]} name="Events" />
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-neon-purple" />
          <span>Fan Support</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-neon-cyan" />
          <span>Merch Sales</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-neon-magenta" />
          <span>Events</span>
        </div>
      </div>
    </GlassCard>
  );
}