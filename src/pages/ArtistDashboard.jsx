import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  DollarSign, Users, TrendingUp, Music,
  Sparkles, BarChart3, Network, AtSign,
  Upload, Disc3, Crown, MessageSquare, Calendar, ShoppingBag,
  Download, Globe, Clock, Share2, Compass, FileSpreadsheet, Gift,
  SplitSquareHorizontal, Tag, Receipt, LineChart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import StatCard from '@/components/shared/StatCard';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import ArtistHandle from '@/components/shared/ArtistHandle';
import ArtistHandleEditor from '@/components/shared/ArtistHandleEditor';
import FanNotifications from '@/components/shared/FanNotifications';
import NetworkNotifications from '@/components/shared/NetworkNotifications';

import UploadManager from '@/components/artist/UploadManager';
import ArtistEventManager from '@/components/artist/ArtistEventManager';
import DownloadsHub from '@/components/artist/DownloadsHub';
import ListeningTimeAnalytics from '@/components/artist/ListeningTimeAnalytics';
import ReferralSourceAnalytics from '@/components/artist/ReferralSourceAnalytics';

import SongCatalogManager from '@/components/catalog/SongCatalogManager';
import ReleaseManager from '@/components/catalog/ReleaseManager';

import PayoutOverview from '@/components/artist/PayoutOverview';
import EarningsReportDashboard from '@/components/artist/EarningsReportDashboard';
import RevenueBreakdownChart from '@/components/artist/RevenueBreakdownChart';
import MonthlyEarningsBreakdown from '@/components/artist/MonthlyEarningsBreakdown';
import MonthlyStatementGenerator from '@/components/artist/MonthlyStatementGenerator';
import BatchStatementDownloader from '@/components/artist/BatchStatementDownloader';
import TaxReports from '@/components/artist/TaxReports';
import PayoutCalendar from '@/components/artist/PayoutCalendar';
import ArtistPayoutHistory from '@/components/artist/ArtistPayoutHistory';
import PayoutNotificationSettings from '@/components/artist/PayoutNotificationSettings';
import ArtistPaymentSetup from '@/components/artist/ArtistPaymentSetup';

import TopSupportersLeaderboard from '@/components/artist/TopSupportersLeaderboard';
import BrandAmbassadors from '@/components/artist/BrandAmbassadors';
import EarningsBreakdown from '@/components/shared/EarningsBreakdown';
import SupporterUpdates from '@/components/artist/SupporterUpdates';
import SupportImpactDashboard from '@/components/artist/SupportImpactDashboard';

import GratitudePaymentComposer from '@/components/partner/GratitudePaymentComposer';
import ArtistGratitudeHistory from '@/components/partner/ArtistGratitudeHistory';
import MilestoneProgress from '@/components/artist/MilestoneProgress';
import ArtistComparisonView from '@/components/artist/ArtistComparisonView';

import ArtistMessageComposer from '@/components/shared/ArtistMessageComposer';
import BulkSupporterMessenger from '@/components/artist/BulkSupporterMessenger';

import ArtistProductManager from '@/components/artist/ArtistProductManager';
import RevenueSplitManager from '@/components/artist/RevenueSplitManager';
import DirectSalesManager from '@/components/artist/DirectSalesManager';
import DirectSalesHistory from '@/components/artist/DirectSalesHistory';
import PurchaseRevenueDashboard from '@/components/artist/PurchaseRevenueDashboard';

import FanGrowthTrendChart from '@/components/shared/FanGrowthTrendChart';
import ArtistGrowthOverview from '@/components/artist/ArtistGrowthOverview';
import GrowthTrendsChart from '@/components/artist/GrowthTrendsChart';
import ListenerGrowthTrend from '@/components/artist/ListenerGrowthTrend';
import ResonanceTrendChart from '@/components/artist/ResonanceTrendChart';
import ResonanceScoreTrend from '@/components/artist/ResonanceScoreTrend';
import ResonanceVsSalesChart from '@/components/artist/ResonanceVsSalesChart';
import TrackRatingsPanel from '@/components/artist/TrackRatingsPanel';
import GenreRatingsSummary from '@/components/artist/GenreRatingsSummary';

