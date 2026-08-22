import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Plus, Pencil, Trash2, Pin, PinOff, Eye, EyeOff, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

const CATEGORIES = [
  { value: 'mainstream_first', label: 'Mainstream First™' },
  { value: 'heard_first', label: 'Heard First on The Mainstream™' },
  { value: 'rising', label: 'Rising on The Mainstream™' },
  { value: 'featured_artist', label: 'Featured Artist' },
  { value: 'new_release', label: 'New Releases' },
  { value: 'discovery_partner_spotlight', label: 'Discovery Partner Spotlight' },
  { value: 'community_spotlight', label: 'Community Spotlight' },
  { value: 'radio_spotlight', label: 'Radio Spotlight' },
  { value: 'live_event', label: 'Live Events' },
  { value: 'merchandise', label: 'Merchandise' },
  { value: 'ticket_sale', label: 'Ticket Sales' },
  { value: 'editorial_collection', label: 'Editorial Collections' },
  { value: 'promotional_campaign', label: 'Promotional Campaigns' },
];

const CTA_ACTIONS = [
  { value: 'play_now', label: 'Play Now' },
  { value: 'view_artist', label: 'View Artist' },
  { value: 'support_artist', label: 'Support Artist' },
  { value: 'view_community', label: 'View Community' },
  { value: 'view_event', label: 'View Event' },
  { value: 'shop_merch', label: 'Shop Merchandise' },
  { value: 'buy_tickets', label: 'Buy Tickets' },
  { value: 'learn_more', label: 'Learn More' },
  { value: 'join_now', label: 'Join Now' },
];

const BANNER_TYPES = [
  { value: 'editorial', label: 'Editorial' },
  { value: 'dynamic_artist', label: 'Dynamic Artist' },
  { value: 'community_event', label: 'Community / Event' },
  { value: 'sponsored_campaign', label: 'Sponsored Campaign' },
];

const USER_TYPES = ['fan', 'artist', 'discovery_partner', 'radio_programmer', 'community_manager', 'admin'];

const EMPTY_FORM = {
  title: '', category: 'featured_artist', category_label: '', headline: '', subheadline: '',
  cta_text: 'Learn More', cta_action: 'view_artist', cta_url: '',
  artist_name: '', artist_handle: '', genre: '',
  desktop_artwork: '', mobile_artwork: '',
  start_date: '', end_date: '',
  is_pinned: false, is_active: true, priority: 0,
  banner_type: 'editorial', target_user_types: ['all'],
};

