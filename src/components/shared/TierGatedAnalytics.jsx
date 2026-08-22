import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/shared/GlassCard';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';

const TIER_COLORS = {
  standard: 'purple',
  advanced: 'cyan',
  advanced_plus: 'magenta',
};

const TIER_LABELS = {
  standard: 'Basic',
  advanced: 'Advanced',
  advanced_plus: 'Premium',
};

/**
 * Wraps analytics content behind a tier gate.
 * If the user's tier includes the feature, renders children.
 * If not, shows a locked upgrade prompt with the feature label.
 */
export default function TierGatedAnalytics({ feature, label, children }) {
  const { tier, hasFeature } = useSubscriptionTier();
  const navigate = useNavigate();

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  return (
    <GlassCard hover={false} className="p-5 mb-8 border-dashed border-border/40 opacity-75">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-muted/50">
          <Lock className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{label || feature}</p>
          <p className="text-[11px] text-muted-foreground">
            Available on Advanced{feature === 'playlist_engagement_details' || feature === 'referral_network_graph' || feature === 'referral_conversion_funnel' || feature === 'referral_revenue_impact' ? '+ (Premium)' : ''} tier and above
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[10px] flex-shrink-0"
          onClick={() => navigate('/pricing')}
        >
          <Sparkles className="w-3 h-3 mr-1" /> Upgrade
        </Button>
      </div>
    </GlassCard>
  );
}

/**
 * Badge showing the current analytics tier.
 */
export function AnalyticsTierBadge({ tier }) {
  const color = TIER_COLORS[tier] || 'purple';
  const label = TIER_LABELS[tier] || 'Basic';
  const colorMap = {
    purple: 'bg-neon-purple/15 text-neon-purple border-neon-purple/30',
    cyan: 'bg-neon-cyan/15 text-neon-cyan border-neon-cyan/30',
    magenta: 'bg-neon-magenta/15 text-neon-magenta border-neon-magenta/30',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${colorMap[color]}`}>
      {label} Analytics
    </span>
  );
}