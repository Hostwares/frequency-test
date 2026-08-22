import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getAllocationTierForPlan, getAnalyticsFeatures, canAccessAnalyticsFeature } from '@/lib/fundedNetworkLimits';

/**
 * Hook that resolves the current user's subscription tier for analytics gating.
 * Returns: { tier, features, hasFeature, isLoading }
 */
export function useSubscriptionTier() {
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['mySubscription', user?.id],
    queryFn: async () => {
      const res = await base44.entities.UserSubscription.filter({ user_id: user.id, status: 'active' });
      return res?.[0] || null;
    },
    enabled: !!user?.id,
  });

  const tier = getAllocationTierForPlan(subscription?.plan_code);
  const features = getAnalyticsFeatures(tier);

  return {
    tier,
    features,
    hasFeature: (feature) => canAccessAnalyticsFeature(tier, feature),
    isLoading,
    planCode: subscription?.plan_code || null,
  };
}