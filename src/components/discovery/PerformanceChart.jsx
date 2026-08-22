import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { TrendingUp, DollarSign, Award, Calendar } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ComposedChart, Bar, Cell
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/50 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }} className="flex items-center gap-1">
          {p.name}: {p.dataKey === 'gratitudePayments' ? `$${p.value}` : p.value}
        </p>
      ))}
    </div>
  );
};

export default function PerformanceChart({ partnerId }) {
  // Fetch gratitude payments received by this partner
  const { data: allPayments = [] } = useQuery({
    queryKey: ['dp-gratitude-payments', partnerId],
    queryFn: () => base44.entities.PartnerGratitudePayment.filter({ 
      discovery_partner_id: partnerId,
      status: 'completed'
    }, '-payment_date'),
    enabled: !!partnerId,
  });

  // Fetch artist profiles to get milestone data
  const { data: allArtists = [] } = useQuery({
    queryKey: ['dp-artist-milestones'],
    queryFn: () => base44.entities.ArtistProfile.list(),
  });

  // Calculate last 12 months data
  const chartData = useMemo(() => {
    const now = new Date();
    const months = [];
    
    // Generate last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
      const monthLabel = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      months.push({ month: monthKey, label: monthLabel, milestones: 0, gratitudePayments: 0 });
    }

    // Count gratitude payments by month
    allPayments.forEach(payment => {
      const paymentMonth = payment.payment_date?.slice(0, 7);
      const monthData = months.find(m => m.month === paymentMonth);
      if (monthData) {
        monthData.gratitudePayments += payment.amount || 0;
      }
    });

    // Count artist milestones reached by month (based on payment_date as proxy for milestone achievement)
    allPayments.forEach(payment => {
      const paymentMonth = payment.payment_date?.slice(0, 7);
      const monthData = months.find(m => m.month === paymentMonth);
      if (monthData) {
        monthData.milestones += 1;
      }
    });

    return months;
  }, [allPayments]);

  // Calculate totals
  const totalMilestones = allPayments.length;
  const totalGratitude = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const avgPayment = totalMilestones > 0 ? totalGratitude / totalMilestones : 0;

  // Get milestone breakdown
  const milestoneBreakdown = useMemo(() => {
    const breakdown = {};
    allPayments.forEach(p => {
      breakdown[p.milestone_trigger] = (breakdown[p.milestone_trigger] || 0) + 1;
    });
    return breakdown;
  }, [allPayments]);

  const milestoneLabels = {
    '20k_fans': '🎯 20k Fans',
    '30k_fans': '⭐ 30k Fans',
    '40k_fans': '🚀 40k Fans',
    '50k_fans': '🏆 50k Fans',
    '60k_fans': '👑 60k Fans',
    'custom': '✨ Custom',
  };

  if (!partnerId) {
    return (
      <GlassCard className="p-6">
        <p className="text-sm text-muted-foreground text-center">No partner profile found</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <GlassCard hover={false} className="p-4 text-center">
          <Award className="w-5 h-5 mx-auto mb-1.5 text-neon-magenta" />
          <p className="text-2xl font-display font-bold text-neon-magenta">{totalMilestones}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Milestones Reached</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center">
          <DollarSign className="w-5 h-5 mx-auto mb-1.5 text-neon-cyan" />
          <p className="text-2xl font-display font-bold text-neon-cyan">${totalGratitude.toFixed(0)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Total Gratitude</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center">
          <TrendingUp className="w-5 h-5 mx-auto mb-1.5 text-neon-purple" />
          <p className="text-2xl font-display font-bold text-neon-purple">${avgPayment.toFixed(0)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Avg Payment</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center">
          <Calendar className="w-5 h-5 mx-auto mb-1.5 text-neon-blue" />
          <p className="text-2xl font-display font-bold text-neon-blue">{Object.keys(milestoneBreakdown).length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Milestone Types</p>
        </GlassCard>
      </div>

      {/* Main Chart */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-neon-purple" />
            <div>
              <p className="font-display font-semibold text-sm">12-Month Performance</p>
              <p className="text-[11px] text-muted-foreground">Milestones reached & gratitude payments</p>
            </div>
          </div>
          <div className="flex gap-2">
            <NeonBadge color="magenta">{totalMilestones} milestones</NeonBadge>
            <NeonBadge color="cyan">${totalGratitude.toFixed(0)}</NeonBadge>
          </div>
        </div>

        {chartData.some(m => m.milestones > 0 || m.gratitudePayments > 0) ? (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 10, fill: '#888' }} 
                tickLine={false} 
                axisLine={false}
              />
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 10, fill: '#888' }} 
                tickLine={false} 
                axisLine={false}
                width={24}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10, fill: '#888' }} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                yAxisId="left"
                dataKey="milestones" 
                name="Milestones" 
                radius={[4, 4, 0, 0]}
                barSize={20}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill="#d946ef" />
                ))}
              </Bar>
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="gratitudePayments" 
                name="Gratitude ($)"
                stroke="#06b6d4" 
                strokeWidth={2}
                dot={{ fill: '#06b6d4', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12">
            <Award className="w-12 h-12 mx-auto mb-3 opacity-20 text-neon-magenta" />
            <p className="text-sm text-muted-foreground">No milestone data yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              When artists you've supported reach milestones, you'll receive gratitude payments
            </p>
          </div>
        )}
      </GlassCard>

      {/* Milestone Breakdown */}
      {Object.keys(milestoneBreakdown).length > 0 && (
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-neon-magenta" />
            <p className="font-display font-semibold text-sm">Milestone Breakdown</p>
          </div>
          <div className="space-y-3">
            {Object.entries(milestoneBreakdown).map(([milestone, count]) => {
              const percentage = Math.round((count / totalMilestones) * 100);
              return (
                <div key={milestone}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{milestoneLabels[milestone] || milestone}</span>
                    <span className="font-medium">{count} ({percentage}%)</span>
                  </div>
                  <div className="h-2 bg-secondary/40 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-neon-magenta to-neon-purple rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}
    </div>
  );
}