import React from 'react';
import { FlaskConical } from 'lucide-react';
import { useBetaConfig } from '@/hooks/useBetaConfig';

export default function BetaStatusBadge() {
  const { config } = useBetaConfig();

  if (!config.beta_mode_enabled) return null;

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neon-magenta/15 border border-neon-magenta/30 text-neon-magenta text-xs font-semibold">
      <FlaskConical className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">BETA</span>
      <span className="sm:hidden">β</span>
    </div>
  );
}