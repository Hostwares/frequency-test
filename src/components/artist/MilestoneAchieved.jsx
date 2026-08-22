import React from 'react';
import { motion } from 'framer-motion';
import { Rocket, Star, Trophy, Sparkles, Award, Flame, Crown, Diamond } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

const BREAKOUT_THRESHOLD = 20000;
const MILESTONE_INCREMENT = 10000;

const MILESTONE_TIERS = [
  { threshold: 20000, icon: Rocket, label: 'Breakout Artist', badge: 'Top 1%', color: 'magenta' },
  { threshold: 30000, icon: Award, label: 'Rising Star', badge: 'Elite Tier', color: 'purple' },
  { threshold: 40000, icon: Flame, label: 'Superstar', badge: 'Legendary', color: 'cyan' },
  { threshold: 50000, icon: Crown, label: 'Icon', badge: 'Hall of Fame', color: 'blue' },
  { threshold: 60000, icon: Diamond, label: 'Living Legend', badge: 'Ultra Elite', color: 'turquoise' },
];

export default function MilestoneAchieved({ artist }) {
  const supporterCount = artist.supporter_count || 0;
  const isBreakout = supporterCount >= BREAKOUT_THRESHOLD;

  if (!isBreakout) {
    return null;
  }

  // Find the highest milestone reached
  const reachedMilestones = MILESTONE_TIERS.filter(tier => supporterCount >= tier.threshold);
  const currentMilestone = reachedMilestones[reachedMilestones.length - 1];
  const nextMilestone = MILESTONE_TIERS.find(tier => tier.threshold > supporterCount);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <GlassCard 
        hover={false} 
        className="p-6 mb-8 border border-neon-magenta/30 bg-gradient-to-br from-neon-magenta/10 via-neon-purple/5 to-neon-cyan/10 relative overflow-hidden"
      >
        {/* Animated background glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-neon-magenta/5 via-neon-purple/5 to-neon-cyan/5 animate-pulse" />
        
        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-magenta/20 to-neon-cyan/20 border border-neon-magenta/30 flex items-center justify-center flex-shrink-0">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Rocket className="w-8 h-8 text-neon-magenta" />
              </motion.div>
            </div>

            {/* Text */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-display font-bold text-foreground">
                  {currentMilestone.label}!
                </h2>
                <Sparkles className="w-5 h-5 text-neon-cyan" />
              </div>
              
              <p className="text-sm text-muted-foreground mb-3">
                {artist.artist_name} has reached {supporterCount.toLocaleString()} fans, achieving {currentMilestone.label} status.
              </p>

              {/* Stats */}
              <div className="flex items-center gap-4 flex-wrap mb-4">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-neon-${currentMilestone.color}/10 border border-neon-${currentMilestone.color}/20`}>
                  <Star className="w-4 h-4 text-neon-cyan" />
                  <span className="text-sm font-bold text-neon-cyan">
                    {supporterCount.toLocaleString()} Fans
                  </span>
                </div>
                
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-neon-${currentMilestone.color}/10 border border-neon-${currentMilestone.color}/20`}>
                  <currentMilestone.icon className="w-4 h-4 text-neon-purple" />
                  <span className="text-sm font-bold text-neon-purple">
                    {currentMilestone.label}
                  </span>
                </div>

                <NeonBadge color={currentMilestone.color} className="text-xs">
                  {currentMilestone.badge}
                </NeonBadge>
              </div>

              {/* All reached milestones */}
              {reachedMilestones.length > 1 && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Milestones Achieved:</p>
                  <div className="flex gap-2 flex-wrap">
                    {reachedMilestones.map((tier, i) => (
                      <div
                        key={tier.threshold}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/30 border border-border/30 text-[10px] ${
                          i === reachedMilestones.length - 1 ? 'border-neon-cyan/40 bg-neon-cyan/5' : ''
                        }`}
                      >
                        <tier.icon className={`w-3 h-3 text-neon-${tier.color}`} />
                        <span className="text-muted-foreground">{tier.threshold.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Progress to next milestone */}
          {nextMilestone && (
            <div className="mt-4 pt-4 border-t border-border/20">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>Next: {nextMilestone.label} at {nextMilestone.threshold.toLocaleString()} fans</span>
                <span className={`text-neon-${nextMilestone.color} font-semibold`}>
                  {(nextMilestone.threshold - supporterCount).toLocaleString()} to go
                </span>
              </div>
              <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ 
                    width: `${Math.min(100, ((supporterCount - currentMilestone.threshold) / (nextMilestone.threshold - currentMilestone.threshold)) * 100)}%` 
                  }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className={`h-full bg-gradient-to-r from-neon-${currentMilestone.color} via-neon-purple to-neon-${nextMilestone.color}`}
                />
              </div>
            </div>
          )}

          {/* Max milestone reached */}
          {!nextMilestone && (
            <div className="mt-4 pt-4 border-t border-border/20">
              <div className="flex items-center gap-2 text-xs">
                <Crown className="w-4 h-4 text-neon-turquoise" />
                <span className="text-neon-turquoise font-semibold">Maximum Milestone Achieved!</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {artist.artist_name} is among the most supported artists on the platform.
              </p>
            </div>
          )}
        </div>

        {/* Decorative corner elements */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-neon-magenta/10 to-transparent rounded-bl-full" />
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-neon-cyan/10 to-transparent rounded-tr-full" />
      </GlassCard>
    </motion.div>
  );
}