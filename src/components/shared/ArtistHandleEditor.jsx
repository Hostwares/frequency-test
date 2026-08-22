import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function ArtistHandleEditor({ artist }) {
  const [handle, setHandle] = useState(artist.artist_handle || '');
  const [available, setAvailable] = useState(null);
  const queryClient = useQueryClient();

  const normalizeHandle = (val) => val.toLowerCase().replace(/[^a-z0-9_]/g, '');

  const checkMutation = useMutation({
    mutationFn: async (rawHandle) => {
      const normalized = normalizeHandle(rawHandle);
      const res = await base44.functions.invoke('validateArtistHandle', {
        handle: normalized,
        artist_id: artist.id,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setAvailable(data.available);
      if (!data.available) toast.error(data.message || 'Handle is taken');
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (rawHandle) => {
      const normalized = normalizeHandle(rawHandle);
      const previous = artist.artist_handle
        ? [...(artist.previous_handles || []), artist.artist_handle]
        : artist.previous_handles || [];

      await base44.entities.ArtistProfile.update(artist.id, {
        artist_handle: normalized,
        previous_handles: previous,
      });
      return normalized;
    },
    onSuccess: (savedHandle) => {
      toast.success(`Artist handle !${savedHandle} saved`);
      queryClient.invalidateQueries({ queryKey: ['artist'] });
      queryClient.invalidateQueries({ queryKey: ['all-artists'] });
      setAvailable(null);
    },
    onError: () => toast.error('Failed to save handle'),
  });

  const handleChange = (e) => {
    const val = normalizeHandle(e.target.value);
    setHandle(val);
    setAvailable(null);
    if (val.length >= 3 && val !== artist.artist_handle) {
      checkMutation.mutate(val);
    }
  };

  const handleSave = () => {
    if (!handle || handle.length < 3) {
      toast.error('Handle must be at least 3 characters');
      return;
    }
    if (!available && handle !== artist.artist_handle) {
      toast.error('Handle is not available');
      return;
    }
    saveMutation.mutate(handle);
  };

  const isSame = handle === artist.artist_handle;

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
          Artist Handle
        </label>
        <div className="flex items-center gap-2">
          <span className="text-neon-cyan font-mono font-bold text-lg">!</span>
          <Input
            value={handle}
            onChange={handleChange}
            placeholder="artistname"
            className="flex-1 font-mono bg-secondary/50 border-border/50"
            maxLength={30}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Lowercase letters, numbers, and underscores only. 3-30 characters.
        </p>
      </div>

      {handle && handle.length >= 3 && !isSame && (
        <div className="flex items-center gap-2 text-xs">
          {checkMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
          ) : available ? (
            <span className="text-neon-cyan flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Available
            </span>
          ) : (
            <span className="text-destructive flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Not available
            </span>
          )}
        </div>
      )}

      <Button
        size="sm"
        disabled={isSame || !available || saveMutation.isPending}
        onClick={handleSave}
      >
        {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Handle'}
      </Button>
    </div>
  );
}