import FanbaseGeoBreakdown from '@/components/shared/FanbaseGeoBreakdown';
import FanReferralNetwork from '@/components/shared/FanReferralNetwork';
import ArtistReferralHub from '@/components/artist/ArtistReferralHub';
import ArtistReferralDashboard from '@/components/artist/ArtistReferralDashboard';
import ArtistNetworkGraph from '@/components/graph/ArtistNetworkGraph';
import ArtistCouncilManager from '@/components/council/ArtistCouncilManager';
import ArtistVerificationRequest from '@/components/artist/ArtistVerificationRequest';
import ArtistSocialLinksManager from '@/components/artist/ArtistSocialLinksManager';
import CreateArtistProfileForm from '@/components/artist/CreateArtistProfileForm';
import OnboardingWidget from '@/components/onboarding/OnboardingWidget';

const TABS = [
  { value: 'upload', label: 'Upload Manager', icon: Upload },
  { value: 'catalog', label: 'Catalog Manager', icon: Disc3 },
  { value: 'royalty', label: 'Royalty Dashboard', icon: DollarSign },
  { value: 'support', label: 'Support Dashboard', icon: Users },
  { value: 'discovery', label: 'Discovery Dashboard', icon: Compass },
  { value: 'messages', label: 'Fan Messages', icon: MessageSquare },
  { value: 'events', label: 'Event Management', icon: Calendar },
  { value: 'merch', label: 'Merchandise Manager', icon: ShoppingBag },
  { value: 'analytics', label: 'Analytics', icon: BarChart3 },
  { value: 'downloads', label: 'Downloads', icon: Download },
  { value: 'geo', label: 'Geographic Stats', icon: Globe },
  { value: 'listening', label: 'Listening Times', icon: Clock },
  { value: 'referrals', label: 'Referral Sources', icon: Share2 },
  { value: 'referral_program', label: 'Referral Program', icon: Gift },
  { value: 'revenue_splits', label: 'Revenue Splits™', icon: SplitSquareHorizontal },
  { value: 'direct_sales', label: 'Song Store', icon: Tag },
  { value: 'sales_history', label: 'Sales History', icon: Receipt },
  { value: 'revenue_insights', label: 'Revenue Insights', icon: LineChart },
];

