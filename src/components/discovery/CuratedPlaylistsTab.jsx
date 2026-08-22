import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Headphones, Plus, Trash2, Music, GripVertical, X } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

function CreatePlaylistForm({ userId, onSave, onCancel }) {
  const [form, setForm] = useState({ name: '', description: '', cover_image: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const create = useMutation({
    mutationFn: () => base44.entities.Playlist.create({
      ...form,
      type: 'community',
      owner_user_id: userId,
      song_ids: [],
      is_living: false,
    }),
    onSuccess: () => onSave(),
  });

  return (
    <GlassCard hover={false} className="p-5 border-neon-cyan/20">
      <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
        <Plus className="w-4 h-4 text-neon-cyan" /> New Curated Playlist
      </h3>
      <div className="space-y-3">
        <Input placeholder="Playlist name *" value={form.name} onChange={e => set('name', e.target.value)} className="bg-secondary/20 text-sm" />
        <Input placeholder="Cover image URL (optional)" value={form.cover_image} onChange={e => set('cover_image', e.target.value)} className="bg-secondary/20 text-sm" />
        <Textarea placeholder="Describe the vibe — what kind of music this is, who it's for..."
          value={form.description} onChange={e => set('description', e.target.value)} className="bg-secondary/20 text-sm min-h-[80px]" />
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={onCancel} className="h-8">Cancel</Button>
          <Button size="sm" onClick={() => create.mutate()} disabled={!form.name || create.isPending}
            className="h-8 bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/25">
            {create.isPending ? 'Creating...' : 'Create Playlist'}
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}

function PlaylistEditor({ playlist }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(false);

  const { data: searchResults = [] } = useQuery({
    queryKey: ['song-search', search],
    queryFn: () => base44.entities.Song.list('-play_count', 20),
    enabled: search.length > 1,
    select: songs => songs.filter(s =>
      s.title?.toLowerCase().includes(search.toLowerCase()) ||
      s.artist_name?.toLowerCase().includes(search.toLowerCase())
    ),
  });

  const { data: playlistSongs = [] } = useQuery({
    queryKey: ['playlist-songs', playlist.id],
    queryFn: () => base44.entities.Song.list(),
    enabled: expanded && (playlist.song_ids?.length || 0) > 0,
    select: songs => songs.filter(s => playlist.song_ids?.includes(s.id)),
  });

  const addSong = useMutation({
    mutationFn: (songId) => base44.entities.Playlist.update(playlist.id, {
      song_ids: [...(playlist.song_ids || []), songId]
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dp-playlists'] }); qc.invalidateQueries({ queryKey: ['playlist-songs'] }); setSearch(''); },
  });

  const removeSong = useMutation({
    mutationFn: (songId) => base44.entities.Playlist.update(playlist.id, {
      song_ids: (playlist.song_ids || []).filter(id => id !== songId)
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dp-playlists'] }); qc.invalidateQueries({ queryKey: ['playlist-songs'] }); },
  });

  const deletePlaylist = useMutation({
    mutationFn: () => base44.entities.Playlist.delete(playlist.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dp-playlists'] }),
  });

  const songCount = playlist.song_ids?.length || 0;

  return (
    <GlassCard hover={false} className="p-4">
      <div className="flex items-start gap-3 mb-3">
        {playlist.cover_image
          ? <img src={playlist.cover_image} alt={playlist.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
          : <div className="w-12 h-12 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center flex-shrink-0">
              <Headphones className="w-5 h-5 text-neon-cyan" />
            </div>
        }
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{playlist.name}</p>
          {playlist.description && <p className="text-xs text-muted-foreground line-clamp-1">{playlist.description}</p>}
          <NeonBadge color="cyan" className="mt-1">{songCount} track{songCount !== 1 ? 's' : ''}</NeonBadge>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setExpanded(e => !e)}>
            {expanded ? 'Close' : 'Edit'}
          </Button>
          <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-destructive/70 hover:text-destructive"
            onClick={() => deletePlaylist.mutate()}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/30 pt-3 space-y-3">
          {/* Search to add songs */}
          <div className="relative">
            <Music className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Search songs to add..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-8 bg-secondary/20 text-xs h-8" />
          </div>
          {searchResults.length > 0 && (
            <div className="bg-secondary/30 rounded-lg divide-y divide-border/20 max-h-40 overflow-y-auto">
              {searchResults.filter(s => !playlist.song_ids?.includes(s.id)).slice(0, 8).map(song => (
                <div key={song.id} className="flex items-center justify-between px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{song.title}</p>
                    <p className="text-[10px] text-muted-foreground">{song.artist_name}</p>
                  </div>
                  <Button size="sm" className="h-6 text-[10px] px-2 ml-2" onClick={() => addSong.mutate(song.id)}>
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Current tracks */}
          {playlistSongs.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Tracks</p>
              {playlistSongs.map((song, i) => (
                <div key={song.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-secondary/20">
                  <GripVertical className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                  <span className="text-[10px] text-muted-foreground w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{song.title}</p>
                    <p className="text-[10px] text-muted-foreground">{song.artist_name}</p>
                  </div>
                  <button onClick={() => removeSong.mutate(song.id)} className="text-muted-foreground/50 hover:text-destructive transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}

export default function CuratedPlaylistsTab({ userId }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: playlists = [], isLoading } = useQuery({
    queryKey: ['dp-playlists', userId],
    queryFn: () => base44.entities.Playlist.filter({ owner_user_id: userId, type: 'community' }),
    enabled: !!userId,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Headphones className="w-4 h-4 text-neon-cyan" />
          <h2 className="font-display font-semibold text-sm">Curated Playlists</h2>
          <NeonBadge color="cyan">{playlists.length}</NeonBadge>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)} disabled={showForm}
          className="h-8 gap-1.5 bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/25">
          <Plus className="w-3.5 h-3.5" /> New Playlist
        </Button>
      </div>

      {/* Philosophy note */}
      <div className="text-[11px] text-muted-foreground bg-secondary/20 rounded-lg px-3 py-2 border border-border/30">
        Curated playlists are earned placements — artists appear here based on your genuine recommendation, never payment.
      </div>

      {showForm && (
        <CreatePlaylistForm userId={userId}
          onSave={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ['dp-playlists'] }); }}
          onCancel={() => setShowForm(false)} />
      )}

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-secondary/20 rounded-xl animate-pulse" />)}</div>
      ) : playlists.length === 0 && !showForm ? (
        <GlassCard hover={false} className="p-10 text-center">
          <Headphones className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No playlists yet. Create your first curated playlist.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {playlists.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <PlaylistEditor playlist={p} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}