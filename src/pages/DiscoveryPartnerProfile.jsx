import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass, Star, Users, ShieldCheck, Globe, MapPin,
  BarChart3, Send, PenLine, CheckCircle2, Headphones,
  Music, Share2, ExternalLink, Target, TrendingUp
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import DiscoveryPartnerBadge from '@/components/shared/DiscoveryPartnerBadge';
import VerifiedPartnerBadge from '@/components/shared/VerifiedPartnerBadge';
import { Button } from '@/components/ui/button';
import GratitudePaymentComposer from '@/components/partner/GratitudePaymentComposer';
import UserActionsMenu from '@/components/shared/UserActionsMenu';
import PartnerFollowButton from '@/components/partner/PartnerFollowButton';
import PartnerFollowers from '@/components/partner/PartnerFollowers';
import FeaturedArtists from '@/components/partner/FeaturedArtists';
import RecommendationHistory from '@/components/partner/RecommendationHistory';
import ArtistSpotlightShowcase from '@/components/partner/ArtistSpotlightShowcase';

const PARTNER_TYPE_LABELS = {
  music_blog: 'Music Blog', independent_curator: 'Independent Curator',
  influencer: 'Influencer', radio_host: 'Radio Host', podcast_host: 'Podcast Host',
  music_reviewer: 'Music Reviewer', veteran_organization: 'Veteran Organization',
  festival_organizer: 'Festival Organizer', college_music_program: 'College Music Program',
  local_music_organization: 'Local Music Organization', music_journalist: 'Music Journalist',
  community_music_leader: 'Community Music Leader', other: 'Other',
};



