import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Share2, Music, ExternalLink, Plus, Trash2, 
  Instagram, Facebook, Twitter, Youtube, Link as LinkIcon,
  Check, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { toast } from 'sonner';

const SOCIAL_PLATFORMS = [
  { id: 'tiktok', name: 'TikTok', icon: Music, color: 'text-neon-magenta', placeholder: 'https://tiktok.com/@username' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-neon-purple', placeholder: 'https://instagram.com/username' },
  { id: 'twitter', name: 'Twitter/X', icon: Twitter, color: 'text-neon-cyan', placeholder: 'https://twitter.com/username' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'text-neon-blue', placeholder: 'https://facebook.com/username' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'text-neon-turquoise', placeholder: 'https://youtube.com/@channel' },
];

export default function FanSocialLinksManager({ userId }) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [urlInput, setUrlInput] = useState('');

  const { data: user, isLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  // Get current user's social links from user.data
  const socialLinks = user?.data?.social_links || [];

  const queryClient = useQueryClient();

  const updateSocialLinksMutation = useMutation({
    mutationFn: async (newLinks) => {
      await base44.auth.updateMe({ data: { social_links: newLinks } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      toast.success('Social links updated');
    },
    onError: (error) => {
      toast.error('Failed to update social links');
      console.error('Error updating social links:', error);
    },
  });

  const handleAddLink = () => {
    if (!selectedPlatform || !urlInput.trim()) return;

    const newLink = {
      platform: selectedPlatform.id,
      url: urlInput.trim(),
      username: urlInput.split('/').pop(),
    };

    const updatedLinks = [...socialLinks, newLink];
    updateSocialLinksMutation.mutate(updatedLinks);
    setUrlInput('');
    setSelectedPlatform(null);
    setIsAddDialogOpen(false);
  };

  const handleRemoveLink = (platformId) => {
    const updatedLinks = socialLinks.filter(link => link.platform !== platformId);
    updateSocialLinksMutation.mutate(updatedLinks);
  };

  const handleShareMusic = (platform, song) => {
    const shareUrls = {
      tiktok: `https://www.tiktok.com/t/${song?.id || ''}/`,
      instagram: `https://www.instagram.com/reels/audio/${song?.id || ''}/`,
      twitter: `https://twitter.com/intent/tweet?text=Check out this track on Frequency!`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin + '/artist/' + song?.artist_profile_id)}`,
    };

    const url = shareUrls[platform] || window.location.origin;
    window.open(url, '_blank');
  };

  const handleCreateContent = (platform) => {
    const platformUrls = {
      tiktok: 'https://www.tiktok.com/@me?lang=en',
      instagram: 'https://www.instagram.com/reels/new/',
      youtube: 'https://studio.youtube.com/',
      facebook: 'https://www.facebook.com/reels/',
      twitter: 'https://twitter.com/compose/tweet',
    };

    window.open(platformUrls[platform] || 'https://www.google.com', '_blank');
  };

  if (isLoading) {
    return <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <GlassCard hover={false} className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-foreground">Social Media Integration</h3>
          <p className="text-xs text-muted-foreground">
            Connect up to 3 platforms to share music instantly
          </p>
        </div>
        <NeonBadge color="cyan">{socialLinks.length}/3</NeonBadge>
      </div>

      {socialLinks.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border/40 rounded-xl">
          <Share2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            Connect your social accounts to share music with your network
          </p>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Social Link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Social Media Platform</DialogTitle>
                <DialogDescription>
                  Choose a platform and add your profile URL. You can connect up to 3 platforms.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Select Platform</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {SOCIAL_PLATFORMS.map((platform) => {
                      const Icon = platform.icon;
                      const isSelected = selectedPlatform?.id === platform.id;
                      return (
                        <Button
                          key={platform.id}
                          variant={isSelected ? 'default' : 'outline'}
                          className={`justify-start gap-2 ${isSelected ? '' : ''}`}
                          onClick={() => setSelectedPlatform(platform)}
                        >
                          <Icon className={`w-4 h-4 ${platform.color}`} />
                          {platform.name}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {selectedPlatform && (
                  <div className="space-y-2">
                    <Label>Profile URL</Label>
                    <Input
                      placeholder={selectedPlatform.placeholder}
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddLink}
                  disabled={!selectedPlatform || !urlInput.trim()}
                >
                  Add Link
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="space-y-3">
          {socialLinks.map((link, idx) => {
            const platform = SOCIAL_PLATFORMS.find(p => p.id === link.platform);
            const Icon = platform?.icon || LinkIcon;
            
            return (
              <motion.div
                key={link.platform}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20 border border-border/30"
              >
                <div className={`p-2 rounded-lg bg-secondary/50`}>
                  <Icon className={`w-4 h-4 ${platform?.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{platform?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{link.username}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(link.url, '_blank')}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveLink(link.platform)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            );
          })}

          {socialLinks.length < 3 && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2 border-dashed">
                  <Plus className="w-4 h-4" />
                  Add Another Platform
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Social Media Platform</DialogTitle>
                  <DialogDescription>
                    Choose a platform and add your profile URL.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Select Platform</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {SOCIAL_PLATFORMS.map((platform) => {
                        const Icon = platform.icon;
                        const isSelected = selectedPlatform?.id === platform.id;
                        const isAlreadyAdded = socialLinks.some(l => l.platform === platform.id);
                        return (
                          <Button
                            key={platform.id}
                            variant={isSelected ? 'default' : 'outline'}
                            disabled={isAlreadyAdded}
                            className="justify-start gap-2"
                            onClick={() => setSelectedPlatform(platform)}
                          >
                            <Icon className={`w-4 h-4 ${platform.color}`} />
                            {platform.name}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {selectedPlatform && (
                    <div className="space-y-2">
                      <Label>Profile URL</Label>
                      <Input
                        placeholder={selectedPlatform.placeholder}
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddLink}
                    disabled={!selectedPlatform || !urlInput.trim()}
                  >
                    Add Link
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}

      {/* Quick Actions */}
      {socialLinks.length > 0 && (
        <div className="mt-6 pt-6 border-t border-border/30">
          <h4 className="text-xs font-semibold text-muted-foreground mb-3">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            {socialLinks.map((link) => {
              const platform = SOCIAL_PLATFORMS.find(p => p.id === link.platform);
              const Icon = platform?.icon || LinkIcon;
              return (
                <Button
                  key={link.platform}
                  variant="outline"
                  size="sm"
                  className="justify-start gap-2"
                  onClick={() => handleCreateContent(link.platform)}
                >
                  <Icon className={`w-3 h-3 ${platform?.color}`} />
                  Create on {platform?.name}
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </GlassCard>
  );
}