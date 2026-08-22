import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import QRScanner from '@/components/pwa/QRScanner';
import { toast } from 'sonner';

// Parse a scanned QR value into an internal app route.
function parseScannedValue(value) {
  if (!value) return null;
  const tryPath = (path) => {
    if (path.startsWith('/artist/')) return path;
    if (path.startsWith('/frequency/')) return path;
    if (path.startsWith('/discovery-partner/')) return path;
    if (path.startsWith('/event/')) return path;
    if (path.startsWith('/playlist/')) return path;
    return null;
  };
  try {
    const url = new URL(value);
    return tryPath(url.pathname) ? { path: tryPath(url.pathname) } : null;
  } catch {
    const p = tryPath(value);
    return p ? { path: p } : null;
  }
}

export default function QRScanButton({ variant = 'ghost', size = 'icon', label }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleScan = (value) => {
    const parsed = parseScannedValue(value);
    setOpen(false);
    if (!parsed) {
      toast.error('Unrecognized QR code', {
        description: "This code doesn't link to an artist, community, or event.",
      });
      return;
    }
    toast.success('QR code found — taking you there');
    navigate(parsed.path);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={label ? 'gap-2' : ''} aria-label="Scan QR code">
          <QrCode className="w-4 h-4" />
          {label && <span className="text-sm">{label}</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <QrCode className="w-4 h-4 text-neon-cyan" /> Scan to Connect
          </DialogTitle>
        </DialogHeader>
        <QRScanner onScan={handleScan} onClose={() => setOpen(false)} />
        <p className="text-xs text-muted-foreground text-center">
          Point your camera at a Frequency QR code to instantly open an artist profile, community, or event.
        </p>
      </DialogContent>
    </Dialog>
  );
}