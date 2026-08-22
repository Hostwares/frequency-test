import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Wallet, Heart, Music, Users, Award, 
  TrendingUp, Radio, Headphones, Share2, Instagram, Video, Sparkles
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import StatCard from '@/components/shared/StatCard';
import FanReferralNetwork from '@/components/shared/FanReferralNetwork';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import FanBadges from '@/components/shared/FanBadges';
import FanBadgeDisplay from '@/components/fan/FanBadgeDisplay';
import SubscriberTierBadge from '@/components/shared/SubscriberTierBadge';
import ArtistInbox from '@/components/shared/ArtistInbox';
import ReferralLeaderboard from '@/components/shared/ReferralLeaderboard';
import FanNotifications from '@/components/shared/FanNotifications';
import FanCouncilInbox from '@/components/council/FanCouncilInbox';
import ReferralGrowthChart from '@/components/shared/ReferralGrowthChart';
import FanSubscriptionsVisual from '@/components/shared/FanSubscriptionsVisual';
import LifetimeImpact from '@/components/fan/LifetimeImpact';
import ReferralPointsTracker from '@/components/shared/ReferralPointsTracker';
import FanScoutProgress from '@/components/shared/FanScoutProgress';
import ReferralMilestoneChart from '@/components/shared/ReferralMilestoneChart';
import ReferralNetworkGraph from '@/components/shared/ReferralNetworkGraph';
import FanWallet from '@/components/fan/FanWallet';
import PurchasedSongs from '@/components/fan/PurchasedSongs';
import FanSocialManager from '@/components/fan/FanSocialManager';
import ShareArtistModal from '@/components/fan/ShareArtistModal';
import SubscriptionManager from '@/components/fan/SubscriptionManager';
import MyMonthlyArtistDistribution from '@/components/shared/MyMonthlyArtistDistribution';
import TierGatedAnalytics from '@/components/shared/TierGatedAnalytics';
import OnboardingWidget from '@/components/onboarding/OnboardingWidget';
import RecentlyPlayed from '@/components/player/RecentlyPlayed';
import { fetchDefaultPlatformArtists, getDefaultArtistsNotAllocated, dismissDefaultArtist } from '@/lib/defaultArtists';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { toast } from 'sonner';

