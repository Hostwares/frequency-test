import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { DollarSign, TrendingUp, Clock, CheckCircle, AlertCircle, Wallet, CreditCard, Bell, BellOff, Download } from 'lucide-react';
import { format, subMonths, startOfMonth } from 'date-fns';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

// Payout status badge
function PayoutStatusBadge({ status }) {
  const styles = {
    pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    processing: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    completed: 'bg-green-500/10 text-green-500 border-green-500/20',
    failed: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  const icons = {
    pending: <Clock className="w-3 h-3 mr-1" />,
    processing: <TrendingUp className="w-3 h-3 mr-1" />,
    completed: <CheckCircle className="w-3 h-3 mr-1" />,
    failed: <AlertCircle className="w-3 h-3 mr-1" />,
  };

  return (
    <NeonBadge className={styles[status] || styles.pending}>
      {icons[status]}
      {status?.replace('_', ' ')}
    </NeonBadge>
  );
}

// Custom tooltip for charts
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  
  return (
    <div className="bg-card/95 backdrop-blur border border-border/60 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="text-muted-foreground mb-2 font-medium">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center justify-between gap-8 mb-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}</span>
          </div>
          <span className="font-semibold text-foreground">${entry.value?.toFixed(2) || '0.00'}</span>
        </div>
      ))}
    </div>
  );
}

