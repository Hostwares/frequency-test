import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileText, Download, Loader2, Calendar } from 'lucide-react';
import { format, subMonths, startOfMonth } from 'date-fns';
import { money, computeStatement, generateStatementDoc } from '@/lib/statementBuilder';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export default function MonthlyStatementGenerator({ artistProfile, user }) {
  const artistProfileId = artistProfile?.id;

  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = startOfMonth(subMonths(new Date(), i));
      return { key: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy') };
    });
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.key);

  const { data: orders = [] } = useQuery({
    queryKey: ['statement-orders', artistProfileId],
    queryFn: () => base44.entities.Order.filter({ artist_profile_id: artistProfileId, payment_status: 'paid' }),
    enabled: !!artistProfileId,
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['statement-allocations', artistProfileId],
    queryFn: () => base44.entities.SupportAllocation.filter({ artist_profile_id: artistProfileId, is_active: true }),
    enabled: !!artistProfileId,
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ['statement-payouts', artistProfileId],
    queryFn: () => base44.entities.ArtistPayout.filter({ artist_profile_id: artistProfileId }, '-processed_date'),
    enabled: !!artistProfileId,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['statement-events', artistProfileId],
    queryFn: () => base44.entities.Event.filter({ artist_profile_id: artistProfileId }),
    enabled: !!artistProfileId,
  });

  const statement = useMemo(
    () => computeStatement({ orders, allocations, payouts, events }, selectedMonth),
    [orders, allocations, payouts, events, selectedMonth]
  );

  const [generating, setGenerating] = useState(false);

  const generatePdf = () => {
    setGenerating(true);
    try {
      const monthLabel = monthOptions.find(m => m.key === selectedMonth)?.label || selectedMonth;
      const doc = generateStatementDoc({ statement, artistProfile, user, monthKey: selectedMonth, monthLabel });
      const fileName = `Frequency-Earnings-${(artistProfile?.artist_name || 'artist').replace(/\s+/g, '-').toLowerCase()}-${selectedMonth}.pdf`;
      doc.save(fileName);
      toast.success('Statement downloaded');
    } catch (err) {
      console.error('PDF generation failed', err);
      toast.error('Could not generate statement');
    } finally {
      setGenerating(false);
    }
  };

  const hasData = statement.grossTotal > 0 || statement.totalPaidOut > 0 || statement.eventRevenue > 0;

  return (
    <GlassCard hover={false} className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-neon-purple/10 border border-neon-purple/20">
          <FileText className="w-5 h-5 text-neon-purple" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display font-semibold text-base">Monthly Earnings Statement</h2>
          <p className="text-xs text-muted-foreground">Download a PDF of your earnings for your records</p>
        </div>
        <NeonBadge color="purple">PDF</NeonBadge>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
        <div className="flex-1 space-y-1.5">
          <label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Statement Month
          </label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={generatePdf}
          disabled={generating}
          className="gap-2"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {generating ? 'Generating…' : 'Download Statement'}
        </Button>
      </div>

      {/* Preview summary for the selected month */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
        <div className="p-3 rounded-lg bg-secondary/30 border border-border/40">
          <p className="text-[10px] text-muted-foreground">Gross Revenue</p>
          <p className="text-lg font-bold text-foreground">{money(statement.grossTotal)}</p>
        </div>
        <div className="p-3 rounded-lg bg-secondary/30 border border-border/40">
          <p className="text-[10px] text-muted-foreground">Platform Fees</p>
          <p className="text-lg font-bold text-destructive">-{money(statement.platformFees)}</p>
        </div>
        <div className="p-3 rounded-lg bg-secondary/30 border border-border/40">
          <p className="text-[10px] text-muted-foreground">Net Earnings</p>
          <p className="text-lg font-bold text-neon-purple">{money(statement.netEarnings)}</p>
        </div>
        <div className="p-3 rounded-lg bg-secondary/30 border border-border/40">
          <p className="text-[10px] text-muted-foreground">Paid Out</p>
          <p className="text-lg font-bold text-neon-cyan">{money(statement.totalPaidOut)}</p>
        </div>
      </div>

      {!hasData && (
        <p className="text-xs text-muted-foreground mt-3 text-center">
          No earnings recorded for this month. The statement will still generate as a blank record.
        </p>
      )}
    </GlassCard>
  );
}