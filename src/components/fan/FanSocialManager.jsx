import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Instagram, Youtube, Twitter, Link as LinkIcon, Plus, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { toast } from 'sonner';

const PLATFORM_CONFIG = {
  instagram: { icon: Instagram, label: 'Instagram', color: 'text-pink-600', placeholder: 'https://instagram.com/yourusername' },
  tiktok: { icon: Youtube, label: 'TikTok', color: 'text-neon-cyan', placeholder: 'https://tiktok.com/@yourusername' },
  twitter: { icon: Twitter, label: 'X/Twitter', color: 'text-blue-400', placeholder: 'https://twitter.com/yourusername' },
  youtube: { icon: Youtube, label: 'YouTube', color: 'text-red-500', placeholder: 'https://youtube.com/@yourchannel' },
  facebook: { icon: LinkIcon, label: 'Facebook', color: 'text-blue-600', placeholder: 'https://facebook.com/yourprofile' },
  snapchat: { icon: LinkIcon, label: 'Snapchat', color: 'text-yellow-400', placeholder: 'Snapchat username' },
};

export default function FanSocialManager({ userId }) {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: userProfile, refetch } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: () => base44.entities.User.filter({ id: userId }),
    enabled: !!userId,
    select: (data) => data?.[0],
  });

  const socialLinks = userProfile?.social_links || {};
  const connectedCount = Object.keys(socialLinks).filter(k => socialLinks[k]).length;

  const updateUserMutation = useMutation({
    mutationFn: async (newSocialLinks) => {
      await base44.auth.updateMe({ social_links: newSocialLinks });
    },
    onSuccess: () => {
      refetch();
      toast.success('Social links updated!');
    },
  });

  const handleAddLink = (platform) => {
    if (connectedCount >= 3) {
      toast.error('Maximum 3 social platforms allowed');
      return;
    }
    
    const url = prompt(`Enter your ${platform} profile URL:`);
    if (url) {
      updateUserMutation.mutate({ ...socialLinks, [platform]: url });
    }
  };

  const handleRemoveLink = (platform) => {
    const updated = { ...socialLinks };
    delete updated[platform];
    updateUserMutation.mutate(updated);
  };

  const handleOpenPlatform = (platform) => {
    const platformUrls = {
      instagram: 'https://www.instagram.com/reels/new/',
      tiktok: 'https://www.tiktok.com/@me?lang=en',
      twitter: 'https://twitter.com/compose/tweet',
      youtube: 'https://studio.youtube.com/',
      facebook: 'https://www.facebook.com/reels/',
      snapchat: 'https://www.snapchat.com/',
    };
    window.open(platformUrls[platform] || 'https://google.com', '_blank');
  };

  return (
    <GlassCard hover={false} className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold">Connected Socials</h3>
          <p className="text-xs text-muted-foreground">Link up to 3 platforms to share music instantly</p>
        </div>
        <NeonBadge color="cyan">{connectedCount}/3</NeonBadge>
      </div>

      <div className="space-y-3">
        {Object.entries(socialLinks).filter(([, url]) => url).map(([platform, url]) => {
          const config = PLATFORM_CONFIG[platform];
          const Icon = config?.icon || LinkIcon;
          
          return (
            <motion.div
              key={platform}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/30"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-secondary ${config?.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{config?.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{url}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenPlatform(platform)}
                  className="h-8 w-8"
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveLink(platform)}
                  className="h-8 w-8 text-red-400 hover:text-red-500"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </motion.div>
          );
        })}

        {connectedCount < 3 && (
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(PLATFORM_CONFIG)
              .filter(([platform]) => !socialLinks[platform])
              .slice(0, 4)
              .map(([platform, config]) => {
                const Icon = config.icon;
                return (
                  <Button
                    key={platform}
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddLink(platform)}
                    className="justify-start gap-2"
                  >
                    <div className={`p-1.5 rounded bg-secondary ${config.color}`}>
                      <Icon className="w-3 h-3" />
                    </div>
                    <Plus className="w-3 h-3" />
                    {config.label}
                  </Button>
                );
              })}
          </div>
        )}
      </div>

      {connectedCount === 0 && (
        <div className="text-center py-6 border border-dashed border-border/40 rounded-xl mt-4">
          <LinkIcon className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No social platforms connected yet</p>
          <p className="text-[10px] text-muted-foreground mt-1">Add your profiles to share music instantly</p>
        </div>
      )}
    </GlassCard>
  );
}