import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import { Badge } from '@/components/ui/badge';
import { Star, Trophy, Users, Heart, Music, Sparkles, Award, Zap, Crown, Diamond, Target, TrendingUp, Gift, Clock, Medal } from 'lucide-react';

const badgeDefinitions = {
  // Referral Badges
  fan_scout: {
    name: 'Fan Scout',
    description: 'Discovered new listeners for artists',
    icon: <Target className="w-5 h-5" />,
    color: 'bg-neon-turquoise/15 text-neon-turquoise border-neon-turquoise/30',
    glow: 'glow-cyan',
  },
  referral_champion: {
    name: 'Referral Champion',
    description: 'Brought 10+ listeners to the platform',
    icon: <Trophy className="w-5 h-5" />,
    color: 'bg-neon-purple/15 text-neon-purple border-neon-purple/30',
    glow: 'glow-purple',
  },
  referral_master: {
    name: 'Referral Master',
    description: 'Brought 25+ listeners to the platform',
    icon: <Award className="w-5 h-5" />,
    color: 'bg-neon-magenta/15 text-neon-magenta border-neon-magenta/30',
    glow: 'glow-magenta',
  },
  referral_legend: {
    name: 'Referral Legend',
    description: 'Brought 50+ listeners to the platform',
    icon: <Crown className="w-5 h-5" />,
    color: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30',
    glow: 'glow-purple',
  },
  
  // Support Tier Badges
  early_supporter: {
    name: 'Early Supporter',
    description: 'One of the first to support an artist',
    icon: <Clock className="w-5 h-5" />,
    color: 'bg-neon-blue/15 text-neon-blue border-neon-blue/30',
    glow: 'glow-cyan',
  },
  super_fan: {
    name: 'Super Fan',
    description: 'Supported 3+ artists consistently',
    icon: <Heart className="w-5 h-5" />,
    color: 'bg-neon-purple/15 text-neon-purple border-neon-purple/30',
    glow: 'glow-purple',
  },
  mega_fan: {
    name: 'Mega Fan',
    description: 'Supported 5+ artists consistently',
    icon: <Sparkles className="w-5 h-5" />,
    color: 'bg-neon-magenta/15 text-neon-magenta border-neon-magenta/30',
    glow: 'glow-magenta',
  },
  ultra_fan: {
    name: 'Ultra Fan',
    description: 'Supported 10+ artists consistently',
    icon: <Diamond className="w-5 h-5" />,
    color: 'bg-cyan-500/15 text-cyan-500 border-cyan-500/30',
    glow: 'glow-cyan',
  },
  legendary_fan: {
    name: 'Legendary Fan',
    description: 'Supported 20+ artists consistently',
    icon: <Crown className="w-5 h-5" />,
    color: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30',
    glow: 'glow-purple',
  },
  
  // Spending Badges
  loyal_patron: {
    name: 'Loyal Patron',
    description: '$100+ total support given',
    icon: <Gift className="w-5 h-5" />,
    color: 'bg-neon-purple/15 text-neon-purple border-neon-purple/30',
    glow: 'glow-purple',
  },
  monthly_champion: {
    name: 'Monthly Champion',
    description: '6+ months of consistent support',
    icon: <Medal className="w-5 h-5" />,
    color: 'bg-neon-cyan/15 text-neon-cyan border-neon-cyan/30',
    glow: 'glow-cyan',
  },
  
  // Community Badges
  community_builder: {
    name: 'Community Builder',
    description: 'Active in fan councils and communities',
    icon: <Users className="w-5 h-5" />,
    color: 'bg-neon-blue/15 text-neon-blue border-neon-blue/30',
    glow: 'glow-cyan',
  },
  playlist_curator: {
    name: 'Playlist Curator',
    description: 'Created and shared playlists',
    icon: <Music className="w-5 h-5" />,
    color: 'bg-neon-magenta/15 text-neon-magenta border-neon-magenta/30',
    glow: 'glow-magenta',
  },
  event_attendee: {
    name: 'Event Attendee',
    description: 'Attended live shows and events',
    icon: <Zap className="w-5 h-5" />,
    color: 'bg-neon-turquoise/15 text-neon-turquoise border-neon-turquoise/30',
    glow: 'glow-cyan',
  },
};

const tierBadges = {
  basic: {
    name: 'Basic Supporter',
    icon: <Star className="w-4 h-4" />,
    color: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
  },
  supporter: {
    name: 'Supporter',
    icon: <Heart className="w-4 h-4" />,
    color: 'bg-neon-blue/15 text-neon-blue border-neon-blue/30',
  },
  champion: {
    name: 'Champion',
    icon: <Trophy className="w-4 h-4" />,
    color: 'bg-neon-purple/15 text-neon-purple border-neon-purple/30',
  },
  patron: {
    name: 'Patron',
    icon: <Crown className="w-4 h-4" />,
    color: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30',
  },
};

