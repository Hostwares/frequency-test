import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileText, Download, DollarSign, Percent } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function TaxReports({ artistProfileId, userId }) {
  const currentYear = new Date().getFullYear();

  const { data: payouts = [] } = useQuery({
    queryKey: ['artist-payouts-tax', artistProfileId],
    queryFn: () => base44.entities.ArtistPayout.filter({ 
      artist_profile_id: artistProfileId,
      status: 'completed'
    }, '-processed_date'),
    enabled: !!artistProfileId,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['artist-orders-tax', artistProfileId],
    queryFn: () => base44.entities.Order.filter({ 
      artist_profile_id: artistProfileId, 
      payment_status: 'paid' 
    }),
    enabled: !!artistProfileId,
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['artist-allocations-tax', artistProfileId],
    queryFn: () => base44.entities.SupportAllocation.filter({ 
      artist_profile_id: artistProfileId 
    }),
    enabled: !!artistProfileId,
  });

  const taxData = useMemo(() => {
    const yearData = {};
    
    for (let i = 0; i < 3; i++) {
      const year = currentYear - i;
      yearData[year] = {
        totalRevenue: 0,
        platformFees: 0,
        netEarnings: 0,
        transactions: 0,
      };
    }

    payouts.forEach(payout => {
      const year = payout.processed_date ? new Date(payout.processed_date).getFullYear() : currentYear;
      if (yearData[year]) {
        yearData[year].totalRevenue += payout.amount || 0;
        yearData[year].platformFees += payout.platform_fee || 0;
        yearData[year].netEarnings += (payout.amount || 0) - (payout.platform_fee || 0);
        yearData[year].transactions += 1;
      }
    });

    orders.forEach(order => {
      const year = order.created_date ? new Date(order.created_date).getFullYear() : currentYear;
      if (yearData[year]) {
        yearData[year].totalRevenue += order.artist_earnings || 0;
        yearData[year].platformFees += order.platform_fee || 0;
        yearData[year].transactions += 1;
      }
    });

    allocations.forEach(alloc => {
      const year = alloc.created_date ? new Date(alloc.created_date).getFullYear() : currentYear;
      if (yearData[year]) {
        yearData[year].totalRevenue += alloc.amount || 0;
        yearData[year].transactions += 1;
      }
    });

    return Object.entries(yearData).map(([year, data]) => ({
      year: parseInt(year),
      ...data,
      effectiveTaxRate: data.totalRevenue > 0 ? ((data.platformFees / data.totalRevenue) * 100).toFixed(1) : 0,
    }));
  }, [payouts, orders, allocations, currentYear]);

  const currentYearData = taxData.find(t => t.year === currentYear) || {
    totalRevenue: 0,
    platformFees: 0,
    netEarnings: 0,
    transactions: 0,
    effectiveTaxRate: 0,
  };

  const exportTaxReport = (year) => {
    const yearData = taxData.find(t => t.year === year);
    if (!yearData) return;

    const csvContent = [
      ['Tax Report', year.toString()],
      ['Generated', new Date().toLocaleDateString()],
      [],
      ['Summary'],
      ['Total Revenue', `$${yearData.totalRevenue.toFixed(2)}`],
      ['Platform Fees', `$${yearData.platformFees.toFixed(2)}`],
      ['Net Earnings', `$${yearData.netEarnings.toFixed(2)}`],
      ['Effective Tax Rate', `${yearData.effectiveTaxRate}%`],
      ['Total Transactions', yearData.transactions.toString()],
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-report-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Tax report for ${year} exported`);
  };

  return (
    <GlassCard hover={false} className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-neon-magenta/10 border border-neon-magenta/20">
            <FileText className="w-5 h-5 text-neon-magenta" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-base">Tax Reports</h2>
            <p className="text-xs text-muted-foreground">Annual earnings breakdown</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => exportTaxReport(currentYear)}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Export {currentYear}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-secondary/20 border border-border/30">
          <DollarSign className="w-5 h-5 text-neon-cyan mb-2" />
          <p className="text-2xl font-bold text-neon-cyan">${currentYearData.totalRevenue.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Total Revenue</p>
        </div>
        <div className="p-4 rounded-xl bg-secondary/20 border border-border/30">
          <Percent className="w-5 h-5 text-neon-magenta mb-2" />
          <p className="text-2xl font-bold text-neon-magenta">{currentYearData.effectiveTaxRate}%</p>
          <p className="text-[10px] text-muted-foreground mt-1">Platform Fees</p>
        </div>
        <div className="p-4 rounded-xl bg-secondary/20 border border-border/30">
          <DollarSign className="w-5 h-5 text-neon-purple mb-2" />
          <p className="text-2xl font-bold text-neon-purple">${currentYearData.netEarnings.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Net Earnings</p>
        </div>
        <div className="p-4 rounded-xl bg-secondary/20 border border-border/30">
          <FileText className="w-5 h-5 text-neon-turquoise mb-2" />
          <p className="text-2xl font-bold text-neon-turquoise">{currentYearData.transactions}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Transactions</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30">
              <th className="text-left py-3 px-2 text-muted-foreground font-medium">Year</th>
              <th className="text-right py-3 px-2 text-muted-foreground font-medium">Total Revenue</th>
              <th className="text-right py-3 px-2 text-muted-foreground font-medium">Platform Fees</th>
              <th className="text-right py-3 px-2 text-muted-foreground font-medium">Net Earnings</th>
              <th className="text-right py-3 px-2 text-muted-foreground font-medium">Fee Rate</th>
              <th className="text-right py-3 px-2 text-muted-foreground font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {taxData.map((yearData) => (
              <tr key={yearData.year} className="border-b border-border/20 hover:bg-secondary/10 transition-colors">
                <td className="py-3 px-2 font-semibold">
                  <NeonBadge color="cyan">{yearData.year}</NeonBadge>
                </td>
                <td className="text-right py-3 px-2 font-medium text-neon-cyan">
                  ${yearData.totalRevenue.toFixed(2)}
                </td>
                <td className="text-right py-3 px-2 text-neon-magenta">
                  ${yearData.platformFees.toFixed(2)}
                </td>
                <td className="text-right py-3 px-2 font-medium text-neon-purple">
                  ${yearData.netEarnings.toFixed(2)}
                </td>
                <td className="text-right py-3 px-2">
                  <NeonBadge color="magenta">{yearData.effectiveTaxRate}%</NeonBadge>
                </td>
                <td className="text-right py-3 px-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => exportTaxReport(yearData.year)}
                    className="h-7 text-xs"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Export
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
        <h3 className="font-semibold text-sm mb-2">Tax Information</h3>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Platform fees are automatically deducted from your earnings</li>
          <li>• Download annual reports for tax filing purposes</li>
          <li>• Keep records of all transactions for your accountant</li>
          <li>• Contact support for 1099 forms if applicable</li>
        </ul>
      </div>
    </GlassCard>
  );
}