import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Gift, Copy, Check, Users, DollarSign, Share2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

export default function ReferralDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: referrals = [] } = useQuery({
    queryKey: ['my-referrals', user?.id],
    queryFn: () => base44.entities.Referral.filter({ referrer_user_id: user.id }, '-created_date', 100),
    enabled: !!user,
  });

  const referralCode = `FREQ-${(user?.id || '').slice(0, 8).toUpperCase()}`;
  const referralLink = `${window.location.origin}/register?ref=${referralCode}`;

  const stats = {
    total: referrals.length,
    converted: referrals.filter(r => r.status === 'subscribed' || r.status === 'rewarded').length,
    earned: referrals.reduce((sum, r) => sum + (r.total_earned || 0), 0),
    pending: referrals.filter(r => r.status === 'pending' || r.status === 'signed_up').length,
  };

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Referral Link */}
      <GlassCard hover={false} className="p-5 border-primary/20">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold">Your Referral Link</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Share your link. When someone subscribes, you both get a free month!
        </p>
        <div className="flex gap-2">
          <Input value={referralLink} readOnly className="flex-1 text-xs" />
          <Button size="sm" onClick={copyLink} className="gap-1.5">
            {copied ? <><Check className="w-3.5 h-3.5" />Copied!</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
          </Button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Your code:</span>
          <NeonBadge color="cyan">{referralCode}</NeonBadge>
        </div>
      </GlassCard>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: Users, label: 'Referred', value: stats.total, color: 'text-neon-cyan' },
          { icon: Check, label: 'Converted', value: stats.converted, color: 'text-neon-turquoise' },
          { icon: TrendingUp, label: 'Pending', value: stats.pending, color: 'text-neon-purple' },
          { icon: DollarSign, label: 'Earned', value: `$${stats.earned.toFixed(2)}`, color: 'text-neon-magenta' },
        ].map(({ icon: Icon, label, value, color }) => (
          <GlassCard key={label} hover={false} className="p-3 text-center">
            <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
            <p className={`text-lg font-bold ${color}`}>{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Referral List */}
      {referrals.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Your Referrals</h4>
          <div className="space-y-1.5">
            {referrals.map(r => (
              <GlassCard key={r.id} hover={false} className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm">{r.referred_name || r.referred_email || 'Anonymous'}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(r.created_date).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  {r.total_earned > 0 && <span className="text-xs text-neon-magenta">+${r.total_earned.toFixed(2)}</span>}
                  <NeonBadge color={
                    r.status === 'rewarded' ? 'turquoise' :
                    r.status === 'subscribed' ? 'cyan' :
                    r.status === 'signed_up' ? 'purple' : 'blue'
                  }>
                    {r.status.replace('_', ' ')}
                  </NeonBadge>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* How it works */}
      <GlassCard hover={false} className="p-4">
        <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
          <Share2 className="w-4 h-4 text-primary" />How It Works
        </h4>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <p>1. Share your referral link with friends</p>
          <p>2. They sign up and subscribe to any paid plan</p>
          <p>3. You both get a free month added to your subscription</p>
          <p>4. Become an affiliate for ongoing commissions (contact us)</p>
        </div>
      </GlassCard>
    </div>
  );
}