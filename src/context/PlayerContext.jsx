import React, { createContext, useContext, useRef, useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useCatalogAccess } from '@/hooks/useCatalogAccess';

// Module-level cached user to avoid calling auth.me() on every track change.
// Resets on page reload (logout/login).
let _cachedUser = null;
let _userPromise = null;
async function getCachedUser() {
  if (_cachedUser) return _cachedUser;
  if (!_userPromise) {
    _userPromise = base44.auth.me()
      .then(u => { _cachedUser = u; return u; })
      .catch((e) => { console.warn('Player: failed to fetch user for history', e); return null; });
  }
  return _userPromise;
}

const PlayerContext = createContext(null);
export const usePlayer = () => useContext(PlayerContext);

export const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const STORAGE_KEY = 'frequency_player';

export function PlayerProvider({ children }) {
  const audioRef = useRef(null);
  const nextRef = useRef(() => {});
  const prevRef = useRef(() => {});
  const lastHistoryTrackId = useRef(null);
  const wasPlayingBeforePause = useRef(false);

  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off');
  const [isShuffled, setIsShuffled] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [restored, setRestored] = useState(false);

  // Catalog access gating — prevents playing/queuing purchasable songs the user hasn't unlocked
  const { canPlay } = useCatalogAccess();
  const accessRef = useRef(canPlay);
  accessRef.current = canPlay;

  const currentTrack = currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Restore saved state on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.queue) setQueue(saved.queue);
        if (saved.currentIndex != null) setCurrentIndex(saved.currentIndex);
        if (saved.volume != null) setVolumeState(saved.volume);
        if (saved.repeatMode) setRepeatMode(saved.repeatMode);
        if (saved.isShuffled != null) setIsShuffled(saved.isShuffled);
        if (saved.playbackRate) setPlaybackRateState(saved.playbackRate);
        if (saved.currentTime) audioRef.current._resumeTime = saved.currentTime;
      }
    } catch {}
    setRestored(true);
  }, []);

  // Create audio element once — must be in DOM for iOS background playback
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.volume = 0.8;
    audio.setAttribute('x-webkit-airplay', 'allow');
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
    audio.disableRemotePlayback = false;
    // Attach to DOM (hidden) — iOS suspends detached Audio elements when backgrounded
    audio.style.display = 'none';
    document.body.appendChild(audio);
    audioRef.current = audio;

    const handlers = {
      timeupdate: () => setCurrentTime(audio.currentTime),
      durationchange: () => setDuration(audio.duration || 0),
      play: () => setIsPlaying(true),
      pause: () => setIsPlaying(false),
      loadedmetadata: () => {
        setDuration(audio.duration || 0);
        if (audio._resumeTime && audio._resumeTime < audio.duration) {
          audio.currentTime = audio._resumeTime;
          audio._resumeTime = 0;
        }
      },
      error: () => setIsPlaying(false),
      ended: () => nextRef.current(),
    };
    Object.entries(handlers).forEach(([evt, fn]) => audio.addEventListener(evt, fn));

    return () => {
      audio.pause();
      audio.src = '';
      audio.remove();
      Object.entries(handlers).forEach(([evt, fn]) => audio.removeEventListener(evt, fn));
    };
  }, []);

  // Resume playback when returning to foreground after system-initiated pause
  useEffect(() => {
    const handleVisibilityChange = () => {
      const audio = audioRef.current;
      if (!audio) return;
      if (document.hidden) {
        if (!audio.paused) wasPlayingBeforePause.current = true;
      } else if (wasPlayingBeforePause.current && audio.paused) {
        audio.play().catch(() => {});
        wasPlayingBeforePause.current = false;
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Update audio source when track changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack || !restored) return;

    audio.src = currentTrack.audio_url || '';
    audio.load();
    audio.play().catch(() => setIsPlaying(false));

    if (currentTrack.id && lastHistoryTrackId.current !== currentTrack.id) {
      lastHistoryTrackId.current = currentTrack.id;
      recordHistory(currentTrack);
    }
    updateMediaSession(currentTrack);
  }, [currentTrack?.id, restored]);

  // Clamp currentIndex when queue shrinks
  useEffect(() => {
    if (queue.length === 0) setCurrentIndex(-1);
    else if (currentIndex >= queue.length) setCurrentIndex(queue.length - 1);
  }, [queue.length]);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // Sync playback rate
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  // Persist state (cap persisted queue to 50 to avoid localStorage bloat)
  useEffect(() => {
    if (!restored) return;
    try {
      const cappedQueue = currentIndex >= 0 ? queue.slice(Math.max(0, currentIndex - 10), currentIndex + 40) : queue.slice(0, 50);
      const offset = currentIndex >= 0 ? Math.min(currentIndex, Math.max(0, currentIndex - 10)) : 0;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        queue: cappedQueue.map(s => ({
          id: s.id, title: s.title, artist_name: s.artist_name,
          audio_url: s.audio_url, cover_art: s.cover_art,
          duration_seconds: s.duration_seconds, artist_profile_id: s.artist_profile_id,
        })),
        currentIndex: Math.max(0, currentIndex - offset),
        volume, repeatMode, isShuffled, playbackRate,
        currentTime: audioRef.current?.currentTime || 0,
      }));
    } catch (e) {
      console.warn('Player: failed to persist state', e);
    }
  }, [queue, currentIndex, volume, repeatMode, isShuffled, playbackRate, restored]);

  // Persist currentTime periodically
  useEffect(() => {
    if (!restored) return;
    const interval = setInterval(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const saved = raw ? JSON.parse(raw) : {};
        saved.currentTime = audioRef.current?.currentTime || 0;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [restored]);

  // Reset cached user on unmount
  useEffect(() => {
    return () => { _cachedUser = null; _userPromise = null; };
  }, []);

  // Media Session API (lock screen, Bluetooth, CarPlay, Android Auto metadata)
  const updateMediaSession = (track) => {
    if (!('mediaSession' in navigator) || !track) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || 'Unknown',
        artist: track.artist_name || 'Unknown',
        album: track.album || 'Frequency',
        artwork: track.cover_art ? [{ src: track.cover_art, sizes: '512x512' }] : [],
      });
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch {}
  };

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.setActionHandler('play', () => audioRef.current?.play());
      navigator.mediaSession.setActionHandler('pause', () => audioRef.current?.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => prevRef.current());
      navigator.mediaSession.setActionHandler('nexttrack', () => nextRef.current());
      navigator.mediaSession.setActionHandler('seekto', (d) => {
        if (d.seekTime != null && audioRef.current) audioRef.current.currentTime = d.seekTime;
      });
    } catch {}
  }, []);

  // Update playbackState in media session
  useEffect(() => {
    if ('mediaSession' in navigator) {
      try { navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'; } catch {}
    }
  }, [isPlaying]);

  // Record listening history
  const recordHistory = async (track) => {
    try {
      const user = await getCachedUser();
      if (!user) return;
      await base44.entities.ListeningHistory.create({
        user_id: user.id,
        song_id: track.id,
        song_title: track.title,
        artist_name: track.artist_name,
        artist_profile_id: track.artist_profile_id,
        audio_url: track.audio_url,
        cover_art: track.cover_art,
        duration_seconds: track.duration_seconds,
        played_at: new Date().toISOString(),
      });
    } catch {}
  };

  // Controls
  const play = useCallback(() => { audioRef.current?.play().catch(() => {}); }, []);
  const pause = useCallback(() => { audioRef.current?.pause(); }, []);

  const togglePlay = useCallback(() => {
    if (!currentTrack) return;
    if (audioRef.current?.paused) audioRef.current.play().catch(() => {});
    else audioRef.current?.pause();
  }, [currentTrack]);

  const playTrack = useCallback((song, contextQueue = null) => {
    if (currentTrack?.id === song.id) { togglePlay(); return; }
    if (!accessRef.current(song)) {
      toast.error('This song requires a direct purchase to play. Buy it to unlock Current Catalog Access.');
      return;
    }
    const songs = contextQueue || [song];
    const idx = songs.findIndex(s => s.id === song.id);
    setQueue(songs);
    setCurrentIndex(idx >= 0 ? idx : 0);
  }, [currentTrack, togglePlay]);

  const addToQueue = useCallback((song) => {
    if (!accessRef.current(song)) {
      toast.error('This song requires a direct purchase to play. Buy it to unlock Current Catalog Access.');
      return;
    }
    setQueue(prev => [...prev, song]);
  }, []);

  const next = useCallback(() => {
    if (queue.length === 0) return;
    if (repeatMode === 'one') {
      if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => {}); }
      return;
    }
    let nextIdx;
    if (isShuffled && queue.length > 1) {
      do { nextIdx = Math.floor(Math.random() * queue.length); } while (nextIdx === currentIndex);
    } else {
      nextIdx = currentIndex + 1;
      if (nextIdx >= queue.length) {
        if (repeatMode === 'all') nextIdx = 0;
        else { audioRef.current?.pause(); return; }
      }
    }
    setCurrentIndex(nextIdx);
  }, [queue.length, currentIndex, repeatMode, isShuffled]);
  nextRef.current = next;

  const previous = useCallback(() => {
    if (queue.length === 0) return;
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    let prevIdx;
    if (isShuffled && queue.length > 1) {
      do { prevIdx = Math.floor(Math.random() * queue.length); } while (prevIdx === currentIndex);
    } else {
      prevIdx = currentIndex - 1;
      if (prevIdx < 0) prevIdx = repeatMode === 'all' ? queue.length - 1 : 0;
    }
    setCurrentIndex(prevIdx);
  }, [queue.length, currentIndex, repeatMode, isShuffled]);
  prevRef.current = previous;

  const seek = useCallback((time) => {
    if (audioRef.current) { audioRef.current.currentTime = time; setCurrentTime(time); }
  }, []);

  const setVolume = useCallback((vol) => {
    setVolumeState(vol);
    if (vol > 0) setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => setIsMuted(prev => !prev), []);
  const toggleShuffle = useCallback(() => setIsShuffled(prev => !prev), []);
  const cycleRepeat = useCallback(() => {
    setRepeatMode(prev => prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off');
  }, []);
  const setPlaybackRate = useCallback((rate) => setPlaybackRateState(rate), []);

  const removeFromQueue = useCallback((index) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
    if (index < currentIndex) setCurrentIndex(prev => prev - 1);
  }, [currentIndex]);

  const clearQueue = useCallback(() => {
    if (currentTrack) { setQueue([currentTrack]); setCurrentIndex(0); }
    else { setQueue([]); setCurrentIndex(-1); }
  }, [currentTrack]);

  const value = {
    currentTrack, queue, currentIndex, isPlaying, currentTime, duration,
    volume, isMuted, repeatMode, isShuffled, playbackRate, isFullPlayerOpen,
    isQueueOpen, progress,
    playTrack, play, pause, togglePlay, next, previous, seek,
    setVolume, toggleMute, toggleShuffle, cycleRepeat, setPlaybackRate,
    addToQueue, removeFromQueue, clearQueue,
    setIsFullPlayerOpen, setIsQueueOpen,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}