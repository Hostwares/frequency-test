import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { PenLine, Megaphone, Plus, Eye, EyeOff, Trash2, Star, Search, X, Disc3 } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

function ArtistSearchInput({ onSelect, selectedArtist }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const search = async (q) => {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const artists = await base44.entities.ArtistProfile.list('-created_date', 100);
      const filtered = artists.filter(a =>
        a.artist_name?.toLowerCase().includes(q.toLowerCase()) ||
        a.artist_handle?.toLowerCase().includes(q.toLowerCase())
      ).slice(0, 8);
      setResults(filtered);
    } catch { setResults([]); }
    setSearching(false);
  };

  if (selectedArtist) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary flex-shrink-0">
          {selectedArtist.profile_image
            ? <img src={selectedArtist.profile_image} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><PenLine className="w-3 h-3 text-neon-cyan" /></div>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{selectedArtist.artist_name}</p>
          {selectedArtist.genre && <p className="text-[10px] text-muted-foreground">{selectedArtist.genre}</p>}
        </div>
        <button onClick={() => { onSelect(null); setQuery(''); setResults([]); }}
          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Search for an artist to spotlight..."
          value={query}
          onChange={e => search(e.target.value)}
          className="bg-secondary/20 text-sm pl-8"
        />
      </div>
      {searching && <p className="text-[10px] text-muted-foreground mt-1">Searching...</p>}
      {results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-lg shadow-xl max-h-56 overflow-y-auto">
          {results.map(a => (
            <button key={a.id} onClick={() => { onSelect(a); setQuery(''); setResults([]); }}
              className="w-full flex items-center gap-2 p-2 hover:bg-secondary/50 transition-colors text-left">
              <div className="w-7 h-7 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                {a.profile_image
                  ? <img src={a.profile_image} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-neon-cyan/20" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{a.artist_name}</p>
                {a.genre && <p className="text-[10px] text-muted-foreground truncate">{a.genre}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SpotlightForm({ partnerId, onSave, onCancel }) {
  const [form, setForm] = useState({ artist_name: '', artist_profile_id: '', title: '', body: '', genre: '', cover_image: '', is_published: false });
  const [selectedArtist, setSelectedArtist] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleArtistSelect = (artist) => {
    if (artist) {
      setSelectedArtist(artist);
      setForm(f => ({ ...f, artist_profile_id: artist.id, artist_name: artist.artist_name, genre: artist.genre || '' }));
    } else {
      setSelectedArtist(null);
      setForm(f => ({ ...f, artist_profile_id: '', artist_name: '', genre: '' }));
    }
  };

  const create = useMutation({
    mutationFn: () => base44.entities.ArtistSpotlight.create({ ...form, discovery_partner_id: partnerId }),
    onSuccess: () => onSave(),
  });

  return (
    <GlassCard hover={false} className="p-5 border-neon-magenta/20">
      <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
        <PenLine className="w-4 h-4 text-neon-magenta" /> New Artist Spotlight
      </h3>
      <div className="space-y-3">
        <div>
          <label className="text-[11px] text-muted-foreground font-medium mb-1.5 block">Link an artist *</label>
          <ArtistSearchInput onSelect={handleArtistSelect} selectedArtist={selectedArtist} />
        </div>
        <Input placeholder="Spotlight title *" value={form.title} onChange={e => set('title', e.target.value)} className="bg-secondary/20 text-sm" />
        <Input placeholder="Cover image URL (optional — defaults to artist photo)" value={form.cover_image} onChange={e => set('cover_image', e.target.value)} className="bg-secondary/20 text-sm" />
        <Textarea placeholder="Write your spotlight — why this artist matters, what makes their music distinctive..."
          value={form.body} onChange={e => set('body', e.target.value)} className="bg-secondary/20 text-sm min-h-[100px]" />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground">
            <input type="checkbox" checked={form.is_published} onChange={e => set('is_published', e.target.checked)} className="rounded" />
            Publish immediately
          </label>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onCancel} className="h-8">Cancel</Button>
            <Button size="sm" onClick={() => create.mutate()} disabled={!form.artist_profile_id || !form.title || create.isPending}
              className="h-8 bg-neon-magenta/20 text-neon-magenta border border-neon-magenta/30 hover:bg-neon-magenta/30">
              {create.isPending ? 'Saving...' : 'Save Spotlight'}
            </Button>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

export default function SpotlightsTab({ spotlights, partnerId }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const togglePublish = useMutation({
    mutationFn: ({ id, is_published }) => base44.entities.ArtistSpotlight.update(id, { is_published }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dp-spotlights'] }),
  });

  const toggleFeatured = useMutation({
    mutationFn: ({ id, is_featured }) => base44.entities.ArtistSpotlight.update(id, { is_featured }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dp-spotlights'] }),
  });

  const deleteSpotlight = useMutation({
    mutationFn: (id) => base44.entities.ArtistSpotlight.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dp-spotlights'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PenLine className="w-4 h-4 text-neon-magenta" />
          <h2 className="font-display font-semibold text-sm">Artist Spotlights</h2>
          <NeonBadge color="magenta">{spotlights.length}</NeonBadge>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)} disabled={showForm}
          className="h-8 gap-1.5 bg-neon-magenta/15 text-neon-magenta border border-neon-magenta/30 hover:bg-neon-magenta/25">
          <Plus className="w-3.5 h-3.5" /> New Spotlight
        </Button>
      </div>

      {showForm && (
        <SpotlightForm partnerId={partnerId}
          onSave={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ['dp-spotlights'] }); }}
          onCancel={() => setShowForm(false)} />
      )}

      {spotlights.length === 0 && !showForm ? (
        <GlassCard hover={false} className="p-10 text-center">
          <Megaphone className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No spotlights yet. Write your first artist spotlight.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {spotlights.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <GlassCard hover={false} className="p-4">
                {s.cover_image && (
                  <img src={s.cover_image} alt={s.title} className="w-full h-28 object-cover rounded-lg mb-3" />
                )}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{s.title}</p>
                    <p className="text-xs text-neon-cyan">{s.artist_name}</p>
                    {s.genre && <p className="text-[10px] text-muted-foreground">{s.genre}</p>}
                    {s.artist_profile_id && <NeonBadge color="cyan" className="mt-1"><Disc3 className="w-2.5 h-2.5 mr-0.5 inline" />Linked</NeonBadge>}
                  </div>
                  {s.is_published ? <NeonBadge color="turquoise">Live</NeonBadge> : <NeonBadge color="blue">Draft</NeonBadge>}
                </div>
                {s.body && <p className="text-xs text-muted-foreground line-clamp-3 mb-3">{s.body}</p>}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 flex-1"
                    onClick={() => togglePublish.mutate({ id: s.id, is_published: !s.is_published })}>
                    {s.is_published ? <><EyeOff className="w-3 h-3" />Unpublish</> : <><Eye className="w-3 h-3" />Publish</>}
                  </Button>
                  <Button size="sm" variant={s.is_featured ? 'default' : 'outline'} className="h-7 w-7 p-0"
                    title={s.is_featured ? 'Unfeature' : 'Feature artist'}
                    onClick={() => toggleFeatured.mutate({ id: s.id, is_featured: !s.is_featured })}>
                    <Star className={`w-3 h-3 ${s.is_featured ? 'fill-current' : ''}`} />
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-destructive/70 hover:text-destructive"
                    onClick={() => deleteSpotlight.mutate(s.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}