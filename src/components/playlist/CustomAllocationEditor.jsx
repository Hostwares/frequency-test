import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Check, Loader2 } from 'lucide-react';

/**
 * Per-artist custom percentage allocation editor.
 * Shown only for Advanced / Advanced+ tier subscribers when allocation method is "custom".
 * Validates that all artist percentages total exactly 100% before saving.
 */
export default function CustomAllocationEditor({ playlist, onUpdate }) {
  const songIds = playlist?.song_ids || [];

  // Fetch songs to resolve artist_profile_id → artist_name
  const { data: songs = [], isLoading } = useQuery({
    queryKey: ['playlist-songs-for-alloc', songIds.join(',')],
    queryFn: async () => {
      if (!songIds.length) return [];
      const all = await base44.entities.Song.list('-created_date', 200);
      return all.filter((s) => songIds.includes(s.id));
    },
    enabled: songIds.length > 0,
  });

  // Build unique artist list from songs
  const artists = useMemo(() => {
    const map = new Map();
    for (const s of songs) {
      if (s.artist_profile_id && !map.has(s.artist_profile_id)) {
        map.set(s.artist_profile_id, {
          artist_profile_id: s.artist_profile_id,
          artist_name: s.artist_name || 'Unknown Artist',
        });
      }
    }
    return [...map.values()];
  }, [songs]);

  // Local percentage state — keyed by artist_profile_id
  const [percentages, setPercentages] = useState({});
  const [touched, setTouched] = useState(false);

  // Initialize from existing artist_allocations (weight = percentage)
  useEffect(() => {
    const initial = {};
    const existing = playlist?.artist_allocations || [];
    for (const a of existing) {
      if (a.artist_profile_id) {
        initial[a.artist_profile_id] = a.weight || 0;
      }
    }
    // Default: equal split
    if (artists.length > 0 && Object.keys(initial).length === 0) {
      const equal = Math.floor(100 / artists.length);
      let remainder = 100 - equal * artists.length;
      artists.forEach((a, i) => {
        initial[a.artist_profile_id] = equal + (i < remainder ? 1 : 0);
      });
    }
    setPercentages(initial);
  }, [artists, playlist?.artist_allocations]);

  const total = useMemo(
    () => artists.reduce((sum, a) => sum + (Number(percentages[a.artist_profile_id]) || 0), 0),
    [artists, percentages]
  );

  const isValid = total === 100 && artists.length > 0;

  const handleChange = (artistId, value) => {
    setTouched(true);
    const clamped = Math.max(0, Math.min(100, Number(value) || 0));
    setPercentages((prev) => ({ ...prev, [artistId]: clamped }));
  };

  const handleDistributeEvenly = () => {
    if (!artists.length) return;
    const equal = Math.floor(100 / artists.length);
    const remainder = 100 - equal * artists.length;
    const next = {};
    artists.forEach((a, i) => {
      next[a.artist_profile_id] = equal + (i < remainder ? 1 : 0);
    });
    setPercentages(next);
    setTouched(true);
  };

  const handleSave = () => {
    if (!isValid) return;
    const allocations = artists.map((a) => ({
      artist_profile_id: a.artist_profile_id,
      weight: Number(percentages[a.artist_profile_id]) || 0,
    }));
    onUpdate({ artist_allocations: allocations });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Loading artists...
      </div>
    );
  }

  if (artists.length === 0) {
    return (
      <div className="rounded-lg bg-secondary/50 p-3 mb-3">
        <p className="text-xs text-muted-foreground">
          Add songs to this playlist first to set custom artist allocations.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-secondary/30 border border-border/50 p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-foreground">Custom Artist Allocation</span>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-[10px] text-neon-cyan hover:text-neon-cyan"
          onClick={handleDistributeEvenly}
        >
          Distribute Evenly
        </Button>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {artists.map((a) => (
          <div key={a.artist_profile_id} className="flex items-center gap-2">
            <span className="text-xs flex-1 truncate">{a.artist_name}</span>
            <div className="flex items-center gap-1 w-24">
              <Input
                type="number"
                min="0"
                max="100"
                step="1"
                value={percentages[a.artist_profile_id] ?? ''}
                onChange={(e) => handleChange(a.artist_profile_id, e.target.value)}
                className="h-7 text-xs w-16"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-medium ${total === 100 ? 'text-green-400' : 'text-destructive'}`}>
            Total: {total}%
          </span>
          {touched && total !== 100 && (
            <AlertTriangle className="w-3 h-3 text-destructive" />
          )}
          {touched && total === 100 && (
            <Check className="w-3 h-3 text-green-400" />
          )}
        </div>
        <Button
          size="sm"
          className="h-7 text-xs"
          disabled={!isValid}
          onClick={handleSave}
        >
          Save Allocation
        </Button>
      </div>
      {touched && total !== 100 && (
        <p className="text-[10px] text-destructive mt-1.5">
          Percentages must total exactly 100%. Currently at {total}%.
        </p>
      )}
    </div>
  );
}