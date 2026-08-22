import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

const PREVIEW_SECONDS = 30;

export default function PreviewPlayer({ song }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [loading, setLoading] = useState(false);

  const previewDuration = Math.min(
    PREVIEW_SECONDS,
    song?.duration_seconds && song.duration_seconds > 0 ? song.duration_seconds : PREVIEW_SECONDS
  );

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.src = song?.audio_url || '';
    audioRef.current = audio;

    const onTime = () => {
      setCurrentTime(audio.currentTime);
      if (audio.currentTime >= previewDuration) {
        audio.pause();
        audio.currentTime = 0;
        setIsPlaying(false);
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      audio.currentTime = 0;
      setCurrentTime(0);
    };
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
    };
  }, [song?.id, song?.audio_url, previewDuration]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      if (audio.currentTime >= previewDuration) {
        audio.currentTime = 0;
        setCurrentTime(0);
      }
      audio.play().catch(() => {});
    }
  };

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progressPct = previewDuration > 0 ? (currentTime / previewDuration) * 100 : 0;

  return (
    <div className="rounded-xl border border-neon-cyan/20 bg-neon-cyan/5 p-3">
      <div className="flex items-center gap-3">
        <Button
          size="icon"
          className="h-10 w-10 rounded-full bg-gradient-neon flex-shrink-0"
          onClick={toggle}
          aria-label={isPlaying ? 'Pause preview' : 'Play 30-second preview'}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current" />
          )}
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-neon-cyan">30-Second Preview</span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {fmt(currentTime)} / {fmt(previewDuration)}
            </span>
          </div>
          <Progress value={progressPct} className="h-1.5" />
          <p className="text-[11px] text-muted-foreground mt-1 truncate">
            Hear a preview of {song?.title || 'this song'} before you buy.
          </p>
        </div>
      </div>
    </div>
  );
}