export default function EarningsReportDashboard({ artistProfileId, userId }) {
  const queryClient = useQueryClient();

  // Fetch payouts
  const { data: payouts = [], isLoading: payoutsLoading } = useQuery({
    queryKey: ['artist-payouts', artistProfileId],
    queryFn: () => base44.entities.ArtistPayout.filter(
      { artist_profile_id: artistProfileId },
      '-processed_date'
    ),
    enabled: !!artistProfileId,
  });

  // Fetch payment methods
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['artist-payment-methods', artistProfileId],
    queryFn: () => base44.entities.ArtistPaymentMethod.filter({ artist_profile_id: artistProfileId }),
    enabled: !!artistProfileId,
  });

  const currentPaymentMethod = paymentMethods[0];

  // Calculate monthly breakdown
  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = startOfMonth(subMonths(new Date(), 5 - i));
      return { key: format(d, 'yyyy-MM'), label: format(d, 'MMM yyyy') };
    });

    return months.map(({ key, label }) => {
      const monthPayouts = payouts.filter(payout => {
        const payoutMonth = payout.processed_date?.slice(0, 7) || payout.period_end?.slice(0, 7);
        return payoutMonth === key && payout.status === 'completed';
      });
      
      const totalSent = monthPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);
      const pendingThisMonth = monthPayouts
        .filter(p => p.status === 'pending' || p.status === 'processing')
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      return {
        label,
        totalSent,
        pending: pendingThisMonth,
        net: totalSent - pendingThisMonth,
      };
    });
  }, [payouts]);

  // Calculate totals
  const totalPaid = payouts.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPending = payouts.filter(p => ['pending', 'processing'].includes(p.status)).reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalFailed = payouts.filter(p => p.status === 'failed').reduce((sum, p) => sum + (p.amount || 0), 0);
  const payoutCount = payouts.length;

  // Pie chart data
  const pieData = [
    { name: 'Completed', value: totalPaid, color: '#22c55e' },
    { name: 'Pending', value: totalPending, color: '#eab308' },
    { name: 'Failed', value: totalFailed, color: '#ef4444' },
  ];

  // Toggle notifications mutation
  const toggleNotificationsMutation = useMutation({
    mutationFn: async (enabled) => {
      await base44.entities.ArtistPaymentMethod.update(currentPaymentMethod.id, {
        notifications_enabled: enabled,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-payment-methods'] });
      toast.success('Notification settings updated');
    },
  });

  // Export report mutation
  const exportReportMutation = useMutation({
    mutationFn: async () => {
      const csvContent = [
        ['Date', 'Amount', 'Status', 'Type', 'Payment Method', 'Transaction ID'],
        ...payouts.map(p => [
          p.processed_date || p.created_date,
          p.amount,
          p.status,
          p.payout_type,
          p.payment_provider,
          p.transaction_id || 'N/A',
        ]),
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `earnings-report-${artistProfileId}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast.success('Report exported successfully');
    },
  });

  if (payoutsLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20">
            <Wallet className="w-5 h-5 text-neon-cyan" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-lg">Earnings Report Dashboard</h2>
            <p className="text-xs text-muted-foreground">Comprehensive payout tracking and analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportReportMutation.mutate()}
            disabled={exportReportMutation.isPending}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard hover={false} className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Paid</p>
              <p className="text-2xl font-bold text-green-500">${totalPaid.toFixed(2)}</p>
            </div>
          </div>
          <Progress value={payoutCount > 0 ? (totalPaid / (totalPaid + totalPending)) * 100 : 0} className="h-1.5" />
        </GlassCard>

        <GlassCard hover={false} className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-yellow-500">${totalPending.toFixed(2)}</p>
            </div>
          </div>
          <Progress value={payoutCount > 0 ? (totalPending / (totalPaid + totalPending)) * 100 : 0} className="h-1.5" />
        </GlassCard>

        <GlassCard hover={false} className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold text-red-500">${totalFailed.toFixed(2)}</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">{payouts.filter(p => p.status === 'failed').length} transactions</p>
        </GlassCard>

        <GlassCard hover={false} className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-neon-purple/10">
              <CreditCard className="w-5 h-5 text-neon-purple" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Transactions</p>
              <p className="text-2xl font-bold text-neon-purple">{payoutCount}</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">All time payouts</p>
        </GlassCard>
      </div>

      {/* Current Balance & Notifications */}
      <div className="grid md:grid-cols-2 gap-6">
        <GlassCard hover={false} className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold">Current Balance</h3>
            <Wallet className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="mb-4">
            <p className="text-4xl font-bold text-neon-cyan mb-2">
              ${currentPaymentMethod?.pending_balance?.toFixed(2) || '0.00'}
            </p>
            <p className="text-xs text-muted-foreground">
              Next payout threshold: $50.00
            </p>
          </div>
          <Progress 
            value={Math.min(((currentPaymentMethod?.pending_balance || 0) / 50) * 100, 100)} 
            className="h-3 mb-2" 
          />
          <p className="text-xs text-muted-foreground">
            {currentPaymentMethod?.pending_balance >= 50 
              ? '✅ Ready for payout!' 
              : `$${(50 - (currentPaymentMethod?.pending_balance || 0)).toFixed(2)} until next payout`}
          </p>
        </GlassCard>

        <GlassCard hover={false} className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold">Payout Notifications</h3>
            <div className="flex items-center gap-2">
              {currentPaymentMethod?.notifications_enabled ? (
                <Bell className="w-5 h-5 text-neon-cyan" />
              ) : (
                <BellOff className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Automatic Alerts</p>
                <p className="text-xs text-muted-foreground">
                  Get notified when you reach $50 threshold
                </p>
              </div>
              <Switch
                checked={currentPaymentMethod?.notifications_enabled !== false}
                onCheckedChange={(checked) => toggleNotificationsMutation.mutate(checked)}
                disabled={toggleNotificationsMutation.isPending}
              />
            </div>
            <div className="pt-3 border-t border-border/30">
              <p className="text-xs text-muted-foreground mb-2">Notification Methods:</p>
              <div className="flex items-center gap-2 text-xs">
                <NeonBadge color="cyan">In-App</NeonBadge>
                <NeonBadge color="purple">Email</NeonBadge>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Monthly Breakdown Chart */}
      <GlassCard hover={false} className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-display font-semibold">Monthly Breakdown</h3>
            <p className="text-xs text-muted-foreground">Funds sent vs pending balances</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
            <Tooltip content={<ChartTooltip />} />
            <Legend />
            <Area type="monotone" dataKey="totalSent" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} name="Total Sent" />
            <Area type="monotone" dataKey="pending" stroke="#eab308" fill="#eab308" fillOpacity={0.3} name="Pending" />
          </AreaChart>
        </ResponsiveContainer>
      </GlassCard>

      {/* Payout Distribution */}
      <GlassCard hover={false} className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-display font-semibold">Payout Status Distribution</h3>
            <p className="text-xs text-muted-foreground">Breakdown by transaction status</p>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <ResponsiveContainer width="50%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-3 flex-1">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-muted-foreground">{item.name}</span>
                </div>
                <span className="font-semibold">${item.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Recent Payouts Table */}
      <GlassCard hover={false} className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold">Recent Payouts</h3>
          <NeonBadge color="cyan">{payouts.length} total</NeonBadge>
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {payouts.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No payouts yet</p>
              <p className="text-xs text-muted-foreground mt-1">Payouts are automatically triggered at $50</p>
            </div>
          ) : (
            payouts.slice(0, 10).map((payout) => (
              <div key={payout.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/30">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    payout.status === 'completed' ? 'bg-green-500/10' :
                    payout.status === 'processing' ? 'bg-blue-500/10' :
                    payout.status === 'failed' ? 'bg-red-500/10' : 'bg-yellow-500/10'
                  }`}>
                    {payout.status === 'completed' ? <CheckCircle className="w-4 h-4 text-green-500" /> :
                     payout.status === 'processing' ? <TrendingUp className="w-4 h-4 text-blue-500" /> :
                     payout.status === 'failed' ? <AlertCircle className="w-4 h-4 text-red-500" /> :
                     <Clock className="w-4 h-4 text-yellow-500" />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">${payout.amount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {payout.period_end ? format(new Date(payout.period_end), 'MMM d, yyyy') : 'Pending'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <PayoutStatusBadge status={payout.status} />
                  <p className="text-[10px] text-muted-foreground mt-1 capitalize">{payout.payout_type}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </GlassCard>
    </div>
  );
}