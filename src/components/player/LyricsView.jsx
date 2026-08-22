import React, { useMemo, useRef, useEffect } from 'react';
import { usePlayer } from '@/context/PlayerContext';

function parseLyrics(lyrics) {
  if (!lyrics) return { lines: [], isSynced: false };
  const rawLines = lyrics.split('\n');
  const parsed = [];
  let hasTimestamps = false;
  for (const line of rawLines) {
    const match = line.match(/\[(\d+):(\d+\.?\d*)\](.*)/);
    if (match) {
      hasTimestamps = true;
      parsed.push({ time: parseInt(match[1]) * 60 + parseFloat(match[2]), text: match[3].trim() });
    } else if (line.trim()) {
      parsed.push({ time: null, text: line.trim() });
    }
  }
  return { lines: parsed, isSynced: hasTimestamps };
}

export default function LyricsView({ lyrics }) {
  const { currentTime } = usePlayer();
  const activeLineRef = useRef(null);

  const { lines, isSynced } = useMemo(() => parseLyrics(lyrics), [lyrics]);

  const activeIndex = useMemo(() => {
    if (!isSynced) return -1;
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].time != null && lines[i].time <= currentTime) idx = i;
      else if (lines[i].time != null && lines[i].time > currentTime) break;
    }
    return idx;
  }, [lines, isSynced, currentTime]);

  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeIndex]);

  if (!lyrics) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">No lyrics available for this track</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-8 scroll-smooth">
      <div className="max-w-md mx-auto space-y-4">
        {lines.map((line, i) => (
          <p
            key={i}
            ref={i === activeIndex ? activeLineRef : null}
            className={`text-center text-lg transition-all duration-300 ${
              i === activeIndex
                ? 'text-neon-purple font-bold scale-105'
                : 'text-muted-foreground/50'
            }`}
          >
            {line.text}
          </p>
        ))}
      </div>
    </div>
  );
}