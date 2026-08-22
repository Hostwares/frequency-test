import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GitBranch, Play, Pause, Clock, Music, Calendar, FileText } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import SongVersionBadge from '@/components/catalog/SongVersionBadge';

const VERSION_LABELS = {
  original: 'Original', acoustic: 'Acoustic', radio_edit: 'Radio Edit', instrumental: 'Instrumental',
  explicit: 'Explicit', clean: 'Clean', alternate_mix: 'Alternate Mix', remix: 'Remix',
  live: 'Live', demo: 'Demo', extended: 'Extended', other: 'Other',
};

export default function VersionHistoryModal({ song, allSongs, isOpen, onClose }) {
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['song-versions', song?.id],
    queryFn: () => base44.entities.Song.filter({ parent_song_id: song?.id }, '-created_date'),
    enabled: !!song?.id,
  });

  const formatDuration = (sec) => {
    if (!sec) return '--:--';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const allVersions = [song, ...versions].filter(Boolean);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary" /> Version History
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">{song?.title} · {allVersions.length} version{allVersions.length !== 1 ? 's' : ''}</p>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] px-6 pb-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading versions...</p>
          ) : (
            <div className="space-y-2">
              {allVersions.map((v, idx) => {
                const isOriginal = v.version_type === 'original' || idx === 0;
                const isCurrent = currentTrack?.id === v.id;
                const showPause = isCurrent && isPlaying;

                return (
                  <div
                    key={v.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      isCurrent ? 'border-primary/40 bg-primary/5' : 'border-border/40 bg-card/40'
                    }`}
                  >
                    <button
                      onClick={() => isCurrent ? togglePlay() : playTrack(v, allVersions)}
                      className="w-9 h-9 rounded-lg bg-secondary/40 flex items-center justify-center flex-shrink-0 hover:bg-primary/20 transition-colors"
                    >
                      {showPause ? <Pause className="w-4 h-4 text-primary fill-primary" /> : <Play className="w-4 h-4 text-foreground fill-current" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{v.title}</p>
                        {isOriginal ? (
                          <span className="text-[10px] px-1.5 py-0.5 bg-neon-purple/20 text-neon-purple rounded font-bold uppercase">Original</span>
                        ) : (
                          <SongVersionBadge version={v} onPlay={() => playTrack(v, allVersions)} isActive={isCurrent} />
                        )}
                        {v.is_active_version === false && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">Inactive</span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatDuration(v.duration_seconds)}
                        </span>
                        {v.bpm && <span>{v.bpm} BPM</span>}
                        {v.key_signature && <span>Key: {v.key_signature}</span>}
                        {v.genre && <span className="capitalize">{v.genre}</span>}
                        {v.explicit_flag && <span className="text-destructive font-bold">E</span>}
                        {v.is_instrumental && <span>INST</span>}
                      </div>

                      {v.version_notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">{v.version_notes}</p>
                      )}

                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground/60">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          {new Date(v.created_date).toLocaleDateString()}
                        </span>
                        {v.isrc && <span>ISRC: {v.isrc}</span>}
                        {v.ai_disclosure && v.ai_disclosure !== 'human_created' && (
                          <span className="capitalize">{v.ai_disclosure.replace(/_/g, ' ')}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {v.audio_url ? (
                        <Button size="sm" variant="ghost" asChild>
                          <a href={v.audio_url} target="_blank" rel="noopener noreferrer">
                            <FileText className="w-3 h-3" />
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}