export default function HeroBannerManager() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ['admin-hero-banners'],
    queryFn: () => base44.entities.HeroBanner.list('-priority', 100),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        category_label: data.category_label || CATEGORIES.find(c => c.value === data.category)?.label || '',
        target_user_types: data.target_user_types?.length ? data.target_user_types : ['all'],
        start_date: data.start_date ? new Date(data.start_date).toISOString() : null,
        end_date: data.end_date ? new Date(data.end_date).toISOString() : null,
        created_by_user_id: user.id,
        created_by_name: user.full_name || user.email,
      };
      if (editingId) {
        return base44.entities.HeroBanner.update(editingId, payload);
      }
      return base44.entities.HeroBanner.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-hero-banners'] });
      qc.invalidateQueries({ queryKey: ['hero-banners'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.HeroBanner.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-hero-banners'] });
      qc.invalidateQueries({ queryKey: ['hero-banners'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, field, value }) => base44.entities.HeroBanner.update(id, { [field]: value }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-hero-banners'] });
      qc.invalidateQueries({ queryKey: ['hero-banners'] });
    },
  });

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (banner) => {
    setForm({
      ...EMPTY_FORM,
      ...banner,
      start_date: banner.start_date ? new Date(banner.start_date).toISOString().slice(0, 16) : '',
      end_date: banner.end_date ? new Date(banner.end_date).toISOString().slice(0, 16) : '',
    });
    setEditingId(banner.id);
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  const toggleUserType = (type) => {
    const current = form.target_user_types || ['all'];
    if (type === 'all') {
      setForm({ ...form, target_user_types: ['all'] });
      return;
    }
    const withoutAll = current.filter(t => t !== 'all');
    if (withoutAll.includes(type)) {
      const next = withoutAll.filter(t => t !== type);
      setForm({ ...form, target_user_types: next.length ? next : ['all'] });
    } else {
      setForm({ ...form, target_user_types: [...withoutAll, type] });
    }
  };

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-primary" /> Hero Banner Management
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {banners.length} banner{banners.length !== 1 ? 's' : ''} configured · {banners.filter(b => b.is_active).length} active
          </p>
        </div>
        {!showForm && (
          <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true); }}>
            <Plus className="w-4 h-4" /> Create Banner
          </Button>
        )}
      </div>

      {showForm && (
        <GlassCard hover={false} className="p-5 space-y-4 border-primary/20">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">{editingId ? 'Edit Banner' : 'New Hero Banner'}</h4>
            <Button size="icon" variant="ghost" onClick={resetForm}><X className="w-4 h-4" /></Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Internal Title</label>
                <Input value={form.title} onChange={e => update('title', e.target.value)} placeholder="Summer Spotlight Campaign" required />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                <Select value={form.category} onValueChange={v => update('category', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Headline</label>
              <Input value={form.headline} onChange={e => update('headline', e.target.value)} placeholder="Discover the Sound of Summer" required />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Subheadline</label>
              <Input value={form.subheadline} onChange={e => update('subheadline', e.target.value)} placeholder="Hand-picked tracks from rising independent artists" />
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">CTA Action</label>
                <Select value={form.cta_action} onValueChange={v => update('cta_action', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CTA_ACTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">CTA Button Text</label>
                <Input value={form.cta_text} onChange={e => update('cta_text', e.target.value)} placeholder="Learn More" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">CTA URL (optional)</label>
                <Input value={form.cta_url} onChange={e => update('cta_url', e.target.value)} placeholder="/artists or https://..." />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Artist Name</label>
                <Input value={form.artist_name} onChange={e => update('artist_name', e.target.value)} placeholder="WinkLoveLoss" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Artist Handle</label>
                <Input value={form.artist_handle} onChange={e => update('artist_handle', e.target.value)} placeholder="winkloveloss" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Genre</label>
                <Input value={form.genre} onChange={e => update('genre', e.target.value)} placeholder="Indie Pop" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Desktop Artwork URL</label>
                <Input value={form.desktop_artwork} onChange={e => update('desktop_artwork', e.target.value)} placeholder="https://images.unsplash.com/..." />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Mobile Artwork URL</label>
                <Input value={form.mobile_artwork} onChange={e => update('mobile_artwork', e.target.value)} placeholder="https://images.unsplash.com/..." />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Start Date</label>
                <Input type="datetime-local" value={form.start_date} onChange={e => update('start_date', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">End Date</label>
                <Input type="datetime-local" value={form.end_date} onChange={e => update('end_date', e.target.value)} />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Banner Type</label>
                <Select value={form.banner_type} onValueChange={v => update('banner_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{BANNER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
                <Input type="number" value={form.priority} onChange={e => update('priority', parseInt(e.target.value) || 0)} placeholder="0" />
              </div>
              <div className="flex items-end gap-4 pb-1">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox checked={form.is_active} onCheckedChange={v => update('is_active', v)} /> Active
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox checked={form.is_pinned} onCheckedChange={v => update('is_pinned', v)} /> Pinned
                </label>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Target User Types</label>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox checked={form.target_user_types?.includes('all')} onCheckedChange={() => toggleUserType('all')} /> All Users
                </label>
                {USER_TYPES.map(type => (
                  <label key={type} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox
                      checked={form.target_user_types?.includes(type)}
                      onCheckedChange={() => toggleUserType(type)}
                    /> {type.replace(/_/g, ' ')}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editingId ? 'Update Banner' : 'Create Banner'}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Banner List */}
      {isLoading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Loading banners...</div>
      ) : banners.length === 0 && !showForm ? (
        <GlassCard hover={false} className="p-10 text-center">
          <ImageIcon className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No hero banners yet. Create your first banner to get started.</p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {banners.map(banner => (
            <GlassCard key={banner.id} hover={false} className="p-3 flex items-center gap-3">
              <div className="w-16 h-10 rounded overflow-hidden flex-shrink-0 bg-secondary/30">
                {banner.desktop_artwork ? (
                  <img src={banner.desktop_artwork} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-muted-foreground/30" /></div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{banner.title || banner.headline}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {banner.category_label || banner.category?.replace(/_/g, ' ')}
                  {banner.artist_name && ` · ${banner.artist_name}`}
                  {banner.priority ? ` · Priority: ${banner.priority}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {banner.is_pinned && <NeonBadge color="purple">Pinned</NeonBadge>}
                <NeonBadge color={banner.is_active ? 'turquoise' : 'magenta'}>
                  {banner.is_active ? 'Active' : 'Inactive'}
                </NeonBadge>
                <Button size="icon" variant="ghost" onClick={() => toggleMutation.mutate({ id: banner.id, field: 'is_pinned', value: !banner.is_pinned })}>
                  {banner.is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => toggleMutation.mutate({ id: banner.id, field: 'is_active', value: !banner.is_active })}>
                  {banner.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => handleEdit(banner)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { if (confirm('Delete this banner?')) deleteMutation.mutate(banner.id); }}>
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}