export default function ArtistDashboard() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: artistProfile } = useQuery({
    queryKey: ['my-artist-profile', user?.id],
    queryFn: async () => {
      // First try to find a profile linked to this user
      let profiles = await base44.entities.ArtistProfile.filter({ user_id: user?.id });
      if (profiles && profiles.length > 0) return profiles[0];

      // No profile linked yet — check if admin created one with the user's email
      if (user?.email) {
        profiles = await base44.entities.ArtistProfile.filter({ artist_email: user.email });
        if (profiles && profiles.length > 0) {
          // Auto-link this profile to the current user
          await base44.entities.ArtistProfile.update(profiles[0].id, { user_id: user.id });
          return { ...profiles[0], user_id: user.id };
        }
      }

      return null;
    },
    enabled: !!user?.id,
  });

  const { data: networkNotifications = [] } = useQuery({
    queryKey: ['network-notifications', artistProfile?.id],
    queryFn: () => base44.entities.NetworkNotification.filter({
      artist_profile_id: artistProfile?.id
    }, '-created_date', 10),
    enabled: !!artistProfile?.id,
  });

  const { data: supporters = [] } = useQuery({
    queryKey: ['my-supporters', artistProfile?.id],
    queryFn: () => base44.entities.SupportAllocation.filter({ artist_profile_id: artistProfile?.id, is_active: true }, '-created_date', 200),
    enabled: !!artistProfile?.id,
  });

  const { data: songs = [] } = useQuery({
    queryKey: ['my-songs', artistProfile?.id],
    queryFn: () => base44.entities.Song.filter({ artist_profile_id: artistProfile?.id }, '-play_count', 10),
    enabled: !!artistProfile?.id,
  });

  const totalSupport = supporters.reduce((sum, s) => sum + (s.amount || 0), 0);

  if (!artistProfile) {
    return (
      <div className="p-4 md:p-8 pb-24 max-w-6xl mx-auto">
        <CreateArtistProfileForm userId={user?.id} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pb-24 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6">
          <OnboardingWidget />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-neon-purple/10">
            <BarChart3 className="w-5 h-5 text-neon-purple" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Artist Dashboard</h1>
            <p className="text-xs text-muted-foreground">{artistProfile.artist_name}</p>
            {artistProfile.artist_handle && (
              <ArtistHandle handle={artistProfile.artist_handle} size="sm" clickable={false} />
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Users} label="Active Supporters" value={supporters.length} color="text-neon-cyan" />
          <StatCard icon={DollarSign} label="Monthly Support" value={`$${totalSupport.toFixed(2)}`} color="text-neon-purple" />
          <StatCard icon={Sparkles} label="Resonance Score" value={artistProfile.resonance_score || 0} color="text-neon-magenta" />
          <StatCard icon={Music} label="Total Songs" value={songs.length} color="text-neon-turquoise" />
        </div>

        {/* Growth Overview — at-a-glance charts */}
        <div className="mb-6">
          <ArtistGrowthOverview artistProfileId={artistProfile.id} supporters={supporters} />
        </div>

        {/* Combined Growth Trends — Resonance Score + Fan Network */}
        <div className="mb-6">
          <GrowthTrendsChart
            artistProfileId={artistProfile.id}
            supporters={supporters}
            resonanceScore={artistProfile.resonance_score || 0}
          />
        </div>

        {/* Resonance Score Trend — 6-month community engagement trajectory */}
        <div className="mb-6">
          <ResonanceScoreTrend
            artistProfileId={artistProfile.id}
            currentResonanceScore={artistProfile.resonance_score || 0}
          />
        </div>

        {/* Resonance vs. Song Sales — monthly comparison */}
        <div className="mb-6">
          <ResonanceVsSalesChart
            artistProfileId={artistProfile.id}
            currentResonanceScore={artistProfile.resonance_score || 0}
          />
        </div>

        {/* Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <GlassCard hover={false} className="p-4">
            <FanNotifications userId={user?.id} />
          </GlassCard>
          <GlassCard hover={false} className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Network className="w-5 h-5 text-neon-cyan" />
              <h3 className="font-display font-semibold">Network Endorsements</h3>
              {networkNotifications.length > 0 && (
                <NeonBadge color="cyan">{networkNotifications.filter(n => !n.is_read).length} new</NeonBadge>
              )}
            </div>
            <NetworkNotifications artistProfileId={artistProfile?.id} />
          </GlassCard>
        </div>

        {/* Profile Settings: Handle + Verification + Social Links */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <GlassCard hover={false} className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AtSign className="w-4 h-4 text-neon-cyan" />
              <h3 className="font-display font-semibold text-sm">Artist Handle</h3>
            </div>
            <ArtistHandleEditor artist={artistProfile} />
          </GlassCard>
          <GlassCard hover={false} className="p-4">
            <ArtistVerificationRequest artistProfile={artistProfile} userId={user.id} />
          </GlassCard>
          <GlassCard hover={false} className="p-4">
            <ArtistSocialLinksManager artistProfileId={artistProfile.id} artistName={artistProfile.artist_name} />
          </GlassCard>
        </div>

        {/* Tabbed Dashboard */}
        <Tabs defaultValue="upload" className="w-full">
          <div className="overflow-x-auto pb-2 -mx-1 px-1">
            <TabsList className="inline-flex h-auto gap-1 bg-secondary/30 p-1.5 rounded-xl">
              {TABS.map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Upload Manager */}
          <TabsContent value="upload" className="mt-6">
            <UploadManager artistProfile={artistProfile} />
          </TabsContent>

          {/* Catalog Manager */}
          <TabsContent value="catalog" className="mt-6 space-y-6">
            <SongCatalogManager artistProfile={artistProfile} />
            <ReleaseManager artistProfile={artistProfile} />
          </TabsContent>

          {/* Direct Sales — catalog access settings + per-song purchase toggles */}
          <TabsContent value="direct_sales" className="mt-6">
            <DirectSalesManager artistProfile={artistProfile} />
          </TabsContent>

          {/* Direct Sales History — who bought which song and when */}
          <TabsContent value="sales_history" className="mt-6">
            <DirectSalesHistory artistProfile={artistProfile} />
          </TabsContent>

          {/* Revenue Insights — daily & monthly revenue + top tracks */}
          <TabsContent value="revenue_insights" className="mt-6">
            <PurchaseRevenueDashboard artistProfileId={artistProfile.id} />
          </TabsContent>

          {/* Royalty Dashboard */}
          <TabsContent value="royalty" className="mt-6 space-y-6">
            <PayoutOverview artistProfileId={artistProfile.id} userId={user.id} />
            <GlassCard hover={false} className="p-5">
              <EarningsReportDashboard artistProfileId={artistProfile.id} userId={user.id} />
            </GlassCard>
            <GlassCard hover={false} className="p-5">
              <RevenueBreakdownChart artistProfileId={artistProfile.id} />
            </GlassCard>
            <GlassCard hover={false} className="p-5">
              <MonthlyEarningsBreakdown artistProfileId={artistProfile.id} />
            </GlassCard>
            <MonthlyStatementGenerator artistProfile={artistProfile} user={user} />
            <BatchStatementDownloader artistProfile={artistProfile} user={user} />
            <GlassCard hover={false} className="p-5">
              <TaxReports artistProfileId={artistProfile.id} userId={user.id} />
            </GlassCard>
            <GlassCard hover={false} className="p-5">
              <PayoutCalendar artistProfileId={artistProfile.id} userId={user.id} />
            </GlassCard>
            <GlassCard hover={false} className="p-5">
              <ArtistPayoutHistory artistProfileId={artistProfile.id} userId={user.id} />
            </GlassCard>
            <GlassCard hover={false} className="p-5">
              <PayoutNotificationSettings artistProfileId={artistProfile.id} userId={user.id} />
            </GlassCard>
            <GlassCard hover={false} className="p-5">
              <ArtistPaymentSetup artistProfileId={artistProfile.id} userId={user.id} />
            </GlassCard>
          </TabsContent>

          {/* Support Dashboard */}
          <TabsContent value="support" className="mt-6 space-y-6">
            <SupportImpactDashboard artistProfileId={artistProfile.id} supporters={supporters} />
            <TopSupportersLeaderboard artistProfileId={artistProfile.id} artistName={artistProfile.artist_name} />
            <BrandAmbassadors artistProfileId={artistProfile.id} artistName={artistProfile.artist_name} />
            <GlassCard hover={false} className="p-5">
              <EarningsBreakdown supporters={supporters} />
            </GlassCard>
            <GlassCard hover={false} className="p-5">
              <SupporterUpdates artistProfileId={artistProfile.id} userId={user.id} />
            </GlassCard>
          </TabsContent>

          {/* Discovery Dashboard */}
          <TabsContent value="discovery" className="mt-6 space-y-6">
            <MilestoneProgress artistProfile={artistProfile} />
            <GlassCard hover={false} className="p-5">
              <ArtistComparisonView currentArtistProfile={artistProfile} />
            </GlassCard>
            <GlassCard hover={false} className="p-5">
              <ArtistGratitudeHistory artistProfileId={artistProfile.id} />
            </GlassCard>
            <GlassCard hover={false} className="p-5">
              <div className="text-center space-y-4">
                <div>
                  <h3 className="font-display font-semibold text-foreground mb-1">Thank Your Discovery Partner</h3>
                  <p className="text-sm text-muted-foreground">
                    Show gratitude for helping you reach milestones with a direct payment
                  </p>
                </div>
                <GratitudePaymentComposer artistProfile={artistProfile} />
              </div>
            </GlassCard>
            <GlassCard hover={false} className="p-5">
              <ArtistCouncilManager artistProfile={artistProfile} supporters={supporters} />
            </GlassCard>
            <GlassCard hover={false} className="p-5">
              <ArtistNetworkGraph artistProfile={artistProfile} />
            </GlassCard>
          </TabsContent>

          {/* Fan Messages */}
          <TabsContent value="messages" className="mt-6 space-y-6">
            <GlassCard hover={false} className="p-5">
              <ArtistMessageComposer artistProfile={artistProfile} supporterCount={supporters.length} />
            </GlassCard>
            <GlassCard hover={false} className="p-5">
              <BulkSupporterMessenger
                artistProfileId={artistProfile.id}
                artistName={artistProfile.artist_name}
                supporters={supporters}
              />
            </GlassCard>
          </TabsContent>

          {/* Event Management */}
          <TabsContent value="events" className="mt-6">
            <ArtistEventManager artistProfile={artistProfile} />
          </TabsContent>

          {/* Merchandise Manager */}
          <TabsContent value="merch" className="mt-6">
            <GlassCard hover={false} className="p-5">
              <ArtistProductManager artistProfileId={artistProfile.id} artistName={artistProfile.artist_name} />
            </GlassCard>
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="mt-6 space-y-6">
            <FanGrowthTrendChart artistProfileId={artistProfile.id} />
            <GlassCard hover={false} className="p-5">
              <ListenerGrowthTrend artistProfileId={artistProfile.id} />
            </GlassCard>
            <ResonanceTrendChart artistProfileId={artistProfile.id} />
            <TrackRatingsPanel artistProfileId={artistProfile.id} />
            <GenreRatingsSummary artistProfileId={artistProfile.id} />
          </TabsContent>

          {/* Downloads */}
          <TabsContent value="downloads" className="mt-6">
            <DownloadsHub artistProfile={artistProfile} user={user} supporters={supporters} />
          </TabsContent>

          {/* Geographic Stats */}
          <TabsContent value="geo" className="mt-6">
            <GlassCard hover={false} className="p-5">
              <FanbaseGeoBreakdown artistProfileId={artistProfile.id} supporters={supporters} />
            </GlassCard>
          </TabsContent>

          {/* Listening Times */}
          <TabsContent value="listening" className="mt-6">
            <ListeningTimeAnalytics artistProfileId={artistProfile.id} />
          </TabsContent>

          {/* Referral Sources */}
          <TabsContent value="referrals" className="mt-6 space-y-6">
            <ReferralSourceAnalytics artistProfileId={artistProfile.id} />
            <GlassCard hover={false} className="p-5">
              <FanReferralNetwork mode="artist" artistProfileId={artistProfile.id} />
            </GlassCard>
          </TabsContent>

          {/* Referral Program */}
          <TabsContent value="referral_program" className="mt-6 space-y-6">
            <ArtistReferralHub artistProfile={artistProfile} user={user} />
            <GlassCard hover={false} className="p-5">
              <ArtistReferralDashboard artistProfileId={artistProfile.id} artistName={artistProfile.artist_name} />
            </GlassCard>
          </TabsContent>

          {/* Revenue Splits™ */}
          <TabsContent value="revenue_splits" className="mt-6">
            <RevenueSplitManager artistProfile={artistProfile} user={user} />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}