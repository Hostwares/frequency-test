import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Music, Radio, Wallet, MessageSquare, Calendar, BarChart3, Image, Megaphone, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import CommunityVotePanel from '@/components/community/CommunityVotePanel';
import CommunityLeaderboard from '@/components/community/CommunityLeaderboard';
import CommunityMilestones from '@/components/community/CommunityMilestones';
import FrequencyHealthMetrics from '@/components/community/FrequencyHealthMetrics';
import CommunityChat from '@/components/community/CommunityChat';
import CommunityPolls from '@/components/community/CommunityPolls';
import CommunityCalendar from '@/components/community/CommunityCalendar';
import CommunityGallery from '@/components/community/CommunityGallery';
import CommunityAnnouncements from '@/components/community/CommunityAnnouncements';
import CommunityModeration from '@/components/community/CommunityModeration';

const TABS = [
  { id: 'overview',       label: 'Overview',       icon: Radio },
  { id: 'chat',           label: 'Chat',           icon: MessageSquare },
  { id: 'events',         label: 'Events',         icon: Calendar },
  { id: 'polls',          label: 'Polls',          icon: BarChart3 },
  { id: 'gallery',        label: 'Gallery',        icon: Image },
  { id: 'announcements',  label: 'News',           icon: Megaphone },
  { id: 'moderation',     label: 'Moderation',     icon: Shield },
];

export default function FrequencyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: community, isLoading } = useQuery({
    queryKey: ['community', id],
    queryFn: () => base44.entities.FrequencyCommunity.filter({ id }),
    select: (data) => data[0],
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="h-48 bg-secondary/30 rounded-2xl animate-pulse mb-6" />
        <div className="h-6 w-48 bg-secondary/30 rounded animate-pulse mb-3" />
        <div className="h-4 w-72 bg-secondary/20 rounded animate-pulse" />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <Radio className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground">Community not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/frequencies')}>← Back</Button>
      </div>
    );
  }

  const isManager = community.manager_user_id === user?.id;

  return (
    <div className="p-4 md:p-8 pb-24 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

        {/* Back */}
        <button
          onClick={() => navigate('/frequencies')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Frequencies
        </button>

        {/* Hero */}
        <div className="relative h-48 md:h-64 rounded-2xl overflow-hidden">
          <img
            src={community.cover_image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80'}
            alt={community.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="absolute bottom-4 left-5 right-5">
            <div className="flex items-center gap-2 mb-1">
              {community.genre && <NeonBadge color="cyan">{community.genre}</NeonBadge>}
              {community.is_active && <NeonBadge color="turquoise">Active</NeonBadge>}
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white">{community.name}</h1>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Users, label: 'Members', value: community.member_count || 0, color: 'text-neon-cyan' },
            { icon: Music, label: 'Artists', value: community.artist_count || 0, color: 'text-neon-purple' },
            { icon: Wallet, label: 'Community Fund', value: `$${community.community_fund || 0}`, color: 'text-neon-turquoise' },
          ].map(({ icon: Icon, label, value, color }) => (
            <GlassCard key={label} hover={false} className="p-3 text-center">
              <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
              <p className={`text-lg font-bold ${color}`}>{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </GlassCard>
          ))}
        </div>

        {/* Description */}
        {community.description && (
          <GlassCard hover={false} className="p-4">
            <p className="text-sm text-muted-foreground leading-relaxed">{community.description}</p>
          </GlassCard>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary/30 rounded-xl p-1 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const showMod = tab.id !== 'moderation' || isManager;
            if (!showMod) return null;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <GlassCard hover={false} className="p-5">
                <CommunityVotePanel community={community} currentUser={user} />
              </GlassCard>
              <FrequencyHealthMetrics communityId={community.id} community={community} />
              <CommunityMilestones communityId={community.id} />
              <CommunityLeaderboard communityId={community.id} />
            </div>
          )}
          {activeTab === 'chat' && (
            <GlassCard hover={false} className="p-4">
              <CommunityChat community={community} currentUser={user} />
            </GlassCard>
          )}
          {activeTab === 'events' && (
            <CommunityCalendar community={community} currentUser={user} />
          )}
          {activeTab === 'polls' && (
            <CommunityPolls community={community} currentUser={user} />
          )}
          {activeTab === 'gallery' && (
            <CommunityGallery community={community} currentUser={user} />
          )}
          {activeTab === 'announcements' && (
            <CommunityAnnouncements community={community} currentUser={user} />
          )}
          {activeTab === 'moderation' && isManager && (
            <CommunityModeration community={community} currentUser={user} />
          )}
        </motion.div>

      </motion.div>
    </div>
  );
}