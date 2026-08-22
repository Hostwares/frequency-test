import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  Trophy, Plus, Trash2, ArrowLeftRight, Loader2, AlertCircle,
  Search, ChevronDown, ChevronUp, User, Video, Music, Link2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

const NOMINEE_TYPES = [
  { value: 'artist', label: 'Artist' },
  { value: 'song', label: 'Song' },
  { value: 'release', label: 'Release' },
  { value: 'community', label: 'Community' },
  { value: 'discovery_partner', label: 'Discovery Partner' },
  { value: 'radio_programmer', label: 'Radio Programmer' },
  { value: 'editorial', label: 'Editorial' },
  { value: 'live_performance', label: 'Live Performance' },
];

const STATUS_OPTIONS = [
  { value: 'eligible', label: 'Eligible' },
  { value: 'nominated', label: 'Nominated' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'winner', label: 'Winner' },
  { value: 'honorable_mention', label: 'Honorable Mention' },
];

export default function NomineeManager() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const currentYear = new Date().getFullYear();

  const [expandedCategory, setExpandedCategory] = useState(null);
  const [addDialogCat, setAddDialogCat] = useState(null);
  const [swapDialog, setSwapDialog] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state for add
  const [formData, setFormData] = useState({
    nominee_name: '',
    nominee_type: 'artist',
    bio: '',
    video_url: '',
    nomination_reason: '',
    artist_profile_id: '',
    song_id: '',
    cover_image: '',
    status: 'nominated',
  });

  // Form state for swap
  const [swapData, setSwapData] = useState({
    replacement_name: '',
    replacement_type: 'artist',
    replacement_bio: '',
    replacement_video_url: '',
    replacement_reason: '',
    replacement_cover_image: '',
  });

  const { data: categories = [], isLoading: catLoading } = useQuery({
    queryKey: ['awards-categories-admin', currentYear],
    queryFn: () => base44.entities.AwardsCategory.filter(
      { year: currentYear }, 'sort_order', 100
    ),
  });

  const { data: nominees = [], isLoading: nomLoading } = useQuery({
    queryKey: ['awards-nominees-admin-manage', currentYear],
    queryFn: () => base44.entities.AwardsNominee.filter(
      { year: currentYear }, '-votes_count', 500
    ),
  });

  const { data: artists = [] } = useQuery({
    queryKey: ['admin-artists-for-nominees'],
    queryFn: () => base44.entities.ArtistProfile.filter({}, 'artist_name', 500),
  });

  const { data: songs = [] } = useQuery({
    queryKey: ['admin-songs-for-nominees'],
    queryFn: () => base44.entities.Song.filter({ is_active_version: true }, 'title', 500),
  });

  const nomineesByCategory = useMemo(() => {
    const map = {};
    nominees.forEach(n => {
      if (!map[n.category_id]) map[n.category_id] = [];
      map[n.category_id].push(n);
    });
    return map;
  }, [nominees]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.category_type?.toLowerCase().includes(q)
    );
  }, [categories, searchQuery]);

  const addNomineeMutation = useMutation({
    mutationFn: async ({ category, data }) => {
      const res = await base44.functions.invoke('castAcademyVote', {
        action: 'create_nominee',
        category_id: category.id,
        nominee_name: data.nominee_name,
        nominee_type: data.nominee_type,
        bio: data.bio,
        video_url: data.video_url,
        nomination_reason: data.nomination_reason,
        artist_profile_id: data.artist_profile_id || null,
        song_id: data.song_id || null,
        cover_image: data.cover_image || null,
      });
      if (res.data?.error) throw new Error(res.data.error);

      // Set status separately if not 'nominated' (backend defaults to 'nominated')
      if (data.status !== 'nominated' && res.data?.nominee_id) {
        await base44.entities.AwardsNominee.update(res.data.nominee_id, { status: data.status });
      }

      await base44.entities.AuditLog.create({
        user_id: user.id,
        user_name: user.full_name || user.email,
        user_email: user.email,
        user_role: 'admin',
        action: 'nominee_added',
        action_category: 'admin',
        entity_type: 'AwardsNominee',
        entity_id: res.data?.nominee_id,
        details: `Added nominee "${data.nominee_name}" to "${category.name}"`,
        severity: 'info',
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['awards-nominees-admin-manage'] });
      qc.invalidateQueries({ queryKey: ['awards-nominees-admin'] });
      qc.invalidateQueries({ queryKey: ['awards-nominees-public'] });
    },
  });

  const removeNomineeMutation = useMutation({
    mutationFn: async ({ nominee, category }) => {
      await base44.entities.AwardsNominee.delete(nominee.id);
      await base44.entities.AuditLog.create({
        user_id: user.id,
        user_name: user.full_name || user.email,
        user_email: user.email,
        user_role: 'admin',
        action: 'nominee_removed',
        action_category: 'admin',
        entity_type: 'AwardsNominee',
        entity_id: nominee.id,
        details: `Removed nominee "${nominee.nominee_name}" from "${category.name}"`,
        severity: 'warning',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['awards-nominees-admin-manage'] });
      qc.invalidateQueries({ queryKey: ['awards-nominees-admin'] });
      qc.invalidateQueries({ queryKey: ['awards-nominees-public'] });
    },
  });

  const swapNomineeMutation = useMutation({
    mutationFn: async ({ oldNominee, category, newData }) => {
      // Delete old nominee
      await base44.entities.AwardsNominee.delete(oldNominee.id);

      // Create replacement
      const res = await base44.functions.invoke('castAcademyVote', {
        action: 'create_nominee',
        category_id: category.id,
        nominee_name: newData.replacement_name,
        nominee_type: newData.replacement_type,
        bio: newData.replacement_bio,
        video_url: newData.replacement_video_url,
        nomination_reason: newData.replacement_reason || `Replacing ${oldNominee.nominee_name}`,
        cover_image: newData.replacement_cover_image || null,
      });
      if (res.data?.error) throw new Error(res.data.error);

      await base44.entities.AuditLog.create({
        user_id: user.id,
        user_name: user.full_name || user.email,
        user_email: user.email,
        user_role: 'admin',
        action: 'nominee_swapped',
        action_category: 'admin',
        entity_type: 'AwardsNominee',
        entity_id: res.data?.nominee_id,
        details: `Swapped "${oldNominee.nominee_name}" with "${newData.replacement_name}" in "${category.name}"`,
        severity: 'warning',
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['awards-nominees-admin-manage'] });
      qc.invalidateQueries({ queryKey: ['awards-nominees-admin'] });
      qc.invalidateQueries({ queryKey: ['awards-nominees-public'] });
      setSwapDialog(null);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ nominee, status }) => {
      await base44.entities.AwardsNominee.update(nominee.id, { status });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['awards-nominees-admin-manage'] });
      qc.invalidateQueries({ queryKey: ['awards-nominees-admin'] });
    },
  });

  const handleOpenAdd = (category) => {
    setFormData({
      nominee_name: '', nominee_type: 'artist', bio: '', video_url: '',
      nomination_reason: '', artist_profile_id: '', song_id: '',
      cover_image: '', status: 'nominated',
    });
    setAddDialogCat(category);
  };

  const handleAddSubmit = () => {
    if (!formData.nominee_name.trim()) return;
    addNomineeMutation.mutate(
      { category: addDialogCat, data: formData },
      { onSuccess: () => setAddDialogCat(null) }
    );
  };

  const handleOpenSwap = (nominee, category) => {
    setSwapData({
      replacement_name: '',
      replacement_type: nominee.nominee_type,
      replacement_bio: '',
      replacement_video_url: nominee.video_url || '',
      replacement_reason: '',
      replacement_cover_image: nominee.cover_image || '',
    });
    setSwapDialog({ nominee, category });
  };

  const handleSwapSubmit = () => {
    if (!swapData.replacement_name.trim()) return;
    swapNomineeMutation.mutate({
      oldNominee: swapDialog.nominee,
      category: swapDialog.category,
      newData: swapData,
    });
  };

  if (catLoading || nomLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-lg font-display font-bold">Nominee Management</h2>
            <p className="text-xs text-muted-foreground">
              Add, remove, or swap nominees — strictly {currentYear} cycle · 5 per category max
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          placeholder="Search categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Category List */}
      <div className="space-y-2">
        {filteredCategories.length === 0 ? (
          <GlassCard hover={false} className="p-10 text-center">
            <Trophy className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'No categories match your search.' : `No award categories for the ${currentYear} cycle yet.`}
            </p>
          </GlassCard>
        ) : (
          filteredCategories.map(category => {
            const catNominees = nomineesByCategory[category.id] || [];
            const maxNom = category.max_nominees || 5;
            const isExpanded = expandedCategory === category.id;
            const isFull = catNominees.length >= maxNom;

            return (
              <GlassCard key={category.id} hover={false} className="overflow-hidden">
                <button
                  onClick={() => setExpandedCategory(prev => prev === category.id ? null : category.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/20 transition-colors"
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    catNominees.length > 0 ? 'bg-neon-magenta/15' : 'bg-secondary/30'
                  }`}>
                    <Trophy className={`w-4 h-4 ${catNominees.length > 0 ? 'text-neon-magenta' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-display font-semibold truncate">{category.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-medium ${
                        isFull ? 'text-neon-magenta' : 'text-muted-foreground'
                      }`}>
                        {catNominees.length}/{maxNom} nominees
                      </span>
                      {isFull && (
                        <NeonBadge color="magenta" className="text-[9px]">Full</NeonBadge>
                      )}
                      {category.category_type === 'live_performance' && (
                        <NeonBadge color="turquoise" className="text-[9px]">Live Performance</NeonBadge>
                      )}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border/30 pt-3 space-y-3">
                    {catNominees.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">
                        No nominees yet. Add up to {maxNom}.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {catNominees.map((nominee, idx) => (
                          <div
                            key={nominee.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20 border border-border/30"
                          >
                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                              {nominee.cover_image ? (
                                <img src={nominee.cover_image} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="text-xs font-bold text-muted-foreground">{idx + 1}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{nominee.nominee_name}</p>
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                <NeonBadge color="blue" className="text-[9px]">
                                  {NOMINEE_TYPES.find(t => t.value === nominee.nominee_type)?.label || nominee.nominee_type}
                                </NeonBadge>
                                {nominee.video_url && <Video className="w-3 h-3 text-neon-magenta" />}
                                {nominee.bio && <User className="w-3 h-3 text-neon-cyan" />}
                                {nominee.song_id && <Music className="w-3 h-3 text-neon-purple" />}
                                {nominee.votes_count > 0 && (
                                  <span className="text-[9px] text-muted-foreground">{nominee.votes_count} votes</span>
                                )}
                              </div>
                            </div>

                            {/* Status selector */}
                            <Select
                              value={nominee.status}
                              onValueChange={(val) => updateStatusMutation.mutate({ nominee, status: val })}
                            >
                              <SelectTrigger className="w-[120px] h-7 text-[10px] flex-shrink-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-[10px] flex-shrink-0"
                              onClick={() => handleOpenSwap(nominee, category)}
                              disabled={swapNomineeMutation.isPending}
                            >
                              <ArrowLeftRight className="w-3 h-3" /> Swap
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-[10px] flex-shrink-0 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                              onClick={() => {
                                if (confirm(`Remove "${nominee.nominee_name}" from ${category.name}?`)) {
                                  removeNomineeMutation.mutate({ nominee, category });
                                }
                              }}
                              disabled={removeNomineeMutation.isPending}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add button */}
                    {catNominees.length < maxNom && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-dashed"
                        onClick={() => handleOpenAdd(category)}
                      >
                        <Plus className="w-4 h-4" /> Add Nominee ({catNominees.length}/{maxNom})
                      </Button>
                    )}
                    {isFull && (
                      <div className="flex items-center gap-2 p-2.5 bg-neon-magenta/5 border border-neon-magenta/20 rounded-lg">
                        <AlertCircle className="w-3.5 h-3.5 text-neon-magenta flex-shrink-0" />
                        <p className="text-[11px] text-muted-foreground">
                          Category is full ({maxNom} nominees). Remove or swap a nominee to make changes.
                        </p>
                      </div>
                    )}

                    {/* Mutation errors */}
                    {addNomineeMutation.isError && addDialogCat?.id === category.id && (
                      <p className="text-xs text-destructive">
                        {addNomineeMutation.error?.message || 'Failed to add nominee'}
                      </p>
                    )}
                  </div>
                )}
              </GlassCard>
            );
          })
        )}
      </div>

      {/* Add Nominee Dialog */}
      <Dialog open={!!addDialogCat} onOpenChange={(open) => !open && setAddDialogCat(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              Add Nominee to {addDialogCat?.name}
            </DialogTitle>
            <DialogDescription>
              {(nomineesByCategory[addDialogCat?.id]?.length || 0) + 1}/{addDialogCat?.max_nominees || 5} nominees after adding.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nominee Name *</label>
              <Input
                value={formData.nominee_name}
                onChange={(e) => setFormData(prev => ({ ...prev, nominee_name: e.target.value }))}
                placeholder="e.g. Jane Doe, Song Title, Community Name"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Nominee Type *</label>
              <Select
                value={formData.nominee_type}
                onValueChange={(val) => setFormData(prev => ({ ...prev, nominee_type: val }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NOMINEE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Bio</label>
              <Textarea
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Nominee biography for the profile page..."
                rows={3}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Video URL (YouTube — for Live Performance nominees)</label>
              <Input
                value={formData.video_url}
                onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                placeholder="https://youtu.be/..."
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Nomination Reason</label>
              <Textarea
                value={formData.nomination_reason}
                onChange={(e) => setFormData(prev => ({ ...prev, nomination_reason: e.target.value }))}
                placeholder="Why this nominee was selected..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Link to Artist (optional)</label>
                <Select
                  value={formData.artist_profile_id}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, artist_profile_id: val }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select artist..." /></SelectTrigger>
                  <SelectContent>
                    {artists.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.artist_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Link to Song (optional)</label>
                <Select
                  value={formData.song_id}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, song_id: val }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select song..." /></SelectTrigger>
                  <SelectContent>
                    {songs.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.title} — {s.artist_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Cover Image URL (optional)</label>
              <Input
                value={formData.cover_image}
                onChange={(e) => setFormData(prev => ({ ...prev, cover_image: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select
                value={formData.status}
                onValueChange={(val) => setFormData(prev => ({ ...prev, status: val }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {addNomineeMutation.isError && (
              <div className="flex items-center gap-2 p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                <p className="text-xs text-destructive">
                  {addNomineeMutation.error?.message || 'Failed to add nominee'}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogCat(null)}>Cancel</Button>
            <Button
              onClick={handleAddSubmit}
              disabled={!formData.nominee_name.trim() || addNomineeMutation.isPending}
            >
              {addNomineeMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</>
              ) : (
                <><Plus className="w-4 h-4" /> Add Nominee</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Swap Nominee Dialog */}
      <Dialog open={!!swapDialog} onOpenChange={(open) => !open && setSwapDialog(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-primary" />
              Swap Nominee
            </DialogTitle>
            <DialogDescription>
              Replace <strong>{swapDialog?.nominee?.nominee_name}</strong> in {swapDialog?.category?.name}.
              The old nominee will be removed and the replacement added in their place.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Replacement Name *</label>
              <Input
                value={swapData.replacement_name}
                onChange={(e) => setSwapData(prev => ({ ...prev, replacement_name: e.target.value }))}
                placeholder="New nominee name"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Replacement Type</label>
              <Select
                value={swapData.replacement_type}
                onValueChange={(val) => setSwapData(prev => ({ ...prev, replacement_type: val }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NOMINEE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Bio</label>
              <Textarea
                value={swapData.replacement_bio}
                onChange={(e) => setSwapData(prev => ({ ...prev, replacement_bio: e.target.value }))}
                placeholder="Replacement nominee biography..."
                rows={3}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Video URL (YouTube)</label>
              <Input
                value={swapData.replacement_video_url}
                onChange={(e) => setSwapData(prev => ({ ...prev, replacement_video_url: e.target.value }))}
                placeholder="https://youtu.be/..."
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Reason for Swap</label>
              <Textarea
                value={swapData.replacement_reason}
                onChange={(e) => setSwapData(prev => ({ ...prev, replacement_reason: e.target.value }))}
                placeholder="Why this swap was made (audited)..."
                rows={2}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Cover Image URL</label>
              <Input
                value={swapData.replacement_cover_image}
                onChange={(e) => setSwapData(prev => ({ ...prev, replacement_cover_image: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            {swapNomineeMutation.isError && (
              <div className="flex items-center gap-2 p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                <p className="text-xs text-destructive">
                  {swapNomineeMutation.error?.message || 'Failed to swap nominee'}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSwapDialog(null)}>Cancel</Button>
            <Button
              onClick={handleSwapSubmit}
              disabled={!swapData.replacement_name.trim() || swapNomineeMutation.isPending}
              className="hover:opacity-90"
            >
              {swapNomineeMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Swapping...</>
              ) : (
                <><ArrowLeftRight className="w-4 h-4" /> Confirm Swap</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}