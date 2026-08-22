import React from 'react';
import { Compass, ShieldCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';

/**
 * Shows a Discovery Partner verification badge.
 * Pass `partnerId` to fetch partner data, OR pass `partner` directly.
 * `size` = 'sm' | 'md' (default 'sm')
 */
export default function DiscoveryPartnerBadge({ partnerId, partner: partnerProp, size = 'sm' }) {
  const navigate = useNavigate();

  const { data: fetched } = useQuery({
    queryKey: ['dp-badge', partnerId],
    queryFn: () => base44.entities.DiscoveryPartner.filter({ id: partnerId }),
    select: d => d?.[0],
    enabled: !!partnerId && !partnerProp,
  });

  const partner = partnerProp || fetched;
  if (!partner) return null;

  const isMd = size === 'md';

  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigate(`/discovery-partner/${partner.id}`); }}
      title={`Curated by ${partner.name}${partner.is_verified ? ' · Verified Discovery Partner' : ''}`}
      className={`inline-flex items-center gap-1 rounded-full border transition-colors
        ${isMd ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[10px]'}
        ${partner.is_verified
          ? 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/20'
          : 'bg-secondary/60 border-border/40 text-muted-foreground hover:border-border/70'
        }`}
    >
      {partner.is_verified
        ? <ShieldCheck className={isMd ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
        : <Compass className={isMd ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
      }
      <span className="font-medium">{partner.name}</span>
      {partner.is_verified && (
        <span className={`${isMd ? 'text-[10px]' : 'text-[9px]'} opacity-70`}>✦ Verified</span>
      )}
    </button>
  );
}