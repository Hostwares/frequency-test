import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Headphones, Lock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ensureFrequencySuffix } from '@/lib/naming';

export default function CreatePlaylistModal({ open, onClose }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('fan');
  const [isFunded, setIsFunded] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [limitCheck, setLimitCheck] = useState(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Playlist.create({
        name: ensureFrequencySuffix(name),
        description,
        type,
        owner_user_id: user.id,
        song_ids: [],
        follower_count: 0,
        is_living: true,
        is_funded_network: isFunded,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-playlists'] });
      toast.success('Playlist created!');
      setName(''); setDescription(''); setType('fan'); setIsFunded(false);
      setLimitCheck(null);
      onClose();
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to create playlist. Please try again.');
    },
  });

  const handleToggleFunded = async (checked) => {
    setIsFunded(checked);
    setLimitCheck(null);
    if (!checked) return;
    try {
      const res = await base44.functions.invoke('validateFundedNetworkChanges', { action: 'create_funded' });
      const data = res.data || {};
      const limitErr = (data.errors || []).find((e) => e.type === 'funded_network_limit_reached');
      if (limitErr) {
        setLimitCheck(limitErr);
      } else {
        setLimitCheck({
          ok: true,
          limit: data.summary?.max_funded_networks,
          current: data.summary?.funded_networks_count,
        });
      }
    } catch {
      // non-fatal: allow the toggle; creation will surface any backend error
    }
  };

  const handleCreate = () => {
    if (limitCheck && limitCheck.type === 'funded_network_limit_reached') {
      toast.error('Funded network limit reached', {
        description: limitCheck.message,
        action: { label: 'Upgrade', onClick: () => navigate('/pricing') },
        duration: 6000,
      });
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border/50 max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Headphones className="w-4 h-4 text-neon-purple" /> Create Playlist
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div>
            <Input placeholder="Playlist name" value={name} onChange={e => setName(e.target.value)} />
            {name.trim() && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Final name: <span className="text-neon-cyan font-medium">{ensureFrequencySuffix(name)}</span>
              </p>
            )}
          </div>
          <Textarea placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} className="min-h-[70px] resize-none text-sm" />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fan">Fan Playlist</SelectItem>
              <SelectItem value="artist">Artist Playlist</SelectItem>
              <SelectItem value="community">Community Playlist</SelectItem>
              <SelectItem value="network">Network Playlist</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2.5">
            <div>
              <Label className="text-xs font-medium">Funded Network</Label>
              <p className="text-[11px] text-muted-foreground">Receives a share of your subscription pool</p>
            </div>
            <Switch checked={isFunded} onCheckedChange={handleToggleFunded} />
          </div>
          {isFunded && limitCheck?.type === 'funded_network_limit_reached' && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 flex items-start gap-2">
              <Lock className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-destructive mb-2">{limitCheck.message}</p>
                <Button size="sm" variant="outline" className="h-7 text-xs border-primary/40 text-primary hover:bg-primary/10" onClick={() => navigate('/pricing')}>
                  Upgrade your plan
                </Button>
              </div>
            </div>
          )}
          {isFunded && limitCheck?.ok && (
            <p className="text-[11px] text-muted-foreground">
              Funded networks: {limitCheck.current} / {limitCheck.limit}
            </p>
          )}
          <Button className="w-full bg-gradient-neon text-white" onClick={() => name.trim() && handleCreate()} disabled={!name.trim() || mutation.isPending}>
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Create Playlist
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}