import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Lock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import SongRow from '@/components/shared/SongRow';
import NeonBadge from '@/components/shared/NeonBadge';

export const LOCK_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Align stored entries to the current song_ids order, backfilling any missing
// entry with the playlist's created_date as the fallback add date.
export function buildEntries(songIds, existingEntries, fallbackDate) {
  const map = new Map((existingEntries || []).map((e) => [e.song_id, e]));
  return (songIds || []).map((id) => map.get(id) || { song_id: id, added_date: fallbackDate });
}

export function lockUntil(entry) {
  if (!entry?.added_date) return null;
  return new Date(new Date(entry.added_date).getTime() + LOCK_DAYS * MS_PER_DAY);
}

export function isLocked(entry) {
  const until = lockUntil(entry);
  return until ? Date.now() < until.getTime() : false;
}

export default function PlaylistSongList({
  songs,
  songIds,
  entries,
  fallbackDate,
  onReorder,
  onRemove,
}) {
  const entryMap = new Map((entries || []).map((e) => [e.song_id, e]));

  const onDragEnd = (result) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    const next = [...songIds];
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    onReorder(next);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="playlist-songs">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            {songs.map((song, index) => {
              const entry = entryMap.get(song.id) || { song_id: song.id, added_date: fallbackDate };
              const locked = isLocked(entry);
              const until = lockUntil(entry);
              return (
                <Draggable key={song.id} draggableId={song.id} index={index}>
                  {(drag) => (
                    <div
                      ref={drag.innerRef}
                      {...drag.draggableProps}
                      className="flex items-center gap-1 rounded-lg hover:bg-secondary/40 transition-colors"
                    >
                      <span
                        {...drag.dragHandleProps}
                        className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-foreground px-1 sm:px-2 flex-shrink-0 self-stretch flex items-center"
                        title="Drag to reorder"
                      >
                        <GripVertical className="w-4 h-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <SongRow song={song} index={index} queue={songs} showArtist />
                      </div>
                      <div className="flex items-center gap-2 pr-1 sm:pr-3 flex-shrink-0">
                        {locked && until && (
                          <span className="hidden lg:inline-block">
                            <NeonBadge color="magenta">
                              <Lock className="w-3 h-3 mr-1 inline" />
                              Until {until.toLocaleDateString()}
                            </NeonBadge>
                          </span>
                        )}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-8 h-8"
                                  disabled={locked}
                                  onClick={() => onRemove(song)}
                                >
                                  {locked ? (
                                    <Lock className="w-4 h-4 text-muted-foreground" />
                                  ) : (
                                    <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                                  )}
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {locked
                                ? `Disbursement lock — removable after ${until.toLocaleDateString()}`
                                : 'Remove from playlist'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}