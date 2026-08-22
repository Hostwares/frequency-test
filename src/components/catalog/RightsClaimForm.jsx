import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CLAIM_TYPES = [
  { value: 'copyright_infringement', label: 'Copyright Infringement' },
  { value: 'ownership_dispute', label: 'Ownership Dispute' },
  { value: 'unauthorized_use', label: 'Unauthorized Use' },
  { value: 'split_dispute', label: 'Split Dispute' },
  { value: 'mechanical_rights_dispute', label: 'Mechanical Rights Dispute' },
  { value: 'publishing_dispute', label: 'Publishing Dispute' },
  { value: 'neighboring_rights_dispute', label: 'Neighboring Rights Dispute' },
  { value: 'master_ownership_dispute', label: 'Master Ownership Dispute' },
];

const RIGHTS_CATEGORIES = [
  { value: 'master_ownership', label: 'Master Ownership' },
  { value: 'publishing', label: 'Publishing' },
  { value: 'mechanical', label: 'Mechanical' },
  { value: 'neighboring', label: 'Neighboring Rights' },
  { value: 'performance', label: 'Performance' },
  { value: 'synchronization', label: 'Synchronization' },
];

export default function RightsClaimForm({ song, artistProfile, user, isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    claim_type: 'copyright_infringement',
    rights_category: 'master_ownership',
    description: '',
    original_work_title: '',
    original_work_url: '',
    claimed_percentage: '',
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RightsClaim.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['rights-claims']);
      toast.success('Rights claim filed');
      onClose();
      setForm({ claim_type: 'copyright_infringement', rights_category: 'master_ownership', description: '', original_work_title: '', original_work_url: '', claimed_percentage: '' });
    },
  });

  const handleSubmit = () => {
    if (!form.description.trim()) { toast.error('Description required'); return; }
    createMutation.mutate({
      ...form,
      song_id: song.id,
      song_title: song.title,
      artist_profile_id: artistProfile.id,
      claimant_user_id: user.id,
      claimant_name: user.full_name || user.email,
      claimed_percentage: form.claimed_percentage ? Number(form.claimed_percentage) : undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle>File Rights Claim — {song?.title}</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-4 space-y-3 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Claim Type</Label>
              <Select value={form.claim_type} onValueChange={(v) => setForm({ ...form, claim_type: v })}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{CLAIM_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Rights Category</Label>
              <Select value={form.rights_category} onValueChange={(v) => setForm({ ...form, rights_category: v })}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{RIGHTS_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Description *</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the rights issue in detail..." rows={4} className="text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Original Work Title</Label>
              <Input value={form.original_work_title} onChange={(e) => setForm({ ...form, original_work_title: e.target.value })} className="text-sm" />
            </div>
            <div>
              <Label className="text-xs">Claimed %</Label>
              <Input type="number" value={form.claimed_percentage} onChange={(e) => setForm({ ...form, claimed_percentage: e.target.value })} placeholder="50" className="text-sm" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Original Work URL</Label>
            <Input value={form.original_work_url} onChange={(e) => setForm({ ...form, original_work_url: e.target.value })} className="text-sm" />
          </div>
        </div>
        <DialogFooter className="px-6 py-4 border-t border-border/30">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? <><Loader2 className="w-3 h-3 animate-spin" /> Filing...</> : 'File Claim'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}