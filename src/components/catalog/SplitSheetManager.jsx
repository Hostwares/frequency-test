import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, CheckCircle2, Clock, FileText, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const RIGHTS_TYPES = [
  { value: 'master_ownership', label: 'Master Ownership' },
  { value: 'publishing', label: 'Publishing' },
  { value: 'mechanical', label: 'Mechanical' },
  { value: 'neighboring', label: 'Neighboring Rights' },
  { value: 'performance', label: 'Performance' },
  { value: 'synchronization', label: 'Synchronization' },
];

const OWNER_ROLES = [
  'primary_artist', 'featured_artist', 'songwriter', 'producer', 'publisher', 'label', 'session_musician', 'engineer', 'co_writer', 'co_producer', 'other',
];

export default function SplitSheetManager({ song, artistProfile, isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newSplit, setNewSplit] = useState({
    rights_type: 'master_ownership', owner_name: '', owner_role: 'primary_artist',
    split_percentage: '', territory: 'Worldwide', notes: '',
  });

  const { data: splits = [], isLoading } = useQuery({
    queryKey: ['split-sheets', song?.id],
    queryFn: () => base44.entities.SplitSheet.filter({ song_id: song?.id }),
    enabled: !!song?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SplitSheet.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['split-sheets']);
      toast.success('Split sheet entry added');
      setShowAdd(false);
      setNewSplit({ rights_type: 'master_ownership', owner_name: '', owner_role: 'primary_artist', split_percentage: '', territory: 'Worldwide', notes: '' });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id) => base44.entities.SplitSheet.update(id, { is_approved: true, approved_date: new Date().toISOString() }),
    onSuccess: () => { queryClient.invalidateQueries(['split-sheets']); toast.success('Split approved'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SplitSheet.delete(id),
    onSuccess: () => { queryClient.invalidateQueries(['split-sheets']); toast.success('Split removed'); },
  });

  const handleAdd = () => {
    if (!newSplit.owner_name.trim()) { toast.error('Owner name required'); return; }
    if (!newSplit.split_percentage || Number(newSplit.split_percentage) <= 0) { toast.error('Valid percentage required'); return; }
    createMutation.mutate({
      ...newSplit,
      song_id: song.id,
      song_title: song.title,
      artist_profile_id: artistProfile.id,
      split_percentage: Number(newSplit.split_percentage),
    });
  };

  // Group by rights type
  const grouped = RIGHTS_TYPES.reduce((acc, rt) => {
    const items = splits.filter(s => s.rights_type === rt.value);
    if (items.length > 0) {
      const total = items.reduce((sum, s) => sum + (s.split_percentage || 0), 0);
      acc.push({ ...rt, items, total });
    }
    return acc;
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[85vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Split Sheet — {song?.title}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">Manage ownership splits across all rights categories</p>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh] px-6 pb-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading splits...</p>
          ) : grouped.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-border/50 rounded-xl">
              <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No split sheet entries yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Add owners and their percentage splits for each rights type</p>
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map(group => (
                <div key={group.value} className="border border-border/40 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-secondary/30">
                    <span className="text-xs font-semibold uppercase tracking-wider">{group.label}</span>
                    <span className={`text-xs font-mono ${group.total === 100 ? 'text-neon-cyan' : 'text-yellow-500'}`}>
                      {group.total}% {group.total === 100 ? '✓' : '(should be 100%)'}
                    </span>
                  </div>
                  <div className="divide-y divide-border/20">
                    {group.items.map(split => (
                      <div key={split.id} className="flex items-center gap-3 px-3 py-2 group">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{split.owner_name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{split.owner_role.replace(/_/g, ' ')}</p>
                          {split.territory && <p className="text-[10px] text-muted-foreground/60">{split.territory}</p>}
                        </div>
                        <span className="text-sm font-mono font-bold">{split.split_percentage}%</span>
                        {split.is_approved ? (
                          <span className="flex items-center gap-1 text-[10px] text-neon-cyan">
                            <CheckCircle2 className="w-3 h-3" /> Approved
                          </span>
                        ) : (
                          <Button variant="ghost" size="sm" className="h-6 text-xs text-yellow-500 hover:text-yellow-400" onClick={() => approveMutation.mutate(split.id)}>
                            <Clock className="w-3 h-3" /> Pending
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="w-7 h-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(split.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {showAdd && (
          <div className="px-6 py-3 border-t border-border/30 space-y-2 bg-secondary/20">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Rights Type</Label>
                <Select value={newSplit.rights_type} onValueChange={(v) => setNewSplit({ ...newSplit, rights_type: v })}>
                  <SelectTrigger className="text-sm h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>{RIGHTS_TYPES.map(rt => <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Owner Role</Label>
                <Select value={newSplit.owner_role} onValueChange={(v) => setNewSplit({ ...newSplit, owner_role: v })}>
                  <SelectTrigger className="text-sm h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>{OWNER_ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label className="text-xs">Owner Name</Label>
                <Input value={newSplit.owner_name} onChange={(e) => setNewSplit({ ...newSplit, owner_name: e.target.value })} placeholder="Name or company" className="text-sm h-8" />
              </div>
              <div>
                <Label className="text-xs">Split %</Label>
                <Input type="number" value={newSplit.split_percentage} onChange={(e) => setNewSplit({ ...newSplit, split_percentage: e.target.value })} placeholder="50" className="text-sm h-8" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Territory</Label>
              <Input value={newSplit.territory} onChange={(e) => setNewSplit({ ...newSplit, territory: e.target.value })} className="text-sm h-8" />
            </div>
          </div>
        )}

        <DialogFooter className="px-6 py-4 border-t border-border/30">
          {showAdd ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAdd} disabled={createMutation.isPending}>Add Split</Button>
            </>
          ) : (
            <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4" /> Add Split Entry
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}