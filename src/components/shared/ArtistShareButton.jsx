import React, { useState } from 'react';
import { Share2, Check, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import ArtistHandle from './ArtistHandle';

export default function ArtistShareButton({ artist }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const profileUrl = artist.artist_handle
    ? `${window.location.origin}/artist/${artist.artist_handle}`
    : `${window.location.origin}/artist/${artist.id}`;

  const shareText = artist.artist_handle
    ? `!${artist.artist_handle}\n${profileUrl}`
    : `${artist.artist_name}\n${profileUrl}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: artist.artist_name,
          text: artist.artist_handle ? `!${artist.artist_handle}` : artist.artist_name,
          url: profileUrl,
        });
      } catch (e) {
        // user cancelled
      }
    } else {
      handleCopy();
    }
  };

  return (
    <>
      <Button variant="outline" className="border-border/60" onClick={() => setOpen(true)}>
        <Share2 className="w-4 h-4 mr-2" /> Share Artist
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Share {artist.artist_name}</DialogTitle>
            <DialogDescription>Share this artist's profile anywhere</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Handle + URL preview */}
            <div className="bg-secondary/50 rounded-lg p-4 text-center space-y-2">
              {artist.artist_handle && (
                <div className="text-lg">
                  <ArtistHandle handle={artist.artist_handle} size="lg" clickable={false} />
                </div>
              )}
              <p className="text-xs text-muted-foreground break-all font-mono">{profileUrl}</p>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 bg-white rounded-lg">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(profileUrl)}`}
                  alt="QR Code"
                  className="w-36 h-36"
                />
              </div>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <QrCode className="w-3 h-3" /> Scan to open profile
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button className="flex-1 bg-gradient-neon text-white" onClick={handleNativeShare}>
                <Share2 className="w-4 h-4 mr-2" /> Share
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4 mr-2 text-neon-cyan" /> : null}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}