import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Plus, X, Save, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import GlassCard from '@/components/shared/GlassCard';
import { toast } from 'sonner';

const PLATFORM_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'spotify', label: 'Spotify' },
  { value: 'apple_music', label: 'Apple Music' },
  { value: 'soundcloud', label: 'SoundCloud' },
  { value: 'bandcamp', label: 'Bandcamp' },
  { value: 'other', label: 'Other' },
];

export default function ArtistSocialLinksManager({ artistProfileId, artistName }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  
  const { data: artistProfile } = useQuery({
    queryKey: ['artist-profile', artistProfileId],
    queryFn: () => base44.entities.ArtistProfile.filter({ id: artistProfileId }),
    enabled: !!artistProfileId,
    select: (data) => data?.[0],
  });
  
  const [links, setLinks] = useState(artistProfile?.social_platforms || []);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.ArtistProfile.update(artistProfileId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-artist-profile'] });
      queryClient.invalidateQueries({ queryKey: ['artist', artistProfileId] });
      toast.success('Social links updated!');
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error('Failed to update links');
      console.error(error);
    },
  });

  const addLink = () => {
    if (links.length >= 3) {
      toast.error('Maximum 3 links allowed');
      return;
    }
    setLinks([...links, { platform: 'instagram', url: '', username: '' }]);
  };

  const removeLink = (index) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const updateLink = (index, field, value) => {
    const updated = [...links];
    updated[index] = { ...updated[index], [field]: value };
    setLinks(updated);
  };

  const handleSave = () => {
    // Validate URLs
    const validLinks = links.filter(link => link.url && link.url.trim());
    if (validLinks.length === 0) {
      toast.error('Add at least one valid URL');
      return;
    }

    updateMutation.mutate({ social_platforms: validLinks });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LinkIcon className="w-4 h-4 text-neon-purple" />
          <h3 className="text-sm font-semibold">Social & Streaming Links</h3>
        </div>
        {!isEditing ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLinks(artistProfile?.social_platforms || []);
              setIsEditing(true);
            }}
            className="text-xs"
          >
            Edit Links
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="text-xs">
              Cancel
            </Button>
            <Button variant="default" size="sm" onClick={handleSave} className="text-xs gap-1">
              <Save className="w-3 h-3" /> Save
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {links.map((link, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2 items-start"
          >
            <div className="flex-1 space-y-2">
              {isEditing ? (
                <>
                  <div className="flex gap-2">
                    <Select
                      value={link.platform}
                      onValueChange={(value) => updateLink(index, 'platform', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Platform" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLATFORM_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLink(index)}
                      className="flex-shrink-0 h-9 w-9"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Profile URL (e.g., https://instagram.com/artistname)"
                    value={link.url}
                    onChange={(e) => updateLink(index, 'url', e.target.value)}
                    className="text-xs"
                  />
                  <Input
                    placeholder="Username/handle (optional)"
                    value={link.username || ''}
                    onChange={(e) => updateLink(index, 'username', e.target.value)}
                    className="text-xs"
                  />
                </>
              ) : (
                <div className="p-3 rounded-lg bg-secondary/20 border border-border/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium capitalize">
                        {link.platform.replace('_', ' ')}
                      </p>
                      {link.username && (
                        <p className="text-[10px] text-muted-foreground">@{link.username}</p>
                      )}
                    </div>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-neon-cyan hover:underline flex items-center gap-1"
                    >
                      Visit <LinkIcon className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {isEditing && links.length < 3 && (
          <Button
            variant="outline"
            size="sm"
            onClick={addLink}
            className="w-full border-dashed text-xs"
          >
            <Plus className="w-3 h-3 mr-1" /> Add Link ({links.length}/3)
          </Button>
        )}

        {!isEditing && links.length === 0 && (
          <div className="text-center py-6 border border-dashed border-border/40 rounded-lg">
            <p className="text-xs text-muted-foreground">No social links added yet</p>
          </div>
        )}
      </div>
    </div>
  );
}