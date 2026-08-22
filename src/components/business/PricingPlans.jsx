import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Check, X, Crown, Sparkles, Star, Zap, Gift, Music, ChevronDown, ChevronUp, Package, Loader2, ShoppingBag, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const DEFAULT_PLANS = [
  {
    name: 'Free',
    plan_code: 'free',
    monthly_price: 0,
    annual_price: 0,
    description: 'Discover the platform and sample music.',
    features: [
      'Listen to featured music', 'Follow artists', 'Join communities',
      'Create playlists', 'Like songs', 'Comment', 'Browse events',
      'Receive recommendations',
    ],
    limitations: ['Cannot allocate monthly artist support', 'No exclusive releases'],
    badge_color: '#6b7280',
    sort_order: 0,
  },
  {
    name: 'Supporter',
    plan_code: 'supporter',
    monthly_price: 9.99,
    annual_price: 99,
    description: 'Core membership for most fans.',
    features: [
      'Unlimited streaming', 'Artist support allocation', 'Exclusive Mainstream First™ releases',
      'Community voting', 'Discovery Partner recommendations', 'Early ticket access',
      'Merchandise discounts', 'QR Membership Card', 'Artist messaging', 'Full audio quality',
    ],
    badge_color: '#06b6d4',
    sort_order: 1,
    is_popular: true,
  },
  {
    name: 'Premium Supporter',
    plan_code: 'premium_supporter',
    monthly_price: 14.99,
    annual_price: 149,
    description: 'Added perks and higher support allocation.',
    features: [
      'Everything in Supporter', 'Higher monthly support allocation', 'Early access to new releases',
      'Behind-the-scenes content', 'Limited edition merchandise', 'Exclusive livestreams',
      'Premium badge', 'Priority event registration',
    ],
    badge_color: '#a855f7',
    sort_order: 2,
  },
  {
    name: 'Patron',
    plan_code: 'champion',
    monthly_price: 24.99,
    annual_price: 249,
    description: 'For dedicated fans who want maximum support and benefits.',
    features: [
      'Everything above', 'Highest artist support allocation', 'VIP community badge',
      'Exclusive Q&A opportunities', 'Artist milestone recognition', 'Premium contests',
      'Beta feature access',
    ],
    badge_color: '#d946ef',
    sort_order: 3,
  },
];

const PLAN_ICONS = {
  free: Star,
  supporter: Zap,
  premium_supporter: Sparkles,
  champion: Crown,
};

