import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Crown, Sparkles, Star, Zap, Gift, Loader2, X, Check, Calendar, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const PLAN_ICONS = {
  free: Star,
  supporter: Zap,
  premium_supporter: Sparkles,
  champion: Crown,
  founding_supporter: Gift,
};

const PLAN_COLORS = {
  free: '#6b7280',
  supporter: '#06b6d4',
  premium_supporter: '#a855f7',
  champion: '#d946ef',
  founding_supporter: '#d946ef',
};

export default function SubscriptionManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['my-subscription', user?.id],
    queryFn: async () => {
      const subs = await base44.entities.UserSubscription.filter({
        user_id: user.id,
        status: { $in: ['active', 'pending', 'past_due'] },
      });
      return subs[0] || null;
    },
    enabled: !!user?.id,
  });

  const { data: plan } = useQuery({
    queryKey: ['subscription-plan', subscription?.plan_code],
    queryFn: async () => {
      const plans = await base44.entities.SubscriptionPlan.filter({ plan_code: subscription.plan_code });
      return plans[0] || null;
    },
    enabled: !!subscription?.plan_code,
  });

  const handleCancel = async () => {
    if (!subscription?.subscription_id) {
      toast.error('No subscription ID found. Please contact support.');
      return;
    }

    setCanceling(true);
    try {
      await base44.functions.invoke('cancelSubscription', {
        subscription_id: subscription.subscription_id,
        immediate: false,
        reason: 'User canceled from dashboard',
      });

      toast.success('Subscription canceled. You\'ll keep access until the end of your billing period.');
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['my-allocations'] });
      setShowCancelDialog(false);
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to cancel subscription. Please try again.');
    } finally {
      setCanceling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No active subscription
  if (!subscription) {
    return (
      <GlassCard hover={false} className="p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-3">
          <Star className="w-6 h-6 text-muted-foreground" />
        </div>
        <h3 className="font-display font-bold text-sm mb-1">No Active Subscription</h3>
        <p className="text-xs text-muted-foreground mb-4">
          You're on the Free plan. Upgrade to support artists directly and unlock exclusive features.
        </p>
        <Link to="/pricing">
          <Button className="bg-gradient-neon text-white">View Plans</Button>
        </Link>
      </GlassCard>
    );
  }

  const planCode = subscription.plan_code;
  const Icon = PLAN_ICONS[planCode] || Star;
  const color = PLAN_COLORS[planCode] || '#a855f7';
  const isPending = subscription.status === 'pending';
  const isFounding = subscription.is_founding_member || planCode === 'founding_supporter';
  const nextBilling = subscription.next_billing_date ? new Date(subscription.next_billing_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : null;

  return (
    <>
      <GlassCard hover={false} className={`p-6 ${isFounding ? 'border-neon-magenta/30' : ''}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
              <Icon className="w-6 h-6" style={{ color }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-base">{subscription.plan_name || planCode}</h3>
                {isFounding && <NeonBadge color="magenta">Founding</NeonBadge>}
                {isPending && <NeonBadge color="cyan">Pending</NeonBadge>}
              </div>
              <p className="text-xs text-muted-foreground capitalize">
                {subscription.billing_cycle} billing · {subscription.status}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-display font-bold">${subscription.monthly_price || plan?.monthly_price || 0}</p>
            <p className="text-xs text-muted-foreground">/{subscription.billing_cycle === 'annual' ? 'year' : 'month'}</p>
          </div>
        </div>

        {isPending && (
          <div className="mb-4 p-3 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20 flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-neon-cyan animate-spin flex-shrink-0" />
            <p className="text-xs text-neon-cyan">Confirming your payment... Your subscription will be active momentarily.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 text-xs">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Started</p>
              <p className="text-foreground font-medium">
                {subscription.started_date ? new Date(subscription.started_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">{subscription.status === 'canceled' ? 'Ends' : 'Next billing'}</p>
              <p className="text-foreground font-medium">{nextBilling || '—'}</p>
            </div>
          </div>
        </div>

        {subscription.support_allocation_amount > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-secondary/30">
            <p className="text-xs text-muted-foreground mb-1">Monthly artist support allocation</p>
            <p className="text-lg font-display font-bold text-neon-cyan">${subscription.support_allocation_amount.toFixed(2)}</p>
          </div>
        )}

        <div className="flex gap-2">
          <Link to="/pricing" className="flex-1">
            <Button variant="outline" className="w-full" size="sm">Change Plan</Button>
          </Link>
          {!isPending && subscription.status !== 'canceled' && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowCancelDialog(true)}
            >
              Cancel
            </Button>
          )}
        </div>
      </GlassCard>

      {/* Cancel confirmation dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel your subscription?</DialogTitle>
            <DialogDescription>
              Your subscription will remain active until the end of your current billing period
              {nextBilling ? ` (${nextBilling})` : ''}. After that, your account will revert to the Free plan.
              {isFounding && (
                <span className="block mt-2 text-neon-magenta">
                  ⚠️ You have Founding Member locked pricing. If you cancel and re-subscribe later, standard pricing will apply.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)} disabled={canceling}>
              Keep Subscription
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={canceling}>
              {canceling ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Canceling...</> : 'Cancel Subscription'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}