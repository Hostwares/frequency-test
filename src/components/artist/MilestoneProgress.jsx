import React from 'react';
import { Progress } from '@/components/ui/progress';
import GlassCard from '@/components/shared/GlassCard';
import { TrendingUp } from 'lucide-react';

export default function MilestoneProgress({ artistProfile }) {
  const currentFans = artistProfile?.supporter_count || 0;
  
  // Calculate next milestone (20k, then every 10k)
  const milestones = [20000, 30000, 40000, 50000, 60000, 70000, 80000, 90000, 100000];
  const nextMilestone = milestones.find(m => m > currentFans) || 100000;
  const previousMilestone = milestones.filter(m => m <= currentFans).pop() || 0;
  
  const fansNeeded = nextMilestone - currentFans;
  const range = nextMilestone - previousMilestone;
  const progress = currentFans - previousMilestone;
  const percentageToNext = Math.min(100, Math.max(0, (progress / range) * 100));

  return (
    <GlassCard hover={false} className="p-5">
      <div className="mb-4">
        <h3 className="font-display font-semibold text-foreground mb-1">Milestone Progress</h3>
        <p className="text-xs text-muted-foreground">Track your journey to the next milestone</p>
      </div>

      {/* Current Fans Display */}
      <div className="text-center mb-6">
        <p className="text-3xl font-bold text-neon-cyan mb-1">
          {currentFans.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">Current Fans</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">
            Progress to {nextMilestone.toLocaleString()}
          </span>
          <span className="text-xs font-semibold text-neon-purple">
            {percentageToNext.toFixed(1)}%
          </span>
        </div>
        <Progress value={percentageToNext} className="h-3" />
      </div>

      {/* Fans Needed */}
      <div className="flex items-center justify-between p-3 bg-gradient-card rounded-lg border border-border/30 mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-neon-magenta" />
          <span className="text-sm text-muted-foreground">Fans needed:</span>
        </div>
        <span className="text-lg font-bold text-neon-magenta">
          {fansNeeded.toLocaleString()}
        </span>
      </div>

      {/* Gratitude Payment Hint */}
      <div className="p-3 bg-neon-purple/10 rounded-lg border border-neon-purple/20">
        <p className="text-xs text-muted-foreground">
          💝 <strong>Tip:</strong> When you reach {nextMilestone.toLocaleString()} fans, send a gratitude payment to your Discovery Partner!
        </p>
      </div>
    </GlassCard>
  );
}