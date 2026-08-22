import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ImagePlus, X, UserPlus, Music, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import SongUploader from './SongUploader';

export default function DefaultArtistSlot({ slotNumber, artistId, onAssign, onClear }) {
  const qc = useQueryClient();
  const [newName, setNewName] = useState('');
  const [search, setSearch] = useState('');

  const { data: artist, isLoading } = useQuery({
    queryKey: ['default-artist', artistId],
    queryFn: () => base44.entities.ArtistProfile.get(artistId),
    enabled: !!artistId,
  });

  const { data: songs = [] } = useQuery({
    queryKey: ['default-artist-songs', artistId],
    queryFn: () => base44.entities.Song.filter({ artist_profile_id: artistId }, 'created_date', 50),
    enabled: !!artistId,
  });

  const { data: allArtists = [], isFetching: searching } = useQuery({
    queryKey: ['artist-search-pool'],
    queryFn: () => base44.entities.ArtistProfile.list('-created_date', 50),
    enabled: !artistId,
  });
  const filtered = search.trim()
    ? allArtists.filter((a) => (a.artist_name || '').toLowerCase().includes(search.toLowerCase())).slice(0, 6)
    : [];

  const uploadImage = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.ArtistProfile.update(artistId, { profile_image: file_url });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['default-artist', artistId] });
      toast.success('Profile image updated');
    },
  });

  const removeSong = useMutation({
    mutationFn: (songId) => base44.entities.Song.delete(songId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['default-artist-songs', artistId] });
      toast.success('Song removed');
    },
  });

  const createArtist = useMutation({
    mutationFn: async (name) => {
      const a = await base44.entities.ArtistProfile.create({
        artist_name: name.trim(),
        is_default_platform_artist: true,
        verification_badge: 'human_created',
      });
      return a.id;
    },
    onSuccess: (newId) => {
      setNewName('');
      onAssign(newId);
    },
    onError: (e) => toast.error(e.message || 'Could not create artist'),
  });

  if (artistId) {
    return (
      <GlassCard hover={false} className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <NeonBadge color="purple">Default Artist {slotNumber}</NeonBadge>
          <Button size="sm" variant="ghost" onClick={onClear}>
            <X className="w-3.5 h-3.5" /> Remove
          </Button>
        </div>
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          artist && (
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-secondary overflow-hidden flex items-center justify-center flex-shrink-0">
                {artist.profile_image ? (
                  <img src={artist.profile_image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Music className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{artist.artist_name}</p>
                {artist.artist_handle && (
                  <p className="text-[10px] text-muted-foreground truncate">!{artist.artist_handle}</p>
                )}
              </div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadImage.mutate(f);
                  }}
                />
                <span className="inline-flex items-center gap-1 text-xs text-primary whitespace-nowrap">
                  <ImagePlus className="w-3.5 h-3.5" />
                  {uploadImage.isPending ? 'Uploading…' : 'Update Image'}
                </span>
              </label>
            </div>
          )
        )}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Songs ({songs.length})</p>
          <div className="space-y-1">
            {songs.map((s) => (
              <div key={s.id} className="flex items-center gap-2 p-2 bg-secondary/20 rounded-lg">
                {s.cover_art ? (
                  <img src={s.cover_art} alt="" className="w-8 h-8 rounded object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center">
                    <Music className="w-3 h-3 text-muted-foreground" />
                  </div>
                )}
                <span className="text-xs truncate flex-1">{s.title}</span>
                <button onClick={() => removeSong.mutate(s.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {songs.length === 0 && <p className="text-[10px] text-muted-foreground">No songs yet.</p>}
          </div>
        </div>
        <SongUploader artistId={artistId} artistName={artist?.artist_name} />
      </GlassCard>
    );
  }

  return (
    <GlassCard hover={false} className="p-4 space-y-3 border-dashed border-border">
      <NeonBadge color="blue">Default Artist {slotNumber} — Not Set</NeonBadge>
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Create a new artist or assign an existing one.</p>
        <div className="flex gap-2">
          <Input
            placeholder="New artist name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1"
          />
          <Button size="sm" onClick={() => createArtist.mutate(newName)} disabled={!newName.trim() || createArtist.isPending}>
            {createArtist.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
            Create
          </Button>
        </div>
      </div>
      <div className="space-y-1">
        <Input placeholder="Search existing artists…" value={search} onChange={(e) => setSearch(e.target.value)} />
        {searching && <Loader2 className="w-3 h-3 animate-spin" />}
        {filtered.map((a) => (
          <button
            key={a.id}
            onClick={() => {
              onAssign(a.id);
              setSearch('');
            }}
            className="w-full flex items-center gap-2 p-2 hover:bg-secondary/30 rounded-lg text-left"
          >
            {a.profile_image ? (
              <img src={a.profile_image} alt="" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                <Music className="w-3 h-3 text-muted-foreground" />
              </div>
            )}
            <span className="text-xs truncate">{a.artist_name}</span>
          </button>
        ))}
      </div>
    </GlassCard>
  );
}