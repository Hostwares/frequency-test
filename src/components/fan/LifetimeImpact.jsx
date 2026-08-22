import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  DollarSign, Calendar, TrendingUp, Users, Award, Heart,
  Music, Star, Zap
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts';

const NEON_COLORS = ['#a855f7', '#06b6d4', '#d946ef', '#3b82f6', '#14b8a6'];

function ImpactStat({ icon: Icon, label, value, subtext, color }) {
  return (
    <GlassCard hover={false} className="p-4 text-center">
      <Icon className={`w-5 h-5 mx-auto mb-2 ${color}`} />
      <p className={`text-2xl font-display font-bold ${color}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
      {subtext && <p className="text-[10px] text-muted-foreground/70 mt-1">{subtext}</p>}
    </GlassCard>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/50 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function LifetimeImpact({ userId }) {
  // Fetch all support allocations (active and historical)
  const { data: allAllocations = [] } = useQuery({
    queryKey: ['user-all-allocations', userId],
    queryFn: () => base44.entities.SupportAllocation.filter({ fan_user_id: userId }, '-created_date', 200),
    enabled: !!userId,
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!allAllocations.length) return null;

    const totalContributed = allAllocations.reduce((sum, a) => sum + (a.amount || 0), 0);
    const uniqueMonths = new Set(allAllocations.map(a => a.month).filter(Boolean)).size;
    const uniqueArtists = new Set(allAllocations.map(a => a.artist_profile_id)).size;
    const avgMonthly = uniqueMonths > 0 ? totalContributed / uniqueMonths : 0;
    
    const activeAllocations = allAllocations.filter(a => a.is_active);
    const currentMonthly = activeAllocations.reduce((sum, a) => sum + (a.amount || 0), 0);
    
    const tierCounts = {};
    activeAllocations.forEach(a => {
      tierCounts[a.tier] = (tierCounts[a.tier] || 0) + 1;
    });
    
    const topArtist = allAllocations.reduce((top, a) => {
      const count = allAllocations.filter(x => x.artist_profile_id === a.artist_profile_id).length;
      return count > (top.count || 0) ? { name: a.artist_name, count } : top;
    }, { name: '', count: 0 });

    return {
      totalContributed,
      uniqueMonths,
      uniqueArtists,
      avgMonthly,
      currentMonthly,
      activeCount: activeAllocations.length,
      tierCounts,
      topArtist,
    };
  }, [allAllocations]);

  // Tier breakdown pie chart data
  const tierData = useMemo(() => {
    if (!metrics?.tierCounts) return [];
    return Object.entries(metrics.tierCounts).map(([tier, count]) => ({
      name: tier.charAt(0).toUpperCase() + tier.slice(1),
      value: count,
    }));
  }, [metrics]);

  // Monthly contribution trend (last 6 months)
  const monthlyData = useMemo(() => {
    if (!allAllocations.length) return [];
    const byMonth = {};
    allAllocations.forEach(a => {
      if (a.month) {
        byMonth[a.month] = (byMonth[a.month] || 0) + (a.amount || 0);
      }
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 6)
      .reverse()
      .map(([month, amount]) => ({
        month: month.slice(5),
        amount: parseFloat(amount.toFixed(2)),
      }));
  }, [allAllocations]);

  if (!metrics || allAllocations.length === 0) {
    return (
      <GlassCard hover={false} className="p-8 text-center">
        <Heart className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm font-semibold text-foreground mb-1">No Impact Data Yet</p>
        <p className="text-xs text-muted-foreground">Start supporting artists to see your lifetime impact!</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard hover={false} className="p-6 border border-neon-purple/20">
      <div className="flex items-center gap-2 mb-6">
        <Award className="w-5 h-5 text-neon-magenta" />
        <h2 className="font-display font-semibold text-lg">Lifetime Impact</h2>
        <NeonBadge color="magenta">{metrics.uniqueMonths} months</NeonBadge>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <ImpactStat
          icon={DollarSign}
          label="Total Contributed"
          value={`$${metrics.totalContributed.toFixed(0)}`}
          subtext="Lifetime"
          color="text-neon-purple"
        />
        <ImpactStat
          icon={Users}
          label="Artists Supported"
          value={metrics.uniqueArtists}
          subtext="Unique"
          color="text-neon-cyan"
        />
        <ImpactStat
          icon={Calendar}
          label="Months Active"
          value={metrics.uniqueMonths}
          subtext="Supporting"
          color="text-neon-magenta"
        />
        <ImpactStat
          icon={TrendingUp}
          label="Avg Monthly"
          value={`$${metrics.avgMonthly.toFixed(0)}`}
          subtext="Per month"
          color="text-neon-blue"
        />
        <ImpactStat
          icon={Heart}
          label="Current Support"
          value={`$${metrics.currentMonthly.toFixed(0)}`}
          subtext={`${metrics.activeCount} artists`}
          color="text-neon-turquoise"
        />
        <ImpactStat
          icon={Star}
          label="Top Artist"
          value={metrics.topArtist.name?.split(' ')[0] || 'N/A'}
          subtext={`${metrics.topArtist.count || 0} months`}
          color="text-neon-magenta"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly trend */}
        {monthlyData.length > 1 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-neon-cyan" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monthly Contribution Trend</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#888' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#888' }} tickLine={false} axisLine={false} width={40} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="amount" name="Support ($)" radius={[4, 4, 0, 0]}>
                  {monthlyData.map((_, i) => (
                    <Cell key={i} fill={NEON_COLORS[i % NEON_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tier distribution */}
        {tierData.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Music className="w-4 h-4 text-neon-purple" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Support Tier Distribution</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={tierData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {tierData.map((_, i) => (
                    <Cell key={i} fill={NEON_COLORS[i % NEON_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Milestone callout */}
      <div className="mt-6 p-4 bg-gradient-to-r from-neon-purple/10 via-neon-cyan/10 to-neon-magenta/10 rounded-lg border border-neon-purple/20">
        <div className="flex items-start gap-3">
          <Award className="w-5 h-5 text-neon-purple mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">Your Impact Matters</p>
            <p className="text-xs text-muted-foreground mt-1">
              You've supported <span className="text-neon-cyan font-semibold">{metrics.uniqueArtists} artists</span> over <span className="text-neon-magenta font-semibold">{metrics.uniqueMonths} months</span>, 
              contributing <span className="text-neon-purple font-semibold">${metrics.totalContributed.toFixed(0)}</span> directly to the music you love.
            </p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}