export default function FanBadgeDisplay({ userId, showTitle = true }) {
  const { data: badges = [] } = useQuery({
    queryKey: ['fan-badges', userId],
    queryFn: () => base44.entities.FanBadge.filter({ 
      fan_user_id: userId,
      is_displayed: true 
    }, '-earned_date'),
    enabled: !!userId,
  });

  const { data: supportAllocations = [] } = useQuery({
    queryKey: ['fan-support-allocations', userId],
    queryFn: () => base44.entities.SupportAllocation.filter({ 
      fan_user_id: userId,
      is_active: true 
    }),
    enabled: !!userId,
  });

  const { data: user } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: () => base44.entities.User.filter({ id: userId }),
    enabled: !!userId,
    select: (data) => data?.[0],
  });

  // Calculate top support tier
  const topTier = React.useMemo(() => {
    if (supportAllocations.length === 0) return null;
    const tierOrder = ['patron', 'champion', 'supporter', 'basic'];
    for (const tier of tierOrder) {
      if (supportAllocations.some(s => s.tier === tier)) {
        return tier;
      }
    }
    return 'basic';
  }, [supportAllocations]);

  // Get referral badge (highest tier)
  const referralBadge = React.useMemo(() => {
    if (badges.some(b => b.badge_type === 'referral_legend')) return 'referral_legend';
    if (badges.some(b => b.badge_type === 'referral_master')) return 'referral_master';
    if (badges.some(b => b.badge_type === 'referral_champion')) return 'referral_champion';
    if (badges.some(b => b.badge_type === 'fan_scout')) return 'fan_scout';
    return null;
  }, [badges]);

  const displayedBadges = badges.slice(0, 12);
  const hasMoreBadges = badges.length > 12;

  return (
    <GlassCard hover={false} className="p-6">
      {showTitle && (
        <div className="mb-6">
          <h2 className="font-display font-semibold text-base mb-1">Achievement Badges</h2>
          <p className="text-xs text-muted-foreground">
            {user?.full_name || 'Fan'}'s earned milestones and support tiers
          </p>
        </div>
      )}

      {/* Featured Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Fan Scout Status */}
        {referralBadge && badgeDefinitions[referralBadge] && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="col-span-2 md:col-span-1"
          >
            <div className={`p-4 rounded-xl border-2 ${badgeDefinitions[referralBadge].color} ${badgeDefinitions[referralBadge].glow} text-center`}>
              <div className="flex justify-center mb-2">
                {badgeDefinitions[referralBadge].icon}
              </div>
              <p className="text-xs font-bold mb-1">{badgeDefinitions[referralBadge].name}</p>
              <p className="text-[10px] text-muted-foreground">{badgeDefinitions[referralBadge].description}</p>
            </div>
          </motion.div>
        )}

        {/* Top Support Tier */}
        {topTier && tierBadges[topTier] && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="col-span-2 md:col-span-1"
          >
            <div className={`p-4 rounded-xl border-2 ${tierBadges[topTier].color} text-center`}>
              <div className="flex justify-center mb-2">
                {tierBadges[topTier].icon}
              </div>
              <p className="text-xs font-bold mb-1">{tierBadges[topTier].name}</p>
              <p className="text-[10px] text-muted-foreground">
                {supportAllocations.length} artist{supportAllocations.length !== 1 ? 's' : ''} supported
              </p>
            </div>
          </motion.div>
        )}

        {/* Latest Badge */}
        {displayedBadges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="col-span-2 md:col-span-2"
          >
            <div className="p-4 rounded-xl bg-secondary/20 border border-border/30 h-full">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-4 h-4 text-neon-cyan" />
                <p className="text-xs font-semibold">Latest Achievement</p>
              </div>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${badgeDefinitions[displayedBadges[0]?.badge_type]?.color || 'bg-neon-purple/15'}`}>
                  {badgeDefinitions[displayedBadges[0]?.badge_type]?.icon || <Award className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">{badgeDefinitions[displayedBadges[0]?.badge_type]?.name || 'Badge'}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(displayedBadges[0]?.earned_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* All Badges Grid */}
      {displayedBadges.length > 0 && (
        <>
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-3">All Badges ({badges.length})</p>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {displayedBadges.map((badge, index) => {
                const def = badgeDefinitions[badge.badge_type];
                if (!def) return null;
                
                return (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-3 rounded-lg border ${def.color} ${def.glow} cursor-pointer hover:scale-105 transition-transform`}
                    title={def.description}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="mb-1">{def.icon}</div>
                      <p className="text-[10px] font-semibold leading-tight">{def.name}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {hasMoreBadges && (
            <div className="text-center">
              <Badge variant="outline" className="text-xs">
                +{badges.length - 12} more badges
              </Badge>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {badges.length === 0 && (
        <div className="text-center py-8">
          <Award className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No badges earned yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Support artists and make referrals to earn badges
          </p>
        </div>
      )}

      {/* Stats Summary */}
      {supportAllocations.length > 0 && (
        <div className="mt-6 pt-6 border-t border-border/30">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xl font-bold text-neon-purple">{supportAllocations.length}</p>
              <p className="text-[10px] text-muted-foreground">Artists Supported</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-neon-cyan">
                ${supportAllocations.reduce((sum, s) => sum + (s.amount || 0), 0).toFixed(0)}
              </p>
              <p className="text-[10px] text-muted-foreground">Monthly Support</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-neon-magenta">
                {badges.length}
              </p>
              <p className="text-[10px] text-muted-foreground">Badges Earned</p>
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  );
}