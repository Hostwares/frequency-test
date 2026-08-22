import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Users, DollarSign, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { toast } from 'sonner';

const milestoneConfig = {
  membership: {
    icon: Users,
    label: 'Membership',
    color: 'cyan',
    thresholds: [100, 500, 1000, 5000, 10000, 25000, 50000],
  },
  support: {
    icon: DollarSign,
    label: 'Community Fund',
    color: 'magenta',
    thresholds: [500, 1000, 5000, 10000, 25000, 50000],
  },
};

export default function CommunityMilestones({ communityId }) {
  const queryClient = useQueryClient();

  const { data: community } = useQuery({
    queryKey: ['community', communityId],
    queryFn: () => base44.entities.FrequencyCommunity.filter({ id: communityId }),
    enabled: !!communityId,
    select: (data) => data?.[0],
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ['community-milestones', communityId],
    queryFn: () => base44.entities.CommunityMilestone.filter({ 
      community_id: communityId 
    }, '-created_date', 10),
    enabled: !!communityId,
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const notifications = await base44.entities.FanNotification.filter({
        fan_user_id: community?.manager_user_id,
        type: 'council_meeting_reminder',
        is_read: false,
      });
      
      await Promise.all(
        notifications.map(n => base44.entities.FanNotification.update(n.id, { is_read: true }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-milestones'] });
      toast.success('All milestones marked as read');
    },
  });

  if (!community) return null;

  const memberCount = community.member_count || 0;
  const communityFund = community.community_fund || 0;

  // Calculate next milestones
  const getNextMilestone = (type, currentValue) => {
    const config = milestoneConfig[type];
    const nextThreshold = config.thresholds.find(t => t > currentValue);
    const previousThreshold = config.thresholds.filter(t => t <= currentValue).pop() || 0;
    const progress = nextThreshold 
      ? ((currentValue - previousThreshold) / (nextThreshold - previousThreshold)) * 100 
      : 100;
    
    return {
      next: nextThreshold,
      previous: previousThreshold,
      progress: Math.min(progress, 100),
      remaining: nextThreshold ? nextThreshold - currentValue : 0,
    };
  };

  const membershipProgress = getNextMilestone('membership', memberCount);
  const supportProgress = getNextMilestone('support', communityFund);

  return (
    <GlassCard hover={false} className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-neon-magenta" />
          <h3 className="font-display font-semibold">Community Milestones</h3>
        </div>
        {milestones.some(m => !m.is_read) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            className="text-xs h-7"
          >
            <Check className="w-3 h-3 mr-1" />
            Mark All Read
          </Button>
        )}
      </div>

      {/* Current Milestones */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {/* Membership Milestone */}
        <div className="p-4 rounded-xl bg-secondary/20 border border-border/30">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-neon-cyan" />
            <span className="text-sm font-medium">Membership Growth</span>
          </div>
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-2xl font-bold text-neon-cyan">{memberCount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">current members</p>
            </div>
            {membershipProgress.next && (
              <NeonBadge color="cyan">
                Next: {membershipProgress.next.toLocaleString()}
              </NeonBadge>
            )}
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-neon-cyan/50 to-neon-cyan transition-all"
              style={{ width: `${membershipProgress.progress}%` }}
            />
          </div>
          {membershipProgress.remaining > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {membershipProgress.remaining.toLocaleString()} members until next milestone
            </p>
          )}
        </div>

        {/* Support Milestone */}
        <div className="p-4 rounded-xl bg-secondary/20 border border-border/30">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-neon-magenta" />
            <span className="text-sm font-medium">Community Fund</span>
          </div>
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-2xl font-bold text-neon-magenta">${communityFund.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">total support</p>
            </div>
            {supportProgress.next && (
              <NeonBadge color="magenta">
                Next: ${supportProgress.next.toLocaleString()}
              </NeonBadge>
            )}
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-neon-magenta/50 to-neon-magenta transition-all"
              style={{ width: `${supportProgress.progress}%` }}
            />
          </div>
          {supportProgress.remaining > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              ${(supportProgress.remaining / 1000).toFixed(1)}k until next milestone
            </p>
          )}
        </div>
      </div>

      {/* Recent Milestone Achievements */}
      {milestones.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">Recent Achievements</h4>
          {milestones.slice(0, 5).map((milestone, index) => {
            const config = milestoneConfig[milestone.milestone_type];
            const Icon = config?.icon || TrendingUp;
            return (
              <motion.div
                key={milestone.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/10 border border-border/20"
              >
                <div className={`p-2 rounded-lg ${config?.color === 'cyan' ? 'bg-neon-cyan/10' : 'bg-neon-magenta/10'}`}>
                  <Icon className={`w-4 h-4 ${config?.color === 'cyan' ? 'text-neon-cyan' : 'text-neon-magenta'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {config?.label} Milestone: {milestone.milestone_value.toLocaleString()}
                    {milestone.milestone_type === 'support' && '$'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(milestone.created_date).toLocaleDateString()}
                  </p>
                </div>
                {milestone.is_read && (
                  <Check className="w-4 h-4 text-green-500" />
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {milestones.length === 0 && (
        <div className="text-center py-8 border border-dashed border-border/40 rounded-xl">
          <Trophy className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Milestones will be tracked here</p>
          <p className="text-xs text-muted-foreground mt-1">
            Keep growing your community!
          </p>
        </div>
      )}
    </GlassCard>
  );
}