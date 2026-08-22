import React, { useState } from 'react';
import { Share2, Instagram, Video, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function ShareArtistModal({ artistName, artistId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/artist/${artistId}`
    : '';

  const handleShare = (platform) => {
    const text = encodeURIComponent(`Check out ${artistName} on Frequency!`);
    const url = encodeURIComponent(shareUrl);
    
    const platformUrls = {
      instagram: `https://www.instagram.com/reels/new/`,
      tiktok: `https://www.tiktok.com/@me?lang=en`,
    };

    window.open(platformUrls[platform] || shareUrl, '_blank');
    setIsOpen(false);
    toast.success(`Opening ${platform === 'instagram' ? 'Instagram' : 'TikTok'}...`);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-neon-magenta hover:text-neon-magenta/80">
          <Share2 className="w-4 h-4" />
          Share
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-neon-magenta" />
            Share {artistName}
          </DialogTitle>
          <DialogDescription>
            Promote this artist on your social media
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12"
            onClick={() => handleShare('instagram')}
          >
            <div className="p-2 rounded-full bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600">
              <Instagram className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-semibold">Instagram Reels</span>
              <span className="text-xs text-muted-foreground">Create a reel featuring this artist</span>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12"
            onClick={() => handleShare('tiktok')}
          >
            <div className="p-2 rounded-full bg-black">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-semibold">TikTok</span>
              <span className="text-xs text-muted-foreground">Make a video with their music</span>
            </div>
          </Button>

          <div className="pt-2 border-t border-border/30">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleCopyLink}
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? 'Copied!' : 'Copy Artist Link'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}