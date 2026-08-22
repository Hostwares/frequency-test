import React from 'react';
import { Play, Pause } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';

const VERSION_LABELS = {
  acoustic: 'Acoustic', radio_edit: 'Radio Edit', instrumental: 'Instrumental',
  explicit: 'Explicit', clean: 'Clean', alternate_mix: 'Alt Mix', remix: 'Remix',
  live: 'Live', demo: 'Demo', extended: 'Extended', other: 'Other',
};

const VERSION_COLORS = {
  acoustic: 'text-neon-turquoise border-neon-turquoise/30 bg-neon-turquoise/10',
  radio_edit: 'text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10',
  instrumental: 'text-neon-blue border-neon-blue/30 bg-neon-blue/10',
  explicit: 'text-destructive border-destructive/30 bg-destructive/10',
  clean: 'text-neon-turquoise border-neon-turquoise/30 bg-neon-turquoise/10',
  alternate_mix: 'text-neon-magenta border-neon-magenta/30 bg-neon-magenta/10',
  remix: 'text-neon-purple border-neon-purple/30 bg-neon-purple/10',
  live: 'text-neon-magenta border-neon-magenta/30 bg-neon-magenta/10',
  demo: 'text-muted-foreground border-muted-foreground/30 bg-muted-foreground/10',
  extended: 'text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10',
  other: 'text-muted-foreground border-border bg-secondary',
};

export default function SongVersionBadge({ version, onPlay, isActive }) {
  const { isPlaying, togglePlay } = usePlayer();
  const label = VERSION_LABELS[version.version_type] || version.version_type;
  const colorClass = VERSION_COLORS[version.version_type] || VERSION_COLORS.other;
  const showPause = isActive && isPlaying;

  return (
    <button
      onClick={() => isActive ? togglePlay() : onPlay()}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border transition-all hover:scale-105 ${colorClass}`}
    >
      {showPause ? <Pause className="w-2.5 h-2.5 fill-current" /> : <Play className="w-2.5 h-2.5 fill-current" />}
      {label}
    </button>
  );
}