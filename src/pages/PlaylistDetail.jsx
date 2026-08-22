import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Music, Sparkles, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import PlaylistSongList, { buildEntries, LOCK_DAYS } from '@/components/playlist/PlaylistSongList';
import AddSongsToPlaylistModal from '@/components/playlist/AddSongsToPlaylistModal';
import FundedNetworkPanel from '@/components/playlist/FundedNetworkPanel';
import AIPlaylistAssistant from '@/components/playlist/AIPlaylistAssistant';
import PlaylistAnalyticsPanel from '@/components/playlist/PlaylistAnalyticsPanel';
import PlaylistShortcutMenu from '@/components/pwa/PlaylistShortcutMenu';
import { addShortcut } from '@/components/pwa/ShortcutCardGrid';
import { toast } from 'sonner';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export default function PlaylistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [added, setAdded] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const { data: playlist, isLoading } = useQuery({
    queryKey: ['playlist', id],
    queryFn: () => base44.entities.Playlist.get(id),
    enabled: !!id,
  });

  const { data: allSongs = [] } = useQuery({
    queryKey: ['playlist-pool', id],
    queryFn: () => base44.entities.Song.list('-created_date', 200),
    enabled: !!playlist,
  });

  const songIds = playlist?.song_ids || [];
  const fallbackDate = playlist?.created_date || new Date().toISOString();
  const entries = buildEntries(songIds, playlist?.song_entries, fallbackDate);
  const playlistSongs = songIds
    .map((sid) => allSongs.find((s) => s.id === sid))
    .filter(Boolean);

  const mutation = useMutation({
    mutationFn: (patch) => base44.entities.Playlist.update(playlist.id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['playlist', id] }),
    onError: (e) => toast.error(e.message || 'Failed to update playlist'),
  });

  const handleReorder = (newOrder) => {
    mutation.mutate({ song_ids: newOrder });
    toast.success('Playlist reordered');
  };

  const handleRemove = (song) => {
    const newIds = songIds.filter((sid) => sid !== song.id);
    const newEntries = entries.filter((e) => e.song_id !== song.id);
    mutation.mutate({ song_ids: newIds, song_entries: newEntries });
    toast.success(`Removed "${song.title}" from playlist`);
  };

  const handleAdd = async (newSongIds) => {
    if (playlist.is_funded_network && newSongIds.length > 0) {
      try {
        const result = await base44.functions.invoke('validateFundedNetworkChanges', {
          network_id: playlist.id,
          proposed_song_ids: [...songIds, ...newSongIds],
          action: 'add_artist',
        });
        if (!result.data.valid) {
          result.data.errors.forEach((e) => {
            if (e.type === 'song_limit_exceeded') {
              toast.error(e.message, {
                action: { label: 'Upgrade', onClick: () => navigate('/pricing') },
              });
            } else {
              toast.error(e.message);
            }
          });
          return;
        }
        result.data.warnings?.forEach((w) => toast.warning(w.message));
      } catch (e) {
        console.error('Validation failed:', e);
      }
    }
    const now = new Date();
    const until = new Date(now.getTime() + LOCK_DAYS * MS_PER_DAY);
    const newEntries = newSongIds.map((sid) => ({
      song_id: sid,
      added_date: now.toISOString(),
      locked_until: until.toISOString(),
    }));
    mutation.mutate({
      song_ids: [...songIds, ...newSongIds],
      song_entries: [...(playlist.song_entries || []), ...newEntries],
    });
    toast.success(
      `Added ${newSongIds.length} song${newSongIds.length > 1 ? 's' : ''} — locked to your disbursement for ${LOCK_DAYS} days`
    );
  };

  const addToQuickLaunch = () => {
    addShortcut({ type: 'playlist', id: playlist.id, label: playlist.name, sub: 'playlist', image: playlist.cover_image });
    setAdded(true);
    toast.success('Added to Quick Launch');
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <GlassCard hover={false} className="p-8 text-center">
          <Music className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">This playlist could not be found.</p>
          <Link to="/playlists"><Button variant="outline" size="sm" className="mt-4">Back to Playlists</Button></Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pb-24 max-w-4xl mx-auto">
      <Link to="/playlists" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> Playlists
      </Link>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard hover={false} className="p-6 mb-6 relative">
          <div className="absolute top-3 right-3">
            <PlaylistShortcutMenu playlist={playlist} url={`${window.location.origin}/playlist/${playlist.id}`} />
          </div>
          <div className="flex flex-col sm:flex-row gap-5">
            <div className="w-32 h-32 rounded-xl overflow-hidden flex-shrink-0 bg-secondary">
              {playlist.cover_image ? (
                <img src={playlist.cover_image} alt={playlist.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="w-10 h-10 text-muted-foreground/50" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <NeonBadge color="purple" className="mb-2">Playlist</NeonBadge>
              <h1 className="text-2xl font-display font-bold truncate">{playlist.name}</h1>
              {playlist.description && <p className="text-sm text-muted-foreground mt-1">{playlist.description}</p>}
              <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                <span>{playlistSongs.length} songs</span>
                <span>{playlist.follower_count || 0} followers</span>
                <span className="font-mono text-neon-cyan break-all">/playlist/{playlist.id}</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Songs
                </Button>
                <Button size="sm" variant="outline" onClick={addToQuickLaunch} disabled={added}>
                  {added ? <><Check className="w-3.5 h-3.5 mr-1.5" /> Added</> : <><Sparkles className="w-3.5 h-3.5 mr-1.5" /> Add to Quick Launch</>}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                Drag the handle to reorder songs anytime. Once a song is added it's locked to that month's disbursement for {LOCK_DAYS} days — it can't be removed or swapped until the lock window passes.
              </p>
            </div>
          </div>
        </GlassCard>

        <FundedNetworkPanel playlist={playlist} onUpdate={(patch) => mutation.mutate(patch)} />

        <AIPlaylistAssistant
          playlist={playlist}
          onAddSongsToPlaylist={handleAdd}
        />

        <PlaylistAnalyticsPanel playlist={playlist} songs={playlistSongs} />

        <GlassCard hover={false} className="p-2 sm:p-4">
          {playlistSongs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No songs in this playlist yet. Tap "Add Songs" to get started.
            </div>
          ) : (
            <PlaylistSongList
              songs={playlistSongs}
              songIds={songIds}
              entries={entries}
              fallbackDate={fallbackDate}
              onReorder={handleReorder}
              onRemove={handleRemove}
            />
          )}
        </GlassCard>
      </motion.div>

      <AddSongsToPlaylistModal
        open={addOpen}
        onOpenChange={setAddOpen}
        allSongs={allSongs}
        existingSongIds={songIds}
        onAdd={handleAdd}
      />
    </div>
  );
}