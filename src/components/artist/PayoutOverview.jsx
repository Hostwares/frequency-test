import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp, 
  Download, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  FileText,
  ShoppingBag,
  Heart,
  Percent
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { format, subMonths, startOfMonth } from 'date-fns';

export default function PayoutOverview({ artistProfileId, userId }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Fetch payment methods
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['artist-payment-methods', artistProfileId],
    queryFn: () => base44.entities.ArtistPaymentMethod.filter({ artist_profile_id: artistProfileId }),
    enabled: !!artistProfileId,
  });

  const paymentMethod = paymentMethods[0];

  // Fetch orders
  const { data: orders = [] } = useQuery({
    queryKey: ['artist-orders-payout', artistProfileId],
    queryFn: () => base44.entities.Order.filter({ 
      artist_profile_id: artistProfileId, 
      payment_status: 'paid' 
    }, '-created_date'),
    enabled: !!artistProfileId,
  });

  // Fetch support allocations
  const { data: allocations = [] } = useQuery({
    queryKey: ['artist-allocations-payout', artistProfileId],
    queryFn: () => base44.entities.SupportAllocation.filter({ 
      artist_profile_id: artistProfileId 
    }, '-created_date'),
    enabled: !!artistProfileId,
  });

  // Fetch payouts
  const { data: payouts = [] } = useQuery({
    queryKey: ['artist-payouts-overview', artistProfileId],
    queryFn: () => base44.entities.ArtistPayout.filter({ 
      artist_profile_id: artistProfileId 
    }, '-processed_date'),
    enabled: !!artistProfileId,
  });

  // Calculate current month earnings
  const currentMonthData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthOrders = orders.filter(order => {
      const orderDate = new Date(order.created_date);
      return orderDate.getMonth() === currentMonth && 
             orderDate.getFullYear() === currentYear;
    });

    const monthAllocations = allocations.filter(alloc => {
      const allocDate = new Date(alloc.created_date);
      return allocDate.getMonth() === currentMonth && 
             allocDate.getFullYear() === currentYear;
    });

    const merchRevenue = monthOrders.reduce((sum, o) => sum + (o.artist_earnings || 0), 0);
    const supportRevenue = monthAllocations.reduce((sum, a) => sum + (a.amount || 0), 0);
    const totalRevenue = merchRevenue + supportRevenue;

    return {
      merchRevenue,
      supportRevenue,
      totalRevenue,
      ordersCount: monthOrders.length,
      supportersCount: monthAllocations.length,
    };
  }, [orders, allocations]);

  // Calculate threshold progress
  const threshold = 50;
  const pendingBalance = paymentMethod?.pending_balance || currentMonthData.totalRevenue;
  const isAboveThreshold = pendingBalance >= threshold;
  const progressToThreshold = Math.min((pendingBalance / threshold) * 100, 100);

  // Monthly earnings data for chart (6 months)
  const monthlyChartData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const date = startOfMonth(subMonths(new Date(), 5 - i));
      const month = date.getMonth();
      const year = date.getFullYear();
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

      const monthOrders = orders.filter(order => {
        const orderDate = new Date(order.created_date);
        return orderDate.getMonth() === month && orderDate.getFullYear() === year;
      });

      const monthAllocations = allocations.filter(alloc => {
        const allocDate = new Date(alloc.created_date);
        return allocDate.getMonth() === month && allocDate.getFullYear() === year;
      });

      const merchRevenue = monthOrders.reduce((sum, o) => sum + (o.artist_earnings || 0), 0);
      const supportRevenue = monthAllocations.reduce((sum, a) => sum + (a.amount || 0), 0);

      return {
        label: format(date, 'MMM yy'),
        merch: merchRevenue,
        support: supportRevenue,
        total: merchRevenue + supportRevenue,
      };
    });
  }, [orders, allocations]);

  // Yearly data for reports
  const yearlyData = useMemo(() => {
    const yearData = {};
    
    for (let i = 0; i < 3; i++) {
      const year = selectedYear - i;
      yearData[year] = {
        totalRevenue: 0,
        platformFees: 0,
        netEarnings: 0,
        payouts: 0,
        orders: 0,
      };
    }

    orders.forEach(order => {
      const year = order.created_date ? new Date(order.created_date).getFullYear() : selectedYear;
      if (yearData[year]) {
        yearData[year].totalRevenue += order.artist_earnings || 0;
        yearData[year].platformFees += order.platform_fee || 0;
        yearData[year].orders += 1;
      }
    });

    allocations.forEach(alloc => {
      const year = alloc.created_date ? new Date(alloc.created_date).getFullYear() : selectedYear;
      if (yearData[year]) {
        yearData[year].totalRevenue += alloc.amount || 0;
      }
    });

    payouts.forEach(payout => {
      const year = payout.processed_date ? new Date(payout.processed_date).getFullYear() : selectedYear;
      if (yearData[year]) {
        yearData[year].netEarnings += (payout.amount || 0) - (payout.platform_fee || 0);
        yearData[year].payouts += 1;
      }
    });

    return Object.entries(yearData).map(([year, data]) => ({
      year: parseInt(year),
      ...data,
      effectiveRate: data.totalRevenue > 0 ? ((data.platformFees / data.totalRevenue) * 100).toFixed(1) : 0,
    }));
  }, [orders, allocations, payouts, selectedYear]);

  const currentYearData = yearlyData.find(y => y.year === selectedYear) || yearlyData[0];

  // Export functions
  const exportMonthlySummary = () => {
    const csvRows = [
      ['Monthly Earnings Summary', format(new Date(), 'MMMM yyyy')],
      ['Generated', new Date().toLocaleDateString()],
      [],
      ['Revenue Breakdown'],
      ['Fan Support', `$${currentMonthData.supportRevenue.toFixed(2)}`],
      ['Merchandise Sales', `$${currentMonthData.merchRevenue.toFixed(2)}`],
      ['Total Revenue', `$${currentMonthData.totalRevenue.toFixed(2)}`],
      [],
      ['Activity'],
      ['Supporters', currentMonthData.supportersCount.toString()],
      ['Orders', currentMonthData.ordersCount.toString()],
      ['Payout Threshold', `$${threshold}`],
      ['Progress', `${progressToThreshold.toFixed(1)}%`],
    ];

    const csv = csvRows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly-earnings-${format(new Date(), 'yyyy-MM')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Monthly summary exported');
  };

  const exportTaxReport = (year) => {
    const data = yearlyData.find(y => y.year === year);
    if (!data) return;

    const csvRows = [
      ['Annual Tax Report', year.toString()],
      ['Generated', new Date().toLocaleDateString()],
      [],
      ['Financial Summary'],
      ['Total Revenue', `$${data.totalRevenue.toFixed(2)}`],
      ['Platform Fees', `$${data.platformFees.toFixed(2)}`],
      ['Net Earnings', `$${data.netEarnings.toFixed(2)}`],
      ['Effective Fee Rate', `${data.effectiveRate}%`],
      [],
      ['Transaction Details'],
      ['Total Orders', data.orders.toString()],
      ['Total Payouts', data.payouts.toString()],
    ];

    const csv = csvRows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-report-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Tax report for ${year} exported`);
  };

  const exportPayoutHistory = () => {
    const csvRows = [
      ['Payout History'],
      ['Generated', new Date().toLocaleDateString()],
      [],
      ['Date', 'Amount', 'Type', 'Status', 'Orders Covered', 'Platform Fee'],
      ...payouts.map(p => [
        p.processed_date ? new Date(p.processed_date).toLocaleDateString() : '',
        `$${(p.amount || 0).toFixed(2)}`,
        p.payout_type || 'monthly',
        p.status || 'pending',
        p.orders_count || 0,
        `$${(p.platform_fee || 0).toFixed(2)}`,
      ]),
    ];

    const csv = csvRows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payout-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Payout history exported');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-card border border-neon-cyan/30">
            <DollarSign className="w-6 h-6 text-neon-cyan" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold">Payout Center</h2>
            <p className="text-xs text-muted-foreground">Track earnings, thresholds, and reports</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportMonthlySummary}
            className="gap-2 border-neon-purple/30 text-neon-purple hover:bg-neon-purple/10"
          >
            <Download className="w-4 h-4" />
            Monthly Summary
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportPayoutHistory}
            className="gap-2 border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10"
          >
            <Download className="w-4 h-4" />
            Payout History
          </Button>
        </div>
      </div>

      {/* Threshold Progress */}
      <GlassCard className="p-6 border-neon-purple/30 bg-gradient-to-r from-neon-purple/5 to-neon-cyan/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-neon-purple/10">
              <TrendingUp className="w-5 h-5 text-neon-purple" />
            </div>
            <div>
              <h3 className="font-display font-semibold">Payout Threshold Progress</h3>
              <p className="text-xs text-muted-foreground">
                {isAboveThreshold ? 'Ready for payout!' : 'Keep earning to reach $50 threshold'}
              </p>
            </div>
          </div>
          <NeonBadge color={isAboveThreshold ? 'cyan' : 'magenta'}>
            {isAboveThreshold ? '✓ Ready' : `${(threshold - pendingBalance).toFixed(2)} to go`}
          </NeonBadge>
        </div>

        <div className="mb-3">
          <div className="flex items-end justify-between mb-2">
            <span className="text-3xl font-bold text-gradient-neon">${pendingBalance.toFixed(2)}</span>
            <span className="text-sm text-muted-foreground">/ $50.00 threshold</span>
          </div>
          <div className="h-4 rounded-full bg-secondary overflow-hidden border border-border/30">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressToThreshold}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full ${
                isAboveThreshold 
                  ? 'bg-gradient-to-r from-neon-cyan to-neon-green' 
                  : 'bg-gradient-to-r from-neon-purple via-neon-magenta to-neon-purple'
              }`}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {progressToThreshold.toFixed(1)}% complete
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="p-3 rounded-lg bg-secondary/20 border border-border/30">
            <Heart className="w-4 h-4 text-neon-purple mb-1" />
            <p className="text-lg font-bold text-neon-purple">${currentMonthData.supportRevenue.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">Fan Support</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/20 border border-border/30">
            <ShoppingBag className="w-4 h-4 text-neon-cyan mb-1" />
            <p className="text-lg font-bold text-neon-cyan">${currentMonthData.merchRevenue.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">Merch Sales</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/20 border border-border/30">
            <FileText className="w-4 h-4 text-neon-magenta mb-1" />
            <p className="text-lg font-bold text-neon-magenta">{currentMonthData.ordersCount + currentMonthData.supportersCount}</p>
            <p className="text-[10px] text-muted-foreground">Transactions</p>
          </div>
        </div>
      </GlassCard>

      {/* Monthly Earnings Chart */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-neon-cyan/10">
              <BarChart className="w-5 h-5 text-neon-cyan" />
            </div>
            <div>
              <h3 className="font-display font-semibold">6-Month Earnings Trend</h3>
              <p className="text-xs text-muted-foreground">Fan support + merchandise revenue</p>
            </div>
          </div>
        </div>

        {monthlyChartData.every(m => m.total === 0) ? (
          <div className="h-64 flex flex-col items-center justify-center text-center border border-dashed border-border/40 rounded-xl">
            <DollarSign className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No earnings yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start building your fanbase to see growth</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyChartData}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0]?.payload;
                  return (
                    <div className="bg-card/95 backdrop-blur border border-border/60 rounded-xl px-4 py-3 shadow-xl text-xs">
                      <p className="font-semibold mb-2">{label}</p>
                      <div className="space-y-1">
                        <div className="flex justify-between gap-8">
                          <span className="text-muted-foreground">Support</span>
                          <span className="font-semibold text-neon-purple">${data.support?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between gap-8">
                          <span className="text-muted-foreground">Merch</span>
                          <span className="font-semibold text-neon-cyan">${data.merch?.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-border/50 pt-1 mt-1">
                          <div className="flex justify-between gap-8">
                            <span className="font-medium">Total</span>
                            <span className="font-bold">${data.total?.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Area 
                type="monotone" 
                dataKey="total" 
                stroke="#a855f7" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorTotal)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </GlassCard>

      {/* Quick Stats & Reports */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Payment Method Status */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-neon-turquoise/10">
              <CheckCircle className="w-5 h-5 text-neon-turquoise" />
            </div>
            <div>
              <h3 className="font-display font-semibold">Payment Setup</h3>
              <p className="text-xs text-muted-foreground">Payout configuration</p>
            </div>
          </div>

          {paymentMethod ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                <span className="text-sm text-muted-foreground">Provider</span>
                <NeonBadge color="cyan" className="capitalize">{paymentMethod.payment_provider}</NeonBadge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                <span className="text-sm text-muted-foreground">Status</span>
                <NeonBadge color={paymentMethod.is_verified ? 'cyan' : 'magenta'}>
                  {paymentMethod.is_verified ? 'Verified' : 'Pending'}
                </NeonBadge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                <span className="text-sm text-muted-foreground">Your Share</span>
                <span className="text-sm font-bold text-neon-purple">{paymentMethod.payout_percentage}%</span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-500">Payment method not configured</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Set up your payment method to receive payouts
                  </p>
                </div>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Annual Reports */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-neon-magenta/10">
                <FileText className="w-5 h-5 text-neon-magenta" />
              </div>
              <div>
                <h3 className="font-display font-semibold">Annual Reports</h3>
                <p className="text-xs text-muted-foreground">Tax documentation</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedYear(Math.max(selectedYear - 1, 2023))}
                className="h-8 w-8 p-0"
              >
                <Calendar className="w-4 h-4 rotate-180" />
              </Button>
              <span className="text-sm font-bold w-12 text-center">{selectedYear}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedYear(Math.min(selectedYear + 1, new Date().getFullYear()))}
                className="h-8 w-8 p-0"
              >
                <Calendar className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {currentYearData ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                <span className="text-sm text-muted-foreground">Total Revenue</span>
                <span className="text-sm font-bold text-neon-cyan">${currentYearData.totalRevenue.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                <span className="text-sm text-muted-foreground">Platform Fees</span>
                <span className="text-sm font-bold text-neon-magenta">${currentYearData.platformFees.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                <span className="text-sm text-muted-foreground">Effective Rate</span>
                <NeonBadge color="magenta">{currentYearData.effectiveRate}%</NeonBadge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportTaxReport(selectedYear)}
                className="w-full gap-2 mt-2"
              >
                <Download className="w-4 h-4" />
                Export {selectedYear} Tax Report
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">No data for this year</p>
          )}
        </GlassCard>
      </div>

      {/* Recent Payout History */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-neon-purple/10">
              <Clock className="w-5 h-5 text-neon-purple" />
            </div>
            <div>
              <h3 className="font-display font-semibold">Recent Payouts</h3>
              <p className="text-xs text-muted-foreground">Payment history</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={exportPayoutHistory}
            className="gap-2 text-xs"
          >
            <Download className="w-4 h-4" />
            Export All
          </Button>
        </div>

        {payouts.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border/40 rounded-xl">
            <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No payouts yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Reach $50 to receive your first automatic payout
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {payouts.slice(0, 5).map((payout) => (
              <div
                key={payout.id}
                className="flex items-center justify-between p-4 rounded-lg bg-secondary/10 border border-border/30 hover:border-neon-purple/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    payout.status === 'completed' ? 'bg-green-500/10' :
                    payout.status === 'processing' ? 'bg-yellow-500/10' :
                    'bg-secondary/20'
                  }`}>
                    {payout.status === 'completed' ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : payout.status === 'processing' ? (
                      <Clock className="w-4 h-4 text-yellow-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-neon-cyan">
                      ${payout.amount?.toFixed(2) || '0.00'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payout.processed_date ? new Date(payout.processed_date).toLocaleDateString() : 'Pending'} •{' '}
                      <span className="capitalize">{payout.payout_type || 'monthly'}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <NeonBadge color={
                    payout.status === 'completed' ? 'cyan' :
                    payout.status === 'processing' ? 'magenta' : 'purple'
                  }>
                    {payout.status}
                  </NeonBadge>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {payout.orders_count || 0} orders
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Info Banner */}
      <GlassCard className="p-5 bg-gradient-to-r from-neon-purple/5 to-neon-cyan/5 border-border/30">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-neon-purple/10">
            <Percent className="w-4 h-4 text-neon-purple" />
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-1">Revenue Split & Payout Schedule</h4>
            <p className="text-xs text-muted-foreground">
              You keep 85% of all earnings (fan support, merch, events). The remaining 15% supports 
              platform operations and network artists. Automatic payouts are processed on the 15th of 
              each month once you reach the $50 threshold. Instant manual payouts are available anytime 
              above $50.
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}