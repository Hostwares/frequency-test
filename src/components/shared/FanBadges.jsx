import React from 'react';
import { motion } from 'framer-motion';
import { 
  Star, Heart, Users, Music, Calendar, PlayCircle, 
  Trophy, Award, Sparkles, Crown, Zap, Target
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

const BADGE_CONFIG = {
  // Support-based badges
  early_supporter: {
    icon: Star,
    label: 'Early Supporter',
    description: 'One of the first to support emerging artists',
    color: 'cyan',
  },
  first_supporter: {
    icon: Sparkles,
    label: 'First Supporter',
    description: 'First fan to support an artist',
    color: 'purple',
  },
  super_fan: {
    icon: Heart,
    label: 'Super Fan',
    description: 'Supported artists with $50+ total',
    color: 'blue',
  },
  mega_fan: {
    icon: Award,
    label: 'Mega Fan',
    description: 'Supported artists with $200+ total',
    color: 'purple',
  },
  ultra_fan: {
    icon: Trophy,
    label: 'Ultra Fan',
    description: 'Supported artists with $500+ total',
    color: 'magenta',
  },
  legendary_fan: {
    icon: Crown,
    label: 'Legendary Fan',
    description: 'Supported artists with $1000+ total',
    color: 'cyan',
  },
  loyal_patron: {
    icon: Heart,
    label: 'Loyal Patron',
    description: '6+ months of consecutive support',
    color: 'purple',
  },
  monthly_champion: {
    icon: Zap,
    label: 'Monthly Champion',
    description: 'Top supporter of the month',
    color: 'magenta',
  },
  
  // Referral badges
  fan_scout: {
    icon: Users,
    label: 'Fan Scout',
    description: 'Referred 5+ listeners to the platform',
    color: 'blue',
  },
  referral_master: {
    icon: Target,
    label: 'Referral Master',
    description: 'Referred 15+ listeners to the platform',
    color: 'purple',
  },
  referral_legend: {
    icon: Crown,
    label: 'Referral Legend',
    description: 'Referred 50+ listeners to the platform',
    color: 'cyan',
  },
  
  // Engagement badges
  genre_explorer: {
    icon: Music,
    label: 'Genre Explorer',
    description: 'Supported artists across 10+ genres',
    color: 'turquoise',
  },
  community_builder: {
    icon: Users,
    label: 'Community Builder',
    description: 'Active in 5+ frequency communities',
    color: 'blue',
  },
  playlist_curator: {
    icon: PlayCircle,
    label: 'Playlist Curator',
    description: 'Created 10+ playlists',
    color: 'purple',
  },
  event_attendee: {
    icon: Calendar,
    label: 'Event Attendee',
    description: 'Attended 5+ events',
    color: 'magenta',
  },
};

const TIER_STYLES = {
  bronze: { border: 'border-amber-700/50', bg: 'bg-amber-900/20', glow: 'shadow-amber-500/20' },
  silver: { border: 'border-slate-400/50', bg: 'bg-slate-400/20', glow: 'shadow-slate-400/20' },
  gold: { border: 'border-yellow-500/50', bg: 'bg-yellow-500/20', glow: 'shadow-yellow-500/20' },
  platinum: { border: 'border-cyan-400/50', bg: 'bg-cyan-400/20', glow: 'shadow-cyan-400/20' },
  diamond: { border: 'border-purple-400/50', bg: 'bg-purple-400/20', glow: 'shadow-purple-400/20' },
};

export default function FanBadges({ badges = [], showAll = false }) {
  const displayedBadges = showAll ? badges : badges.filter(b => b.is_displayed !== false);
  
  if (displayedBadges.length === 0) {
    return (
      <GlassCard className="p-8 text-center">
        <Award className="w-12 h-12 mx-auto mb-3 opacity-20 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No badges earned yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Support artists and refer friends to earn badges!
        </p>
      </GlassCard>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {displayedBadges.map((badge, index) => {
        const config = BADGE_CONFIG[badge.badge_type];
        if (!config) return null;
        
        const Icon = config.icon;
        const tierStyle = TIER_STYLES[badge.badge_tier] || TIER_STYLES.bronze;
        
        return (
          <motion.div
            key={badge.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <GlassCard 
              hover={true}
              className={`p-3 text-center ${tierStyle.bg} border-2 ${tierStyle.border}`}
            >
              <div className="relative">
                <div className={`inline-flex p-2 rounded-full ${tierStyle.bg} ${tierStyle.glow} shadow-lg`}>
                  <Icon className={`w-5 h-5 text-${config.color}-400`} />
                </div>
                {badge.badge_tier === 'diamond' && (
                  <Sparkles className="w-3 h-3 text-purple-400 absolute -top-1 -right-1" />
                )}
              </div>
              
              <p className="text-[10px] font-semibold text-foreground mt-2 leading-tight">
                {config.label}
              </p>
              
              <p className="text-[9px] text-muted-foreground mt-1">
                {badge.badge_tier}
              </p>
              
              <NeonBadge color={config.color} className="mt-2 text-[8px] py-0.5 px-1.5">
                {new Date(badge.earned_date).toLocaleDateString()}
              </NeonBadge>
            </GlassCard>
          </motion.div>
        );
      })}
    </div>
  );
}