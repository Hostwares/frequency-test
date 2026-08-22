import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Music, Loader2 } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import GenreSelect from '@/components/shared/GenreSelect';
import { toast } from 'sonner';

const BIO_MAX = 7000;

export default function CreateArtistProfileForm({ userId, onCreated }) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    artist_name: '',
    bio: '',
    genre: '',
    location: '',
  });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.artist_name.trim()) {
      toast.error('Artist name is required');
      return;
    }
    if (form.bio.length > BIO_MAX) {
      toast.error(`Bio must be ${BIO_MAX.toLocaleString()} characters or fewer`);
      return;
    }
    setCreating(true);
    try {
      await base44.entities.ArtistProfile.create({
        user_id: userId,
        artist_name: form.artist_name.trim(),
        bio: form.bio.trim(),
        genre: form.genre,
        location: form.location.trim(),
      });
      toast.success('Artist profile created!');
      queryClient.invalidateQueries({ queryKey: ['my-artist-profile'] });
      if (onCreated) onCreated();
    } catch (err) {
      toast.error(err.message || 'Failed to create artist profile');
    } finally {
      setCreating(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <GlassCard hover={false} className="p-6 max-w-lg mx-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-center mb-4">
            <div className="inline-flex p-3 rounded-xl bg-neon-purple/10 border border-neon-purple/20 mb-3">
              <Music className="w-6 h-6 text-neon-purple" />
            </div>
            <h2 className="text-xl font-display font-bold">Create Your Artist Profile</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Set up your profile to start uploading music, receiving support, and building your network.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="artist_name">Artist / Band Name *</Label>
            <Input
              id="artist_name"
              placeholder="Your stage name"
              value={form.artist_name}
              onChange={(e) => set('artist_name', e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Primary Genre</Label>
            <GenreSelect value={form.genre} onChange={(v) => set('genre', v)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="City, State or Country"
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="bio">Bio</Label>
              <span className={`text-[10px] tabular-nums ${form.bio.length > BIO_MAX ? 'text-destructive' : 'text-muted-foreground'}`}>
                {form.bio.length.toLocaleString()} / {BIO_MAX.toLocaleString()}
              </span>
            </div>
            <Textarea
              id="bio"
              placeholder="Tell fans about your music and story..."
              value={form.bio}
              onChange={(e) => set('bio', e.target.value.slice(0, BIO_MAX))}
              maxLength={BIO_MAX}
              className="h-20"
            />
          </div>

          <Button type="submit" className="w-full bg-gradient-neon" disabled={creating}>
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating profile...
              </>
            ) : (
              'Create Artist Profile'
            )}
          </Button>
        </form>
      </GlassCard>
    </motion.div>
  );
}