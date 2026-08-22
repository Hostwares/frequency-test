import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CreditCard, DollarSign, Building, CheckCircle, AlertCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

export default function ArtistPaymentSetup({ artistProfileId, userId }) {
  const [isOpen, setIsOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: paymentMethods = [], isLoading } = useQuery({
    queryKey: ['artist-payment-methods', artistProfileId],
    queryFn: () => base44.entities.ArtistPaymentMethod.filter({ artist_profile_id: artistProfileId }),
    enabled: !!artistProfileId,
  });

  const paymentMethod = paymentMethods[0];

  const totalEarned = paymentMethod?.total_earned || 0;
  const pendingBalance = paymentMethod?.pending_balance || 0;

  return (
    <GlassCard hover={false} className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20">
            <CreditCard className="w-5 h-5 text-neon-cyan" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-base">Payment Setup</h2>
            <p className="text-xs text-muted-foreground">Configure how you receive payments</p>
          </div>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant={paymentMethod ? "outline" : "default"}>
              <Settings className="w-4 h-4 mr-2" />
              {paymentMethod ? 'Manage' : 'Setup'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Payment Method Configuration</DialogTitle>
            </DialogHeader>
            <PaymentMethodForm
              artistProfileId={artistProfileId}
              userId={userId}
              existingMethod={paymentMethod}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['artist-payment-methods'] });
                setIsOpen(false);
              }}
              onCancel={() => setIsOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="h-32 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : !paymentMethod ? (
        <div className="text-center py-8 border border-dashed border-border/40 rounded-xl">
          <CreditCard className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-2">No payment method configured</p>
          <p className="text-xs text-muted-foreground/60 mb-4">Set up Base44 Payments to start receiving earnings</p>
          <Button onClick={() => setIsOpen(true)}>
            Setup Payment Method
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/10 border border-border/30">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${paymentMethod.is_verified ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                {paymentMethod.is_verified ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {paymentMethod.is_verified ? 'Verified & Active' : 'Pending Verification'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {paymentMethod.payment_provider.replace('_', ' ').toUpperCase()}
                </p>
              </div>
            </div>
            <NeonBadge color={paymentMethod.is_verified ? 'cyan' : 'magenta'}>
              {paymentMethod.payout_percentage}% to you
            </NeonBadge>
          </div>

          {/* Earnings Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-gradient-card border border-border/30">
              <DollarSign className="w-5 h-5 text-neon-cyan mb-2" />
              <p className="text-2xl font-bold text-neon-cyan">${pendingBalance.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">Pending Balance</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-card border border-border/30">
              <Building className="w-5 h-5 text-neon-purple mb-2" />
              <p className="text-2xl font-bold text-neon-purple">${totalEarned.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Earned</p>
            </div>
          </div>

          {/* Payout Info */}
          <div className="p-4 rounded-xl bg-secondary/10 border border-border/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Payout Schedule</span>
              <span className="text-sm font-semibold capitalize">{paymentMethod.payout_schedule}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Minimum Payout</span>
              <span className="text-sm font-semibold">${paymentMethod.minimum_payout}</span>
            </div>
            {paymentMethod.last_payout_date && (
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                <span className="text-xs text-muted-foreground">Last Payout</span>
                <span className="text-xs font-semibold">
                  ${paymentMethod.last_payout_amount?.toFixed(2) || '0.00'} on {new Date(paymentMethod.last_payout_date).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </GlassCard>
  );
}

function PaymentMethodForm({ artistProfileId, userId, existingMethod, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    payment_provider: existingMethod?.payment_provider || 'wix_payments',
    account_email: existingMethod?.account_email || '',
    payout_percentage: existingMethod?.payout_percentage || 85,
    minimum_payout: existingMethod?.minimum_payout || 20,
    payout_schedule: existingMethod?.payout_schedule || 'weekly',
  });

  const provider = formData.payment_provider;
  const emailLabel =
    provider === 'zelle' ? 'Zelle Email or Mobile'
    : provider === 'paypal' ? 'PayPal Email'
    : provider === 'stripe' ? 'Stripe Account Email'
    : provider === 'bank_transfer' ? 'Bank Contact Email'
    : 'Payout Email';
  const emailPlaceholder = provider === 'zelle' ? 'name@bank.com or 5551234567' : 'your@email.com';
  const emailHint =
    provider === 'zelle'
      ? "Enter the email or mobile number registered with your bank's Zelle"
      : 'Earnings will be sent to this email address';

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ArtistPaymentMethod.create({
      ...data,
      artist_profile_id: artistProfileId,
      artist_user_id: userId,
      is_verified: data.payment_provider === 'wix_payments' || data.payment_provider === 'zelle',
    }),
    onSuccess,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ArtistPaymentMethod.update(id, data),
    onSuccess,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (existingMethod) {
      updateMutation.mutate({ id: existingMethod.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <p className="text-xs text-blue-300">
          <strong>Base44 Payments</strong> is already configured for this app. 
          Artists receive 85% of sales, with automatic payouts.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="payment_provider">Payout Method</Label>
        <Select
          value={formData.payment_provider}
          onValueChange={(value) => setFormData({ ...formData, payment_provider: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="wix_payments">Base44 Payments</SelectItem>
            <SelectItem value="zelle">Zelle</SelectItem>
            <SelectItem value="paypal">PayPal</SelectItem>
            <SelectItem value="stripe">Stripe</SelectItem>
            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="account_email">{emailLabel}</Label>
        <Input
          id="account_email"
          type={formData.payment_provider === 'zelle' ? 'text' : 'email'}
          value={formData.account_email}
          onChange={(e) => setFormData({ ...formData, account_email: e.target.value })}
          placeholder={emailPlaceholder}
          required
        />
        <p className="text-xs text-muted-foreground">{emailHint}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="payout_schedule">Payout Schedule</Label>
        <Select
          value={formData.payout_schedule}
          onValueChange={(value) => setFormData({ ...formData, payout_schedule: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="instant">Instant (after each sale)</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="minimum_payout">Minimum Payout Amount ($)</Label>
        <Input
          id="minimum_payout"
          type="number"
          value={formData.minimum_payout}
          onChange={(e) => setFormData({ ...formData, minimum_payout: parseFloat(e.target.value) || 20 })}
        />
        <p className="text-xs text-muted-foreground">
          Minimum balance required before payout is triggered
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
          {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </form>
  );
}