export default function FanDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: allocations = [] } = useQuery({
    queryKey: ['my-allocations'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.SupportAllocation.filter({ fan_user_id: user.id, is_active: true }, '-created_date', 50);
    },
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: defaultArtists = [] } = useQuery({
    queryKey: ['default-platform-artists'],
    queryFn: fetchDefaultPlatformArtists,
  });

  const { data: fanBadges = [] } = useQuery({
    queryKey: ['fan-badges', user?.id],
    queryFn: () => base44.entities.FanBadge.filter({ fan_user_id: user?.id }, '-earned_date', 50),
    enabled: !!user?.id,
  });

  const totalAllocated = allocations.reduce((sum, a) => sum + (a.amount || 0), 0);
  const budget = user?.monthly_budget || 12;
  const remaining = budget - totalAllocated;
  const earnedBadgeCount = fanBadges.length;

  // Default artists the fan hasn't explicitly allocated to — shown but not counted
  const unallocatedDefaults = getDefaultArtistsNotAllocated(allocations, defaultArtists);

  const handleDismissDefault = async (artistId, artistName) => {
    try {
      const dismissed = user?.dismissed_default_artist_ids || [];
      await dismissDefaultArtist(artistId, dismissed);
      toast.success(`${artistName} removed from your defaults`);
      queryClient.invalidateQueries({ queryKey: ['default-platform-artists'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
    } catch {
      toast.error('Could not remove default artist');
    }
  };

  return (
    <div className="p-4 md:p-8 pb-24 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-6">
        <OnboardingWidget />
      </div>
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-primary/10">
            <Headphones className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-display font-bold">Fan Dashboard</h1>
              <SubscriberTierBadge userId={user?.id} size="md" showLabel={true} />
            </div>
            <p className="text-xs text-muted-foreground">Your music economy at a glance</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Heart} label="Supporting" value={allocations.length} color="text-neon-magenta" />
          <StatCard icon={Wallet} label="Monthly Budget" value={`$${budget}`} color="text-neon-cyan" />
          <StatCard icon={TrendingUp} label="Allocated" value={`$${totalAllocated.toFixed(2)}`} color="text-neon-purple" />
          <StatCard icon={Award} label="Badges" value={earnedBadgeCount} color="text-neon-turquoise" />
        </div>

        {/* Recently Played — quick resume listening */}
        <div className="mb-8">
          <RecentlyPlayed />
        </div>

        {/* Subscription Management */}
        <div className="mb-8">
          <SubscriptionManager />
        </div>

        {/* Subscriptions Visual */}
        <GlassCard hover={false} className="p-5 mb-8">
          <FanSubscriptionsVisual userId={user?.id} allocations={allocations} defaultArtists={defaultArtists} />
        </GlassCard>

        {/* My Monthly Artist Distribution */}
        <MyMonthlyArtistDistribution userId={user?.id} />

        {/* Lifetime Impact Summary */}
        <div className="mb-8">
          <LifetimeImpact userId={user?.id} />
        </div>

        {/* Budget Allocation */}
        <GlassCard hover={false} className="p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-foreground">Monthly Allocation</h2>
            <span className="text-sm text-muted-foreground">${totalAllocated.toFixed(2)} / ${budget}</span>
          </div>
          <Progress value={(totalAllocated / budget) * 100} className="h-2 mb-4" />
          <div className="grid grid-cols-3 gap-4 text-center text-xs">
            <div>
              <p className="text-neon-purple font-bold text-lg">{Math.round((totalAllocated / budget) * 100)}%</p>
              <p className="text-muted-foreground">To Artists</p>
            </div>
            <div>
              <p className="text-neon-cyan font-bold text-lg">${remaining.toFixed(2)}</p>
              <p className="text-muted-foreground">Remaining</p>
            </div>
            <div>
              <p className="text-neon-turquoise font-bold text-lg">{25 - allocations.length}</p>
              <p className="text-muted-foreground">Slots Open</p>
            </div>
          </div>
        </GlassCard>

        {/* Artist Inbox */}
        <GlassCard hover={false} className="p-5 mb-8">
          <ArtistInbox
            userId={user?.id}
            artistIds={allocations.map(a => a.artist_profile_id).filter(Boolean)}
          />
        </GlassCard>

        {/* Badges */}
        <GlassCard hover={false} className="p-5 mb-8">
          <FanBadgeDisplay userId={user?.id} />
        </GlassCard>

        {/* Fan Councils */}
        <GlassCard hover={false} className="p-5 mb-8">
          <FanCouncilInbox user={user} />
        </GlassCard>

        {/* Referral Activity Notifications */}
        <GlassCard hover={false} className="p-5 mb-8">
          <FanNotifications userId={user?.id} />
        </GlassCard>

        {/* Referral Milestone Chart — Advanced+ */}
        <TierGatedAnalytics feature="referral_milestone_chart" label="Referral Milestones">
          <GlassCard hover={false} className="p-5 mb-8">
            <ReferralMilestoneChart userId={user?.id} />
          </GlassCard>
        </TierGatedAnalytics>

        {/* Referral Network Graph — Premium only */}
        <TierGatedAnalytics feature="referral_network_graph" label="Referral Network Graph">
          <GlassCard hover={false} className="p-5 mb-8">
            <ReferralNetworkGraph userId={user?.id} />
          </GlassCard>
        </TierGatedAnalytics>

        {/* Referral Growth Chart — Advanced+ */}
        <TierGatedAnalytics feature="referral_growth_chart" label="Referral Growth Chart">
          <GlassCard hover={false} className="p-5 mb-8">
            <ReferralGrowthChart userId={user?.id} />
          </GlassCard>
        </TierGatedAnalytics>

        {/* Referral Leaderboard — Advanced+ */}
        <TierGatedAnalytics feature="referral_leaderboard" label="Referral Leaderboard">
          <GlassCard hover={false} className="p-5 mb-8">
            <ReferralLeaderboard currentUserId={user?.id} />
          </GlassCard>
        </TierGatedAnalytics>

        {/* Fan Scout Progress — Advanced+ */}
        <TierGatedAnalytics feature="fan_scout_progress" label="Fan Scout Progress">
          <FanScoutProgress userId={user?.id} />
        </TierGatedAnalytics>

        {/* Purchases & Wallet */}
        <GlassCard hover={false} className="p-5 mb-8">
          <FanWallet userId={user?.id} />
        </GlassCard>

        {/* Purchased Songs */}
        <PurchasedSongs userId={user?.id} />

        {/* Referral Points Tracker — available to all tiers */}
        <ReferralPointsTracker userId={user?.id} />

        {/* Social Media Integration */}
        <GlassCard hover={false} className="p-5 mb-8">
          <FanSocialManager userId={user?.id} />
        </GlassCard>

        {/* Referral Network — Premium only */}
        <TierGatedAnalytics feature="referral_network_graph" label="Referral Network">
          <GlassCard hover={false} className="p-5 mb-8">
            <FanReferralNetwork mode="fan" fanUserId={user?.id} />
          </GlassCard>
        </TierGatedAnalytics>

        {/* Supported Artists */}
        <h2 className="font-display font-semibold text-foreground mb-4">Supported Artists</h2>
        {(allocations.length > 0 || unallocatedDefaults.length > 0) ? (
          <div className="space-y-3">
            {/* Fan's explicit allocations */}
            {allocations.map(alloc => (
              <GlassCard key={alloc.id} className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-secondary overflow-hidden flex-shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=80&q=80"
                    alt={alloc.artist_name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{alloc.artist_name}</p>
                  <NeonBadge color="purple">{alloc.tier}</NeonBadge>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-neon-cyan font-bold text-sm">${alloc.amount}/mo</p>
                  <ShareArtistModal artistName={alloc.artist_name} artistId={alloc.artist_profile_id} />
                </div>
              </GlassCard>
            ))}

            {/* Default platform artists (not counted toward slots/budget) */}
            {unallocatedDefaults.map(artist => (
              <GlassCard key={artist.id} className="p-4 flex items-center gap-3 sm:gap-4 border-primary/20">
                <div className="w-12 h-12 rounded-full bg-secondary overflow-hidden flex-shrink-0">
                  <img
                    src={artist.profile_image || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=80&q=80"}
                    alt={artist.artist_name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">{artist.artist_name}</p>
                    <NeonBadge color="cyan"><Sparkles className="w-3 h-3 mr-0.5 inline" />Default</NeonBadge>
                  </div>
                  <p className="text-xs text-muted-foreground">{artist.genre}</p>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => navigate(`/artist/${artist.id}`)}
                  >
                    Support
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDismissDefault(artist.id, artist.artist_name)}
                    title="Remove from your defaults"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </GlassCard>
            ))}
          </div>
        ) : (
          <GlassCard hover={false} className="p-8 text-center">
            <Heart className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">You're not supporting any artists yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Discover artists and direct your support where it matters.</p>
          </GlassCard>
        )}
      </motion.div>
    </div>
  );
}