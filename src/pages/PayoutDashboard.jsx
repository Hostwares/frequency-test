import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import {
  Wallet, DollarSign, TrendingUp, ArrowDownToLine, ArrowUpFromLine,
  CheckCircle2, Clock, Loader2, AlertCircle, Download,
  Banknote, Calendar, Percent, ArrowLeft, Filter
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { format, subMonths, startOfMonth } from 'date-fns';

const PAYOUT_THRESHOLD = 50;
const ARTIST_SHARE = 0.85;

const STATUS_CONFIG = {
  completed: { icon: CheckCircle2, color: 'text-neon-turquoise', badge: 'cyan', label: 'Completed' },
  processing: { icon: Loader2, color: 'text-yellow-400', badge: 'magenta', label: 'Processing' },
  pending: { icon: Clock, color: 'text-neon-cyan', badge: 'cyan', label: 'Pending' },
  failed: { icon: AlertCircle, color: 'text-red-400', badge: 'magenta', label: 'Failed' },
  refunded: { icon: ArrowDownToLine, color: 'text-muted-foreground', badge: 'purple', label: 'Refunded' },
};

function TransferRow({ tx }) {
  const config = STATUS_CONFIG[tx.status] || STATUS_CONFIG.pending;
  const Icon = config.icon;
  const isCredit = tx.direction === 'credit';
  const date = tx.created_date ? new Date(tx.created_date) : null;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/10 border border-border/30 hover:border-border/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`p-2 rounded-lg flex-shrink-0 ${isCredit ? 'bg-neon-turquoise/10' : 'bg-neon-purple/10'}`}>
          <Icon className={`w-4 h-4 ${config.color} ${tx.status === 'processing' ? 'animate-spin' : ''}`} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{tx.description || 'Transfer'}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[10px] text-muted-foreground">
              {date ? format(date, 'MMM d, yyyy • h:mm a') : '—'}
            </p>
            {tx.payment_method && (
              <span className="text-[10px] text-muted-foreground/60 capitalize">· {tx.payment_method.replace(/_/g, ' ')}</span>
            )}
          </div>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-bold ${isCredit ? 'text-neon-turquoise' : 'text-neon-cyan'}`}>
          {isCredit ? '+' : '−'}${Math.abs(tx.amount || 0).toFixed(2)}
        </p>
        <NeonBadge color={config.badge} className="mt-0.5">{config.label}</NeonBadge>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sublabel, color = 'text-neon-cyan' }) {
  return (
    <div className="p-4 rounded-xl bg-secondary/20 border border-border/30">
      <Icon className={`w-4 h-4 ${color} mb-2`} />
      <p className="text-2xl font-bold font-display">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      {sublabel && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sublabel}</p>}
    </div>
  );
}

export default function PayoutDashboard() {
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: artistProfile } = useQuery({
    queryKey: ['my-artist-profile', user?.id],
    queryFn: () => base44.entities.ArtistProfile.filter({ user_id: user?.id }),
    enabled: !!user?.id,
    select: (data) => data?.[0],
  });

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['artist-payment-methods', artistProfile?.id],
    queryFn: () => base44.entities.ArtistPaymentMethod.filter({ artist_profile_id: artistProfile?.id }),
    enabled: !!artistProfile?.id,
  });
  const paymentMethod = paymentMethods[0];

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['payout-orders', artistProfile?.id],
    queryFn: () => base44.entities.Order.filter({
      artist_profile_id: artistProfile?.id,
      payment_status: 'paid'
    }, '-created_date'),
    enabled: !!artistProfile?.id,
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['payout-allocations', artistProfile?.id],
    queryFn: () => base44.entities.SupportAllocation.filter({
      artist_profile_id: artistProfile?.id
    }, '-created_date'),
    enabled: !!artistProfile?.id,
  });

  const { data: walletTransactions = [], isLoading: walletLoading } = useQuery({
    queryKey: ['wallet-transfers', user?.id],
    queryFn: () => base44.entities.WalletTransaction.filter({
      user_id: user?.id,
      transaction_type: 'payout'
    }, '-created_date'),
    enabled: !!user?.id,
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ['artist-payouts-dashboard', artistProfile?.id],
    queryFn: () => base44.entities.ArtistPayout.filter({
      artist_profile_id: artistProfile?.id
    }, '-processed_date'),
    enabled: !!artistProfile?.id,
  });

  // Calculate all-time accumulated earnings
  const earnings = useMemo(() => {
    const supportRevenue = allocations.reduce((sum, a) => sum + (a.amount || 0), 0);
    const merchRevenue = orders.reduce((sum, o) => sum + (o.artist_earnings || 0), 0);
    const totalGross = supportRevenue + merchRevenue;
    const totalNet = totalGross * ARTIST_SHARE;
    const totalWithdrawn = payouts
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const pendingBalance = paymentMethod?.pending_balance || totalNet - totalWithdrawn;

    return {
      supportRevenue,
      merchRevenue,
      totalGross,
      totalNet,
      totalWithdrawn,
      pendingBalance: Math.max(pendingBalance, 0),
      availableForWithdrawal: Math.max(pendingBalance, 0) >= PAYOUT_THRESHOLD ? pendingBalance : 0,
    };
  }, [allocations, orders, payouts, paymentMethod]);

  // Monthly cumulative earnings chart (12 months)
  const chartData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = startOfMonth(subMonths(new Date(), 11 - i));
      return { key: format(d, 'yyyy-MM'), label: format(d, 'MMM yy'), earnings: 0, withdrawals: 0 };
    });

    orders.forEach(o => {
      const key = o.created_date?.slice(0, 7);
      const m = months.find(mm => mm.key === key);
      if (m) m.earnings += (o.artist_earnings || 0) * ARTIST_SHARE;
    });
    allocations.forEach(a => {
      const key = a.created_date?.slice(0, 7);
      const m = months.find(mm => mm.key === key);
      if (m) m.earnings += (a.amount || 0) * ARTIST_SHARE;
    });
    walletTransactions.forEach(tx => {
      const key = tx.created_date?.slice(0, 7);
      const m = months.find(mm => mm.key === key);
      if (m && tx.direction === 'debit') m.withdrawals += Math.abs(tx.amount || 0);
    });

    let cumulative = 0;
    months.forEach(m => {
      cumulative += m.earnings;
      m.cumulative = cumulative;
    });

    return months;
  }, [orders, allocations, walletTransactions]);

  const filteredTransfers = useMemo(() => {
    if (statusFilter === 'all') return walletTransactions;
    return walletTransactions.filter(tx => tx.status === statusFilter);
  }, [walletTransactions, statusFilter]);

  const thresholdProgress = Math.min((earnings.pendingBalance / PAYOUT_THRESHOLD) * 100, 100);
  const isAboveThreshold = earnings.pendingBalance >= PAYOUT_THRESHOLD;

  const exportTransfers = () => {
    const rows = [
      ['Transfer History Export'],
      ['Generated', new Date().toLocaleDateString()],
      ['Artist', artistProfile?.artist_name || ''],
      [],
      ['Date', 'Description', 'Amount', 'Direction', 'Status', 'Method', 'Balance After'],
      ...walletTransactions.map(tx => [
        tx.created_date ? new Date(tx.created_date).toLocaleString() : '',
        tx.description || '',
        (tx.amount || 0).toFixed(2),
        tx.direction || '',
        tx.status || '',
        tx.payment_method || '',
        (tx.balance_after || 0).toFixed(2),
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transfer-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!artistProfile) {
    return (
      <div className="p-4 md:p-8 pb-24 max-w-5xl mx-auto">
        <GlassCard hover={false} className="p-12 text-center">
          <Wallet className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <h2 className="text-xl font-display font-bold mb-2">Artist Profile Required</h2>
          <p className="text-sm text-muted-foreground">Create an artist profile to access your payout dashboard.</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pb-24 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/artist-dashboard">
            <Button variant="ghost" size="icon" className="mr-1">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="p-2 rounded-lg bg-gradient-to-br from-neon-cyan/20 to-neon-purple/10 border border-neon-cyan/20">
            <Wallet className="w-5 h-5 text-neon-cyan" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Payout Dashboard</h1>
            <p className="text-xs text-muted-foreground">{artistProfile.artist_name} · Base44 Wallet</p>
          </div>
        </div>

        {/* Total Accumulated Earnings Hero */}
        <GlassCard hover={false} className="p-6 mb-6 bg-gradient-to-br from-neon-purple/8 to-neon-cyan/4 border-neon-purple/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-neon-purple" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Accumulated Earnings</span>
            </div>
            <NeonBadge color="purple">All-time</NeonBadge>
          </div>
          <div className="flex items-baseline gap-3 mb-4">
            <p className="text-4xl font-bold text-gradient-neon font-display">${earnings.totalNet.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">net after platform fees</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-secondary/20">
              <p className="text-[10px] text-muted-foreground">Fan Support (85%)</p>
              <p className="text-sm font-bold text-neon-purple">${(earnings.supportRevenue * ARTIST_SHARE).toFixed(2)}</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/20">
              <p className="text-[10px] text-muted-foreground">Merch & Tickets (85%)</p>
              <p className="text-sm font-bold text-neon-cyan">${(earnings.merchRevenue * ARTIST_SHARE).toFixed(2)}</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/20">
              <p className="text-[10px] text-muted-foreground">Platform Fee (15%)</p>
              <p className="text-sm font-bold text-neon-magenta">${(earnings.totalGross * 0.15).toFixed(2)}</p>
            </div>
          </div>
        </GlassCard>

        {/* Current Withdrawal Status */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={Wallet}
            label="Available Balance"
            value={`$${earnings.pendingBalance.toFixed(2)}`}
            sublabel={isAboveThreshold ? 'Ready for withdrawal' : `$${(PAYOUT_THRESHOLD - earnings.pendingBalance).toFixed(2)} to threshold`}
            color="text-neon-cyan"
          />
          <StatCard
            icon={ArrowUpFromLine}
            label="Total Withdrawn"
            value={`$${earnings.totalWithdrawn.toFixed(2)}`}
            sublabel={`${payouts.filter(p => p.status === 'completed').length} transfers`}
            color="text-neon-turquoise"
          />
          <StatCard
            icon={Clock}
            label="Pending Transfers"
            value={walletTransactions.filter(tx => tx.status === 'pending' || tx.status === 'processing').length}
            sublabel="In progress"
            color="text-yellow-400"
          />
          <StatCard
            icon={Banknote}
            label="Payout Method"
            value={paymentMethod?.payment_provider ? paymentMethod.payment_provider.charAt(0).toUpperCase() + paymentMethod.payment_provider.slice(1) : 'Not set'}
            sublabel={paymentMethod?.is_verified ? 'Verified' : 'Action needed'}
            color={paymentMethod?.is_verified ? 'text-neon-turquoise' : 'text-yellow-400'}
          />
        </div>

        {/* Threshold & Withdrawal Action */}
        <GlassCard hover={false} className="p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-neon-purple" />
              <h3 className="font-display font-semibold text-sm">Withdrawal Threshold</h3>
            </div>
            <NeonBadge color={isAboveThreshold ? 'cyan' : 'magenta'}>
              {isAboveThreshold ? '✓ Ready to withdraw' : `${(PAYOUT_THRESHOLD - earnings.pendingBalance).toFixed(2)} to go`}
            </NeonBadge>
          </div>
          <Progress value={thresholdProgress} className="h-3 mb-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>${earnings.pendingBalance.toFixed(2)} accumulated</span>
            <span>${PAYOUT_THRESHOLD.toFixed(2)} threshold</span>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-secondary/20 flex items-start gap-2">
            <Calendar className="w-3.5 h-3.5 text-neon-cyan mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              Automatic payouts process on the <span className="font-semibold text-foreground">15th of each month</span> when your balance exceeds ${PAYOUT_THRESHOLD}.
              You keep <span className="font-semibold text-neon-turquoise">85%</span> of all earnings; 15% supports platform operations.
            </p>
          </div>
        </GlassCard>

        {/* Earnings vs Withdrawals Chart */}
        <GlassCard hover={false} className="p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-neon-purple" />
            <h3 className="font-display font-semibold text-sm">12-Month Earnings Trajectory</h3>
          </div>
          {chartData.some(m => m.cumulative > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} width={36} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value, name) => name === 'cumulative' ? [`$${value.toFixed(2)}`, 'Cumulative Earnings'] : [`$${value.toFixed(2)}`, 'Withdrawals']}
                />
                <Area type="monotone" dataKey="cumulative" stroke="#a855f7" strokeWidth={2} fill="url(#earningsGrad)" dot={{ r: 2, fill: '#a855f7' }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-10">
              <TrendingUp className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Earnings chart will populate as you receive support and sales</p>
            </div>
          )}
        </GlassCard>

        {/* Transfer History */}
        <GlassCard hover={false} className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ArrowDownToLine className="w-4 h-4 text-neon-cyan" />
              <h3 className="font-display font-semibold text-sm">Transfer History</h3>
              <NeonBadge color="cyan">{walletTransactions.length}</NeonBadge>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-28 text-xs">
                  <Filter className="w-3 h-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              {walletTransactions.length > 0 && (
                <Button variant="ghost" size="sm" onClick={exportTransfers} className="gap-1.5 text-xs">
                  <Download className="w-3.5 h-3.5" /> Export
                </Button>
              )}
            </div>
          </div>

          {walletLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTransfers.length > 0 ? (
            <div className="space-y-2">
              {filteredTransfers.map(tx => (
                <TransferRow key={tx.id} tx={tx} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 border border-dashed border-border/30 rounded-xl">
              <ArrowDownToLine className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No transfers yet</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {walletTransactions.length === 0
                  ? 'Your withdrawal history will appear here once payouts are processed'
                  : 'No transfers match this filter'}
              </p>
            </div>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}