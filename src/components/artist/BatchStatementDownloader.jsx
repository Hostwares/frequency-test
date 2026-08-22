import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import JSZip from 'jszip';
import { Package, Loader2, CheckSquare, Square } from 'lucide-react';
import { format, subMonths, startOfMonth } from 'date-fns';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Button } from '@/components/ui/button';
import { computeStatement, generateStatementDoc, money } from '@/lib/statementBuilder';
import { toast } from 'sonner';

export default function BatchStatementDownloader({ artistProfile, user }) {
  const artistProfileId = artistProfile?.id;
  const [selected, setSelected] = useState(new Set());
  const [generating, setGenerating] = useState(false);

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const d = startOfMonth(subMonths(new Date(), i));
        return { key: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy') };
      }),
    []
  );

  // Reuse the same query keys as MonthlyStatementGenerator so React Query dedupes.
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

  const dataReady = !!artistProfileId;

  const preview = useMemo(() => {
    return monthOptions.map((m) => {
      const stmt = computeStatement({ orders, allocations, payouts, events }, m.key);
      return { ...m, net: stmt.netEarnings, gross: stmt.grossTotal, hasData: stmt.grossTotal > 0 || stmt.totalPaidOut > 0 };
    });
  }, [monthOptions, orders, allocations, payouts, events]);

  const toggle = (key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };
  const selectAll = () => setSelected(new Set(monthOptions.map((m) => m.key)));
  const clearAll = () => setSelected(new Set());

  const artistSlug = (artistProfile?.artist_name || 'artist').replace(/\s+/g, '-').toLowerCase();

  const handleDownload = async () => {
    const months = Array.from(selected).sort();
    if (months.length === 0) return;
    setGenerating(true);
    try {
      const zip = new JSZip();
      for (const monthKey of months) {
        const monthLabel = monthOptions.find((m) => m.key === monthKey)?.label || monthKey;
        const stmt = computeStatement({ orders, allocations, payouts, events }, monthKey);
        const doc = generateStatementDoc({ statement: stmt, artistProfile, user, monthKey, monthLabel });
        const blob = doc.output('blob');
        zip.file(`Frequency-Earnings-${artistSlug}-${monthKey}.pdf`, blob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Frequency-Earnings-${artistSlug}-${format(new Date(), 'yyyy-MM-dd')}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${months.length} statement${months.length === 1 ? '' : 's'} as ZIP`);
    } catch (err) {
      console.error('Batch ZIP generation failed', err);
      toast.error('Could not generate ZIP file');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <GlassCard hover={false} className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-neon-magenta/10 border border-neon-magenta/20">
          <Package className="w-5 h-5 text-neon-magenta" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display font-semibold text-base">Batch Statement Download</h2>
          <p className="text-xs text-muted-foreground">Select multiple months and download all statements as a single ZIP</p>
        </div>
        <NeonBadge color="magenta">ZIP</NeonBadge>
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">
          {selected.size} of {monthOptions.length} months selected
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={selectAll} disabled={!dataReady}>Select all</Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearAll} disabled={selected.size === 0}>Clear</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
        {preview.map((m) => {
          const checked = selected.has(m.key);
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => toggle(m.key)}
              className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-colors ${
                checked ? 'bg-primary/10 border-primary/40' : 'bg-secondary/20 border-border/30 hover:border-border/60'
              }`}
            >
              {checked ? <CheckSquare className="w-4 h-4 text-primary flex-shrink-0" /> : <Square className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{m.label}</p>
                <p className="text-[10px] text-muted-foreground">
                  {m.hasData ? `Net ${money(m.net)}` : 'No activity'}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/30">
        <p className="text-xs text-muted-foreground">
          {selected.size > 0 ? `${selected.size} PDF${selected.size === 1 ? '' : 's'} will be bundled` : 'Select months to continue'}
        </p>
        <Button
          onClick={handleDownload}
          disabled={selected.size === 0 || generating || !dataReady}
          className="bg-gradient-neon text-white gap-2"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
          {generating ? 'Bundling…' : 'Download as ZIP'}
        </Button>
      </div>
    </GlassCard>
  );
}