import React from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { Play, X, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function QueuePanel() {
  const { queue, currentIndex, isPlaying, playTrack, removeFromQueue, clearQueue, currentTrack } = usePlayer();

  if (queue.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">Queue is empty</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <h3 className="font-display font-semibold text-sm">Up Next ({queue.length})</h3>
        <Button variant="ghost" size="sm" onClick={clearQueue} className="text-xs gap-1 text-muted-foreground hover:text-destructive">
          <Trash2 className="w-3.5 h-3.5" />
          Clear
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="px-2 py-2 space-y-1">
          {queue.map((song, i) => {
            const isCurrent = i === currentIndex;
            return (
              <div
                key={`${song.id}-${i}`}
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors group ${
                  isCurrent ? 'bg-primary/10' : 'hover:bg-secondary/40'
                }`}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
                <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 relative">
                  <img
                    src={song.cover_art || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=80&q=80'}
                    alt={song.title}
                    className="w-full h-full object-cover"
                  />
                  {isCurrent && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      {isPlaying ? (
                        <div className="flex items-end gap-[2px] h-4">
                          {[0, 1, 2].map(j => (
                            <div
                              key={j}
                              className="w-[2px] bg-neon-cyan rounded-full animate-waveform"
                              style={{ animationDelay: `${j * 0.15}s`, height: '100%' }}
                            />
                          ))}
                        </div>
                      ) : (
                        <Play className="w-3 h-3 text-white fill-white" />
                      )}
                    </div>
                  )}
                </div>
                <button
                  className="flex-1 min-w-0 text-left"
                  onClick={() => playTrack(song, queue)}
                >
                  <p className={`text-sm truncate ${isCurrent ? 'text-primary font-medium' : 'text-foreground'}`}>
                    {song.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{song.artist_name}</p>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                  onClick={() => removeFromQueue(i)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}