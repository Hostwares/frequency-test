import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import {
  Trophy, Users, TrendingUp, Star, Crown, Medal,
  Sparkles, Gift, Mail, ExternalLink, ChevronRight,
  UserPlus, DollarSign, Calendar, Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { toast } from 'sonner';

const TIER_ICONS = {
  basic: UserPlus,
  supporter: Star,
  champion: Medal,
  patron: Crown,
};

const TIER_COLORS = {
  basic: 'text-muted-foreground',
  supporter: 'text-neon-blue',
  champion: 'text-neon-purple',
  patron: 'text-neon-magenta',
};

function AmbassadorCard({ ambassador, rank, artistProfileId, onMessage }) {
  const TierIcon = TIER_ICONS[ambassador.tier] || UserPlus;
  const tierColor = TIER_COLORS[ambassador.tier] || 'text-muted-foreground';

  const handleRewardClick = () => {
    toast.success(`Reward options for ${ambassador.display_name || 'Top Fan'} coming soon!`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.05 }}
      className="rounded-xl border border-border/30 bg-secondary/10 p-4 hover:border-neon-purple/40 hover:bg-neon-purple/5 transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Rank Badge */}
          <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center text-lg font-bold flex-shrink-0 ${
            rank === 0 ? 'border-yellow-400/60 bg-yellow-400/10 text-yellow-400' :
            rank === 1 ? 'border-slate-300/50 bg-slate-300/10 text-slate-300' :
            rank === 2 ? 'border-amber-600/50 bg-amber-600/10 text-amber-500' :
            'border-border/30 bg-secondary/30 text-muted-foreground'
          }`}>
            {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `#${rank + 1}`}
          </div>

          {/* Fan Info */}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">
                {ambassador.display_name || `Ambassador #${rank + 1}`}
              </h3>
              {rank < 3 && <Sparkles className="w-3 h-3 text-yellow-400" />}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <TierIcon className={`w-3 h-3 ${tierColor}`} />
              <span className="text-[10px] text-muted-foreground capitalize">{ambassador.tier || 'Basic'} Fan</span>
              <span className="text-[10px] text-muted-foreground">•</span>
              <span className="text-[10px] text-muted-foreground">
                Joined {new Date(ambassador.first_referral_date).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Total Impact Badge */}
        <NeonBadge color="cyan">
          <DollarSign className="w-3 h-3 mr-1" />
          ${ambassador.total_support.toFixed(2)}/mo
        </NeonBadge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-secondary/20 border border-border/30">
          <Users className="w-4 h-4 text-neon-cyan mb-1" />
          <p className="text-lg font-bold text-neon-cyan">{ambassador.referral_count}</p>
          <p className="text-[10px] text-muted-foreground">Fans Referred</p>
        </div>
        <div className="p-3 rounded-lg bg-secondary/20 border border-border/30">
          <TrendingUp className="w-4 h-4 text-neon-purple mb-1" />
          <p className="text-lg font-bold text-neon-purple">{ambassador.growth_rate}%</p>
          <p className="text-[10px] text-muted-foreground">Growth Rate</p>
        </div>
        <div className="p-3 rounded-lg bg-secondary/20 border border-border/30">
          <Award className="w-4 h-4 text-neon-magenta mb-1" />
          <p className="text-lg font-bold text-neon-magenta">{ambassador.badges || 0}</p>
          <p className="text-[10px] text-muted-foreground">Badges Earned</p>
        </div>
      </div>

      {/* Recent Referrals */}
      {ambassador.recent_referrals && ambassador.recent_referrals.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground font-medium mb-2">Recent Referrals</p>
          <div className="space-y-1">
            {ambassador.recent_referrals.slice(0, 3).map((ref, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-secondary/10">
                <span className="text-muted-foreground">New fan</span>
                <NeonBadge color="purple">${ref.amount}/mo</NeonBadge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onMessage(ambassador)}
          className="flex-1 gap-2 border-neon-purple/30 text-neon-purple hover:bg-neon-purple/10"
        >
          <Mail className="w-3 h-3" />
          Message
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRewardClick}
          className="flex-1 gap-2 border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10"
        >
          <Gift className="w-3 h-3" />
          Reward
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}

export default function BrandAmbassadors({ artistProfileId, artistName }) {
  const [selectedTier, setSelectedTier] = useState('all');

  // Fetch all support allocations with fan referrals
  const { data: allReferrals = [] } = useQuery({
    queryKey: ['artist-fan-referrals', artistProfileId],
    queryFn: () => base44.entities.SupportAllocation.filter({ 
      artist_profile_id: artistProfileId,
      is_active: true 
    }, '-created_date'),
    enabled: !!artistProfileId,
  });

  // Fetch user details for referrers
  const referrerIds = [...new Set(
    allReferrals
      .filter(r => r.referred_by_fan_id)
      .map(r => r.referred_by_fan_id)
  )];
  
  const { data: referrerUsers = [] } = useQuery({
    queryKey: ['referrer-users', referrerIds.join(',')],
    queryFn: () => base44.entities.User.filter({ id: referrerIds }),
    enabled: referrerIds.length > 0,
  });

  // Aggregate data by referrer
  const ambassadors = useMemo(() => {
    const map = {};

    allReferrals.forEach(allocation => {
      if (!allocation.referred_by_fan_id) return;

      const referrerId = allocation.referred_by_fan_id;
      
      if (!map[referrerId]) {
        const user = referrerUsers.find(u => u.id === referrerId);
        map[referrerId] = {
          fan_user_id: referrerId,
          display_name: user?.full_name || user?.display_name || null,
          tier: user?.subscription_tier || allocation.tier || 'basic',
          referral_count: 0,
          total_support: 0,
          first_referral_date: allocation.created_date,
          referrals: [],
          badges: 0,
          growth_rate: 0,
        };
      }

      map[referrerId].referral_count += 1;
      map[referrerId].total_support += allocation.amount || 0;
      map[referrerId].referrals.push({
        fan_id: allocation.fan_user_id,
        amount: allocation.amount,
        date: allocation.created_date,
        tier: allocation.tier,
      });

      // Update first referral date if earlier
      if (allocation.created_date < map[referrerId].first_referral_date) {
        map[referrerId].first_referral_date = allocation.created_date;
      }
    });

    // Calculate growth rate (referrals in last 30 days / total referrals * 100)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    Object.values(map).forEach(amb => {
      const recentReferrals = amb.referrals.filter(
        r => new Date(r.date) > thirtyDaysAgo
      );
      amb.growth_rate = amb.referral_count > 0 
        ? Math.round((recentReferrals.length / amb.referral_count) * 100)
        : 0;
      
      // Get recent referrals for display
      amb.recent_referrals = amb.referrals
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 3);

      // Estimate badges based on referral count
      amb.badges = Math.floor(amb.referral_count / 5);
    });

    // Sort by total impact (referral count + support generated)
    return Object.values(map).sort((a, b) => {
      const scoreA = a.referral_count * 10 + a.total_support;
      const scoreB = b.referral_count * 10 + b.total_support;
      return scoreB - scoreA;
    });
  }, [allReferrals, referrerUsers]);

  // Filter by tier
  const filteredAmbassadors = selectedTier === 'all' 
    ? ambassadors 
    : ambassadors.filter(a => a.tier === selectedTier);

  const handleSendMessage = (ambassador) => {
    toast.success(`Opening message to ${ambassador.display_name || 'Top Fan'}...`);
    // In production: open message composer modal
  };

  const totalReferrals = ambassadors.reduce((sum, a) => sum + a.referral_count, 0);
  const totalSupport = ambassadors.reduce((sum, a) => sum + a.total_support, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-card border border-yellow-400/30">
            <Trophy className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold">Brand Ambassadors</h2>
            <p className="text-xs text-muted-foreground">Your top fan advocates driving growth</p>
          </div>
        </div>
        <div className="flex gap-2">
          <NeonBadge color="cyan">
            <Users className="w-3 h-3 mr-1" />
            {ambassadors.length} Ambassadors
          </NeonBadge>
          <NeonBadge color="purple">
            <UserPlus className="w-3 h-3 mr-1" />
            {totalReferrals} Referrals
          </NeonBadge>
        </div>
      </div>

      {/* Summary Stats */}
      <GlassCard className="p-6 bg-gradient-to-r from-yellow-400/5 to-neon-cyan/5 border-yellow-400/20">
        <div className="grid md:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-xl bg-secondary/20 border border-border/30">
            <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-yellow-400">{ambassadors.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Active Ambassadors</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-secondary/20 border border-border/30">
            <UserPlus className="w-5 h-5 text-neon-cyan mx-auto mb-2" />
            <p className="text-2xl font-bold text-neon-cyan">{totalReferrals}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Referrals</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-secondary/20 border border-border/30">
            <DollarSign className="w-5 h-5 text-neon-purple mx-auto mb-2" />
            <p className="text-2xl font-bold text-neon-purple">${totalSupport.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">Monthly Support</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-secondary/20 border border-border/30">
            <TrendingUp className="w-5 h-5 text-neon-magenta mx-auto mb-2" />
            <p className="text-2xl font-bold text-neon-magenta">
              {ambassadors.length > 0 
                ? Math.round(ambassadors.reduce((sum, a) => sum + a.growth_rate, 0) / ambassadors.length)
                : 0}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">Avg Growth Rate</p>
          </div>
        </div>
      </GlassCard>

      {/* Tier Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium">Filter by Tier:</span>
        {['all', 'basic', 'supporter', 'champion', 'patron'].map(tier => (
          <button
            key={tier}
            onClick={() => setSelectedTier(tier)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedTier === tier
                ? 'bg-neon-purple/20 border border-neon-purple/40 text-neon-purple'
                : 'bg-secondary/20 border border-border/30 text-muted-foreground hover:border-neon-purple/30'
            }`}
          >
            {tier.charAt(0).toUpperCase() + tier.slice(1)}
          </button>
        ))}
      </div>

      {/* Ambassadors List */}
      {filteredAmbassadors.length === 0 ? (
        <GlassCard className="p-12 text-center border-dashed">
          <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display font-semibold mb-2">
            {ambassadors.length === 0 
              ? 'No Brand Ambassadors Yet' 
              : 'No Ambassadors in This Tier'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {ambassadors.length === 0
              ? 'Encourage your fans to share your music with friends. As they refer new listeners, they\'ll appear here as brand ambassadors.'
              : 'Try selecting a different tier filter to see ambassadors.'}
          </p>
        </GlassCard>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredAmbassadors.slice(0, 10).map((ambassador, idx) => (
            <AmbassadorCard
              key={ambassador.fan_user_id}
              ambassador={ambassador}
              rank={ambassadors.indexOf(ambassador)}
              artistProfileId={artistProfileId}
              onMessage={handleSendMessage}
            />
          ))}
        </div>
      )}

      {/* Rewards Info */}
      <GlassCard className="p-5 bg-gradient-to-r from-neon-magenta/5 to-neon-purple/5 border-border/30">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-neon-magenta/10">
            <Gift className="w-4 h-4 text-neon-magenta" />
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-1">Reward Your Ambassadors</h4>
            <p className="text-xs text-muted-foreground">
              Consider sending exclusive merch, early access to tickets, personalized thank-you messages, 
              or special discount codes to your top ambassadors. These fans are your biggest advocates 
              and deserve recognition for growing your fanbase.
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}