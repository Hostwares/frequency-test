import React from 'react';
import { useBetaConfig } from '@/hooks/useBetaConfig';
import { FlaskConical } from 'lucide-react';

/**
 * Beta notice banner. Renders only while the platform is in Beta Mode
 * (and beta banners are enabled). Used on signup and checkout flows so
 * new members know they're joining during the beta phase.
 */
export default function BetaNoticeBanner({ className = '', compact = false }) {
  const { config } = useBetaConfig();

  if (!(config.beta_mode_enabled && config.beta_banners_enabled)) return null;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border border-neon-purple/30 bg-gradient-to-r from-neon-purple/10 to-neon-cyan/5 ${compact ? 'p-2.5' : 'p-3'} ${className}`}
    >
      <FlaskConical className={`flex-shrink-0 text-neon-purple ${compact ? 'w-4 h-4 mt-0.5' : 'w-5 h-5 mt-0.5'}`} />
      <div className="min-w-0">
        <p className={`font-semibold text-foreground ${compact ? 'text-xs' : 'text-sm'}`}>
          You're joining during the Beta phase
        </p>
        <p className={`text-muted-foreground ${compact ? 'text-[11px] mt-0.5' : 'text-xs mt-1'}`}>
          Frequency is in beta — features are evolving and some pricing is at special beta rates. Thanks for being an early member and helping shape the platform.
        </p>
      </div>
    </div>
  );
}