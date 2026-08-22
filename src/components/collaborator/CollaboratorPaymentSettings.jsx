import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CreditCard, Loader2 } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PAYMENT_METHODS, getRoleLabel, getPaymentMethodLabel } from '@/lib/splitConstants';
import { toast } from 'sonner';

const PAY_STATUS = {
  pending_setup: { color: 'yellow', label: 'Pending Setup' },
  verified: { color: 'cyan', label: 'Verified' },
  ready: { color: 'turquoise', label: 'Ready' },
  suspended: { color: 'magenta', label: 'Suspended' },
};

export default function CollaboratorPaymentSettings({ splits, userId }) {
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState(null);

  const myEntries = useMemo(() => {
    return splits
      .map((split) => {
        const entry = (split.collaborators || []).find((c) => c.collaborator_user_id === userId);
        return entry ? { split, entry } : null;
      })
      .filter(Boolean);
  }, [splits, userId]);

  const updateMutation = useMutation({
    mutationFn: async ({ split, method }) => {
      setBusyId(split.id);
      const collaborators = (split.collaborators || []).map((c) =>
        c.collaborator_user_id === userId
          ? { ...c, payment_method: method, payment_status: method === 'manual' ? 'pending_setup' : 'verified' }
          : c
      );
      return base44.entities.RevenueSplit.update(split.id, { collaborators });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborator-splits'] });
      toast.success('Payment method updated');
    },
    onError: () => toast.error('Could not update payment method'),
    onSettled: () => setBusyId(null),
  });

  return (
    <GlassCard hover={false} className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="w-4 h-4 text-neon-magenta" />
        <h3 className="font-display font-semibold text-sm">Payment Information</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Choose how you'd like to receive your share of earnings for each split. Frequency Wallet payouts are available immediately; other methods may require additional verification.
      </p>

      {myEntries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No payment methods to manage yet.</p>
      ) : (
        <div className="space-y-3">
          {myEntries.map(({ split, entry }) => (
            <div key={split.id} className="p-3 rounded-lg bg-secondary/20 border border-border/30">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{split.split_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {getRoleLabel(entry.role)} · {entry.revenue_percentage}% share
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <NeonBadge color={(PAY_STATUS[entry.payment_status] || PAY_STATUS.pending_setup).color}>
                    {(PAY_STATUS[entry.payment_status] || PAY_STATUS.pending_setup).label}
                  </NeonBadge>
                  <Select
                    value={entry.payment_method || 'frequency_wallet'}
                    onValueChange={(method) => updateMutation.mutate({ split, method })}
                    disabled={busyId === split.id}
                  >
                    <SelectTrigger className="w-[180px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {busyId === split.id && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}