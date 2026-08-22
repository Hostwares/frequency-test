import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bell, BellOff, CheckCircle, Mail } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function PayoutNotificationSettings({ artistProfileId, userId }) {
  const queryClient = useQueryClient();

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['artist-payment-methods', artistProfileId],
    queryFn: () => base44.entities.ArtistPaymentMethod.filter({ artist_profile_id: artistProfileId }),
    enabled: !!artistProfileId,
  });

  const paymentMethod = paymentMethods[0];

  const toggleNotificationsMutation = useMutation({
    mutationFn: async (enabled) => {
      if (!paymentMethod?.id) return;
      await base44.entities.ArtistPaymentMethod.update(paymentMethod.id, {
        notifications_enabled: enabled,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-payment-methods'] });
      toast.success('Notification settings updated');
    },
  });

  if (!paymentMethod) {
    return (
      <GlassCard hover={false} className="p-6">
        <div className="text-center py-8">
          <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No payment method configured</p>
          <p className="text-xs text-muted-foreground mt-1">Set up your payment details first</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard hover={false} className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-neon-purple/10 border border-neon-purple/20">
            <Bell className="w-5 h-5 text-neon-purple" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-base">Payout Notifications</h2>
            <p className="text-xs text-muted-foreground">Manage automatic payout alerts</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {paymentMethod.notifications_enabled ? (
            <Bell className="w-5 h-5 text-neon-cyan" />
          ) : (
            <BellOff className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-border/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-neon-cyan/10">
              <Mail className="w-5 h-5 text-neon-cyan" />
            </div>
            <div>
              <p className="text-sm font-medium">Email Notifications</p>
              <p className="text-xs text-muted-foreground">{paymentMethod.account_email || paymentMethod.payout_email}</p>
            </div>
          </div>
          <Switch
            checked={paymentMethod.notifications_enabled !== false}
            onCheckedChange={(checked) => toggleNotificationsMutation.mutate(checked)}
            disabled={toggleNotificationsMutation.isPending}
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-border/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-neon-purple/10">
              <Bell className="w-5 h-5 text-neon-purple" />
            </div>
            <div>
              <p className="text-sm font-medium">In-App Alerts</p>
              <p className="text-xs text-muted-foreground">Dashboard & notification center</p>
            </div>
          </div>
          <Switch
            checked={paymentMethod.notifications_enabled !== false}
            onCheckedChange={(checked) => toggleNotificationsMutation.mutate(checked)}
            disabled={toggleNotificationsMutation.isPending}
          />
        </div>

        <div className="mt-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">How it works:</strong> When your pending balance reaches the $50 threshold, 
            you'll automatically receive both an email and in-app notification. Your payout will be processed within 1-3 business days. 
            Toggle off either method to disable those specific alerts.
          </p>
        </div>
      </div>
    </GlassCard>
  );
}