function PlaylistCard({ playlist }) {
  const navigate = useNavigate();
  const songCount = playlist.song_ids?.length || 0;
  return (
    <GlassCard className="p-4" onClick={() => navigate('/playlists')}>
      <div className="flex items-center gap-3">
        {playlist.cover_image
          ? <img src={playlist.cover_image} alt={playlist.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
          : <div className="w-12 h-12 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center flex-shrink-0">
              <Headphones className="w-5 h-5 text-neon-cyan" />
            </div>
        }
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{playlist.name}</p>
          {playlist.description && <p className="text-xs text-muted-foreground line-clamp-1">{playlist.description}</p>}
          <NeonBadge color="cyan" className="mt-1">{songCount} track{songCount !== 1 ? 's' : ''}</NeonBadge>
        </div>
        <ExternalLink className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
      </div>
    </GlassCard>
  );
}

export default function DiscoveryPartnerProfile() {
  const { id } = useParams();
  const [activeSection, setActiveSection] = useState('spotlights');
  const [copied, setCopied] = useState(false);

  const discoveryScore = Math.round(
    ((partner?.scout_score || 0) + (partner?.reputation_score || 0)) / 2
  );

  const { data: partner, isLoading } = useQuery({
    queryKey: ['dp-profile', id],
    queryFn: () => base44.entities.DiscoveryPartner.filter({ id }),
    select: d => d?.[0],
  });

  const { data: spotlights = [] } = useQuery({
    queryKey: ['dp-spotlights-public', id],
    queryFn: () => base44.entities.ArtistSpotlight.filter({ discovery_partner_id: id, is_published: true }),
    enabled: !!id,
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: playlists = [] } = useQuery({
    queryKey: ['dp-playlists-public', partner?.user_id],
    queryFn: () => base44.entities.Playlist.filter({ owner_user_id: partner?.user_id, type: 'community' }),
    enabled: !!partner?.user_id,
  });

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 pb-24 max-w-4xl mx-auto space-y-4">
        <div className="h-40 bg-secondary/20 rounded-xl animate-pulse" />
        <div className="h-24 bg-secondary/20 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="p-8 text-center">
        <Compass className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">Discovery Partner not found.</p>
      </div>
    );
  }

  const isOwner = user?.id && partner.user_id === user.id;

  return (
    <div className="p-4 md:p-8 pb-24 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

        {/* Cover + header */}
        <div className="relative mb-6">
          {partner.cover_image
            ? <img src={partner.cover_image} alt="" className="w-full h-44 object-cover rounded-xl" />
            : <div className="w-full h-44 rounded-xl bg-gradient-to-br from-neon-cyan/20 via-neon-purple/10 to-transparent border border-border/30" />
          }
          <div className="flex items-end justify-between gap-4 px-2 -mt-10 relative z-10">
            <div className="flex items-end gap-3">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-card border-2 border-neon-cyan/30 flex-shrink-0 shadow-xl">
                {partner.profile_image
                  ? <img src={partner.profile_image} alt={partner.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><Compass className="w-8 h-8 text-neon-cyan" /></div>}
              </div>
              <div className="pb-1">
                <h1 className="text-xl font-display font-bold mb-1">{partner.name}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <NeonBadge color="cyan">{PARTNER_TYPE_LABELS[partner.partner_type] || 'Discovery Partner'}</NeonBadge>
                  <VerifiedPartnerBadge partner={partner} size="sm" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pb-1 items-center flex-wrap">
              {user?.id && !isOwner && (
                <PartnerFollowButton partnerId={partner.id} userId={user.id} followerCount={partner.follower_count || 0} />
              )}
              <Button size="sm" variant="outline" onClick={handleShare}
                className="h-8 gap-1.5 border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10">
                <Share2 className="w-3.5 h-3.5" />
                {copied ? 'Copied!' : 'Share'}
              </Button>
              <GratitudePaymentComposer discoveryPartner={partner} />
              {partner.user_id && (
                <UserActionsMenu targetUserId={partner.user_id} targetUserName={partner.name} />
              )}
            </div>
          </div>
        </div>

        {/* Discovery Score Hero */}
        <GlassCard hover={false} className="p-5 mb-5 border-neon-purple/20 bg-gradient-to-r from-neon-purple/8 via-neon-cyan/5 to-transparent">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-neon-purple/15 border-2 border-neon-purple/30 flex items-center justify-center flex-shrink-0">
                <Target className="w-7 h-7 text-neon-purple" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Discovery Score</p>
                <p className="text-3xl font-display font-bold text-neon-purple">{discoveryScore}</p>
                <p className="text-[10px] text-muted-foreground">Combined scout & reputation</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-right">
              <div>
                <p className="text-[10px] text-muted-foreground">Success Rate</p>
                <p className="text-lg font-display font-bold text-neon-turquoise flex items-center gap-1 justify-end">
                  <TrendingUp className="w-3.5 h-3.5" />{partner.discovery_success_rate || 0}%
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Artists Found</p>
                <p className="text-lg font-display font-bold text-neon-cyan">{partner.artists_discovered || 0}</p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { icon: Star,      label: 'Reputation',   value: partner.reputation_score || 0,             color: 'text-neon-magenta' },
            { icon: Compass,   label: 'Discovered',   value: partner.artists_discovered || 0,           color: 'text-neon-cyan' },
            { icon: BarChart3, label: 'Success Rate', value: `${partner.discovery_success_rate || 0}%`, color: 'text-neon-purple' },
            { icon: Users,     label: 'Followers',    value: partner.follower_count || 0,               color: 'text-neon-blue' },
          ].map(({ icon: Icon, label, value, color }) => (
            <GlassCard key={label} hover={false} className="p-3 text-center">
              <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
              <p className={`text-lg font-display font-bold ${color}`}>{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </GlassCard>
          ))}
        </div>

        {/* About */}
        {(partner.description || partner.location || partner.website) && (
          <GlassCard hover={false} className="p-5 mb-5">
            <div className="mb-3">
              <DiscoveryPartnerBadge partner={partner} size="md" />
            </div>
            {partner.description && (
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">{partner.description}</p>
            )}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              {partner.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{partner.location}</span>}
              {partner.website && (
                <a href={partner.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-neon-cyan hover:underline">
                  <Globe className="w-3 h-3" />{partner.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
            {partner.genres_covered?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/30">
                {partner.genres_covered.map(g => <NeonBadge key={g} color="cyan">{g}</NeonBadge>)}
              </div>
            )}
          </GlassCard>
        )}

        {/* Featured Artists */}
        <FeaturedArtists partnerId={partner.id} />

        {/* Section tabs */}
        <div className="flex gap-1 bg-secondary/30 rounded-xl p-1 mb-6">
          {[
            { id: 'spotlights', label: 'Spotlights', icon: PenLine,   count: spotlights.length },
            { id: 'history',    label: 'History',    icon: Compass,   count: null },
            { id: 'playlists',  label: 'Playlists',  icon: Headphones, count: playlists.length },
            { id: 'followers',  label: 'Followers',  icon: Users,     count: partner.follower_count || 0 },
            { id: 'metrics',    label: 'Metrics',    icon: BarChart3,  count: null },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveSection(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
                  ${activeSection === tab.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.count !== null && tab.count > 0 && (
                  <span className="text-[10px] text-muted-foreground">({tab.count})</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Spotlights section */}
        {activeSection === 'spotlights' && (
          <AnimatePresence mode="wait">
            <motion.div key="spotlights" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {spotlights.length === 0 ? (
                <GlassCard hover={false} className="p-10 text-center">
                  <PenLine className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No spotlights published yet.</p>
                </GlassCard>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {spotlights.map((s, i) => (
                    <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <ArtistSpotlightShowcase spotlight={s} />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Playlists section */}
        {activeSection === 'playlists' && (
          <AnimatePresence mode="wait">
            <motion.div key="playlists" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {playlists.length === 0 ? (
                <GlassCard hover={false} className="p-10 text-center">
                  <Headphones className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No curated playlists yet.</p>
                </GlassCard>
              ) : (
                <div className="space-y-3">
                  {playlists.map((p, i) => (
                    <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <PlaylistCard playlist={p} />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Recommendation History section */}
        {activeSection === 'history' && (
          <AnimatePresence mode="wait">
            <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <RecommendationHistory partnerId={partner.id} userId={partner.user_id} />
            </motion.div>
          </AnimatePresence>
        )}

        {/* Followers section */}
        {activeSection === 'followers' && (
          <AnimatePresence mode="wait">
            <motion.div key="followers" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <PartnerFollowers partnerId={partner.id} />
            </motion.div>
          </AnimatePresence>
        )}

        {/* Metrics section */}
        {activeSection === 'metrics' && (
          <AnimatePresence mode="wait">
            <motion.div key="metrics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <GlassCard hover={false} className="p-5">
                <h2 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-neon-purple" /> Discovery Record
                </h2>
                <div className="space-y-3">
                  {[
                    { label: 'Discovery Score',      value: discoveryScore,                       icon: Target,       color: 'text-neon-purple' },
                    { label: 'Success Rate',         value: `${partner.discovery_success_rate || 0}%`, icon: TrendingUp, color: 'text-neon-turquoise' },
                    { label: 'Artists Discovered',   value: partner.artists_discovered || 0,     icon: Compass,      color: 'text-neon-cyan' },
                    { label: 'Artists Supported',    value: partner.artists_supported  || 0,     icon: CheckCircle2, color: 'text-neon-turquoise' },
                    { label: 'Community Endorsements', value: partner.community_endorsements || 0, icon: Users,   color: 'text-neon-blue' },
                    { label: 'Scout Score',          value: partner.scout_score || 0,            icon: Star,         color: 'text-neon-magenta' },
                    { label: 'Reputation Score',     value: partner.reputation_score || 0,       icon: BarChart3,    color: 'text-neon-purple' },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Icon className={`w-3.5 h-3.5 ${color}`} />{label}
                      </span>
                      <span className={`font-display font-bold text-sm ${color}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard hover={false} className="p-4 border-neon-cyan/15 bg-gradient-to-r from-neon-cyan/5 to-transparent">
                <p className="text-[11px] text-neon-cyan font-semibold mb-1">How reputation is earned</p>
                <p className="text-xs text-muted-foreground">
                  Reputation reflects real outcomes — artist growth, community retention, and peer endorsements. It cannot be purchased or gamed. Every metric here represents trust earned over time.
                </p>
              </GlassCard>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Submit CTA (non-owners only) */}
        {!isOwner && (
          <GlassCard hover={false} className="p-5 mt-6 text-center border-neon-purple/20 bg-gradient-to-r from-neon-purple/5 to-transparent">
            <Send className="w-5 h-5 text-neon-purple mx-auto mb-2" />
            <p className="text-sm font-display font-semibold mb-1">Submit Your Music</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Submit your artist profile for consideration. Discovery is earned through quality — no placement is ever paid for.
            </p>
            <NeonBadge color="purple" className="mt-2">No paid placements</NeonBadge>
          </GlassCard>
        )}

      </motion.div>
    </div>
  );
}