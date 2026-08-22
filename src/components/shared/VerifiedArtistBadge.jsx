import React from 'react';
import { BadgeCheck } from 'lucide-react';

export default function VerifiedArtistBadge({ isVerified, size = 'md', showLabel = false }) {
  if (!isVerified) return null;

  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <span className="inline-flex items-center gap-1" title="Verified Artist on The Mainstream Frequency">
      <BadgeCheck className={`${sizes[size]} text-neon-cyan fill-neon-cyan/20`} />
      {showLabel && (
        <span className="text-xs text-neon-cyan font-medium">Verified Artist</span>
      )}
    </span>
  );
}