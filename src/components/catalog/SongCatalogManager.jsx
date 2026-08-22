import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Pencil, GitBranch, Trash2, Layers, Clock, Music, Play, Pause, FileText, History, RefreshCw } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { toast } from 'sonner';
import { useState } from 'react';
import SongUploadForm from '@/components/catalog/SongUploadForm';
import SongVersionBadge from '@/components/catalog/SongVersionBadge';
import SplitSheetManager from '@/components/catalog/SplitSheetManager';
import ReplaceAudioModal from '@/components/catalog/ReplaceAudioModal';
import VersionHistoryModal from '@/components/catalog/VersionHistoryModal';

const VERSION_LABELS = {
  original: 'Original', acoustic: 'Acoustic', radio_edit: 'Radio Edit', instrumental: 'Instrumental',
  explicit: 'Explicit', clean: 'Clean', alternate_mix: 'Alt Mix', remix: 'Remix',
  live: 'Live', demo: 'Demo', extended: 'Extended', other: 'Other',
};

export default function SongCatalogManager({ artistProfile }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingSong, setEditingSong] = useState(null);
  const [parentSongId, setParentSongId] = useState(null);
  const [versionSong, setVersionSong] = useState(null);
  const [splitSheetSong, setSplitSheetSong] = useState(null);
  const [replaceAudioSong, setReplaceAudioSong] = useState(null);
  const [historySong, setHistorySong] = useState(null);
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();

  const { data: songs = [], isLoading } = useQuery({
    queryKey: ['catalog-songs', artistProfile.id],
    queryFn: () => base44.entities.Song.filter({ artist_profile_id: artistProfile.id }, '-created_date'),
  });

  const originals = songs.filter(s => !s.parent_song_id && s.version_type === 'original');
  const versionsByParent = songs.reduce((acc, s) => {
    if (s.parent_song_id) {
      if (!acc[s.parent_song_id]) acc[s.parent_song_id] = [];
      acc[s.parent_song_id].push(s);
    }
    return acc;
  }, {});

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Song.delete(id),
    onSuccess: () => { queryClient.invalidateQueries(['catalog-songs']); toast.success('Song deleted'); },
  });

  const handleEdit = (song) => { setEditingSong(song); setShowForm(true); };
  const handleNewVersion = (song) => { setParentSongId(song.id); setVersionSong(song); setShowForm(true); };
  const handleClose = () => { setShowForm(false); setEditingSong(null); setParentSongId(null); setVersionSong(null); };

  const formatDuration = (sec) => {
    if (!sec) return '--:--';
    const m = Math.floor(sec / 60); const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-semibold text-lg">Song Catalog</h2>
          <p className="text-xs text-muted-foreground">{originals.length} originals · {songs.length - originals.length} versions</p>
        </div>
        <Button size="sm" className="gap-1.5 bg-gradient-neon" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Upload Song
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Loading songs...</div>
      ) : originals.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border/50 rounded-xl">
          <Music className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No songs yet. Upload your first track to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {originals.map(song => {
            const versions = versionsByParent[song.id] || [];
            const isCurrent = currentTrack?.id === song.id;
            return (
              <div key={song.id} className="bg-card/60 border border-border/40 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 p-3 group">
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 relative">
                    <img src={song.cover_art || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&q=80'} alt={song.title} className="w-full h-full object-cover" />
                    <button
                      onClick={() => isCurrent ? togglePlay() : playTrack(song, songs)}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {isCurrent && isPlaying ? <Pause className="w-4 h-4 text-white fill-white" /> : <Play className="w-4 h-4 text-white fill-white" />}
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium truncate ${isCurrent ? 'text-primary' : ''}`}>{song.title}</p>
                      {song.explicit_flag && <span className="text-[10px] px-1 bg-destructive/20 text-destructive rounded font-bold">E</span>}
                      {song.is_instrumental && <span className="text-[10px] px-1 bg-secondary rounded text-muted-foreground">INST</span>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" /> {formatDuration(song.duration_seconds)}
                      {song.genre && <span className="capitalize">· {song.genre}</span>}
                      {song.isrc && <span>· ISRC: {song.isrc}</span>}
                      {song.rights_verified && <span className="text-neon-cyan">· Rights Verified</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setReplaceAudioSong(song)} title="Replace audio">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setHistorySong(song)} title="Version history">
                      <History className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setSplitSheetSong(song)} title="Split sheet">
                      <FileText className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleNewVersion(song)} title="Add version">
                      <GitBranch className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleEdit(song)} title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {versions.length > 0 && (
                  <div className="border-t border-border/30 px-3 py-2 bg-secondary/20">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Layers className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{versions.length} Versions</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {versions.map(v => (
                        <SongVersionBadge key={v.id} version={v} onPlay={() => playTrack(v, songs)} isActive={currentTrack?.id === v.id} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <SongUploadForm
          isOpen={showForm}
          onClose={handleClose}
          onSaved={() => queryClient.invalidateQueries(['catalog-songs'])}
          artistProfile={artistProfile}
          editingSong={editingSong}
          parentSongId={parentSongId}
        />
      )}

      {splitSheetSong && (
        <SplitSheetManager
          song={splitSheetSong}
          artistProfile={artistProfile}
          isOpen={!!splitSheetSong}
          onClose={() => setSplitSheetSong(null)}
        />
      )}

      {replaceAudioSong && (
        <ReplaceAudioModal
          song={replaceAudioSong}
          isOpen={!!replaceAudioSong}
          onClose={() => setReplaceAudioSong(null)}
        />
      )}

      {historySong && (
        <VersionHistoryModal
          song={historySong}
          allSongs={songs}
          isOpen={!!historySong}
          onClose={() => setHistorySong(null)}
        />
      )}
    </div>
  );
}