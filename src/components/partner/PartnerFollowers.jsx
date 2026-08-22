import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';

export default function PartnerFollowers({ partnerId }) {
  const { data: followers = [] } = useQuery({
    queryKey: ['partner-followers', partnerId],
    queryFn: () => base44.entities.PartnerFollow.filter({ partner_id: partnerId, is_active: true }, '-created_date', 50),
    enabled: !!partnerId,
  });

  if (followers.length === 0) return null;

  return (
    <GlassCard hover={false} className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-neon-blue" />
        <h3 className="font-display font-semibold text-sm">Community Followers</h3>
        <span className="text-xs text-muted-foreground">({followers.length})</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {followers.slice(0, 20).map(f => (
          <div key={f.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary/30 rounded-full">
            <div className="w-5 h-5 rounded-full bg-neon-blue/20 flex items-center justify-center text-[9px] font-bold text-neon-blue">
              {(f.follower_name || '?')[0]?.toUpperCase()}
            </div>
            <span className="text-xs">{f.follower_name || 'Anonymous'}</span>
            {f.follower_type && f.follower_type !== 'fan' && (
              <span className="text-[9px] text-muted-foreground capitalize">· {f.follower_type}</span>
            )}
          </div>
        ))}
        {followers.length > 20 && (
          <span className="text-xs text-muted-foreground self-center">+{followers.length - 20} more</span>
        )}
      </div>
    </GlassCard>
  );
}