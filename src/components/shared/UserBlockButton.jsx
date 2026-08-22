import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Ban, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';

const BLOCK_REASONS = [
  { value: 'harassment', label: 'Harassment' },
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate_content', label: 'Inappropriate Content' },
  { value: 'scam_fraud', label: 'Scam or Fraud' },
  { value: 'other', label: 'Other' },
];

export default function UserBlockButton({ targetUserId, targetUserName, variant = 'ghost', size = 'sm' }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: existingBlock } = useQuery({
    queryKey: ['block-status', user?.id, targetUserId],
    queryFn: () => base44.entities.UserBlock.filter({ blocker_user_id: user.id, blocked_user_id: targetUserId, is_active: true }),
    enabled: !!user?.id && !!targetUserId,
    select: (data) => data?.[0],
  });

  const blockMutation = useMutation({
    mutationFn: (data) => base44.entities.UserBlock.create(data),
    onSuccess: () => {
      toast.success(`${targetUserName || 'User'} has been blocked.`);
      queryClient.invalidateQueries(['block-status']);
      queryClient.invalidateQueries(['my-blocked-users']);
      setOpen(false);
      setReason('');
    },
    onError: () => toast.error('Failed to block user.'),
  });

  const unblockMutation = useMutation({
    mutationFn: () => base44.entities.UserBlock.update(existingBlock.id, { is_active: false }),
    onSuccess: () => {
      toast.success(`${targetUserName || 'User'} has been unblocked.`);
      queryClient.invalidateQueries(['block-status']);
      queryClient.invalidateQueries(['my-blocked-users']);
    },
    onError: () => toast.error('Failed to unblock user.'),
  });

  if (existingBlock) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={() => unblockMutation.mutate()}
        disabled={unblockMutation.isPending}
        className="gap-2 text-green-500 hover:text-green-400"
      >
        <UserCheck className="w-4 h-4" />
        Unblock
      </Button>
    );
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className="gap-2 text-destructive hover:text-destructive"
      >
        <Ban className="w-4 h-4" />
        Block
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Block {targetUserName || 'User'}?</DialogTitle>
            <DialogDescription>
              Blocked users cannot send you messages or interact with your profile. You can unblock them anytime from your Security Center.
            </DialogDescription>
          </DialogHeader>

          <div>
            <label className="text-sm font-medium mb-2 block">Reason (optional)</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {BLOCK_REASONS.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => blockMutation.mutate({
                blocker_user_id: user.id,
                blocked_user_id: targetUserId,
                blocked_user_name: targetUserName || 'Unknown',
                reason: reason || 'other',
                is_active: true,
              })}
              disabled={blockMutation.isPending}
            >
              {blockMutation.isPending ? 'Blocking...' : 'Block User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}