import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

export default function ArtistPayoutHistory({ artistProfileId, userId }) {
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['artist-payment-methods', artistProfileId],
    queryFn: () => base44.entities.ArtistPaymentMethod.filter({ artist_profile_id: artistProfileId }),
    enabled: !!artistProfileId,
  });

  const paymentMethod = paymentMethods[0];

  const { data: orders = [] } = useQuery({
    queryKey: ['artist-orders', artistProfileId],
    queryFn: () => base44.entities.Order.filter({ artist_profile_id: artistProfileId, payment_status: 'paid' }, '-created_date', 20),
    enabled: !!artistProfileId,
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['artist-allocations', artistProfileId],
    queryFn: () => base44.entities.SupportAllocation.filter({ artist_profile_id: artistProfileId, is_active: true }),
    enabled: !!artistProfileId,
  });

  // Calculate monthly support revenue
  const monthlySupport = allocations.reduce((sum, a) => sum + (a.amount || 0), 0);
  
  // Calculate product sales revenue
  const productSales = orders.reduce((sum, o) => sum + (o.artist_earnings || 0), 0);

  // Calculate network split (15% of earnings go to network artists)
  const networkShare = (monthlySupport + productSales) * 0.15;
  const artistKeep = (monthlySupport + productSales) * 0.85;

  const totalRevenue = monthlySupport + productSales;

  return (
    <GlassCard hover={false} className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20">
            <DollarSign className="w-5 h-5 text-neon-cyan" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-base">Revenue & Payouts</h2>
            <p className="text-xs text-muted-foreground">Earnings breakdown and history</p>
          </div>
        </div>
        {paymentMethod && (
          <NeonBadge color={paymentMethod.pending_balance >= 50 ? 'cyan' : 'magenta'}>
            ${paymentMethod.pending_balance?.toFixed(2) || '0.00'} pending
          </NeonBadge>
        )}
      </div>

      {/* Revenue Breakdown */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-secondary/10 border border-border/30">
          <TrendingUp className="w-5 h-5 text-neon-purple mb-2" />
          <p className="text-xs text-muted-foreground mb-1">Monthly Support</p>
          <p className="text-2xl font-bold text-neon-purple">${monthlySupport.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{allocations.length} supporters</p>
        </div>
        <div className="p-4 rounded-xl bg-secondary/10 border border-border/30">
          <DollarSign className="w-5 h-5 text-neon-cyan mb-2" />
          <p className="text-xs text-muted-foreground mb-1">Product Sales</p>
          <p className="text-2xl font-bold text-neon-cyan">${productSales.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{orders.length} orders</p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-card border border-border/30">
          <CheckCircle className="w-5 h-5 text-neon-magenta mb-2" />
          <p className="text-xs text-muted-foreground mb-1">Your Share (85%)</p>
          <p className="text-2xl font-bold text-neon-magenta">${artistKeep.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Network gets ${networkShare.toFixed(2)}</p>
        </div>
      </div>

      {/* Payout Info */}
      {paymentMethod && (
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Payout Threshold</span>
            <span className="text-sm font-semibold">$50.00</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Current Balance</span>
            <span className="text-sm font-semibold">${paymentMethod.pending_balance?.toFixed(2) || '0.00'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <NeonBadge color={paymentMethod.pending_balance >= 50 ? 'cyan' : 'magenta'}>
              {paymentMethod.pending_balance >= 50 ? 'Ready for Payout' : 'Building Balance'}
            </NeonBadge>
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div>
        <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-neon-cyan" />
          Recent Earnings
        </h3>
        {orders.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No orders yet</p>
        ) : (
          <div className="space-y-2">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/10 border border-border/30">
                <div>
                  <p className="text-sm font-semibold">{order.order_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.created_date).toLocaleDateString()} • {order.fan_name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-neon-cyan">+${(order.artist_earnings || 0).toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground">Your earnings</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </GlassCard>
  );
}