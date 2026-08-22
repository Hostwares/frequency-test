import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  DollarSign, TrendingUp, TrendingDown, Wallet, Download, Calculator,
  Receipt, Calendar, Percent, FileText, Clock, CheckCircle2,
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import MonthlyPayoutReportExport from '@/components/admin/MonthlyPayoutReportExport';

function formatMonth(ym) {
  const [y, m] = ym.split('-');
  const date = new Date(parseInt(y), parseInt(m) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function downloadCSV(data, filename) {
  const headers = ['Month', 'Gross Revenue', 'Platform Expenses', 'Net Revenue', 'Share %', 'Estimated Payout', 'Paid', 'Pending', 'Status'];
  const rows = data.map(e => [
    e.month, e.gross_revenue?.toFixed(2), e.platform_expenses?.toFixed(2),
    e.net_revenue?.toFixed(2), e.revenue_share_percentage, e.estimated_payout?.toFixed(2),
    e.paid_amount?.toFixed(2), e.pending_amount?.toFixed(2), e.status,
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminPartnerEarnings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [payoutAmount, setPayoutAmount] = useState({});
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', category: 'other' });

  const isMasterAdmin = user?.role === 'master_admin' || user?.role === 'admin';

  // Get admin partner profile
  const { data: partnerProfile } = useQuery({
    queryKey: ['my-admin-partner', user?.id],
    queryFn: () => base44.entities.AdminPartner.filter({ user_id: user?.id, is_active: true }),
    select: d => d?.[0],
    enabled: !!user?.id && user?.role === 'admin_partner',
  });

  // Get earnings records
  const { data: earnings = [], isLoading } = useQuery({
    queryKey: ['admin-partner-earnings', partnerProfile?.id || user?.id],
    queryFn: () => {
      if (isMasterAdmin) {
        return base44.entities.AdminPartnerEarning.list('-created_date', 100);
      }
      return base44.entities.AdminPartnerEarning.filter({ admin_partner_id: partnerProfile.id }, '-created_date', 100);
    },
    enabled: !!user?.id && (isMasterAdmin || !!partnerProfile?.id),
  });

  // Get platform expenses (master admin only for entry)
  const { data: expenses = [] } = useQuery({
    queryKey: ['platform-expenses', selectedMonth],
    queryFn: () => base44.entities.PlatformExpense.filter({ month: selectedMonth }, '-created_date', 50),
    enabled: isMasterAdmin,
  });

  // Get all admin partners (master admin view)
  const { data: allPartners = [] } = useQuery({
    queryKey: ['admin-partners'],
    queryFn: () => base44.entities.AdminPartner.filter({ is_active: true }),
    enabled: isMasterAdmin,
  });

  const calculateEarnings = useMutation({
    mutationFn: (month) =>
      base44.functions.invoke('manageAdminPartner', { action: 'calculate_earnings', month }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-partner-earnings'] });
      toast.success('Earnings calculated for ' + formatMonth(selectedMonth));
    },
    onError: () => toast.error('Failed to calculate earnings'),
  });

  const recordPayout = useMutation({
    mutationFn: ({ earning_id, amount }) =>
      base44.functions.invoke('manageAdminPartner', { action: 'record_payout', earning_id, amount }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-partner-earnings'] });
      setPayoutAmount({});
      toast.success('Payout recorded');
    },
    onError: () => toast.error('Failed to record payout'),
  });

  const addExpense = useMutation({
    mutationFn: () =>
      base44.entities.PlatformExpense.create({
        ...expenseForm,
        amount: parseFloat(expenseForm.amount),
        month: selectedMonth,
        expense_date: new Date().toISOString().split('T')[0],
        entered_by_user_id: user.id,
        entered_by_name: user.full_name || user.email,
      }),
    onSuccess: () => {
      setExpenseForm({ description: '', amount: '', category: 'other' });
      qc.invalidateQueries({ queryKey: ['platform-expenses'] });
      toast.success('Expense added');
    },
  });

  // Calculate summary
  const totalEstimated = earnings.reduce((s, e) => s + (e.estimated_payout || 0), 0);
  const totalPaid = earnings.reduce((s, e) => s + (e.paid_amount || 0), 0);
  const totalPending = earnings.reduce((s, e) => s + (e.pending_amount || 0), 0);
  const currentShare = partnerProfile?.revenue_share_percentage || allPartners.find(p => p.user_id === user?.id)?.revenue_share_percentage || 0;

  // Annual grouping
  const annualData = {};
  earnings.forEach(e => {
    if (!annualData[e.year]) annualData[e.year] = { gross: 0, expenses: 0, net: 0, payout: 0, paid: 0 };
    annualData[e.year].gross += e.gross_revenue || 0;
    annualData[e.year].expenses += e.platform_expenses || 0;
    annualData[e.year].net += e.net_revenue || 0;
    annualData[e.year].payout += e.estimated_payout || 0;
    annualData[e.year].paid += e.paid_amount || 0;
  });

  if (user?.role !== 'master_admin' && user?.role !== 'admin' && user?.role !== 'admin_partner') {
    return (
      <GlassCard hover={false} className="p-8 text-center">
        <Wallet className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Admin Partner access required.</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Wallet className="w-5 h-5 text-neon-turquoise" />
        <h2 className="font-display font-semibold text-sm">
          {isMasterAdmin ? 'Partner Earnings Management' : 'My Earnings Dashboard'}
        </h2>
        {currentShare > 0 && (
          <NeonBadge color="turquoise"><Percent className="w-2.5 h-2.5 mr-0.5 inline" />{currentShare}% Share</NeonBadge>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GlassCard hover={false} className="p-4 text-center">
          <DollarSign className="w-4 h-4 mx-auto mb-1 text-neon-cyan" />
          <p className="text-lg font-display font-bold text-neon-cyan">${totalEstimated.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">Total Estimated</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center">
          <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-neon-turquoise" />
          <p className="text-lg font-display font-bold text-neon-turquoise">${totalPaid.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">Total Paid</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center">
          <Clock className="w-4 h-4 mx-auto mb-1 text-neon-magenta" />
          <p className="text-lg font-display font-bold text-neon-magenta">${totalPending.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">Total Pending</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center">
          <Percent className="w-4 h-4 mx-auto mb-1 text-neon-purple" />
          <p className="text-lg font-display font-bold text-neon-purple">{currentShare}%</p>
          <p className="text-[10px] text-muted-foreground">Revenue Share</p>
        </GlassCard>
      </div>

      {/* Master Admin: Month selector + calculate + expense entry */}
      {isMasterAdmin && (
        <GlassCard hover={false} className="p-5 border-neon-purple/20">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="w-4 h-4 text-neon-purple" />
            <h3 className="text-sm font-medium">Calculate Monthly Earnings</h3>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
              className="bg-secondary/20 text-sm w-40" />
            <Button size="sm"
              onClick={() => calculateEarnings.mutate(selectedMonth)}
              disabled={calculateEarnings.isPending}
              className="h-8 gap-1.5 bg-neon-purple/15 text-neon-purple border border-neon-purple/30 hover:bg-neon-purple/25">
              <Calculator className="w-3.5 h-3.5" />
              {calculateEarnings.isPending ? 'Calculating...' : 'Calculate'}
            </Button>
          </div>

          {/* Expense entry */}
          <div className="mt-4 pt-4 border-t border-border/30">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="w-4 h-4 text-neon-magenta" />
              <h4 className="text-xs font-semibold">Platform Expenses — {formatMonth(selectedMonth)}</h4>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[150px]">
                <Input placeholder="Expense description" value={expenseForm.description}
                  onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))}
                  className="bg-secondary/20 text-sm h-8" />
              </div>
              <div className="w-28">
                <Input type="number" placeholder="Amount $" value={expenseForm.amount}
                  onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
                  className="bg-secondary/20 text-sm h-8" />
              </div>
              <Select value={expenseForm.category} onValueChange={v => setExpenseForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="w-36 h-8 bg-secondary/20 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['infrastructure', 'payroll', 'marketing', 'legal', 'software', 'office', 'taxes', 'other'].map(c => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8"
                disabled={!expenseForm.description || !expenseForm.amount || addExpense.isPending}
                onClick={() => addExpense.mutate()}>
                Add Expense
              </Button>
            </div>

            {/* Expense list */}
            {expenses.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {expenses.map(exp => (
                  <div key={exp.id} className="flex items-center justify-between text-xs px-3 py-2 bg-secondary/20 rounded-md">
                    <div>
                      <span className="font-medium">{exp.description}</span>
                      <NeonBadge color="blue" className="ml-2">{exp.category}</NeonBadge>
                    </div>
                    <span className="font-bold text-destructive">-${(exp.amount || 0).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-xs px-3 py-2 bg-destructive/5 rounded-md font-semibold">
                  <span>Total Expenses</span>
                  <span className="text-destructive">-${expenses.reduce((s, e) => s + (e.amount || 0), 0).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {/* Earnings history */}
      <GlassCard hover={false} className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-neon-cyan" />
            <h3 className="text-sm font-medium">Payout History</h3>
          </div>
          {earnings.length > 0 && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5"
                onClick={() => downloadCSV(earnings, `admin-partner-earnings-${new Date().toISOString().split('T')[0]}.csv`)}>
                <Download className="w-3 h-3" /> Export CSV
              </Button>
              <MonthlyPayoutReportExport earnings={earnings} partners={allPartners} isMasterAdmin={isMasterAdmin} />
            </div>
          )}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
        ) : earnings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No earnings records yet. {isMasterAdmin ? 'Calculate monthly earnings to get started.' : 'Records will appear once the Master Admin calculates monthly earnings.'}
          </p>
        ) : (
          <div className="space-y-2">
            {/* Monthly breakdown */}
            {earnings.map(e => (
              <div key={e.id} className="p-3 bg-secondary/20 rounded-lg">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">{formatMonth(e.month)}</span>
                    {isMasterAdmin && <NeonBadge color="purple">{e.partner_name}</NeonBadge>}
                    <NeonBadge color={e.status === 'paid' ? 'turquoise' : e.status === 'partial' ? 'magenta' : 'blue'}>
                      {e.status}
                    </NeonBadge>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-center">
                      <p className="text-[9px] text-muted-foreground">Gross</p>
                      <p className="font-semibold text-neon-cyan">${(e.gross_revenue || 0).toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-muted-foreground">Expenses</p>
                      <p className="font-semibold text-destructive">-${(e.platform_expenses || 0).toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-muted-foreground">Net</p>
                      <p className="font-semibold text-neon-turquoise">${(e.net_revenue || 0).toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-muted-foreground">Share</p>
                      <p className="font-semibold text-neon-purple">{e.revenue_share_percentage}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-muted-foreground">Payout</p>
                      <p className="font-bold text-neon-magenta">${(e.estimated_payout || 0).toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-muted-foreground">Paid</p>
                      <p className="font-semibold text-neon-turquoise">${(e.paid_amount || 0).toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-muted-foreground">Pending</p>
                      <p className="font-semibold text-neon-magenta">${(e.pending_amount || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Record payout (master admin only) */}
                {isMasterAdmin && e.pending_amount > 0 && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
                    <Input type="number" placeholder="Payout amount" className="bg-secondary/20 text-sm h-7 w-32"
                      value={payoutAmount[e.id] || ''}
                      onChange={ev => setPayoutAmount(s => ({ ...s, [e.id]: ev.target.value }))} />
                    <Button size="sm" variant="outline" className="h-7 text-xs"
                      onClick={() => recordPayout.mutate({ earning_id: e.id, amount: parseFloat(payoutAmount[e.id] || 0) })}>
                      Record Payout
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {/* Annual summary */}
            {Object.keys(annualData).length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/30">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Annual Summary</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(annualData).sort(([a], [b]) => b - a).map(([year, data]) => (
                    <div key={year} className="p-3 bg-secondary/20 rounded-lg">
                      <p className="text-sm font-bold mb-2">{year}</p>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between"><span className="text-muted-foreground">Gross:</span><span className="text-neon-cyan">${data.gross.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Expenses:</span><span className="text-destructive">-${data.expenses.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Net:</span><span className="text-neon-turquoise">${data.net.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Payout:</span><span className="text-neon-magenta">${data.payout.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Paid:</span><span className="text-neon-turquoise">${data.paid.toFixed(2)}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
}