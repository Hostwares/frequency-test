import React, { useState } from 'react';
import { QRCodeImage } from '@/components/pwa/QRCodeImage';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  MoreVertical, Share2, QrCode, Link2, Home, Bookmark, Heart, WifiOff,
} from 'lucide-react';

const FAV_KEY = 'tmf_playlist_favs';
const FOLLOW_KEY = 'tmf_playlist_follows';
const OFFLINE_KEY = 'tmf_offline_playlists';

function readArr(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function toggleArr(key, id) {
  const arr = readArr(key);
  const next = arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
  localStorage.setItem(key, JSON.stringify(next));
  return next.includes(id);
}

export default function PlaylistShortcutMenu({ playlist, url }) {
  const [qrOpen, setQrOpen] = useState(false);
  const [fav, setFav] = useState(() => playlist?.id ? readArr(FAV_KEY).includes(playlist.id) : false);
  const [follow, setFollow] = useState(() => playlist?.id ? readArr(FOLLOW_KEY).includes(playlist.id) : false);
  const [offline, setOffline] = useState(() => playlist?.id ? readArr(OFFLINE_KEY).some((p) => p.id === playlist.id) : false);

  if (!playlist) return null;
  const shareUrl = url || (typeof window !== 'undefined' ? `${window.location.origin}/playlist/${playlist.id}` : `/playlist/${playlist.id}`);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Playlist link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: playlist.name || 'Playlist', url: shareUrl });
      } catch { /* cancelled */ }
    } else {
      copyLink();
    }
  };

  const saveOffline = (value) => {
    const arr = readArr(OFFLINE_KEY);
    const exists = arr.some((p) => p.id === playlist.id);
    if (value) {
      if (!exists) arr.push({ id: playlist.id, name: playlist.name, saved_at: Date.now() });
    } else {
      const next = arr.filter((p) => p.id !== playlist.id);
      localStorage.setItem(OFFLINE_KEY, JSON.stringify(next));
      setOffline(false);
      return;
    }
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(arr));
    setOffline(true);
    toast.success(value ? 'Playlist metadata saved for offline viewing' : 'Removed offline metadata');
  };

  const addToHomeScreen = () => {
    toast.message('Add to Home Screen', {
      description: 'Open your browser menu (⋯) and choose "Add to Home screen" or "Install app" to pin this playlist.',
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={addToHomeScreen}><Home className="w-4 h-4 mr-2" /> Add to Home Screen</DropdownMenuItem>
          <DropdownMenuItem onClick={share}><Share2 className="w-4 h-4 mr-2" /> Share Playlist</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setQrOpen(true)}><QrCode className="w-4 h-4 mr-2" /> Generate QR Code</DropdownMenuItem>
          <DropdownMenuItem onClick={copyLink}><Link2 className="w-4 h-4 mr-2" /> Copy Link</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setFav(toggleArr(FAV_KEY, playlist.id))}>
            <Heart className={`w-4 h-4 mr-2 ${fav ? 'fill-neon-magenta text-neon-magenta' : ''}`} /> Favorite Playlist
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setFollow(toggleArr(FOLLOW_KEY, playlist.id))}>
            <Bookmark className={`w-4 h-4 mr-2 ${follow ? 'fill-neon-cyan text-neon-cyan' : ''}`} /> Follow Playlist
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-sm flex items-center gap-2"><WifiOff className="w-4 h-4" /> Save Offline Metadata</span>
            <Switch checked={offline} onCheckedChange={saveOffline} />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Playlist QR Code</DialogTitle>
            <DialogDescription>Scan to open this playlist.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            <QRCodeImage text={shareUrl} size={220} className="rounded-lg border border-border/30" />
            <p className="text-xs text-muted-foreground break-all text-center">{shareUrl}</p>
            <Button size="sm" variant="outline" onClick={copyLink}><Link2 className="w-3.5 h-3.5 mr-1.5" /> Copy Link</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}