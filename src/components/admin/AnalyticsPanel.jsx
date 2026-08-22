import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Users, Music, DollarSign, TrendingUp, Headphones, MessageSquare,
  Radio, ShoppingBag, Calendar, BarChart3, Loader2
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';

const CHART_COLORS = ['#a855f7', '#06b6d4', '#d946ef', '#3b82f6', '#14b8a6'];

export default function AnalyticsPanel() {
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users-analytics'],
    queryFn: () => base44.entities.User.list('-created_date', 200),
  });

  const { data: songs = [] } = useQuery({
    queryKey: ['admin-songs-analytics'],
    queryFn: () => base44.entities.Song.list('-created_date', 200),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['admin-orders-analytics'],
    queryFn: () => base44.entities.Order.filter({ payment_status: 'paid' }, '-created_date', 200),
  });

  const { data: communities = [] } = useQuery({
    queryKey: ['admin-communities-analytics'],
    queryFn: () => base44.entities.FrequencyCommunity.list('-created_date', 200),
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['admin-allocations-analytics'],
    queryFn: () => base44.entities.SupportAllocation.filter({ is_active: true }),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['admin-events-analytics'],
    queryFn: () => base44.entities.Event.list('-created_date', 100),
  });

  // User growth chart (30 days)
  const userGrowthData = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = startOfDay(subDays(new Date(), 29 - i));
      return { key: format(d, 'yyyy-MM-dd'), label: format(d, 'MMM d'), count: 0, cumulative: 0 };
    });
    users.forEach(u => {
      const key = u.created_date?.slice(0, 10);
      const day = days.find(dd => dd.key === key);
      if (day) day.count += 1;
    });
    let cum = 0;
    days.forEach(d => { cum += d.count; d.cumulative = cum; });
    return days;
  }, [users]);

  // Revenue by payment type
  const revenueByType = useMemo(() => {
    const types = {};
    orders.forEach(o => {
      const pt = o.payment_type || 'merch';
      if (!types[pt]) types[pt] = { name: pt.replace(/_/g, ' '), value: 0 };
      types[pt].value += o.total || 0;
    });
    return Object.values(types);
  }, [orders]);

  // Revenue trend (14 days)
  const revenueTrend = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = startOfDay(subDays(new Date(), 13 - i));
      return { key: format(d, 'yyyy-MM-dd'), label: format(d, 'MMM d'), revenue: 0, orders: 0 };
    });
    orders.forEach(o => {
      const key = o.created_date?.slice(0, 10);
      const day = days.find(dd => dd.key === key);
      if (day) { day.revenue += o.total || 0; day.orders += 1; }
    });
    return days;
  }, [orders]);

  // Genre distribution
  const genreDistribution = useMemo(() => {
    const genres = {};
    songs.forEach(s => {
      const g = s.genre || 'Unknown';
      genres[g] = (genres[g] || 0) + 1;
    });
    return Object.entries(genres)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [songs]);

  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const totalPlays = songs.reduce((s, song) => s + (song.play_count || 0), 0);
  const activeSupport = allocations.reduce((s, a) => s + (a.amount || 0), 0);

  const stats = [
    { icon: Users, label: 'Total Users', value: users.length, color: 'text-neon-cyan' },
    { icon: Music, label: 'Total Songs', value: songs.length, color: 'text-neon-purple' },
    { icon: DollarSign, label: 'Total Revenue', value: `$${totalRevenue.toFixed(0)}`, color: 'text-neon-turquoise' },
    { icon: Headphones, label: 'Total Plays', value: totalPlays.toLocaleString(), color: 'text-neon-magenta' },
    { icon: MessageSquare, label: 'Communities', value: communities.length, color: 'text-neon-blue' },
    { icon: DollarSign, label: 'Active Support/mo', value: `$${activeSupport.toFixed(0)}`, color: 'text-neon-turquoise' },
    { icon: Calendar, label: 'Events', value: events.length, color: 'text-neon-cyan' },
    { icon: TrendingUp, label: 'Avg Order Value', value: orders.length > 0 ? `$${(totalRevenue / orders.length).toFixed(2)}` : '$0', color: 'text-neon-purple' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(({ icon: Icon, label, value, color }) => (
          <GlassCard key={label} hover={false} className="p-4">
            <Icon className={`w-4 h-4 ${color} mb-1`} />
            <p className={`text-lg font-bold font-display ${color}`}>{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </GlassCard>
        ))}
      </div>

      {/* User Growth Chart */}
      <GlassCard hover={false} className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-neon-cyan" />
          <h3 className="font-display font-semibold text-sm">User Growth (30 Days)</h3>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={userGrowthData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} interval={4} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={28} />
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
            <Area type="monotone" dataKey="cumulative" stroke="#06b6d4" strokeWidth={2} fill="url(#userGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </GlassCard>

      {/* Revenue Trend + Revenue by Type */}
      <div className="grid md:grid-cols-2 gap-4">
        <GlassCard hover={false} className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4 text-neon-turquoise" />
            <h3 className="font-display font-semibold text-sm">Revenue Trend (14 Days)</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} width={36} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} formatter={v => `$${v.toFixed(2)}`} />
              <Bar dataKey="revenue" fill="#14b8a6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard hover={false} className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-neon-purple" />
            <h3 className="font-display font-semibold text-sm">Revenue by Type</h3>
          </div>
          {revenueByType.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={revenueByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                  {revenueByType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} formatter={v => `$${v.toFixed(2)}`} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-xs text-muted-foreground">No revenue data yet</p>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Genre Distribution */}
      <GlassCard hover={false} className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Music className="w-4 h-4 text-neon-magenta" />
          <h3 className="font-display font-semibold text-sm">Genre Distribution</h3>
        </div>
        {genreDistribution.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={genreDistribution} layout="vertical" margin={{ top: 0, right: 16, left: 60, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={60} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="value" fill="#d946ef" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[180px] flex items-center justify-center">
            <p className="text-xs text-muted-foreground">No genre data yet</p>
          </div>
        )}
      </GlassCard>
    </div>
  );
}