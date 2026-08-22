import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Crown } from 'lucide-react';

/**
 * TIER_BADGE_URLS — static mapping of beta tier plan codes to their badge image assets.
 * Also mirrored on the SubscriptionPlan.tier_badge_url field; the static map is used
 * as a fallback when the plan record hasn't been updated yet.
 */
const TIER_BADGE_URLS = {
  founding_supporter_beta: 'https://media.base44.com/images/public/6a36dc5db470c51b499adc6f/528da101e_generated_image.png',
  founding_premium_beta: 'https://media.base44.com/images/public/6a36dc5db470c51b499adc6f/3cc928085_generated_image.png',
  founding_champion_beta: 'https://media.base44.com/images/public/6a36dc5db470c51b499adc6f/235cd03a7_generated_image.png',
};

const TIER_FALLBACK = {
  founding_supporter_beta: { label: 'Beta Supporter', color: '#a855f7' },
  founding_premium_beta: { label: 'Founding Premium', color: '#d946ef' },
  founding_champion_beta: { label: 'Founding Patron', color: '#fbbf24' },
};

/**
 * SubscriberTierBadge — displays a tier badge for a subscriber.
 *
 * Props:
 *   userId       — the subscriber's user ID (resolves their active subscription + plan)
 *   planCode     — OR pass a plan_code directly (skips subscription lookup)
 *   size         — 'sm' | 'md' | 'lg' (default 'md')
 *   showLabel    — show the tier name text next to the badge image (default true)
 *
 * If the plan has a tier_badge_url (or it's one of the known beta tiers), the badge
 * image is rendered. Otherwise, a styled fallback badge renders using the plan name
 * and badge_color.
 */
export default function SubscriberTierBadge({ userId, planCode, size = 'md', showLabel = true }) {
  // Resolve the subscriber's active subscription
  const { data: subscription } = useQuery({
    queryKey: ['subscription-for-badge', userId],
    queryFn: async () => {
      const subs = await base44.entities.UserSubscription.filter({
        user_id: userId,
        status: 'active',
      });
      return subs?.[0] || null;
    },
    enabled: !!userId && !planCode,
  });

  const resolvedPlanCode = planCode || subscription?.plan_code;

  // Fetch the plan record for tier_badge_url and badge_color
  const { data: plan } = useQuery({
    queryKey: ['plan-for-badge', resolvedPlanCode],
    queryFn: async () => {
      const plans = await base44.entities.SubscriptionPlan.filter({ plan_code: resolvedPlanCode });
      return plans?.[0] || null;
    },
    enabled: !!resolvedPlanCode,
  });

  if (!resolvedPlanCode) return null;

  const badgeUrl = plan?.tier_badge_url || TIER_BADGE_URLS[resolvedPlanCode];
  const fallback = TIER_FALLBACK[resolvedPlanCode];
  const label = plan?.name || fallback?.label || resolvedPlanCode;
  const color = plan?.badge_color || fallback?.color || '#a855f7';

  const sizeClasses = {
    sm: { img: 'w-7 h-7', text: 'text-[10px]', icon: 'w-3.5 h-3.5' },
    md: { img: 'w-10 h-10', text: 'text-xs', icon: 'w-5 h-5' },
    lg: { img: 'w-14 h-14', text: 'text-sm', icon: 'w-7 h-7' },
  };
  const sz = sizeClasses[size] || sizeClasses.md;

  // Image badge
  if (badgeUrl) {
    return (
      <div className="flex items-center gap-2">
        <img
          src={badgeUrl}
          alt={`${label} tier badge`}
          className={`${sz.img} rounded-full object-cover flex-shrink-0`}
        />
        {showLabel && (
          <span className={`${sz.text} font-semibold`} style={{ color }}>
            {label}
          </span>
        )}
      </div>
    );
  }

  // Styled fallback badge (for non-beta tiers or when no image asset exists)
  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sz.img} rounded-full flex items-center justify-center flex-shrink-0 border-2`}
        style={{ backgroundColor: `${color}20`, borderColor: `${color}60` }}
      >
        <Crown className={`${sz.icon}`} style={{ color }} />
      </div>
      {showLabel && (
        <span className={`${sz.text} font-semibold`} style={{ color }}>
          {label}
        </span>
      )}
    </div>
  );
}