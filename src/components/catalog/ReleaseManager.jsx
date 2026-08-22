import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Disc3, Trash2, Calendar, Music, Layers, Pencil } from 'lucide-react';
import GenreSelect from '@/components/shared/GenreSelect';
import { toast } from 'sonner';

const RELEASE_TYPES = [
  { value: 'single', label: 'Single' },
  { value: 'ep', label: 'EP' },
  { value: 'album', label: 'Album' },
  { value: 'deluxe_edition', label: 'Deluxe Edition' },
  { value: 'compilation', label: 'Compilation' },
  { value: 'mixtape', label: 'Mixtape' },
  { value: 'live_album', label: 'Live Album' },
];

const TYPE_COLORS = {
  single: 'text-neon-cyan', ep: 'text-neon-purple', album: 'text-neon-magenta',
  deluxe_edition: 'text-neon-turquoise', compilation: 'text-neon-blue',
  mixtape: 'text-yellow-500', live_album: 'text-neon-magenta',
};

export default function ReleaseManager({ artistProfile }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingRelease, setEditingRelease] = useState(null);
  const [form, setForm] = useState({
    title: '', release_type: 'single', release_date: '', cover_art: '',
    description: '', upc: '', catalog_number: '', label: '', copyright_year: '',
    copyright_holder: '', genre: '', track_ids: [],
  });
  const [uploadingArt, setUploadingArt] = useState(false);

  const { data: releases = [], isLoading } = useQuery({
    queryKey: ['releases', artistProfile.id],
    queryFn: () => base44.entities.Release.filter({ artist_profile_id: artistProfile.id }, '-release_date'),
  });

  const { data: songs = [] } = useQuery({
    queryKey: ['catalog-songs', artistProfile.id],
    queryFn: () => base44.entities.Song.filter({ artist_profile_id: artistProfile.id }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      if (editingRelease) {
        return base44.entities.Release.update(editingRelease.id, data);
      }
      return base44.entities.Release.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['releases']);
      toast.success(editingRelease ? 'Release updated' : 'Release created');
      setShowForm(false);
      setEditingRelease(null);
      setForm({ title: '', release_type: 'single', release_date: '', cover_art: '', description: '', upc: '', catalog_number: '', label: '', copyright_year: '', copyright_holder: '', genre: '', track_ids: [] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Release.delete(id),
    onSuccess: () => { queryClient.invalidateQueries(['releases']); toast.success('Release deleted'); },
  });

  const handleArtUpload = async (file) => {
    setUploadingArt(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(prev => ({ ...prev, cover_art: file_url }));
    } catch { toast.error('Upload failed'); }
    finally { setUploadingArt(false); }
  };

  const handleSubmit = () => {
    if (!form.title.trim()) { toast.error('Title required'); return; }
    createMutation.mutate({
      ...form,
      artist_profile_id: artistProfile.id,
      artist_name: artistProfile.artist_name,
      copyright_year: form.copyright_year ? Number(form.copyright_year) : undefined,
      track_count: form.track_ids.length,
    });
  };

  const handleEdit = (release) => {
    setEditingRelease(release);
    setForm({
      title: release.title || '',
      release_type: release.release_type || 'single',
      release_date: release.release_date || '',
      cover_art: release.cover_art || '',
      description: release.description || '',
      upc: release.upc || '',
      catalog_number: release.catalog_number || '',
      label: release.label || '',
      copyright_year: release.copyright_year || '',
      copyright_holder: release.copyright_holder || '',
      genre: release.genre || '',
      track_ids: release.track_ids || [],
    });
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingRelease(null);
    setForm({ title: '', release_type: 'single', release_date: '', cover_art: '', description: '', upc: '', catalog_number: '', label: '', copyright_year: '', copyright_holder: '', genre: '', track_ids: [] });
    setShowForm(true);
  };

  const toggleTrack = (songId) => {
    setForm(prev => ({
      ...prev,
      track_ids: prev.track_ids.includes(songId)
        ? prev.track_ids.filter(id => id !== songId)
        : [...prev.track_ids, songId],
    }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-semibold text-lg">Releases</h2>
          <p className="text-xs text-muted-foreground">{releases.length} releases</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={handleNew}>
          <Plus className="w-4 h-4" /> New Release
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
      ) : releases.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border/50 rounded-xl">
          <Disc3 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No releases yet. Create your first single, EP, or album.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {releases.map(release => (
            <div key={release.id} className="bg-card/60 border border-border/40 rounded-xl overflow-hidden group">
              <div className="aspect-square relative">
                <img src={release.cover_art || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&q=80'} alt={release.title} className="w-full h-full object-cover" />
                <div className="absolute top-2 left-2">
                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 bg-black/60 rounded ${TYPE_COLORS[release.release_type] || 'text-muted-foreground'}`}>
                    {release.release_type.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 bg-black/60 text-white hover:text-primary"
                    onClick={() => handleEdit(release)}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 bg-black/60 text-white hover:text-destructive"
                    onClick={() => deleteMutation.mutate(release.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="p-2.5">
                <p className="text-sm font-medium truncate">{release.title}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                  <Music className="w-3 h-3" /> {release.track_count || 0} tracks
                </div>
                {release.release_date && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <Calendar className="w-3 h-3" /> {new Date(release.release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[85vh] p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle className="flex items-center gap-2">
              <Disc3 className="w-5 h-5 text-primary" /> {editingRelease ? 'Edit Release' : 'New Release'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] px-6 pb-4">
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Release title" className="text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Release Type</Label>
                  <Select value={form.release_type} onValueChange={(v) => setForm({ ...form, release_type: v })}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{RELEASE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Release Date</Label>
                  <Input type="date" value={form.release_date} onChange={(e) => setForm({ ...form, release_date: e.target.value })} className="text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">UPC</Label>
                  <Input value={form.upc} onChange={(e) => setForm({ ...form, upc: e.target.value })} className="text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Catalog Number</Label>
                  <Input value={form.catalog_number} onChange={(e) => setForm({ ...form, catalog_number: e.target.value })} className="text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Label</Label>
                  <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Copyright Year</Label>
                  <Input type="number" value={form.copyright_year} onChange={(e) => setForm({ ...form, copyright_year: e.target.value })} placeholder={new Date().getFullYear()} className="text-sm" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Copyright Holder</Label>
                <Input value={form.copyright_holder} onChange={(e) => setForm({ ...form, copyright_holder: e.target.value })} className="text-sm" />
              </div>
              <div>
                <Label className="text-xs">Genre</Label>
                <div className="mt-1"><GenreSelect value={form.genre} onChange={(v) => setForm({ ...form, genre: v })} /></div>
              </div>
              <div>
                <Label className="text-xs">Cover Art</Label>
                <div className="flex items-center gap-3 mt-1">
                  {form.cover_art ? (
                    <img src={form.cover_art} alt="cover" className="w-16 h-16 rounded-lg object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-secondary/50 flex items-center justify-center">
                      <Disc3 className="w-5 h-5 text-muted-foreground/50" />
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild disabled={uploadingArt}>
                      <span>{uploadingArt ? 'Uploading...' : 'Upload'}</span>
                    </Button>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleArtUpload(e.target.files?.[0])} />
                  </label>
                </div>
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="text-sm" />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1"><Layers className="w-3 h-3" /> Select Tracks ({form.track_ids.length} selected)</Label>
                <div className="mt-1 max-h-40 overflow-y-auto border border-border/40 rounded-lg p-2 space-y-1">
                  {songs.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">Upload songs first</p>
                  ) : songs.map(song => (
                    <label key={song.id} className="flex items-center gap-2 p-1.5 hover:bg-secondary/40 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.track_ids.includes(song.id)}
                        onChange={() => toggleTrack(song.id)}
                        className="rounded"
                      />
                      <span className="text-sm truncate">{song.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="px-6 py-4 border-t border-border/30">
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Saving...' : editingRelease ? 'Save Changes' : 'Create Release'}
          </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}