import React, { useMemo, useRef, useState } from 'react';

export default function WaveformDisplay({ songId, currentTime, duration, onSeek, isPlaying }) {
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const bars = useMemo(() => {
    const seed = songId || 'default';
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0;
    }
    return Array.from({ length: 64 }, (_, i) => {
      const x = Math.sin(hash * 0.001 + i * 0.3) * 0.5 + 0.5;
      const y = Math.cos(hash * 0.002 + i * 0.5) * 0.5 + 0.5;
      return 0.15 + (x * y) * 0.85;
    });
  }, [songId]);

  const progress = duration > 0 ? (currentTime / duration) : 0;

  const handlePointer = (e) => {
    if (!containerRef.current || !duration) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(duration, x * duration)));
  };

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-[2px] h-16 cursor-pointer touch-none select-none"
      onPointerDown={(e) => { setIsDragging(true); handlePointer(e); }}
      onPointerMove={(e) => isDragging && handlePointer(e)}
      onPointerUp={() => setIsDragging(false)}
      onPointerLeave={() => setIsDragging(false)}
    >
      {bars.map((height, i) => {
        const barProgress = (i + 1) / bars.length;
        const isPlayed = barProgress <= progress;
        return (
          <div
            key={i}
            className={`flex-1 rounded-full transition-colors duration-150 ${
              isPlayed ? 'bg-neon-purple' : 'bg-muted-foreground/25'
            }`}
            style={{
              height: `${height * 100}%`,
              animation: isPlayed && isPlaying ? `waveform 0.8s ease-in-out infinite ${i * 0.05}s` : 'none',
            }}
          />
        );
      })}
    </div>
  );
}