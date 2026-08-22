import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePlayer, formatTime } from '@/context/PlayerContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  ChevronDown, ListMusic, Mic2, Gauge, Volume2, VolumeX, Cast
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import WaveformDisplay from '@/components/player/WaveformDisplay';
import LyricsView from '@/components/player/LyricsView';
import QueuePanel from '@/components/player/QueuePanel';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function FullPlayer() {
  const {
    currentTrack, isPlaying, currentTime, duration, progress,
    togglePlay, next, previous, seek, isFullPlayerOpen, setIsFullPlayerOpen,
    volume, isMuted, setVolume, toggleMute,
    repeatMode, isShuffled, toggleShuffle, cycleRepeat, playbackRate, setPlaybackRate,
  } = usePlayer();

  const [view, setView] = useState('player');

  const { data: fullSong } = useQuery({
    queryKey: ['player-song-detail', currentTrack?.id],
    queryFn: async () => {
      const results = await base44.entities.Song.filter({ id: currentTrack.id });
      return results?.[0];
    },
    enabled: !!currentTrack?.id && isFullPlayerOpen,
  });

  return (
    <AnimatePresence>
      {isFullPlayerOpen && currentTrack && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
            onClick={() => setIsFullPlayerOpen(false)}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-50 bg-background flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
              <Button variant="ghost" size="icon" onClick={() => setIsFullPlayerOpen(false)}>
                <ChevronDown className="w-5 h-5" />
              </Button>
              <div className="flex gap-1">
                <Button variant={view === 'player' ? 'default' : 'ghost'} size="sm" onClick={() => setView('player')} className="text-xs">
                  Player
                </Button>
                <Button variant={view === 'lyrics' ? 'default' : 'ghost'} size="sm" onClick={() => setView('lyrics')} className="text-xs gap-1">
                  <Mic2 className="w-3 h-3" /> Lyrics
                </Button>
                <Button variant={view === 'queue' ? 'default' : 'ghost'} size="sm" onClick={() => setView('queue')} className="text-xs gap-1">
                  <ListMusic className="w-3 h-3" /> Queue
                </Button>
              </div>
              <div className="w-10" />
            </div>

            {/* Content */}
            {view === 'player' && (
              <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 overflow-y-auto">
                {/* Album art */}
                <div className="w-48 h-48 md:w-64 md:h-64 rounded-2xl overflow-hidden shadow-2xl mb-6">
                  <img
                    src={currentTrack.cover_art || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80'}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Title */}
                <h2 className="text-xl font-display font-bold text-center">{currentTrack.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{currentTrack.artist_name}</p>

                {/* Waveform */}
                <div className="w-full max-w-md mt-6">
                  <WaveformDisplay
                    songId={currentTrack.id}
                    currentTime={currentTime}
                    duration={duration}
                    onSeek={seek}
                    isPlaying={isPlaying}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground font-mono mt-2">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Main controls */}
                <div className="flex items-center gap-3 sm:gap-6 mt-6">
                  <Button variant="ghost" size="icon" onClick={toggleShuffle} className={`w-9 h-9 sm:w-10 sm:h-10 ${isShuffled ? 'text-neon-cyan' : 'text-muted-foreground'}`}>
                    <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={previous} className="w-10 h-10 sm:w-12 sm:h-12">
                    <SkipBack className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
                  </Button>
                  <Button
                    variant="default"
                    size="icon"
                    className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90"
                    onClick={togglePlay}
                  >
                    {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-1" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={next} className="w-10 h-10 sm:w-12 sm:h-12">
                    <SkipForward className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={cycleRepeat} className={`w-9 h-9 sm:w-10 sm:h-10 ${repeatMode !== 'off' ? 'text-neon-purple' : 'text-muted-foreground'}`}>
                    {repeatMode === 'one' ? <Repeat1 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Repeat className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </Button>
                </div>

                {/* Secondary controls */}
                <div className="flex items-center gap-2 sm:gap-4 mt-6">
                  {/* Volume */}
                  <div className="flex items-center gap-2 w-24 sm:w-32">
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

                  {/* Playback speed */}
                  <Select value={String(playbackRate)} onValueChange={(v) => setPlaybackRate(parseFloat(v))}>
                    <SelectTrigger className="w-20 h-8 text-xs gap-1">
                      <Gauge className="w-3 h-3" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SPEEDS.map(s => (
                        <SelectItem key={s} value={String(s)}>{s}x</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Cast / AirPlay */}
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground" title="Cast to device">
                    <Cast className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {view === 'lyrics' && (
              <div className="flex-1 overflow-hidden">
                <LyricsView lyrics={fullSong?.lyrics} />
              </div>
            )}

            {view === 'queue' && (
              <div className="flex-1 overflow-hidden">
                <QueuePanel />
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}