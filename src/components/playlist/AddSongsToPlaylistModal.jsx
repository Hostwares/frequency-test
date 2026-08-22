import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Check, Music, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useCatalogAccess } from '@/hooks/useCatalogAccess';

export default function AddSongsToPlaylistModal({
  open,
  onOpenChange,
  allSongs,
  existingSongIds,
  onAdd,
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(new Set());
  const { canPlay } = useCatalogAccess();

  const existing = new Set(existingSongIds || []);
  const available = (allSongs || [])
    .filter((s) => !existing.has(s.id))
    .filter((s) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        (s.title || '').toLowerCase().includes(q) ||
        (s.artist_name || '').toLowerCase().includes(q)
      );
    });

  const toggle = (song) => {
    if (!canPlay(song)) {
      toast.error('This song requires a direct purchase before it can be added to a playlist.');
      return;
    }
    const next = new Set(selected);
    if (next.has(song.id)) next.delete(song.id);
    else next.add(song.id);
    setSelected(next);
  };

  const handleAdd = () => {
    const ids = [...selected];
    if (ids.length === 0) {
      toast.info('Select at least one song to add');
      return;
    }
    onAdd(ids);
    setSelected(new Set());
    setQuery('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add songs to playlist</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Search songs or artists..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ScrollArea className="h-72 pr-2">
          {available.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Music className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              No songs available to add
            </div>
          ) : (
            available.map((song) => {
              const sel = selected.has(song.id);
              const locked = !canPlay(song);
              return (
                <button
                  key={song.id}
                  type="button"
                  onClick={() => toggle(song)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    locked ? 'opacity-50 cursor-not-allowed' : sel ? 'bg-primary/15' : 'hover:bg-secondary/50'
                  }`}
                >
                  <div className="w-9 h-9 rounded overflow-hidden flex-shrink-0">
                    <img
                      src={song.cover_art || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=80'}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{song.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{song.artist_name}</p>
                  </div>
                  {locked ? (
                    <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  ) : sel ? (
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  ) : (
                    <Plus className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={selected.size === 0}>
            {selected.size > 0
              ? `Add ${selected.size} song${selected.size > 1 ? 's' : ''}`
              : 'Add Songs'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}