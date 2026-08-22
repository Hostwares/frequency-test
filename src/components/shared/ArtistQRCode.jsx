import React, { useState } from 'react';
import { QrCode, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import ArtistHandle from './ArtistHandle';

export default function ArtistQRCode({ artist, triggerSize = 'icon' }) {
  const [open, setOpen] = useState(false);

  const profileUrl = artist.artist_handle
    ? `${window.location.origin}/artist/${artist.artist_handle}`
    : `${window.location.origin}/artist/${artist.id}`;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(profileUrl)}`;

  const trigger = triggerSize === 'icon' ? (
    <Button variant="ghost" size="icon" onClick={() => setOpen(true)} title="Artist QR Code">
      <QrCode className="w-4 h-4" />
    </Button>
  ) : (
    <Button variant="outline" onClick={() => setOpen(true)}>
      <QrCode className="w-4 h-4 mr-2" /> QR Code
    </Button>
  );

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Artist QR Code</DialogTitle>
            <DialogDescription>
              Use on business cards, merch, posters, flyers, and more
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4">
            {artist.artist_handle && (
              <div className="text-center">
                <p className="text-lg font-display font-bold">{artist.artist_name}</p>
                <ArtistHandle handle={artist.artist_handle} size="md" clickable={false} />
              </div>
            )}

            <div className="p-4 bg-white rounded-xl">
              <img src={qrUrl} alt="Artist QR Code" className="w-56 h-56" />
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open(qrUrl, '_blank')}
            >
              <Download className="w-4 h-4 mr-2" /> Download QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}