import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Zap, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { getRoleLabel, getSourceLabel, getPaymentMethodLabel } from '@/lib/splitConstants';
import { useToast } from '@/components/ui/use-toast';

const METHOD_INSTANT = (m) => m === 'frequency_wallet' || m === 'manual';

export default function BatchPayoutProcessor({ artistProfile }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(new Set());

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ['batch-payout-pending', artistProfile?.id],
    queryFn: () => base44.entities.CollaboratorEarning.filter(
      { artist_profile_id: artistProfile?.id, payment_status: 'pending' },
      '-created_date', 500
    ),
    enabled: !!artistProfile?.id,
  });

  const { data: processing = [] } = useQuery({
    queryKey: ['batch-payout-processing', artistProfile?.id],
    queryFn: () => base44.entities.CollaboratorEarning.filter(
      { artist_profile_id: artistProfile?.id, payment_status: 'processing' },
      '-created_date', 500
    ),
    enabled: !!artistProfile?.id,
  });

  const queue = useMemo(() => [...pending, ...processing], [pending, processing]);

  const selectedAmount = useMemo(
    () => queue.filter((e) => selected.has(e.id)).reduce((s, e) => s + (e.collaborator_amount || 0), 0),
    [queue, selected]
  );

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(queue.map((e) => e.id)));
  const selectInstant = () => setSelected(new Set(queue.filter((e) => METHOD_INSTANT(e.payment_method)).map((e) => e.id)));
  const clearAll = () => setSelected(new Set());

  const mutation = useMutation({
    mutationFn: (ids) => base44.functions.invoke('batchProcessCollaboratorPayouts', { earning_ids: ids }),
    onSuccess: (res) => {
      const d = res?.data || res;
      toast({
        title: 'Batch payout processed',
        description: `${d.processed} payment${d.processed === 1 ? '' : 's'} triggered · $${Number(d.total_amount || 0).toFixed(2)} (${d.paid_instantly} paid, ${d.moved_to_processing} processing)`,
      });
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ['batch-payout-pending', artistProfile?.id] });
      queryClient.invalidateQueries({ queryKey: ['batch-payout-processing', artistProfile?.id] });
      queryClient.invalidateQueries({ queryKey: ['collaborator-earnings-summary', artistProfile?.id] });
      queryClient.invalidateQueries({ queryKey: ['revenue-splits-analytics', artistProfile?.id] });
    },
    onError: (err) => {
      toast({ title: 'Batch payout failed', description: err?.response?.data?.error || err?.message, variant: 'destructive' });
    },
  });

  const handleProcess = () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    mutation.mutate(ids);
  };

  if (isLoading) {
    return (
      <GlassCard hover={false} className="p-5 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading pending payments...
      </GlassCard>
    );
  }

  if (queue.length === 0) {
    return (
      <GlassCard hover={false} className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="w-4 h-4 text-neon-turquoise" />
          <h4 className="font-display font-semibold text-sm">Batch Payout Processor</h4>
        </div>
        <p className="text-xs text-muted-foreground">No pending collaborator payments. New payouts appear here automatically when revenue is distributed from your active splits.</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard hover={false} className="p-5">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-neon-magenta" />
            <h4 className="font-display font-semibold text-sm">Batch Payout Processor</h4>
            <NeonBadge color="magenta">{queue.length} pending</NeonBadge>
          </div>
          <p className="text-xs text-muted-foreground">Select multiple collaborator payments and trigger them together instead of one by one.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={selectAll}>Select all</Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={selectInstant}>Instant only</Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearAll}>Clear</Button>
        </div>
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {queue.map((e) => {
          const checked = selected.has(e.id);
          const instant = METHOD_INSTANT(e.payment_method);
          return (
            <label
              key={e.id}
              className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                checked ? 'bg-primary/10 border-primary/40' : 'bg-secondary/20 border-border/30 hover:border-border/60'
              }`}
            >
              <Checkbox checked={checked} onCheckedChange={() => toggle(e.id)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate">{e.collaborator_name}</span>
                  <NeonBadge color="blue">{getRoleLabel(e.collaborator_role)}</NeonBadge>
                  <NeonBadge color={instant ? 'turquoise' : 'cyan'}>
                    {instant ? 'Instant' : 'Processing'}
                  </NeonBadge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {e.split_name} · {getSourceLabel(e.revenue_source)} · {getPaymentMethodLabel(e.payment_method)}
                  {e.earning_period_month && e.earning_period_year ? ` · ${e.earning_period_year}-${String(e.earning_period_month).padStart(2, '0')}` : ''}
                </p>
              </div>
              <span className="font-semibold text-neon-purple text-sm flex-shrink-0">${(e.collaborator_amount || 0).toFixed(2)}</span>
            </label>
          );
        })}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 mt-4 pt-4 border-t border-border/30">
        <p className="text-xs text-muted-foreground">
          {selected.size} selected · <span className="text-neon-purple font-semibold">${selectedAmount.toFixed(2)}</span>
        </p>
        <Button
          className="bg-gradient-neon text-white"
          disabled={selected.size === 0 || mutation.isPending}
          onClick={handleProcess}
        >
          {mutation.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Zap className="w-4 h-4 mr-1.5" />}
          Approve & Trigger {selected.size > 0 ? `${selected.size} ` : ''}Payment{selected.size === 1 ? '' : 's'}
        </Button>
      </div>

      {mutation.isError && (
        <div className="flex items-center gap-2 mt-3 text-xs text-destructive">
          <AlertTriangle className="w-3.5 h-3.5" />
          Failed to process batch. Try again or process individually.
        </div>
      )}
    </GlassCard>
  );
}