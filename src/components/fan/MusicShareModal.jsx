import React from 'react';
import { Share2, Music, Copy, Video, Camera, PenTool } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const SOCIAL_PLATFORMS = [
  { id: 'tiktok', action: 'Create TikTok', icon: Video, bg: 'bg-black' },
  { id: 'instagram', action: 'Make Reel', icon: Camera, bg: 'bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600' },
  { id: 'youtube', action: 'Create Short', icon: Video, bg: 'bg-red-600' },
  { id: 'twitter', action: 'Tweet', icon: PenTool, bg: 'bg-black' },
];

export default function MusicShareModal({ song, artistName, isOpen, onOpenChange }) {
  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/artist/${song?.artist_profile_id}`
    : '';

  const handleShare = (platform) => {
    const text = encodeURIComponent(`Check out "${song?.title}" by ${artistName} on Frequency!`);
    const url = encodeURIComponent(shareUrl);
    
    const platformUrls = {
      tiktok: 'https://www.tiktok.com/@me?lang=en',
      instagram: 'https://www.instagram.com/reels/new/',
      youtube: 'https://studio.youtube.com/',
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
    };

    window.open(platformUrls[platform] || shareUrl, '_blank');
    onOpenChange?.(false);
  };

  if (!song) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="w-5 h-5 text-neon-purple" />
            Share This Track
          </DialogTitle>
          <DialogDescription>
            Share "{song.title}" by {artistName} with your followers
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="grid grid-cols-2 gap-3">
            {SOCIAL_PLATFORMS.map((platform) => {
              const Icon = platform.icon;
              return (
                <Button
                  key={platform.id}
                  variant="outline"
                  className="flex flex-col items-center gap-2 h-auto py-4"
                  onClick={() => handleShare(platform.id)}
                >
                  <div className={`p-3 rounded-full ${platform.bg}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs font-medium">{platform.action}</span>
                </Button>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-border/30">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                toast.success('Link copied!');
                onOpenChange?.(false);
              }}
            >
              <Copy className="w-4 h-4" />
              Copy Link
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}