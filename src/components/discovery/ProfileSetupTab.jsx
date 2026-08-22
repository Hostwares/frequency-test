import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { User, Globe, MapPin, Save, Link2 } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const PARTNER_TYPES = [
  ['music_blog', 'Music Blog'],
  ['independent_curator', 'Independent Curator'],
  ['influencer', 'Influencer'],
  ['radio_host', 'Radio Host'],
  ['podcast_host', 'Podcast Host'],
  ['music_reviewer', 'Music Reviewer'],
  ['veteran_organization', 'Veteran Organization'],
  ['festival_organizer', 'Festival Organizer'],
  ['college_music_program', 'College Music Program'],
  ['local_music_organization', 'Local Music Organization'],
  ['music_journalist', 'Music Journalist'],
  ['community_music_leader', 'Community Music Leader'],
  ['other', 'Other'],
];

export default function ProfileSetupTab({ profile, userId }) {
  const qc = useQueryClient();
  const isNew = !profile?.id;

  const [form, setForm] = useState({
    name: '', description: '', partner_type: 'independent_curator',
    website: '', location: '', profile_image: '', cover_image: '',
    genres_covered: [],
    social_links: { instagram: '', twitter: '', youtube: '', tiktok: '' },
  });
  const [genreInput, setGenreInput] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) setForm({ ...form, ...profile, social_links: profile.social_links || form.social_links });
  }, [profile?.id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setSocial = (k, v) => setForm(f => ({ ...f, social_links: { ...f.social_links, [k]: v } }));

  const save = useMutation({
    mutationFn: () => isNew
      ? base44.entities.DiscoveryPartner.create({ ...form, user_id: userId, is_active: true })
      : base44.entities.DiscoveryPartner.update(profile.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-dp-profile'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const addGenre = () => {
    const g = genreInput.trim();
    if (g && !form.genres_covered.includes(g)) {
      set('genres_covered', [...form.genres_covered, g]);
    }
    setGenreInput('');
  };

  const removeGenre = (g) => set('genres_covered', form.genres_covered.filter(x => x !== g));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <User className="w-4 h-4 text-neon-purple" />
        <h2 className="font-display font-semibold text-sm">
          {isNew ? 'Set Up Your Profile' : 'Edit Profile'}
        </h2>
        {!isNew && profile?.verification_status && (
          <NeonBadge color={profile.is_verified ? 'turquoise' : 'blue'}>
            {profile.is_verified ? 'Verified' : `Verification: ${profile.verification_status}`}
          </NeonBadge>
        )}
      </div>

      {isNew && (
        <GlassCard hover={false} className="p-4 border-neon-cyan/15 bg-gradient-to-r from-neon-cyan/5 to-transparent">
          <p className="text-xs text-muted-foreground">
            <span className="text-neon-cyan font-semibold">First time here?</span> Fill out your profile to start curating playlists, writing spotlights, and building your discovery reputation.
          </p>
        </GlassCard>
      )}

      {/* Identity */}
      <GlassCard hover={false} className="p-5 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Identity</p>
        <Input placeholder="Display name *" value={form.name} onChange={e => set('name', e.target.value)} className="bg-secondary/20" />
        <Textarea placeholder="Describe who you are, what you curate, and why the community should trust your picks..."
          value={form.description} onChange={e => set('description', e.target.value)} className="bg-secondary/20 min-h-[90px]" />
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 bg-secondary/20 rounded-md px-3 h-9">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input placeholder="Location" value={form.location} onChange={e => set('location', e.target.value)}
              className="bg-transparent text-sm flex-1 outline-none placeholder:text-muted-foreground/60" />
          </div>
          <div className="flex items-center gap-2 bg-secondary/20 rounded-md px-3 h-9">
            <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input placeholder="Website URL" value={form.website} onChange={e => set('website', e.target.value)}
              className="bg-transparent text-sm flex-1 outline-none placeholder:text-muted-foreground/60" />
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">Partner type</p>
          <div className="flex flex-wrap gap-1.5">
            {PARTNER_TYPES.map(([val, label]) => (
              <button key={val} onClick={() => set('partner_type', val)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors
                  ${form.partner_type === val
                    ? 'bg-primary/20 text-primary border-primary/30'
                    : 'text-muted-foreground border-border/30 hover:border-border/60'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Images */}
      <GlassCard hover={false} className="p-5 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Images</p>
        <Input placeholder="Profile image URL" value={form.profile_image} onChange={e => set('profile_image', e.target.value)} className="bg-secondary/20" />
        <Input placeholder="Cover / banner image URL" value={form.cover_image} onChange={e => set('cover_image', e.target.value)} className="bg-secondary/20" />
      </GlassCard>

      {/* Genres */}
      <GlassCard hover={false} className="p-5 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Genres You Cover</p>
        <div className="flex gap-2">
          <Input placeholder="e.g. Indie Folk" value={genreInput} onChange={e => setGenreInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addGenre()} className="bg-secondary/20 flex-1" />
          <Button size="sm" variant="outline" onClick={addGenre} className="h-9">Add</Button>
        </div>
        {form.genres_covered.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {form.genres_covered.map(g => (
              <button key={g} onClick={() => removeGenre(g)}
                className="text-[11px] px-2 py-0.5 rounded-full bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-colors">
                {g} ×
              </button>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Social links */}
      <GlassCard hover={false} className="p-5 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Link2 className="w-3.5 h-3.5" /> Social Links
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[['instagram', 'Instagram'], ['twitter', 'X / Twitter'], ['youtube', 'YouTube'], ['tiktok', 'TikTok']].map(([key, label]) => (
            <Input key={key} placeholder={label} value={form.social_links?.[key] || ''}
              onChange={e => setSocial(key, e.target.value)} className="bg-secondary/20 text-sm" />
          ))}
        </div>
      </GlassCard>

      <Button onClick={() => save.mutate()} disabled={!form.name || save.isPending}
        className="w-full gap-2 bg-neon-purple/20 text-neon-purple border border-neon-purple/30 hover:bg-neon-purple/30">
        <Save className="w-4 h-4" />
        {save.isPending ? 'Saving...' : saved ? 'Saved!' : isNew ? 'Create Profile' : 'Save Changes'}
      </Button>
    </div>
  );
}