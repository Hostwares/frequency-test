import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Gift, Copy, Check, Users, DollarSign, Share2, TrendingUp,
  Award, Link2, Sparkles, Trophy, UserPlus, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

const STATUS_COLORS = {
  pending: 'blue',
  signed_up: 'purple',
  subscribed: 'cyan',
  rewarded: 'turquoise',
  expired: 'magenta',
};

const STATUS_LABELS = {
  pending: 'Pending',
  signed_up: 'Signed Up',
  subscribed: 'Subscribed',
  rewarded: 'Rewarded',
  expired: 'Expired',
};

export default function ArtistReferralHub({ artistProfile, user }) {
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ['artist-referrals', user?.id],
    queryFn: () => base44.entities.Referral.filter({ referrer_user_id: user.id }, '-created_date', 200),
    enabled: !!user?.id,
  });

  const referralCode = `!${artistProfile?.artist_handle || (user?.id || '').slice(0, 8).toUpperCase()}`;
  const referralLink = `${window.location.origin}/register?ref=${referralCode}&artist=${artistProfile?.id || ''}`;

  const stats = {
    total: referrals.length,
    converted: referrals.filter(r => r.status === 'subscribed' || r.status === 'rewarded').length,
    pending: referrals.filter(r => r.status === 'pending' || r.status === 'signed_up').length,
    earned: referrals.reduce((sum, r) => sum + (r.total_earned || 0), 0),
  };

  const conversionRate = stats.total > 0 ? ((stats.converted / stats.total) * 100).toFixed(0) : 0;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLinks = [
    {
      label: 'Twitter',
      color: 'bg-[#1DA1F2]',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Discover ${artistProfile?.artist_name} on The Mainstream Frequency! 🎵`)}&url=${encodeURIComponent(referralLink)}`,
    },
    {
      label: 'Facebook',
      color: 'bg-[#1877F2]',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
    },
    {
      label: 'WhatsApp',
      color: 'bg-[#25D366]',
      url: `https://wa.me/?text=${encodeURIComponent(`Check out ${artistProfile?.artist_name} on Frequency! ${referralLink}`)}`,
    },
    {
      label: 'Email',
      color: 'bg-neon-purple',
      url: `mailto:?subject=${encodeURIComponent(`Discover ${artistProfile?.artist_name} on Frequency`)}&body=${encodeURIComponent(`Hey! I think you'd love ${artistProfile?.artist_name}'s music. Check them out here: ${referralLink}`)}`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Referral Link Card */}
      <GlassCard hover={false} className="p-5 border-primary/20 bg-gradient-card">
        <div className="flex items-center gap-2 mb-2">
          <Gift className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold">Artist Referral Program</h3>
          <NeonBadge color="purple" className="ml-auto">Earn Rewards</NeonBadge>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Share your unique link. When someone signs up and subscribes, you both earn rewards —
          and new supporters get directed straight to your artist profile.
        </p>

        <div className="flex gap-2 mb-3">
          <Input value={referralLink} readOnly className="flex-1 text-xs font-mono" />
          <Button size="sm" onClick={copyLink} className="gap-1.5">
            {copied ? <><Check className="w-3.5 h-3.5" />Copied!</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShareOpen(!shareOpen)} className="gap-1.5">
            <Share2 className="w-3.5 h-3.5" />Share
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Your referral code:</span>
          <NeonBadge color="cyan">{referralCode}</NeonBadge>
        </div>

        {shareOpen && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-4 border-t border-border/30">
            {shareLinks.map(s => (
              <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg ${s.color} text-white text-xs font-medium hover:opacity-90 transition-opacity`}>
                <Share2 className="w-3 h-3" />{s.label}
              </a>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Users, label: 'Total Referred', value: stats.total, color: 'text-neon-cyan' },
          { icon: Check, label: 'Converted', value: stats.converted, color: 'text-neon-turquoise' },
          { icon: Clock, label: 'Pending', value: stats.pending, color: 'text-neon-purple' },
          { icon: DollarSign, label: 'Total Earned', value: `$${stats.earned.toFixed(2)}`, color: 'text-neon-magenta' },
        ].map(({ icon: Icon, label, value, color }) => (
          <GlassCard key={label} hover={false} className="p-4 text-center">
            <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
            <p className={`text-lg font-bold ${color}`}>{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Conversion Funnel */}
      {stats.total > 0 && (
        <GlassCard hover={false} className="p-5">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-primary" />Conversion Funnel
          </h4>
          <div className="space-y-2">
            {[
              { label: 'Invited', count: stats.total, pct: 100, color: 'bg-neon-blue' },
              { label: 'Signed Up', count: referrals.filter(r => ['signed_up', 'subscribed', 'rewarded'].includes(r.status)).length, pct: 0, color: 'bg-neon-purple' },
              { label: 'Subscribed', count: referrals.filter(r => ['subscribed', 'rewarded'].includes(r.status)).length, pct: 0, color: 'bg-neon-cyan' },
              { label: 'Rewarded', count: stats.converted, pct: 0, color: 'bg-neon-turquoise' },
            ].map((stage, i) => {
              const pct = stats.total > 0 ? (stage.count / stats.total) * 100 : 0;
              return (
                <div key={stage.label} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{stage.label}</span>
                  <div className="flex-1 h-6 bg-secondary/30 rounded-full overflow-hidden">
                    <div className={`h-full ${stage.color} rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                      style={{ width: `${Math.max(pct, stage.count > 0 ? 8 : 0)}%` }}>
                      {stage.count > 0 && <span className="text-[10px] text-white font-medium">{stage.count}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground w-10 text-right">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Overall conversion rate</span>
            <span className="text-sm font-bold text-neon-turquoise">{conversionRate}%</span>
          </div>
        </GlassCard>
      )}

      {/* Referral List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : referrals.length > 0 ? (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <UserPlus className="w-3.5 h-3.5" />Your Referrals
          </h4>
          <div className="space-y-1.5">
            {referrals.map(r => (
              <GlassCard key={r.id} hover={false} className="p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm truncate">{r.referred_name || r.referred_email || 'Anonymous'}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(r.created_date).toLocaleDateString()}
                    {r.is_affiliate && <span className="ml-1">· Affiliate</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {r.total_earned > 0 && (
                    <span className="text-xs text-neon-magenta font-medium">+${r.total_earned.toFixed(2)}</span>
                  )}
                  <NeonBadge color={STATUS_COLORS[r.status] || 'blue'}>
                    {STATUS_LABELS[r.status] || r.status}
                  </NeonBadge>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      ) : (
        <GlassCard hover={false} className="p-8 text-center">
          <Sparkles className="w-8 h-8 text-primary/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-1">No referrals yet</p>
          <p className="text-xs text-muted-foreground">Share your link above to start earning rewards!</p>
        </GlassCard>
      )}

      {/* How It Works */}
      <GlassCard hover={false} className="p-5">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-1.5">
          <Award className="w-4 h-4 text-primary" />How It Works
        </h4>
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">1</span>
            <p>Share your unique referral link with fans, friends, and other artists</p>
          </div>
          <div className="flex gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">2</span>
            <p>They sign up for Frequency and subscribe to any paid plan</p>
          </div>
          <div className="flex gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">3</span>
            <p>You both receive a free month — and new sign-ups are directed to your artist profile</p>
          </div>
          <div className="flex gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">4</span>
            <p>Top referrers can qualify for affiliate status with ongoing commission rewards</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}