import React from 'react';
import { Info } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';

const COPY = {
  purchase: {
    title: 'Direct Artist Purchase',
    body:
      'Subscribers may optionally purchase any eligible song an artist makes available for sale. After a qualifying purchase with Current Catalog Access, you receive the purchased song and may listen to the artist\u2019s eligible catalog and add those songs to personal listening playlists. A direct song purchase is a one-time commercial transaction \u2014 it does not automatically enroll the artist into your recurring monthly Artist Distribution Pool. To provide recurring monthly support through your subscription, add the artist to your Primary Funded Playlist during the next billing cycle\u2019s two-day grace period.',
  },
  funding: {
    title: 'Primary Funded Playlist Support',
    body:
      'Artists on your Primary Funded Playlist receive part of your monthly Artist Distribution Pool (at least the platform minimum distribution) and continue receiving support until removed during a future billing cycle\u2019s grace period. A direct song purchase is separate from this \u2014 buying a song does not automatically add an artist to your funded playlist. To fund an artist monthly, add them to this playlist during the next billing cycle\u2019s two-day grace period.',
  },
};

export default function PurchaseVsFundingExplainer({ variant = 'purchase' }) {
  const copy = COPY[variant] || COPY.purchase;
  return (
    <GlassCard hover={false} className="p-4 border-border/40">
      <div className="flex items-start gap-3">
        <Info className="w-4 h-4 text-neon-cyan flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold mb-1">{copy.title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{copy.body}</p>
        </div>
      </div>
    </GlassCard>
  );
}