import React from 'react';
import { Zap, Headphones, CheckCircle2 } from 'lucide-react';

const TWELVE_WEEKS_MS = 12 * 7 * 24 * 60 * 60 * 1000;

/**
 * Displays the Mainstream First™ or Heard First on The Mainstream™ badge.
 * 
 * Status can come from either:
 * - Song.mainstream_first_status ("none" | "mainstream_first" | "heard_first")
 * - ArtistProfile.mainstream_first_badge ("none" | "mainstream_first" | "heard_first")
 * - Song.is_heard_first (permanent designation)
 * 
 * If a song is_heard_first but status is not set, we show the Heard First badge.
 * The badge auto-transitions after 12 weeks via the scheduled automation.
 */
export default function MainstreamFirstBadge({ status, startDate, isHeardFirst, size = 'sm' }) {
  // Determine effective status
  let effectiveStatus = status;
  if (!effectiveStatus || effectiveStatus === 'none') {
    if (isHeardFirst) {
      effectiveStatus = 'heard_first';
    } else {
      return null;
    }
  }

  // Check if we should auto-transition based on date (client-side fallback)
  if (effectiveStatus === 'mainstream_first' && startDate) {
    const elapsed = Date.now() - new Date(startDate).getTime();
    if (elapsed >= TWELVE_WEEKS_MS) {
      effectiveStatus = 'heard_first';
    }
  }

  const isExclusive = effectiveStatus === 'mainstream_first';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';
  const padSize = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1';

  if (isExclusive) {
    return (
      <span
        className={`inline-flex items-center gap-1 ${padSize} rounded-full border bg-neon-magenta/15 text-neon-magenta border-neon-magenta/30 ${textSize} font-semibold`}
        title="Exclusive to The Mainstream Frequency for 12 weeks"
      >
        <Zap className={iconSize} />
        🟣 MAINSTREAM FIRST™
      </span>
    );
  }

  // Heard First — permanent designation
  return (
    <span
      className={`inline-flex items-center gap-1 ${padSize} rounded-full border bg-neon-turquoise/15 text-neon-turquoise border-neon-turquoise/30 ${textSize} font-semibold`}
      title="This song made its debut on The Mainstream Frequency."
    >
      <Headphones className={iconSize} />
      🟢 HEARD FIRST ON THE MAINSTREAM™
    </span>
  );
}

/**
 * Compact permanent designation badge: "✓ First Released on The Mainstream Frequency"
 * Shown after a song has fully transitioned and is permanently in the Heard First collection.
 */
export function FirstReleasedBadge({ size = 'sm' }) {
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan ${textSize} font-semibold`}
      title="This designation can never be removed."
    >
      <CheckCircle2 className={iconSize} />
      ✓ First Released on The Mainstream Frequency
    </span>
  );
}