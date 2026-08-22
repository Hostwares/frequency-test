import React, { useState } from 'react';
import { Play, Pause, Clock, Share2, ListPlus, Check, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlayer } from '@/context/PlayerContext';
import { toast } from 'sonner';
import MusicShareModal from '@/components/fan/MusicShareModal';
import { useCatalogAccess } from '@/hooks/useCatalogAccess';

export default function SongRow({ song, index, showArtist = true, queue }) {
  const [showShareModal, setShowShareModal] = useState(false);
  const { currentTrack, isPlaying, togglePlay, playTrack, addToQueue, queue: playerQueue } = usePlayer();
  const { canPlay } = useCatalogAccess();
  const isCurrent = currentTrack?.id === song.id;
  const showPause = isCurrent && isPlaying;
  const inQueue = playerQueue.some(s => s.id === song.id);
  const locked = !canPlay(song);

  const handleAddToQueue = (e) => {
    e.stopPropagation();
    if (locked) { toast.error('This song requires a direct purchase to play.'); return; }
    if (inQueue) { toast.info('Already in queue'); return; }
    addToQueue(song);
    toast.success(`Added to queue: ${song.title}`);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '3:30';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handlePlay = () => {
    if (locked) {
      toast.error('This song requires a direct purchase to play.');
      return;
    }
    if (isCurrent) togglePlay();
    else playTrack(song, queue);
  };

  return (
    <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-4 py-3 rounded-lg hover:bg-secondary/40 transition-colors group">
      <span className="w-6 text-center text-sm text-muted-foreground font-mono hidden lg:block lg:group-hover:hidden">
        {index + 1}
      </span>
      <Button variant="ghost" size="icon" className="w-6 h-6 flex lg:hidden lg:group-hover:flex text-primary flex-shrink-0" onClick={handlePlay}>
        {locked ? <Lock className="w-3.5 h-3.5 text-muted-foreground" /> : showPause ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
      </Button>

      <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
        <img
          src={song.cover_art || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=80&q=80'}
          alt={song.title}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isCurrent ? 'text-primary' : 'text-foreground'}`}>{song.title}</p>
        {showArtist && (
          <p className="text-xs text-muted-foreground truncate">{song.artist_name}</p>
        )}
      </div>

      <span className="text-xs text-muted-foreground hidden sm:inline">{song.play_count || 0} plays</span>

      <Button 
        variant="ghost" 
        size="icon" 
        className="w-8 h-8 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex-shrink-0"
        onClick={handleAddToQueue}
        title={inQueue ? 'Already in queue' : 'Add to queue'}
      >
        {inQueue ? <Check className="w-4 h-4 text-neon-cyan" /> : <ListPlus className="w-4 h-4 text-muted-foreground hover:text-neon-cyan" />}
      </Button>

      <Button 
        variant="ghost" 
        size="icon" 
        className="w-8 h-8 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex-shrink-0"
        onClick={() => setShowShareModal(true)}
      >
        <Share2 className="w-4 h-4 text-muted-foreground hover:text-neon-cyan" />
      </Button>

      <span className="text-xs text-muted-foreground w-10 text-right font-mono hidden sm:inline">
        {formatDuration(song.duration_seconds)}
      </span>

      <MusicShareModal 
        song={song} 
        artistName={song.artist_name}
        isOpen={showShareModal}
        onOpenChange={setShowShareModal}
      />
    </div>
  );
}