import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PartnerFollowButton({ partnerId, userId, followerCount = 0 }) {
  const qc = useQueryClient();
  const [hovering, setHovering] = useState(false);

  const { data: existing = [] } = useQuery({
    queryKey: ['partner-follow-check', partnerId, userId],
    queryFn: () => base44.entities.PartnerFollow.filter({ partner_id: partnerId, follower_user_id: userId, is_active: true }),
    enabled: !!partnerId && !!userId,
  });

  const isFollowing = existing.length > 0;

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        await base44.entities.PartnerFollow.update(existing[0].id, { is_active: false });
      } else {
        await base44.entities.PartnerFollow.create({
          partner_id: partnerId,
          follower_user_id: userId,
          is_active: true,
        });
      }
      // Update follower count on partner
      const newCount = isFollowing ? Math.max(0, followerCount - 1) : followerCount + 1;
      await base44.entities.DiscoveryPartner.update(partnerId, { follower_count: newCount });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partner-follow-check'] });
      qc.invalidateQueries({ queryKey: ['dp-profile'] });
      qc.invalidateQueries({ queryKey: ['partner-followers'] });
      toast.success(isFollowing ? 'Unfollowed' : 'Following');
    },
    onError: (e) => toast.error(e.message || 'Failed to update follow'),
  });

  return (
    <Button
      size="sm"
      variant={isFollowing ? 'secondary' : 'default'}
      className="h-8 gap-1.5"
      disabled={followMutation.isPending}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={() => followMutation.mutate()}
    >
      {followMutation.isPending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : isFollowing ? (
        hovering ? (
          <><UserCheck className="w-3.5 h-3.5 text-destructive" /> Unfollow</>
        ) : (
          <><UserCheck className="w-3.5 h-3.5" /> Following</>
        )
      ) : (
        <><UserPlus className="w-3.5 h-3.5" /> Follow</>
      )}
    </Button>
  );
}