export default function PricingPlans() {
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState('monthly');

  const { data: plans = DEFAULT_PLANS } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const dbPlans = await base44.entities.SubscriptionPlan.filter({ is_active: true, target_audience: 'fan' }, 'sort_order', 10);
      return dbPlans.length > 0 ? dbPlans : DEFAULT_PLANS;
    },
  });

  const { data: userSubscription } = useQuery({
    queryKey: ['my-subscription', user?.id],
    queryFn: async () => {
      const subs = await base44.entities.UserSubscription.filter({
        user_id: user.id, status: 'active'
      });
      return subs[0];
    },
    enabled: !!user,
  });

  const startSubscription = useMutation({
    mutationFn: async (plan) => {
      const response = await base44.functions.invoke('createCheckout', {
        payment_type: 'subscription',
        plan_code: plan.plan_code,
        billing_cycle: billingCycle,
        amount: billingCycle === 'annual' ? plan.annual_price : plan.monthly_price,
        name: `${plan.name} — ${billingCycle === 'annual' ? 'Annual' : 'Monthly'}`,
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.checkout_url) window.location.href = data.checkout_url;
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error || 'Failed to start subscription. Please try again.');
    },
  });

  const startFounding = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('createCheckout', {
        payment_type: 'subscription',
        plan_code: 'founding_supporter',
        billing_cycle: 'monthly',
        amount: 7.99,
        name: 'Founding Supporter — Monthly (Locked for Life)',
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.checkout_url) window.location.href = data.checkout_url;
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error || 'Failed to start founding membership.');
    },
  });

  const isRedirecting = startSubscription.isPending || startFounding.isPending;

  return (
    <div className="space-y-6">
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setBillingCycle('monthly')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${billingCycle === 'monthly' ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
        >Monthly</button>
        <button
          onClick={() => setBillingCycle('annual')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${billingCycle === 'annual' ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
        >
          Annual
          <NeonBadge color="turquoise">2 months free</NeonBadge>
        </button>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan, i) => {
          const Icon = PLAN_ICONS[plan.plan_code] || Star;
          const price = billingCycle === 'annual' ? plan.annual_price : plan.monthly_price;
          const isCurrent = userSubscription?.plan_code === plan.plan_code;
          const isFree = plan.plan_code === 'free' || plan.monthly_price === 0;

          return (
            <motion.div key={plan.plan_code} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <GlassCard
                hover={false}
                className={`p-5 h-full flex flex-col ${plan.is_popular ? 'border-primary/40 glow-purple' : ''}`}
              >
                {plan.is_popular && (
                  <div className="mb-2">
                    <NeonBadge color="purple">★ Most Popular</NeonBadge>
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${plan.badge_color || '#a855f7'}20` }}>
                    <Icon className="w-5 h-5" style={{ color: plan.badge_color || '#a855f7' }} />
                  </div>
                  <h3 className="font-display font-bold">{plan.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{plan.description}</p>

                <div className="mb-4">
                  {isFree ? (
                    <p className="text-3xl font-display font-bold">$0</p>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-display font-bold">${price}</span>
                      <span className="text-xs text-muted-foreground">/{billingCycle === 'annual' ? 'year' : 'month'}</span>
                    </div>
                  )}
                  {!isFree && billingCycle === 'annual' && (
                    <p className="text-[10px] text-neon-turquoise mt-0.5">Save ${(plan.monthly_price * 12 - plan.annual_price).toFixed(2)}/year</p>
                  )}
                </div>

                <div className="flex-1 space-y-1.5 mb-4">
                  {plan.features?.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-xs">
                      <Check className="w-3 h-3 text-neon-turquoise flex-shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                  {plan.limitations?.map((lim, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-xs text-muted-foreground/60">
                      <X className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      <span>{lim}</span>
                    </div>
                  ))}
                </div>

                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    <Check className="w-4 h-4" />Current Plan
                  </Button>
                ) : isFree ? (
                  <Button variant="outline" className="w-full">Get Started</Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.is_popular ? 'default' : 'outline'}
                    onClick={() => startSubscription.mutate(plan)}
                    disabled={isRedirecting || !user}
                  >
                    {isRedirecting ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Redirecting...</> : `Subscribe ${plan.is_popular ? '★' : ''}`}
                  </Button>
                )}
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {/* Founding Member banner */}
      <GlassCard hover={false} className="p-5 border-neon-magenta/30 bg-gradient-to-r from-neon-magenta/10 via-neon-purple/5 to-transparent">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-neon-magenta/15 border border-neon-magenta/30 flex items-center justify-center flex-shrink-0">
            <Gift className="w-6 h-6 text-neon-magenta" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-sm flex items-center gap-2 flex-wrap">
              Founding Supporter Program
              <NeonBadge color="magenta">Limited Time</NeonBadge>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Lock in $7.99/month for life + exclusive Founding Member badge. Available during our first year only.
            </p>
          </div>
          <Button
            size="sm"
            variant="default"
            className="bg-neon-magenta/80 hover:bg-neon-magenta w-full sm:w-auto flex-shrink-0"
            onClick={() => startFounding.mutate()}
            disabled={isRedirecting || !user}
          >
            {startFounding.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Redirecting...</> : 'Become a Founder'}
          </Button>
        </div>
      </GlassCard>

      {/* Artist section */}
      <ArtistPricingSection />
    </div>
  );
}

const ARTIST_FREE_FEATURES = [
  'Unlimited profile',
  'Upload music',
  'Community participation',
  'Artist dashboard',
  'Discovery Partners',
  'Radio Portal',
  'Sync profile',
  'Basic analytics',
];

const ARTIST_INTEGRATIONS = [
  { name: 'Merchandise Fulfillment', description: 'Automated order processing, shipping, and inventory management.' },
  { name: 'Ticketing', description: 'Sell event tickets with QR entry, seating charts, and check-in tools.' },
  { name: 'Print-on-Demand', description: 'Custom merch printing with no upfront inventory costs.' },
  { name: 'Promotional Campaigns', description: 'Boost tracks, run targeted fan outreach, and schedule releases.' },
  {
    name: 'Advanced Analytics',
    description: 'Full suite of growth and insight tools:',
    sub_features: [
      'Artist Growth Score™',
      'Fan Journey Analytics™',
      'Support Conversion Rate',
      'Discovery Source Report',
      'Support Impact Dashboard™',
      'Mainstream First™ Analytics',
      'Radio Dashboard',
      'Audience Heatmap',
      'Opportunity Dashboard',
      'Discovery Timeline™',
    ],
  },
  { name: 'Premium Storage', description: 'Expanded storage for high-resolution audio, video, and media assets.' },
];

const MERCH_STORES = [
  { name: 'Shopify', url: 'https://www.shopify.com', description: 'Full e-commerce storefront with inventory, shipping, and POS.', color: '#95BF47' },
  { name: 'Printify', url: 'https://printify.com', description: 'Print-on-demand marketplace with 100+ print providers.', color: '#18A0FB' },
  { name: 'Printful', url: 'https://www.printful.com', description: 'Print-on-demand with warehousing and fulfillment services.', color: '#76B900' },
  { name: 'Etsy', url: 'https://www.etsy.com', description: 'Marketplace for handmade, vintage, and unique merch.', color: '#F1641E' },
  { name: 'Bandcamp', url: 'https://bandcamp.com', description: 'Direct-to-fan music and merch sales with artist-friendly splits.', color: '#1DA0C3' },
];

function ArtistPricingSection() {
  const [expanded, setExpanded] = useState(false);

  return (
    <GlassCard hover={false} className="p-6 border-neon-cyan/20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-neon-cyan/15 border border-neon-cyan/30 flex items-center justify-center flex-shrink-0">
          <Music className="w-6 h-6 text-neon-cyan" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-bold text-base">Free Artist Account</h3>
            <NeonBadge color="cyan">$0/mo</NeonBadge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Everything you need to share your music. No monthly fee — pay only $1.99 per integration when you use optional business services.
          </p>
        </div>
        <Button size="sm" variant="outline" className="border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10 flex-shrink-0 w-full sm:w-auto">
          Artist Sign Up
        </Button>
      </div>

      {/* Free features */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {ARTIST_FREE_FEATURES.map((feat, idx) => (
          <div key={idx} className="flex items-start gap-1.5 text-xs">
            <Check className="w-3 h-3 text-neon-turquoise flex-shrink-0 mt-0.5" />
            <span>{feat}</span>
          </div>
        ))}
      </div>

      {/* Integrations toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-neon-cyan" />
          <span className="text-sm font-medium">Optional Business Integrations</span>
          <NeonBadge color="cyan">$1.99 each</NeonBadge>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 space-y-2">
          {ARTIST_INTEGRATIONS.map((integration, idx) => (
            <div key={idx} className="p-3 rounded-lg border border-border/40 bg-card/50">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-medium">{integration.name}</h4>
                <span className="text-xs font-bold text-neon-cyan">$1.99</span>
              </div>
              <p className="text-xs text-muted-foreground">{integration.description}</p>
              {integration.sub_features && (
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-1">
                  {integration.sub_features.map((sub, sIdx) => (
                    <div key={sIdx} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Check className="w-3 h-3 text-neon-purple flex-shrink-0 mt-0.5" />
                      <span>{sub}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground/60 text-center pt-1">
            Integrations are activated on-demand from the Artist Dashboard. You're only charged when you enable a service.
          </p>
        </motion.div>
      )}

      {/* Top merch store integrations */}
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-2">
          <ShoppingBag className="w-4 h-4 text-neon-magenta" />
          <span className="text-sm font-medium">Top Merch Store Integrations</span>
          <NeonBadge color="magenta">Artist Pro</NeonBadge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {MERCH_STORES.map((store, idx) => (
            <a
              key={idx}
              href={store.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-lg border border-border/40 bg-card/50 hover:border-primary/40 hover:bg-secondary/40 transition-colors flex flex-col gap-1.5"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: store.color }} />
                <span className="text-sm font-semibold">{store.name}</span>
                <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto flex-shrink-0" />
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">{store.description}</p>
            </a>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}