import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { DollarSign, Music, ShoppingBag, Calendar } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const COLORS = {
  fanSupport: '#a855f7',
  merchSales: '#06b6d4',
  eventRevenue: '#d946ef',
};

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  const total = data.value;
  const percentage = ((data.value / (data.fanSupport + data.merchSales + data.eventRevenue)) * 100).toFixed(1);
  
  return (
    <div className="bg-card/95 backdrop-blur border border-border/60 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="font-semibold mb-2">{data.name}</p>
      <p className="text-muted-foreground">Amount: <span className="font-semibold text-foreground">${total.toFixed(2)}</span></p>
      <p className="text-muted-foreground">Percentage: <span className="font-semibold text-neon-cyan">{percentage}%</span></p>
    </div>
  );
}

export default function RevenueBreakdownChart({ artistProfileId }) {
  const now = new Date();
  const currentMonth = format(now, 'yyyy-MM');
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const { data: orders = [] } = useQuery({
    queryKey: ['artist-orders-revenue', artistProfileId],
    queryFn: () => base44.entities.Order.filter({ 
      artist_profile_id: artistProfileId, 
      payment_status: 'paid' 
    }),
    enabled: !!artistProfileId,
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['artist-allocations-current', artistProfileId],
    queryFn: () => base44.entities.SupportAllocation.filter({ 
      artist_profile_id: artistProfileId,
      is_active: true 
    }),
    enabled: !!artistProfileId,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['artist-events-revenue', artistProfileId],
    queryFn: () => base44.entities.Event.filter({ 
      artist_profile_id: artistProfileId 
    }),
    enabled: !!artistProfileId,
  });

  const revenueData = useMemo(() => {
    // Fan support for current month
    const fanSupport = allocations
      .filter(alloc => {
        const allocMonth = alloc.month || alloc.created_date?.slice(0, 7);
        return allocMonth === currentMonth;
      })
      .reduce((sum, alloc) => sum + (alloc.amount || 0), 0);

    // Merch sales for current month
    const merchSales = orders
      .filter(order => {
        const orderMonth = order.created_date?.slice(0, 7);
        return orderMonth === currentMonth;
      })
      .reduce((sum, order) => sum + (order.artist_earnings || 0), 0);

    // Event revenue for current month
    const eventRevenue = events
      .filter(event => {
        const eventMonth = event.date?.slice(0, 7);
        return eventMonth === currentMonth;
      })
      .reduce((sum, event) => sum + ((event.ticket_price || 0) * (event.attendee_count || 0)), 0);

    const total = fanSupport + merchSales + eventRevenue;

    return [
      { name: 'Fan Support', value: fanSupport, percentage: total > 0 ? ((fanSupport / total) * 100).toFixed(1) : 0 },
      { name: 'Merch Sales', value: merchSales, percentage: total > 0 ? ((merchSales / total) * 100).toFixed(1) : 0 },
      { name: 'Events', value: eventRevenue, percentage: total > 0 ? ((eventRevenue / total) * 100).toFixed(1) : 0 },
    ].filter(item => item.value > 0);
  }, [orders, allocations, events, currentMonth]);

  const totalRevenue = revenueData.reduce((sum, item) => sum + item.value, 0);

  if (revenueData.length === 0) {
    return (
      <GlassCard hover={false} className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20">
            <DollarSign className="w-5 h-5 text-neon-cyan" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-base">Revenue Breakdown</h2>
            <p className="text-xs text-muted-foreground">{format(now, 'MMMM yyyy')}</p>
          </div>
        </div>
        <div className="h-64 flex flex-col items-center justify-center text-center border border-dashed border-border/40 rounded-xl">
          <DollarSign className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No revenue this month</p>
          <p className="text-xs text-muted-foreground mt-1">Revenue will appear here once you start earning</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard hover={false} className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20">
            <DollarSign className="w-5 h-5 text-neon-cyan" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-base">Revenue Breakdown</h2>
            <p className="text-xs text-muted-foreground">{format(now, 'MMMM yyyy')}</p>
          </div>
        </div>
        <NeonBadge color="cyan">
          <DollarSign className="w-3 h-3 mr-1" />
          ${totalRevenue.toFixed(0)} total
        </NeonBadge>
      </div>

      <div className="flex items-center gap-8">
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={revenueData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {revenueData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.name === 'Fan Support' ? COLORS.fanSupport : entry.name === 'Merch Sales' ? COLORS.merchSales : COLORS.eventRevenue} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3 w-48">
          {revenueData.map((item) => (
            <div key={item.name} className="flex items-center gap-3">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.name === 'Fan Support' ? COLORS.fanSupport : item.name === 'Merch Sales' ? COLORS.merchSales : COLORS.eventRevenue }} 
              />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                  <span className="text-xs font-semibold">{item.percentage}%</span>
                </div>
                <p className="text-sm font-bold text-foreground">${item.value.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue Sources */}
      <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-border/30">
        <div className="text-center p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
          <Music className="w-4 h-4 text-neon-purple mx-auto mb-1" />
          <p className="text-[10px] text-muted-foreground">Fan Support</p>
          <p className="text-lg font-bold text-neon-purple">
            ${revenueData.find(r => r.name === 'Fan Support')?.value.toFixed(2) || '0.00'}
          </p>
        </div>
        <div className="text-center p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
          <ShoppingBag className="w-4 h-4 text-neon-cyan mx-auto mb-1" />
          <p className="text-[10px] text-muted-foreground">Merch Sales</p>
          <p className="text-lg font-bold text-neon-cyan">
            ${revenueData.find(r => r.name === 'Merch Sales')?.value.toFixed(2) || '0.00'}
          </p>
        </div>
        <div className="text-center p-3 rounded-lg bg-magenta-500/5 border border-magenta-500/20">
          <Calendar className="w-4 h-4 text-neon-magenta mx-auto mb-1" />
          <p className="text-[10px] text-muted-foreground">Events</p>
          <p className="text-lg font-bold text-neon-magenta">
            ${revenueData.find(r => r.name === 'Events')?.value.toFixed(2) || '0.00'}
          </p>
        </div>
      </div>
    </GlassCard>
  );
}