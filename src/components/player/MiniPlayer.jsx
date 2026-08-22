import React from 'react';
import { usePlayer, formatTime } from '@/context/PlayerContext';
import { Play, Pause, SkipBack, SkipForward, ChevronUp, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

export default function MiniPlayer() {
  const {
    currentTrack, isPlaying, currentTime, duration, progress,
    togglePlay, next, previous, seek, setIsFullPlayerOpen,
    volume, isMuted, setVolume, toggleMute,
  } = usePlayer();

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border/50 lg:ml-64">
      {/* Progress bar */}
      <div
        className="h-1 bg-muted/30 cursor-pointer group"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          seek(pct * duration);
        }}
      >
        <div className="h-full bg-neon-purple group-hover:bg-neon-cyan transition-colors" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Track info */}
        <button
          className="flex items-center gap-3 min-w-0 flex-1 max-w-[50%] md:max-w-[30%]"
          onClick={() => setIsFullPlayerOpen(true)}
        >
          <div className="w-11 h-11 rounded-md overflow-hidden flex-shrink-0">
            <img
              src={currentTrack.cover_art || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=80&q=80'}
              alt={currentTrack.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-sm font-medium truncate">{currentTrack.title}</p>
            <p className="text-xs text-muted-foreground truncate">{currentTrack.artist_name}</p>
          </div>
        </button>

        {/* Center controls */}
        <div className="flex items-center gap-1 md:gap-2 mx-auto">
          <Button variant="ghost" size="icon" className="hidden md:flex w-9 h-9" onClick={previous}>
            <SkipBack className="w-4 h-4 fill-current" />
          </Button>
          <Button
            variant="default"
            size="icon"
            className="w-10 h-10 rounded-full bg-primary hover:bg-primary/90"
            onClick={togglePlay}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="hidden md:flex w-9 h-9" onClick={next}>
            <SkipForward className="w-4 h-4 fill-current" />
          </Button>
        </div>

        {/* Time (desktop) */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground font-mono w-28">
          <span>{formatTime(currentTime)}</span>
          <span>/</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Volume (desktop) */}
        <div className="hidden lg:flex items-center gap-2 w-32">
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={toggleMute}>
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume * 100]}
            max={100}
            step={1}
            onValueChange={(v) => setVolume(v[0] / 100)}
            className="flex-1"
          />
        </div>

        {/* Expand */}
        <Button variant="ghost" size="icon" className="w-9 h-9 flex-shrink-0" onClick={() => setIsFullPlayerOpen(true)}>
          <ChevronUp className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}