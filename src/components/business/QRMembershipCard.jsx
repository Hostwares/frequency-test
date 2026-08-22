import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Crown, Zap, Sparkles, Star, QrCode } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

const PLAN_ICONS = {
  free: Star,
  supporter: Zap,
  premium_supporter: Sparkles,
  champion: Crown,
  founding_supporter: Crown,
};

const PLAN_COLORS = {
  free: '#6b7280',
  supporter: '#06b6d4',
  premium_supporter: '#a855f7',
  champion: '#d946ef',
  founding_supporter: '#d946ef',
};

export default function QRMembershipCard() {
  const { user } = useAuth();

  const { data: subscription } = useQuery({
    queryKey: ['my-subscription', user?.id],
    queryFn: async () => {
      const subs = await base44.entities.UserSubscription.filter({
        user_id: user.id, status: 'active'
      });
      return subs[0];
    },
    enabled: !!user,
  });

  const planCode = subscription?.plan_code || 'free';
  const planName = subscription?.plan_name || 'Free';
  const Icon = PLAN_ICONS[planCode] || Star;
  const color = PLAN_COLORS[planCode] || '#a855f7';

  // Generate QR code with member info
  const memberData = JSON.stringify({
    user_id: user?.id,
    name: user?.full_name || user?.email,
    plan: planCode,
    since: subscription?.started_date || user?.created_date,
  });
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(memberData)}`;

  const memberSince = subscription?.started_date || user?.created_date;
  let sinceStr = '';
  if (memberSince) {
    try { sinceStr = new Date(memberSince).toLocaleDateString([], { year: 'numeric', month: 'short' }); } catch { sinceStr = ''; }
  }

  return (
    <GlassCard hover={false} className="p-0 overflow-hidden max-w-xs mx-auto" style={{ borderColor: `${color}40` }}>
      {/* Card header */}
      <div className="p-4" style={{ background: `linear-gradient(135deg, ${color}20, transparent)` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}25` }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Frequency</p>
              <p className="text-xs font-display font-bold">Membership Card</p>
            </div>
          </div>
          {subscription?.is_founding_member && <NeonBadge color="magenta">Founding</NeonBadge>}
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 pt-2">
        <p className="text-sm font-medium mb-0.5">{user?.full_name || user?.email}</p>
        <div className="flex items-center gap-2 mb-3">
          <NeonBadge color="cyan">{planName}</NeonBadge>
          {sinceStr && <span className="text-[10px] text-muted-foreground">Member since {sinceStr}</span>}
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-2">
          <div className="p-2 bg-white rounded-lg">
            <img src={qrUrl} alt="Membership QR" className="w-32 h-32" />
          </div>
        </div>
        <p className="text-center text-[10px] text-muted-foreground">
          <QrCode className="w-3 h-3 inline mr-1" />
          Present this card for member benefits
        </p>
      </div>

      {/* Card footer */}
      <div className="px-4 py-2 bg-secondary/20 border-t border-border/30 flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground">ID: {(user?.id || '').slice(0, 12).toUpperCase()}</span>
        <span className="text-[9px] text-muted-foreground">The Mainstream Frequency</span>
      </div>
    </GlassCard>
  );
}