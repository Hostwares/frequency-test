import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import {
  Compass, Star, Users, BarChart3, ShieldCheck, Sparkles,
  Send, PenLine, Headphones, User, ExternalLink, BarChart2, Target, TrendingUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import VerifiedPartnerBadge from '@/components/shared/VerifiedPartnerBadge';
import SubmissionsTab from '@/components/discovery/SubmissionsTab';
import SpotlightsTab from '@/components/discovery/SpotlightsTab';
import CuratedPlaylistsTab from '@/components/discovery/CuratedPlaylistsTab';
import ProfileSetupTab from '@/components/discovery/ProfileSetupTab';
import AnalyticsTab from '@/components/discovery/AnalyticsTab';

const PARTNER_TYPE_LABELS = {
  music_blog: 'Music Blog', independent_curator: 'Independent Curator',
  influencer: 'Influencer', radio_host: 'Radio Host', podcast_host: 'Podcast Host',
  music_reviewer: 'Music Reviewer', veteran_organization: 'Veteran Organization',
  festival_organizer: 'Festival Organizer', college_music_program: 'College Music Program',
  local_music_organization: 'Local Music Organization', music_journalist: 'Music Journalist',
  community_music_leader: 'Community Music Leader', other: 'Other',
};

const TABS = [
  { id: 'submissions', label: 'Submissions', icon: Send },
  { id: 'spotlights',  label: 'Spotlights',  icon: PenLine },
  { id: 'playlists',   label: 'Playlists',   icon: Headphones },
  { id: 'analytics',   label: 'Analytics',   icon: BarChart2 },
  { id: 'profile',     label: 'Profile',     icon: User },
];

export default function DiscoveryPartnerDashboard() {
  const [activeTab, setActiveTab] = useState('submissions');
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: partnerProfile } = useQuery({
    queryKey: ['my-dp-profile', user?.id],
    queryFn: () => base44.entities.DiscoveryPartner.filter({ user_id: user?.id }),
    enabled: !!user?.id,
    select: d => d?.[0],
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['dp-submissions', partnerProfile?.id],
    queryFn: () => base44.entities.ArtistSubmission.filter({ discovery_partner_id: partnerProfile?.id }, '-created_date', 50),
    enabled: !!partnerProfile?.id,
  });

  const { data: spotlights = [] } = useQuery({
    queryKey: ['dp-spotlights', partnerProfile?.id],
    queryFn: () => base44.entities.ArtistSpotlight.filter({ discovery_partner_id: partnerProfile?.id }, '-created_date', 50),
    enabled: !!partnerProfile?.id,
  });

  const pendingCount = submissions.filter(s => s.status === 'pending').length;

  if (!partnerProfile && user) {
    return (
      <div className="p-4 md:p-8 pb-24 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-neon-cyan/10"><Compass className="w-5 h-5 text-neon-cyan" /></div>
          <h1 className="text-2xl font-display font-bold">Discovery Dashboard</h1>
        </div>
        <ProfileSetupTab profile={null} userId={user.id} />
      </div>
    );
  }

  if (!partnerProfile) return null;

  return (
    <div className="p-4 md:p-8 pb-24 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-neon-cyan/10">
            <Compass className="w-5 h-5 text-neon-cyan" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-display font-bold">{partnerProfile.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className="text-xs text-muted-foreground">{PARTNER_TYPE_LABELS[partnerProfile.partner_type] || 'Discovery Partner'}</p>
              <VerifiedPartnerBadge partner={partnerProfile} size="sm" showAllStates={true} />
            </div>
          </div>
          <button onClick={() => navigate(`/discovery-partner/${partnerProfile.id}`)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-neon-cyan transition-colors flex-shrink-0">
            <ExternalLink className="w-3.5 h-3.5" /> Public profile
          </button>
        </div>

        {/* Discovery Score Hero */}
        <GlassCard hover={false} className="p-5 mb-6 border-neon-purple/20 bg-gradient-to-r from-neon-purple/8 via-neon-cyan/5 to-transparent">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-neon-purple/15 border-2 border-neon-purple/30 flex items-center justify-center flex-shrink-0">
                <Target className="w-7 h-7 text-neon-purple" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Discovery Score</p>
                <p className="text-3xl font-display font-bold text-neon-purple">
                  {Math.round(((partnerProfile.scout_score || 0) + (partnerProfile.reputation_score || 0)) / 2)}
                </p>
                <p className="text-[10px] text-muted-foreground">Combined scout & reputation</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-right">
              <div>
                <p className="text-[10px] text-muted-foreground">Success Rate</p>
                <p className="text-lg font-display font-bold text-neon-turquoise flex items-center gap-1 justify-end">
                  <TrendingUp className="w-3.5 h-3.5" />{partnerProfile.discovery_success_rate || 0}%
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Artists Found</p>
                <p className="text-lg font-display font-bold text-neon-cyan">{partnerProfile.artists_discovered || 0}</p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Star,      label: 'Reputation',       value: partnerProfile.reputation_score || 0,           color: 'text-neon-magenta' },
            { icon: Compass,   label: 'Discovered',       value: partnerProfile.artists_discovered || 0,         color: 'text-neon-cyan' },
            { icon: BarChart3, label: 'Success Rate',     value: `${partnerProfile.discovery_success_rate || 0}%`, color: 'text-neon-purple' },
            { icon: Users,     label: 'Followers',        value: partnerProfile.follower_count || 0,             color: 'text-neon-blue' },
          ].map(({ icon: Icon, label, value, color }) => (
            <GlassCard key={label} hover={false} className="p-3 text-center">
              <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
              <p className={`text-lg font-display font-bold ${color}`}>{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </GlassCard>
          ))}
        </div>

        {/* Philosophy banner */}
        <div className="flex items-start gap-3 bg-gradient-to-r from-neon-cyan/8 to-transparent border border-neon-cyan/15 rounded-xl p-3 mb-6">
          <Sparkles className="w-4 h-4 text-neon-cyan mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-neon-cyan">Trust → Exposure.</span>{' '}
            Discovery is earned through genuine curation and community trust — never purchased. Your reputation reflects outcomes, not spending.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-secondary/30 rounded-xl p-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const badge = tab.id === 'submissions' && pendingCount > 0 ? pendingCount : null;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all relative
                  ${activeTab === tab.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {badge && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-neon-magenta rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'submissions' && (
          <SubmissionsTab submissions={submissions} partnerId={partnerProfile.id} />
        )}
        {activeTab === 'spotlights' && (
          <SpotlightsTab spotlights={spotlights} partnerId={partnerProfile.id} />
        )}
        {activeTab === 'playlists' && (
          <CuratedPlaylistsTab userId={user?.id} />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsTab partnerId={partnerProfile.id} userId={user?.id} />
        )}
        {activeTab === 'profile' && (
          <ProfileSetupTab profile={partnerProfile} userId={user?.id} />
        )}

      </motion.div>
    </div>
  );
}