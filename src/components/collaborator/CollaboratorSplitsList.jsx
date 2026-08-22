import React, { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Check, X, SplitSquareHorizontal, Music, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Button } from '@/components/ui/button';
import { getRoleLabel, getSplitTypeLabel, getPaymentMethodLabel } from '@/lib/splitConstants';
import { toast } from 'sonner';

const STATUS_STYLES = {
  draft: 'muted',
  pending_approval: 'cyan',
  active: 'turquoise',
  archived: 'blue',
};

const APPROVAL_STYLES = {
  pending: { color: 'cyan', label: 'Pending Your Approval' },
  approved: { color: 'turquoise', label: 'Approved' },
  rejected: { color: 'blue', label: 'Rejected' },
  needs_revision: { color: 'magenta', label: 'Needs Revision' },
};

function updateCollaborator(split, userId, fields) {
  const collaborators = (split.collaborators || []).map((c) =>
    c.collaborator_user_id === userId ? { ...c, ...fields } : c
  );
  return base44.entities.RevenueSplit.update(split.id, { collaborators });
}

export default function CollaboratorSplitsList({ splits, userId }) {
  const queryClient = useQueryClient();

  const myEntries = useMemo(() => {
    return splits
      .map((split) => {
        const entry = (split.collaborators || []).find((c) => c.collaborator_user_id === userId);
        return entry ? { split, entry } : null;
      })
      .filter(Boolean);
  }, [splits, userId]);

  const approvalMutation = useMutation({
    mutationFn: async ({ split, status }) => {
      await updateCollaborator(split, userId, {
        approval_status: status,
        approved_date: status === 'approved' ? new Date().toISOString() : null,
      });
    },
    onSuccess: (_d, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['collaborator-splits'] });
      toast.success(status === 'approved' ? 'Split approved' : 'Split rejected');
    },
    onError: () => toast.error('Could not update approval'),
  });

  if (myEntries.length === 0) {
    return (
      <GlassCard hover={false} className="p-8 text-center">
        <SplitSquareHorizontal className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">You haven't been assigned to any revenue splits yet.</p>
        <p className="text-xs text-muted-foreground mt-1">When an artist adds you as a collaborator, your splits will appear here.</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-3">
      {myEntries.map(({ split, entry }) => {
        const approval = APPROVAL_STYLES[entry.approval_status] || APPROVAL_STYLES.pending;
        const canApprove = split.status === 'pending_approval' && entry.approval_status === 'pending';
        return (
          <GlassCard key={split.id} hover={false} className="p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Music className="w-4 h-4 text-neon-purple flex-shrink-0" />
                  <h3 className="font-semibold text-sm truncate">{split.split_name}</h3>
                  <NeonBadge color={STATUS_STYLES[split.status] || 'muted'}>
                    {split.status?.replace('_', ' ')}
                  </NeonBadge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {getSplitTypeLabel(split.split_type)}
                  {split.release_name ? ` · ${split.release_name}` : ''}
                  {split.song_name ? ` · ${split.song_name}` : ''}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Role: <span className="text-foreground font-medium">{getRoleLabel(entry.role)}</span></span>
                  <span>Share: <span className="text-neon-purple font-semibold">{entry.revenue_percentage}%</span></span>
                  <span>Payout: <span className="text-foreground">{getPaymentMethodLabel(entry.payment_method)}</span></span>
                  {split.effective_date && (
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Effective {format(new Date(split.effective_date), 'MMM d, yyyy')}</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-start md:items-end gap-2">
                <NeonBadge color={approval.color}>{approval.label}</NeonBadge>
                {canApprove && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => approvalMutation.mutate({ split, status: 'approved' })}
                      disabled={approvalMutation.isPending}
                      className="gap-1.5 h-8"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => approvalMutation.mutate({ split, status: 'rejected' })}
                      disabled={approvalMutation.isPending}
                      className="gap-1.5 h-8"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}